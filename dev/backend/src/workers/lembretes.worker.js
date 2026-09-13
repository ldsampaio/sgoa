// Worker de avisos de prazo: verifica periodicamente as orientações em andamento
// e envia mensagem + notificação + e-mail (stub) ao aluno quando o prazo de
// qualificação/defesa está chegando, conforme a configuração do professor.
// Uso: npm run lembretes. Disparo manual: POST /api/lembretes/verificar.
// Env: LEMBRETES_INTERVALO_MS (padrão 6h), LEMBRETES_UMA_VEZ=false para ciclo único.
import 'dotenv/config';
import { initDatabase } from '../config/database.js';
import { verificarTodas } from '../services/lembretes.service.js';

await initDatabase();

const INTERVALO_MS = Number(process.env.LEMBRETES_INTERVALO_MS) || 6 * 60 * 60 * 1000;
const UMA_VEZ = String(process.env.LEMBRETES_UMA_VEZ ?? 'false').toLowerCase() === 'true';

async function ciclo() {
  try {
    const avisos = await verificarTodas();
    if (avisos.length) {
      console.log(`[LEMBRETES] avisos enviados: ${JSON.stringify(avisos)}`);
    } else {
      console.log('[LEMBRETES] verificação concluída, nenhum aviso devido.');
    }
  } catch (err) {
    console.error('[LEMBRETES] erro no ciclo:', err.message);
  }
}

async function main() {
  console.log(`[LEMBRETES] worker iniciado (intervalo ${INTERVALO_MS}ms)`);
  await ciclo();
  if (UMA_VEZ) process.exit(0);
  setInterval(ciclo, INTERVALO_MS);
}

function shutdown() {
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

main();
