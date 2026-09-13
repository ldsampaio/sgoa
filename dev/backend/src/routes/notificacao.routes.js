import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { list, markRead, unreadCount } from '../controllers/notificacao.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', list);
router.get('/nao-lidas', unreadCount);
router.put('/:id/lida', markRead);

export default router;