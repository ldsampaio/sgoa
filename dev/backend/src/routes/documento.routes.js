import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { download } from '../controllers/documento.controller.js';

const router = Router();

router.use(authenticate);

router.get('/:id/download', download);

export default router;