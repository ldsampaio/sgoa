// Agente interno de avaliação: consome sgoa.avaliacoes.pendentes, extrai o texto
// do arquivo, avalia via OpenRouter (só modelos :free, 2 passes) e publica o
// resultado em sgoa.avaliacoes.resultados (o worker de resultados finaliza).
// Uso: npm run agent (local) ou serviço sgoa-agent no docker-compose.
// ATENÇÃO: não rode junto com um agente externo no mesmo tópico (duplicaria avaliações).
import 'dotenv/config';
import { Kafka, logLevel } from 'kafkajs';
import { initDatabase } from '../config/database.js';
import * as AvaliacaoModel from '../models/avaliacao.model.js';
import * as DocumentoModel from '../models/documento.model.js';
import { extrairTexto, dividirChunks } from '../services/extrairTexto.service.js';
import { chatComRetry } from '../services/openRouter.service.js';
import {
  topicPedidos,
  publicarResultado,
  desconectar as desconectarFila,
} from '../services/filaAvaliacao.service.js';

await initDatabase();

if (String(process.env.AGENT_ENABLED ?? 'true').toLowerCase() === 'false') {
  console.log('[AGENTE] AGENT_ENABLED=false — nada a consumir. Encerrando.');
  process.exit(0);
}
if (!process.env.OPENROUTER_API_KEY) {
  console.error('[AGENTE] OPENROUTER_API_KEY não configurada. Encerrando.');
  process.exit(1);
}

const LIMITE_RESUMO = Number(process.env.OPENROUTER_MAX_TOKENS_RESUMO) || 1200;
const LIMITE_PARECER = Number(process.env.OPENROUTER_MAX_TOKENS_PARECER) || 2500;
const CHUNK_CHARS = Number(process.env.OPENROUTER_CHUNK_CHARS) || 15000;
const MAX_CHUNKS = Number(process.env.OPENROUTER_MAX_CHUNKS) || 8;
const MIN_CHARS = Number(process.env.AGENT_MIN_CHARS) || 500;

const kafka = new Kafka({
  clientId: `${process.env.KAFKA_CLIENT_ID || 'sgoa-backend'}-agent`,
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',').map((b) => b.trim()),
  logLevel: logLevel.ERROR,
  retry: { retries: 10 },
});

const consumer = kafka.consumer({ groupId: `${process.env.KAFKA_GROUP_ID || 'sgoa-avaliacoes'}-agent` });

const PROMPT_RESUMO = (parte, total) =>
  `Resuma o trecho ${parte}/${total} de um trabalho acadêmico, preservando estrutura, dados, argumentos e conclusões. Responda somente com o resumo, em até 300 palavras.`;

// Passe 1 (map): resume cada chunk sequencialmente (respeita o rate limit free).
async function resumirPartes(chunks, idAvaliacao) {
  const resumos = [];
  let n = 0;
  for (const chunk of chunks) {
    n += 1;
    const resumo = await chatComRetry(
      {
        messages: [
          { role: 'system', content: PROMPT_RESUMO(n, chunks.length) },
          { role: 'user', content: chunk },
        ],
        maxTokens: LIMITE_RESUMO,
      },
      {
        onRetry: ({ tentativa, esperaMs, erro }) =>
          console.warn(`[AGENTE:${idAvaliacao}] resumo ${n}/${chunks.length} retry ${tentativa} em ${esperaMs}ms: ${erro}`),
      },
    );
    resumos.push(`--- Parte ${n}/${chunks.length} ---\n${resumo}`);
  }
  return resumos.join('\n\n');
}

// Passe 2 (reduce): prompt do professor + resumos → parecer final.
async function emitirParecer(promptProfessor, resumos, parcial, idAvaliacao) {
  const observacao = parcial
    ? '\n\nObservação: o trabalho excedeu o limite de leitura; este parecer baseia-se nos resumos das partes inicial e final.'
    : '';
  return chatComRetry(
    {
      messages: [
        {
          role: 'user',
          content: `${promptProfessor}\n\n=== RESUMOS POR PARTE DO TRABALHO AVALIADO ===\n${resumos}${observacao}`,
        },
      ],
      maxTokens: LIMITE_PARECER,
    },
    {
      onRetry: ({ tentativa, esperaMs, erro }) =>
        console.warn(`[AGENTE:${idAvaliacao}] parecer retry ${tentativa} em ${esperaMs}ms: ${erro}`),
    },
  );
}

async function finalizar(idAvaliacao, resultado) {
  await publicarResultado(resultado);
  console.log(`[AGENTE] avaliação ${idAvaliacao} → ${resultado.status}`);
}

async function processar(pedido) {
  const idAvaliacao = pedido?.id_avaliacao ? String(pedido.id_avaliacao) : null;
  if (!idAvaliacao) {
    console.warn('[AGENTE] pedido sem id_avaliacao ignorado.');
    return;
  }
  const avaliacao = await AvaliacaoModel.findById(idAvaliacao);
  if (!avaliacao) {
    console.warn(`[AGENTE] avaliação desconhecida ignorada: ${idAvaliacao}`);
    return;
  }
  if (avaliacao.status === 'concluída') return; // idempotência contra replays

  await AvaliacaoModel.marcarProcessando(idAvaliacao);
  const doc = await DocumentoModel.findById(avaliacao.id_documento);
  if (!doc) {
    await finalizar(idAvaliacao, { id_avaliacao: idAvaliacao, status: 'falha', erro: 'Documento não encontrado.' });
    return;
  }

  try {
    const caminho = DocumentoModel.resolverCaminhoArmazenamento(doc.caminho_armazenamento);
    const { texto, paginas } = await extrairTexto(caminho, doc.tipo_arquivo);
    if (texto.length < MIN_CHARS) {
      await finalizar(idAvaliacao, {
        id_avaliacao: idAvaliacao,
        status: 'falha',
        erro: `Texto extraído insuficiente (${texto.length} caracteres, mínimo ${MIN_CHARS}). O PDF pode ser digitalizado (imagem).`,
      });
      return;
    }
    console.log(`[AGENTE] ${idAvaliacao}: ${texto.length} chars${paginas ? `, ${paginas} págs` : ''} — resumindo...`);
    const { chunks, parcial } = dividirChunks(texto, CHUNK_CHARS, MAX_CHUNKS);
    const resumos = await resumirPartes(chunks, idAvaliacao);
    const parecer = await emitirParecer(avaliacao.prompt_usado, resumos, parcial, idAvaliacao);
    await finalizar(idAvaliacao, { id_avaliacao: idAvaliacao, status: 'concluída', resultado: parecer });
  } catch (err) {
    if (err.code === 'AUTH') {
      await finalizar(idAvaliacao, { id_avaliacao: idAvaliacao, status: 'falha', erro: 'OpenRouter: API key inválida.' });
    } else if (err.code === 'RATE') {
      await finalizar(idAvaliacao, {
        id_avaliacao: idAvaliacao,
        status: 'falha',
        erro: 'OpenRouter: limite do plano free atingido após retentativas. Reenvie mais tarde.',
      });
    } else if (String(err.message || '').includes('não suportado')) {
      await finalizar(idAvaliacao, { id_avaliacao: idAvaliacao, status: 'falha', erro: err.message });
    } else {
      await finalizar(idAvaliacao, {
        id_avaliacao: idAvaliacao,
        status: 'falha',
        erro: `Falha no agente: ${String(err.message || err).slice(0, 300)}`,
      });
    }
  }
}

async function main() {
  for (let tentativa = 1; ; tentativa++) {
    try {
      await consumer.connect();
      await consumer.subscribe({ topic: topicPedidos(), fromBeginning: false });
      break;
    } catch (err) {
      if (tentativa >= 15) throw err;
      console.warn(`[AGENTE] broker indisponível (tentativa ${tentativa}): ${err.message}. Retentando em 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.log(`[AGENTE] consumindo ${topicPedidos()} (modelo ${process.env.OPENROUTER_MODEL || 'padrão :free'})`);
  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      try {
        await processar(JSON.parse(message.value?.toString() || 'null'));
        await consumer.commitOffsets([{ topic, partition, offset: (Number(message.offset) + 1).toString() }]);
      } catch (err) {
        // Falha transitória: NÃO commita para o pedido ser reentregue.
        console.error('[AGENTE] erro transitório, pedido será reentregue:', err.message);
        await new Promise((r) => setTimeout(r, 2000));
      }
    },
  });
}

async function shutdown() {
  try {
    await consumer.disconnect();
    await desconectarFila();
  } catch {
    // ignore
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

main().catch((err) => {
  console.error('[AGENTE] falha fatal:', err.message);
  process.exit(1);
});
