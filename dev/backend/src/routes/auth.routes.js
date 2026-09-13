import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { esqueciSenha, login, me, redefinirSenha, verificarCodigo } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/esqueci-senha', esqueciSenha);
router.post('/verificar-codigo', verificarCodigo);
router.post('/redefinir-senha', redefinirSenha);

export default router;