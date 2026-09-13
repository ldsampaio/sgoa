// Worker: consome sgoa.avaliacoes.resultados e atualiza o SGOA.
// Uso: npm run worker (local) ou serviço sgoa-worker no docker-compose.
// O agente de IA é externo e publica neste tópico o resultado da avaliação.
import 'dotenv/config';
import { Kafka, logLevel } from 'kafkajs';
import { initDatabase } from '../config/database.js';
import * as AvaliacaoModel from '../models/avaliacao.model.js';
import { notificarParticipantes } from '../services/notificacao.service.js';
import { topicResultados } from '../services/filaAvaliacao.service.js';

initDatabase();

const kafka = new Kafka({
  clientId: `${process.env.KAFKA_CLIENT_ID || 'sgoa-backend'}-worker`,
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',').map((b) => b.trim()),
  logLevel: logLevel.ERROR,
  retry: { retries: 10 },
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'sgoa-avaliacoes' });

function validarMensagem(msg) {
  if (!msg || typeof msg !== 'object') return null;
  const { id_avaliacao, status, resultado, nota, erro } = msg;
  if (!id_avaliacao || !['concluída', 'falha'].includes(status)) return null;
  return { id_avaliacao: String(id_avaliacao), status, resultado, nota, erro };
}

async function processar(mensagem) {
  const valida = validarMensagem(mensagem);
  if (!valida) {
    console.warn('[WORKER] mensagem inválida ignorada:', JSON.stringify(mensagem)?.slice(0, 200));
    return;
  }
  const avaliacao = await AvaliacaoModel.findById(valida.id_avaliacao);
  if (!avaliacao) {
    console.warn(`[WORKER] avaliação desconhecida ignorada: ${valida.id_avaliacao}`);
    return;
  }
  if (avaliacao.status === 'concluída' && valida.status === 'concluída') return; // idempotência
  if (avaliacao.status === valida.status && valida.status === 'falha' && avaliacao.erro === valida.erro) return;

  if (valida.status === 'concluída') {
    if (!valida.resultado) {
      await AvaliacaoModel.falhar(valida.id_avaliacao, 'Agente retornou conclusão sem resultado.');
    } else {
      await AvaliacaoModel.concluir(valida.id_avaliacao, { resultado: valida.resultado, nota: valida.nota });
    }
    await notificarParticipantes(
      avaliacao.id_orientacao,
      'avaliacao',
      'Avaliação de IA disponível',
      `A avaliação de "${avaliacao.nome_arquivo}" está pronta.`,
      null,
    );
  } else {
    await AvaliacaoModel.falhar(valida.id_avaliacao, valida.erro || 'Agente reportou falha.');
    await notificarParticipantes(
      avaliacao.id_orientacao,
      'avaliacao',
      'Avaliação de IA falhou',
      `A avaliação de "${avaliacao.nome_arquivo}" falhou: ${valida.erro || 'sem detalhes.'}`,
      null,
    );
  }
  console.log(`[WORKER] avaliação ${valida.id_avaliacao} → ${valida.status}`);
}

async function main() {
  // Retry de conexão: o broker pode ainda estar subindo (docker compose).
  for (let tentativa = 1; ; tentativa++) {
    try {
      await consumer.connect();
      await consumer.subscribe({ topic: topicResultados(), fromBeginning: false });
      break;
    } catch (err) {
      if (tentativa >= 15) throw err;
      console.warn(`[WORKER] broker indisponível (tentativa ${tentativa}): ${err.message}. Retentando em 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.log(`[WORKER] consumindo ${topicResultados()} (group ${process.env.KAFKA_GROUP_ID || 'sgoa-avaliacoes'})`);
  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      try {
        await processar(JSON.parse(message.value?.toString() || 'null'));
        // Desfecho permanente (válido, inválido, desconhecido ou duplicado): commita.
        await consumer.commitOffsets([{ topic, partition, offset: (Number(message.offset) + 1).toString() }]);
      } catch (err) {
        // Falha transitória (ex: SQLite ocupado): NÃO commita para a mensagem
        // ser reentregue; pausa breve para não girar em loop quente.
        console.error('[WORKER] erro transitório, mensagem será reentregue:', err.message);
        await new Promise((r) => setTimeout(r, 2000));
      }
    },
  });
}

async function shutdown() {
  try {
    await consumer.disconnect();
  } catch {
    // ignore
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

main().catch((err) => {
  console.error('[WORKER] falha fatal:', err.message);
  process.exit(1);
});
