import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  listUsuarios,
  updateMe,
  updateUsuario,
  listProfessores,
  listAlunos,
} from '../controllers/usuario.controller.js';

const router = Router();

router.use(authenticate);

// O sgoa não cria usuário: o cadastro é do saga. Só leitura + situação da conta.
router.get('/professores', listProfessores);
router.get('/alunos', listAlunos);
router.put('/me', updateMe);

router.get('/', authorize('Administrador', 'Coordenador'), listUsuarios);
router.put('/:id', authorize('Coordenador', 'Administrador'), updateUsuario);

export default router;
