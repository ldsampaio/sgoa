import 'dotenv/config';
import { execScript, initDatabase, ensureTiposBase } from '../config/database.js';
import { hashPassword } from '../utils/password.js';
import * as UsuarioModel from '../models/usuario.model.js';
import * as ProfessorModel from '../models/professor.model.js';
import * as AlunoModel from '../models/aluno.model.js';
import * as OrientacaoModel from '../models/orientacao.model.js';
import * as TarefaModel from '../models/tarefa.model.js';
import * as ReuniaoModel from '../models/reuniao.model.js';
import * as MensagemModel from '../models/mensagem.model.js';
import * as EnlaceModel from '../models/enlaceOverleaf.model.js';
import { garantirPadroes } from '../models/promptAvaliacao.model.js';

// NUNCA rode em produção: apaga todas as tabelas. Em prod use
// scripts/create-admin.js (bootstrap) — o schema é criado no boot.
if (String(process.env.NODE_ENV ?? '').toLowerCase() === 'production' && !process.env.ALLOW_SEED) {
  console.error('[SEED] recusado: NODE_ENV=production. Use scripts/create-admin.js para bootstrap.');
  process.exit(1);
}

await initDatabase();

await execScript(`
  DELETE FROM notificacoes;
  DELETE FROM recuperacoes_senha;
  DELETE FROM mensagens;
  DELETE FROM enlaces_destacados;
  DELETE FROM enlaces_overleaf;
  DELETE FROM documentos;
  DELETE FROM tarefas;
  DELETE FROM reunioes;
  DELETE FROM co_orientadores;
  DELETE FROM orientacoes;
  DELETE FROM integracoes_google;
  DELETE FROM avaliacoes;
  DELETE FROM prompts_avaliacao;
  DELETE FROM tipos_documento;
  DELETE FROM documentos;
  DELETE FROM alunos;
  DELETE FROM professores;
  DELETE FROM perfis;
  DELETE FROM usuarios;
`);

await ensureTiposBase();

async function criarUsuario({ nome, email, senha, tipo, matricula, departamento, curso, programaPos, dataMatricula }) {
  const user = await UsuarioModel.create({
    nome,
    email,
    senhaHash: hashPassword(senha),
    tipoUsuario: tipo,
  });
  if (tipo === 'Professor') {
    return { user, professor: await ProfessorModel.create({ idUsuario: user.id_usuario, matricula, departamento }) };
  }
  if (tipo === 'Aluno') {
    return {
      user,
      aluno: await AlunoModel.create({ idUsuario: user.id_usuario, matricula, curso, programaPos, dataMatricula }),
    };
  }
  return { user };
}

const emAndamento = 'Em Andamento';
const hoje = new Date();

function iso(dias) {
  const d = new Date(hoje);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const admin = await criarUsuario({
  nome: 'Administrador do Sistema',
  email: 'admin@sgoa.dev',
  senha: 'Admin@123',
  tipo: 'Administrador',
});

const carlos = await criarUsuario({
  nome: 'Prof. Carlos Almeida',
  email: 'carlos@sgoa.dev',
  senha: 'Prof@1234',
  tipo: 'Professor',
  matricula: 'P1001',
  departamento: 'Ciência da Computação',
});

const maria = await criarUsuario({
  nome: 'Prof. Maria Silva',
  email: 'maria@sgoa.dev',
  senha: 'Prof@1234',
  tipo: 'Professor',
  matricula: 'P1002',
  departamento: 'Educação',
});

const silvia = await criarUsuario({
  nome: 'Dra. Silvia Nogueira',
  email: 'silvia@sgoa.dev',
  senha: 'Coord@1234',
  tipo: 'Coordenador',
});

const joao = await criarUsuario({
  nome: 'João Silva',
  email: 'joao@sgoa.dev',
  senha: 'Aluno@1234',
  tipo: 'Aluno',
  matricula: 'A2001',
  curso: 'Ciência da Computação',
  dataMatricula: '2024-03-15',
});

const ana = await criarUsuario({
  nome: 'Ana Paula',
  email: 'ana@sgoa.dev',
  senha: 'Aluno@1234',
  tipo: 'Aluno',
  matricula: 'A2002',
  curso: 'Pós-graduação em Educação',
  programaPos: 'Mestrado em Educação',
  dataMatricula: '2024-08-01',
});

const pedro = await criarUsuario({
  nome: 'Pedro Costa',
  email: 'pedro@sgoa.dev',
  senha: 'Aluno@1234',
  tipo: 'Aluno',
  matricula: 'A2003',
  curso: 'Pós-graduação em Ciência da Computação',
  programaPos: 'Doutorado em Ciência da Computação',
  dataMatricula: '2023-03-01',
});

const oriJoao = await OrientacaoModel.create({
  idOrientador: carlos.professor.id_professor,
  idAluno: joao.aluno.id_aluno,
  tipo: 'TCC',
  titulo: 'Análise de dados educacionais com aprendizado de máquina',
  status: emAndamento,
  dataInicio: iso(-30),
  dataPrevisaoFim: iso(120),
});

const oriAna = await OrientacaoModel.create({
  idOrientador: carlos.professor.id_professor,
  idAluno: ana.aluno.id_aluno,
  tipo: 'Mestrado',
  titulo: 'Impacto da IA na Educação Superior',
  status: emAndamento,
  dataInicio: iso(-90),
  dataPrevisaoFim: iso(60),
});
await OrientacaoModel.addCoOrientador(oriAna.id_orientacao, maria.professor.id_professor);

const oriPedro = await OrientacaoModel.create({
  idOrientador: carlos.professor.id_professor,
  idAluno: pedro.aluno.id_aluno,
  tipo: 'Doutorado',
  titulo: 'Modelagem de sistemas sociotécnicos complexos',
  status: emAndamento,
  dataInicio: iso(-200),
  dataPrevisaoFim: iso(90),
});

await TarefaModel.create({
  idOrientacao: oriAna.id_orientacao,
  idResponsavel: ana.user.id_usuario,
  idCriador: carlos.user.id_usuario,
  titulo: 'Revisar capítulo 3',
  descricao: 'Revisar o capítulo 3 da dissertação e enviar os comentários ao orientador.',
  prioridade: 'Alta',
  cor: 'amarelo',
  dataLimite: iso(3),
});
const tarefaRef = await TarefaModel.create({
  idOrientacao: oriAna.id_orientacao,
  idResponsavel: ana.user.id_usuario,
  idCriador: carlos.user.id_usuario,
  titulo: 'Pesquisar referências',
  descricao: 'Levantar referências atualizadas sobre IA na educação superior.',
  prioridade: 'Média',
  cor: 'azul',
  dataLimite: iso(-7),
});
await TarefaModel.updateStatus(tarefaRef.id_tarefa, 'Concluída');
await TarefaModel.create({
  idOrientacao: oriAna.id_orientacao,
  idResponsavel: ana.user.id_usuario,
  idCriador: carlos.user.id_usuario,
  titulo: 'Preparar apresentação para banca',
  descricao: 'Montar os slides da defesa e revisar o roteiro de apresentação.',
  prioridade: 'Alta',
  cor: 'lilas',
  status: 'Em Andamento',
  dataLimite: iso(45),
});
await TarefaModel.create({
  idOrientacao: oriAna.id_orientacao,
  idResponsavel: ana.user.id_usuario,
  idCriador: carlos.user.id_usuario,
  titulo: 'Escrever seção de metodologia',
  descricao: 'Detalhar o método de coleta e análise dos dados da pesquisa.',
  prioridade: 'Média',
  cor: 'menta',
  status: 'Em Andamento',
  dataLimite: iso(20),
});
await TarefaModel.create({
  idOrientacao: oriAna.id_orientacao,
  idResponsavel: ana.user.id_usuario,
  idCriador: carlos.user.id_usuario,
  titulo: 'Revisar formatação ABNT',
  descricao: 'Conferir citações, referências e formatação geral do documento.',
  prioridade: 'Baixa',
  cor: 'neutro',
  dataLimite: iso(60),
});
await TarefaModel.create({
  idOrientacao: oriJoao.id_orientacao,
  idResponsavel: joao.user.id_usuario,
  idCriador: carlos.user.id_usuario,
  titulo: 'Pesquisar referências do TCC',
  descricao: 'Selecionar artigos sobre aprendizado de máquina aplicado à educação.',
  prioridade: 'Alta',
  cor: 'menta',
  dataLimite: iso(5),
});
await TarefaModel.create({
  idOrientacao: oriJoao.id_orientacao,
  idResponsavel: joao.user.id_usuario,
  idCriador: carlos.user.id_usuario,
  titulo: 'Definir cronograma',
  descricao: 'Organizar as etapas restantes do TCC até a entrega final.',
  prioridade: 'Média',
  cor: 'amarelo',
  dataLimite: iso(15),
});
await TarefaModel.create({
  idOrientacao: oriPedro.id_orientacao,
  idResponsavel: pedro.user.id_usuario,
  idCriador: carlos.user.id_usuario,
  titulo: 'Entregar capítulo de revisão de literatura',
  descricao: 'Enviar a versão revisada do capítulo 2 para avaliação.',
  prioridade: 'Média',
  cor: 'neutro',
  dataLimite: iso(10),
});

await ReuniaoModel.create({
  idOrientacao: oriAna.id_orientacao,
  dataHora: iso(7) + 'T10:00:00',
  pauta: 'Revisão do capítulo de metodologia e próximos passos da escrita',
  decisoes: 'Ana deve enviar o capítulo 3 até a próxima sexta-feira.',
  participantes: [carlos.user.id_usuario, ana.user.id_usuario, maria.user.id_usuario],
});

// Enlaces Overleaf (RF.OV) — o aluno registra o link do projeto institucional.
const enlaceDissertacao = await EnlaceModel.create({
  idOrientacao: oriAna.id_orientacao,
  idCriador: ana.user.id_usuario,
  categoria: 'Dissertação',
  url: 'https://overleaf.utfpr.edu.br/project/demo-dissertacao-ana',
  observacao: 'Capítulos 1 a 3 em revisão.',
});
await EnlaceModel.create({
  idOrientacao: oriAna.id_orientacao,
  idCriador: ana.user.id_usuario,
  categoria: 'Projeto de Mestrado',
  url: 'https://overleaf.utfpr.edu.br/read/demo-projeto-mestrado-ana',
  status: 'Encerrado',
});
await EnlaceModel.create({
  idOrientacao: oriJoao.id_orientacao,
  idCriador: joao.user.id_usuario,
  categoria: 'TCC1',
  url: 'https://overleaf.utfpr.edu.br/project/demo-tcc1-joao',
});
// Destaque é por usuário: fixar para o professor não muda a lista da aluna.
await EnlaceModel.alternarDestaque(enlaceDissertacao.id_enlace, carlos.user.id_usuario);

await MensagemModel.create({
  idOrientacao: oriAna.id_orientacao,
  idRemetente: ana.user.id_usuario,
  conteudo: 'Professor, enviei o capítulo 2 para revisão. Aguardando feedback.',
});
await MensagemModel.create({
  idOrientacao: oriAna.id_orientacao,
  idRemetente: carlos.user.id_usuario,
  conteudo: 'Perfeito Ana, vou revisar até o final da semana.',
});

// Prompts-padrão de avaliação IA para cada professor.
await garantirPadroes(carlos.professor.id_professor);
await garantirPadroes(maria.professor.id_professor);

console.log('Seed concluído com sucesso.');
console.log('Acessos de exemplo:');
for (const [nome, email, senha] of [
  ['Administrador', 'admin@sgoa.dev', 'Admin@123'],
  ['Professor Carlos', 'carlos@sgoa.dev', 'Prof@1234'],
  ['Coordenadora Silvia', 'silvia@sgoa.dev', 'Coord@1234'],
  ['Aluna Ana Paula', 'ana@sgoa.dev', 'Aluno@1234'],
  ['Aluno João Silva', 'joao@sgoa.dev', 'Aluno@1234'],
]) {
  console.log(`  ${nome.padEnd(20)} ${email.padEnd(22)} ${senha}`);
}