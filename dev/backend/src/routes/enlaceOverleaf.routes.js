import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listarCategorias,
  listarMeus,
  detalhe,
  atualizar,
  remover,
  destacar,
} from '../controllers/enlaceOverleaf.controller.js';

const router = Router();

router.use(authenticate);

router.get('/categorias', listarCategorias);
router.get('/me', listarMeus);
router.get('/:id', detalhe);
router.put('/:id', atualizar);
router.delete('/:id', remover);
router.patch('/:id/destacar', destacar);

export default router;
