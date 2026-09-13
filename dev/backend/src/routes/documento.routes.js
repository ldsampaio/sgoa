import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { agentOuAuth } from '../middleware/agentAuth.js';
import { download } from '../controllers/documento.controller.js';
import { getByDocumento } from '../controllers/avaliacao.controller.js';

const router = Router();

// Download permite o token de serviço do agente de IA (sem JWT de usuário).
router.get('/:id/download', agentOuAuth, download);

router.use(authenticate);

router.get('/:id/avaliacao', getByDocumento);

export default router;