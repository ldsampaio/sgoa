import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { testarEnvio } from '../controllers/email.controller.js';

const router = Router();

router.use(authenticate);

// Conta institucional única: só o administrador pode disparar teste.
router.post('/testar', authorize('Administrador'), testarEnvio);

export default router;
