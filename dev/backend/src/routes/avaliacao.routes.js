import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as avaliacao from '../controllers/avaliacao.controller.js';

const router = Router();

router.use(authenticate);

router.post('/:id/reenviar', avaliacao.reenviar);

export default router;
