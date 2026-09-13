import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import * as tipos from '../controllers/tipoDocumento.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', tipos.listar);
router.post('/', authorize('Coordenador', 'Administrador'), tipos.criar);
router.put('/:id', authorize('Coordenador', 'Administrador'), tipos.atualizar);
router.patch('/:id/ativo', authorize('Coordenador', 'Administrador'), tipos.alternarAtivo);
router.delete('/:id', authorize('Coordenador', 'Administrador'), tipos.remover);

export default router;
