import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as integracaoGoogle from '../controllers/integracaoGoogle.controller.js';

const router = Router();

// Callback precisa ser público: o Google chama sem o JWT do SGOA (autenticado via `state`).
router.get('/callback', integracaoGoogle.callback);

router.use(authenticate);
router.get('/auth-url', integracaoGoogle.authUrl);
router.get('/status', integracaoGoogle.status);
router.delete('/', integracaoGoogle.disconnect);

export default router;
