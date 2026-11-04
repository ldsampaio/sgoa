import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { me } from '../controllers/auth.controller.js';

const router = Router();

// Só leitura de sessão. Login e recuperação de senha não existem no sgoa:
// a autenticação é do saga.
router.get('/me', authenticate, me);

export default router;
