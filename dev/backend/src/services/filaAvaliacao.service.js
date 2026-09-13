import { Kafka, logLevel } from 'kafkajs';
import 'dotenv/config';

let kafka = null;
let producer = null;
let conectado = false;

export function kafkaHabilitado() {
  return String(process.env.KAFKA_ENABLED ?? 'true').toLowerCase() !== 'false';
}

export function topicPedidos() {
  return process.env.KAFKA_TOPIC_PEDIDOS || 'sgoa.avaliacoes.pendentes';
}

export function topicResultados() {
  return process.env.KAFKA_TOPIC_RESULTADOS || 'sgoa.avaliacoes.resultados';
}

function getKafka() {
  if (!kafka) {
    kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'sgoa-backend',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',').map((b) => b.trim()),
      logLevel: logLevel.NOTHING,
      retry: { retries: 2 },
    });
  }
  return kafka;
}

async function getProducer() {
  if (!conectado) {
    producer = getKafka().producer();
    await producer.connect();
    conectado = true;
  }
  return producer;
}

// Best-effort: nunca quebra o upload; retorna { publicado, erro }.
export async function publicarPedidoAvaliacao(pedido) {
  if (!kafkaHabilitado()) {
    return { publicado: false, erro: 'Kafka desabilitado (KAFKA_ENABLED=false).' };
  }
  try {
    const p = await getProducer();
    await p.send({
      topic: topicPedidos(),
      messages: [{ key: pedido.id_avaliacao, value: JSON.stringify(pedido) }],
    });
    return { publicado: true, erro: null };
  } catch (err) {
    conectado = false;
    producer = null;
    return { publicado: false, erro: `Falha ao publicar no Kafka: ${err.message}` };
  }
}

export function montarPedido({ avaliacao, documento, orientacao, alunoNome, professorNome }) {
  const baseUrl = (process.env.API_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
  return {
    id_avaliacao: avaliacao.id_avaliacao,
    id_documento: avaliacao.id_documento,
    id_orientacao: avaliacao.id_orientacao,
    tipo: avaliacao.tipo,
    id_tipo: avaliacao.id_tipo || null,
    prompt: avaliacao.prompt_usado,
    documento: {
      nome: documento.nome_arquivo,
      tipo_arquivo: documento.tipo_arquivo,
      versao: documento.versao,
      categoria: documento.categoria || avaliacao.tipo,
      descricao: documento.descricao || null,
      download_url: `${baseUrl}/api/documentos/${avaliacao.id_documento}/download`,
    },
    aluno: { nome: alunoNome || null },
    professor: { nome: professorNome || null },
    tentativas: avaliacao.tentativas,
    enviado_em: new Date().toISOString(),
  };
}

export async function desconectar() {
  try {
    await producer?.disconnect();
  } catch {
    // ignore
  }
  conectado = false;
  producer = null;
}

// Publica o resultado da avaliação (usado pelo agente interno).
// Formato idêntico ao do agente externo; o worker de resultados finaliza.
export async function publicarResultado(resultado) {
  const p = await getProducer();
  await p.send({
    topic: topicResultados(),
    messages: [{ key: resultado.id_avaliacao, value: JSON.stringify(resultado) }],
  });
}
