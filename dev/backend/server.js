import 'dotenv/config';
import { createApp } from './src/app.js';

const PORT = process.env.PORT || 3000;

const app = await createApp();

app.listen(PORT, () => {
  console.log(`SGOA API rodando em http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
