import 'dotenv/config';
import { createApp } from './src/app.js';
import { validaGateProducao } from './src/config/gateProducao.js';

// SEC-02: recusa boot de produção com ambiente inseguro (antes de subir a API).
validaGateProducao();

const PORT = process.env.PORT || 3000;

const app = await createApp();

app.listen(PORT, () => {
  console.log(`SGOA API rodando em http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
