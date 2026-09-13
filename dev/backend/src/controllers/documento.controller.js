import path from 'node:path';
import multer from 'multer';
import 'dotenv/config';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAcesso } from '../services/acesso.service.js';
import * as DocumentoModel from '../models/documento.model.js';
import * as AvaliacaoModel from '../models/avaliacao.model.js';
import * as OrientacaoModel from '../models/orientacao.model.js';
import { resolverPrompt } from '../models/promptAvaliacao.model.js';
import { findById as findProfessorById } from '../models/professor.model.js';
import { findById as findTipoById, findByNome as findTipoByNome } from '../models/tipoDocumento.model.js';
import { montarPedido, publicarPedidoAvaliacao } from '../services/filaAvaliacao.service.js';
import { isAgentToken } from '../middleware/agentAuth.js';
import { notificarParticipantes } from '../services/notificacao.service.js';
import { uuid } from '../utils/id.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DocumentoModel.storagePath(process.env.UPLOAD_DIR)),
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});

export const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE) || 50 * 1024 * 1024 },
});

export const listByOrientacao = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;
  return res.json(await DocumentoModel.listByOrientacao(id));
});

export const uploadDocumento = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;

  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhum arquivo enviado. Envie um arquivo no campo "arquivo".' });
  }

  const { descricao, id_tipo } = req.body;
  const original = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const ext = path.extname(original);
  const base = original.slice(0, original.length - ext.length);

  // Categoria do documento (dropdown no upload). Valida se informada.
  let tipoDoc = null;
  if (id_tipo) {
    tipoDoc = await findTipoById(String(id_tipo));
    if (!tipoDoc) return res.status(400).json({ erro: 'Categoria de documento inválida.' });
    if (!tipoDoc.ativo) return res.status(400).json({ erro: 'Categoria de documento desativada.' });
  }

  const versao = await DocumentoModel.nextVersion(id, base);
  const nomeExibicao = versao > 1 ? `${base} (v${versao})${ext}` : original;

  const doc = await DocumentoModel.create({
    idOrientacao: id,
    idUploader: req.user.id_usuario,
    idTipoDocumento: tipoDoc?.id_tipo || null,
    nomeArquivo: nomeExibicao,
    tipoArquivo: ext.replace('.', '') || 'bin',
    caminho: req.file.path,
    descricao,
    versao,
  });

  await notificarParticipantes(
    id,
    'documento',
    'Novo documento enviado',
    `${req.user.nome} enviou "${nomeExibicao}" (v${versao}).`,
    req.user.id_usuario,
  );

  // Submissão de aluno → cria avaliação por IA (fila Kafka). Upload de professor = apoio, sem avaliação.
  // Categoria: escolhida no upload; fallback = tipo da orientação (TCC/Mestrado/Doutorado).
  let avaliacao = null;
  if (req.user.tipo_usuario === 'Aluno') {
    try {
      const orientacao = await OrientacaoModel.findById(id);
      const categoria = tipoDoc || (orientacao?.tipo ? await findTipoByNome(orientacao.tipo) : null);
      if (categoria && !categoria.ativo) {
        console.error('[AVALIAÇÃO] categoria desativada, avaliação não criada.');
      } else {
        const professor = orientacao?.orientador?.id_professor
          ? await findProfessorById(orientacao.orientador.id_professor)
          : null;
        const prompt = professor && categoria ? await resolverPrompt(professor.id_professor, categoria.id_tipo) : null;
        if (professor && categoria && prompt) {
          avaliacao = await AvaliacaoModel.create({
            idDocumento: doc.id_documento,
            idOrientacao: id,
            idProfessor: professor.id_professor,
            idTipo: categoria.id_tipo,
            tipo: categoria.nome,
            promptUsado: prompt,
          });
          const pedido = montarPedido({
            avaliacao,
            documento: doc,
            orientacao,
            alunoNome: orientacao?.aluno?.nome,
            professorNome: orientacao?.orientador?.nome,
          });
          const { publicado, erro } = await publicarPedidoAvaliacao(pedido);
          if (!publicado && erro) {
            await AvaliacaoModel.falhar(avaliacao.id_avaliacao, erro);
            avaliacao = await AvaliacaoModel.findById(avaliacao.id_avaliacao);
          }
        }
      }
    } catch (err) {
      console.error('[AVALIAÇÃO] falha ao enfileirar:', err.message);
    }
  }

  return res.status(201).json({ ...doc, avaliacao });
});

export const download = asyncHandler(async (req, res) => {
  const doc = await DocumentoModel.findById(req.params.id);
  if (!doc) return res.status(404).json({ erro: 'Documento não encontrado.' });
  // Agente de IA externo (token de serviço, sem vínculo a orientação).
  if (!isAgentToken(req) && !(await requireAcesso(req, res, doc.id_orientacao))) return;
  return res.download(DocumentoModel.resolverCaminhoArmazenamento(doc.caminho_armazenamento), doc.nome_arquivo);
});