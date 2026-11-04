import 'dotenv/config';
import { createClient } from 'redis';

// O sgoa conecta com o usuário ACL `saga_readonly`: só enxerga
// `saga:sess:*:meta` e `saga:heartbeat`. Não lê o payload upstream (Fernet,
// só o saga lê) e não escreve nada.
//
// Redis é a fonte da verdade da sessão. Falha de conexão aqui não tem fallback:
// sem confirmar liveness, o verifier rejeita (503).
let client = null;

// Falha fechada precisa ser RÁPIDA: sem um limite de reconexão, connect() nunca resolve
// quando o Redis está fora e o request pendura em vez de responder 503. O verifier já
// trata o erro como "liveness não confirmada", então o limite de tentativas é o que
// transforma "Redis indisponível" em 503 de fato (regressão no CI, que não tem Redis).
const MAX_RECONNECTS = 3;

export function estrategiaReconexao(retries) {
  if (retries >= MAX_RECONNECTS) return new Error('redis: reconexão esgotada');
  return Math.min(retries * 100, 500);
}

export async function getRedis() {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://saga_readonly:saga-dev-ro@localhost:6379/0',
      socket: { connectTimeout: 5000, reconnectStrategy: estrategiaReconexao },
    });
    client.on('error', () => {
      // O verifier trata a falha como "liveness não confirmada" → 503.
    });
  }
  if (!client.isOpen) await client.connect();
  return client;
}

// Interface mínima que o verifier usa (get + hgetall). Em teste, entra um fake
// em memória com a mesma forma.
//
// node-redis v6 expõe `hGetAll` (camelCase); `hgetall` não existe no cliente
// real — chamar por `hgetall` lançava TypeError, que o verifier tratava como
// "liveness não confirmada" e respondia 503. O port mantém o nome que o verifier
// espera e delega para o método do cliente.
export function portRedis(clientGetter = getRedis) {
  return {
    get: (chave) => clientGetter().then((c) => c.get(chave)),
    hgetall: (chave) => clientGetter().then((c) => c.hGetAll(chave)),
  };
}
