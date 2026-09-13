import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usuarioRoutes from './usuario.routes.js';
import orientacaoRoutes from './orientacao.routes.js';
import tarefaRoutes from './tarefa.routes.js';
import documentoRoutes from './documento.routes.js';
import notificacaoRoutes from './notificacao.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import integracaoGoogleRoutes from './integracaoGoogle.routes.js';
import promptAvaliacaoRoutes from './promptAvaliacao.routes.js';
import avaliacaoRoutes from './avaliacao.routes.js';
import tipoDocumentoRoutes from './tipoDocumento.routes.js';
import parametrosRoutes from './parametros.routes.js';
import lembretesRoutes from './lembretes.routes.js';
import emailIntegracaoRoutes from './emailIntegracao.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/orientacoes', orientacaoRoutes);
router.use('/tarefas', tarefaRoutes);
router.use('/documentos', documentoRoutes);
router.use('/notificacoes', notificacaoRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/integracoes/google', integracaoGoogleRoutes);
router.use('/prompts-avaliacao', promptAvaliacaoRoutes);
router.use('/avaliacoes', avaliacaoRoutes);
router.use('/tipos-documento', tipoDocumentoRoutes);
router.use('/parametros-prazos', parametrosRoutes);
router.use('/lembretes', lembretesRoutes);
router.use('/email-integracao', emailIntegracaoRoutes);

export default router;