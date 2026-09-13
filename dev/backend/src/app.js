import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { initDatabase } from './config/database.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  initDatabase();

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

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}