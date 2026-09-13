import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { list, update } from '../controllers/parametros.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', list);
router.put('/:nivel', authorize('Coordenador'), update);

export default router;
