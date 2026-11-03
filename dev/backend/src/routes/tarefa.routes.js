import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { update, arquivar } from '../controllers/tarefa.controller.js';

const router = Router();

router.use(authenticate);

router.put('/:id', update);
router.delete('/:id', arquivar);

export default router;
