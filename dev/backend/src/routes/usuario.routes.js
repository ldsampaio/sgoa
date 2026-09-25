import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  createUsuario,
  listUsuarios,
  updateMe,
  updateUsuario,
  listProfessores,
  listAlunos,
} from '../controllers/usuario.controller.js';

const router = Router();

router.use(authenticate);

router.get('/professores', listProfessores);
router.get('/alunos', listAlunos);
router.put('/me', updateMe);

router.get('/', authorize('Administrador', 'Coordenador'), listUsuarios);
router.post('/', authorize('Administrador', 'Coordenador', 'Professor'), createUsuario);
// Professor edita apenas dados acadêmicos dos alunos que orienta (validado no controller).
router.put('/:id', authorize('Coordenador', 'Administrador', 'Professor'), updateUsuario);

export default router;