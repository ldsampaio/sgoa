import { asyncHandler } from '../middleware/errorHandler.js';
import * as TipoModel from '../models/tipoDocumento.model.js';
import { garantirParaProfessor } from '../models/promptAvaliacao.model.js';
import { all } from '../utils/query.js';

export const listar = asyncHandler(async (req, res) => {
  const incluirInativos =
    req.query.todos === '1' && ['Coordenador', 'Administrador'].includes(req.user.tipo_usuario);
  return res.json(TipoModel.listAtivos(incluirInativos));
});

export const criar = asyncHandler(async (req, res) => {
  const { nome, descricao, prompt_padrao } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Nome do tipo é obrigatório.' });
  if (!prompt_padrao || String(prompt_padrao).trim().length < 50) {
    return res.status(400).json({ erro: 'O prompt-padrão deve ter ao menos 50 caracteres.' });
  }
  if (TipoModel.findByNome(nome.trim())) {
    return res.status(409).json({ erro: 'Já existe um tipo com este nome.' });
  }
  const tipo = TipoModel.create({ nome, descricao, promptPadrao: prompt_padrao });
  // Todos os professores herdam o padrão (sem sobrescrever customs).
  const professores = all('SELECT id_professor FROM professores');
  for (const p of professores) garantirParaProfessor(p.id_professor, [{ id_tipo: tipo.id_tipo }]);
  return res.status(201).json(tipo);
});

export const atualizar = asyncHandler(async (req, res) => {
  const atual = TipoModel.findById(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Tipo não encontrado.' });
  const { nome, descricao, prompt_padrao } = req.body;
  if (nome?.trim() && nome.trim() !== atual.nome && TipoModel.findByNome(nome.trim())) {
    return res.status(409).json({ erro: 'Já existe um tipo com este nome.' });
  }
  if (prompt_padrao !== undefined && String(prompt_padrao).trim().length < 50) {
    return res.status(400).json({ erro: 'O prompt-padrão deve ter ao menos 50 caracteres.' });
  }
  return res.json(TipoModel.update(req.params.id, { nome, descricao, promptPadrao: prompt_padrao }));
});

export const alternarAtivo = asyncHandler(async (req, res) => {
  const atual = TipoModel.findById(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Tipo não encontrado.' });
  return res.json(TipoModel.setAtivo(req.params.id, !atual.ativo));
});

export const remover = asyncHandler(async (req, res) => {
  const atual = TipoModel.findById(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Tipo não encontrado.' });
  if (TipoModel.emUso(req.params.id)) {
    return res.status(409).json({ erro: 'Tipo em uso por documentos/avaliações. Desative em vez de excluir.' });
  }
  TipoModel.remove(req.params.id);
  return res.status(204).end();
});
