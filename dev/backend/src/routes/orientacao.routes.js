import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  list,
  detail,
  create,
  update,
  addCoOrientador,
  removeCoOrientador,
} from '../controllers/orientacao.controller.js';
import * as tarefa from '../controllers/tarefa.controller.js';
import * as reuniao from '../controllers/reuniao.controller.js';
import * as documento from '../controllers/documento.controller.js';
import * as mensagem from '../controllers/mensagem.controller.js';
import * as avaliacao from '../controllers/avaliacao.controller.js';
import { timeline } from '../controllers/atividade.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', list);
router.post('/', create);
router.get('/:id', detail);
router.put('/:id', update);
router.post('/:id/coorientadores', addCoOrientador);
router.delete('/:id/coorientadores/:id_professor', removeCoOrientador);

router.get('/:id/atividades', timeline);

router.get('/:id/tarefas', tarefa.listByOrientacao);
router.post('/:id/tarefas', tarefa.create);

router.get('/:id/reunioes', reuniao.listByOrientacao);
router.post('/:id/reunioes', reuniao.create);
router.delete('/:id/reunioes/:idReuniao', reuniao.remove);

router.get('/:id/documentos', documento.listByOrientacao);
router.post('/:id/documentos', documento.upload.single('arquivo'), documento.uploadDocumento);

router.get('/:id/mensagens', mensagem.listByOrientacao);
router.post('/:id/mensagens', mensagem.create);

router.get('/:id/avaliacoes', avaliacao.listByOrientacao);

export default router;