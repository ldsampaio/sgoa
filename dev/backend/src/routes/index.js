import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usuarioRoutes from './usuario.routes.js';
import orientacaoRoutes from './orientacao.routes.js';
import tarefaRoutes from './tarefa.routes.js';
import documentoRoutes from './documento.routes.js';
import notificacaoRoutes from './notificacao.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/orientacoes', orientacaoRoutes);
router.use('/tarefas', tarefaRoutes);
router.use('/documentos', documentoRoutes);
router.use('/notificacoes', notificacaoRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;