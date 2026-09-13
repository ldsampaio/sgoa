import { all } from '../utils/query.js';

export async function timeline(idOrientacao) {
  const reunioes = await all(
    `SELECT r.data_cadastro AS quando, 'Reunião' AS tipo, r.pauta AS titulo,
            r.decisoes_proximos_passos AS descricao, NULL AS autor
     FROM reunioes r WHERE r.id_orientacao = ?`,
    [idOrientacao],
  );
  const tarefas = await all(
    `SELECT t.data_cadastro AS quando, 'Tarefa' AS tipo, t.descricao AS titulo,
            t.status AS descricao, u.nome AS autor
     FROM tarefas t JOIN usuarios u ON u.id_usuario = t.id_responsavel
     WHERE t.id_orientacao = ?`,
    [idOrientacao],
  );
  const documentos = await all(
    `SELECT d.data_upload AS quando, 'Documento' AS tipo, d.nome_arquivo AS titulo,
            d.descricao AS descricao, u.nome AS autor
     FROM documentos d JOIN usuarios u ON u.id_usuario = d.id_uploader
     WHERE d.id_orientacao = ?`,
    [idOrientacao],
  );
  const mensagens = await all(
    `SELECT m.data_envio AS quando, 'Mensagem' AS tipo, m.conteudo AS titulo,
            NULL AS descricao, u.nome AS autor
     FROM mensagens m JOIN usuarios u ON u.id_usuario = m.id_remetente
     WHERE m.id_orientacao = ?`,
    [idOrientacao],
  );
  const atividades = [...reunioes, ...tarefas, ...documentos, ...mensagens];
  return atividades.sort((a, b) => new Date(b.quando) - new Date(a.quando));
}