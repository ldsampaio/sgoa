import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMinha, salvarMinha, testarMinha, removerMinha } from '../controllers/emailIntegracao.controller.js';

const router = Router();

router.use(authenticate);

// Cada usuário gerencia a própria integração (professor: SMTP institucional).
router.get('/minha', getMinha);
router.post('/minha', salvarMinha);
router.post('/minha/testar', testarMinha);
router.delete('/minha', removerMinha);

export default router;
