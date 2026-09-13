import path from 'node:path';
import multer from 'multer';
import 'dotenv/config';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAcesso } from '../services/acesso.service.js';
import * as DocumentoModel from '../models/documento.model.js';
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

  const { descricao } = req.body;
  const original = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const ext = path.extname(original);
  const base = original.slice(0, original.length - ext.length);

  const versao = await DocumentoModel.nextVersion(id, base);
  const nomeExibicao = versao > 1 ? `${base} (v${versao})${ext}` : original;

  const doc = await DocumentoModel.create({
    idOrientacao: id,
    idUploader: req.user.id_usuario,
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

  return res.status(201).json(doc);
});

export const download = asyncHandler(async (req, res) => {
  const doc = await DocumentoModel.findById(req.params.id);
  if (!doc) return res.status(404).json({ erro: 'Documento não encontrado.' });
  if (!(await requireAcesso(req, res, doc.id_orientacao))) return;
  return res.download(doc.caminho_armazenamento, doc.nome_arquivo);
});