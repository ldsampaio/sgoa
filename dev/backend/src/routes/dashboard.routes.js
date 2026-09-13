import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  dashboardProfessor,
  dashboardAluno,
  dashboardCoordenador,
} from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authenticate);

router.get('/professor', authorize('Professor', 'Administrador'), dashboardProfessor);
router.get('/aluno', authorize('Aluno', 'Administrador'), dashboardAluno);
router.get('/coordenador', authorize('Coordenador', 'Administrador'), dashboardCoordenador);

export default router;