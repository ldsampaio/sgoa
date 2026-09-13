import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  verificar,
  marcarEtapas,
  getConfig,
  updateConfig,
  listarEnvios,
} from '../controllers/lembretes.controller.js';

const router = Router();

router.use(authenticate);

// Disparo manual (testes/diagnóstico). O ciclo é idempotente.
router.post('/verificar', authorize('Professor', 'Coordenador', 'Administrador'), verificar);

// Etapas e configuração por orientação (qualquer papel autenticado lê;
// escrita restrita no controller: orientador/Coordenador/Administrador).
router.get('/orientacoes/:id/config', getConfig);
router.put('/orientacoes/:id/config', updateConfig);
router.put('/orientacoes/:id/etapas', marcarEtapas);
router.get('/orientacoes/:id/envios', listarEnvios);

export default router;
