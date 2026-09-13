import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDatabase } from './config/database.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function createApp() {
  await initDatabase();

  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', servico: 'SGOA API' }));

  app.use('/api', routes);

  // Container único (produção): serve o frontend buildado na mesma origem.
  // Dev continua com Vite na 5173. FRONTEND_DIST aponta para o dist do build.
  if (String(process.env.SERVE_FRONTEND ?? 'false').toLowerCase() === 'true') {
    const distDir = resolve(process.env.FRONTEND_DIST || `${__dirname}/../public`);
    if (existsSync(distDir)) {
      app.use(express.static(distDir));
      // Fallback SPA: qualquer rota não-/api entrega o index.html.
      app.use((req, res, next) => {
        if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
        if (!req.accepts('html')) return next();
        return res.sendFile(resolve(distDir, 'index.html'));
      });
    } else {
      console.warn(`[APP] SERVE_FRONTEND=true mas dist não encontrado em ${distDir}`);
    }
  }

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}
