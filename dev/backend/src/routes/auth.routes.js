import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { login, me } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, me);

export default router;