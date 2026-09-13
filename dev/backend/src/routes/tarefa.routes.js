import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { updateStatus } from '../controllers/tarefa.controller.js';

const router = Router();

router.use(authenticate);

router.put('/:id', updateStatus);

export default router;