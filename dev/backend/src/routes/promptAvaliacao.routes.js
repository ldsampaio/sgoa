import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as prompts from '../controllers/promptAvaliacao.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', prompts.listar);
router.put('/:idTipo', prompts.atualizar);

export default router;
