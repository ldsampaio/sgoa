import 'dotenv/config';
import { execScript, initDatabase, ensureTiposBase } from '../config/database.js';
import { run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import * as ProfessorModel from '../models/professor.model.js';
import * as AlunoModel from '../models/aluno.model.js';
import * as OrientacaoModel from '../models/orientacao.model.js';
import * as TarefaModel from '../models/tarefa.model.js';
import * as ReuniaoModel from '../models/reuniao.model.js';
import * as MensagemModel from '../models/mensagem.model.js';
import * as EnlaceModel from '../models/enlaceOverleaf.model.js';
import { garantirPadroes } from '../models/promptAvaliacao.model.js';

// NUNCA rode em produção: apaga todas as tabelas. Em prod o seed não existe —
// o cadastro de usuário é do saga (schema `auth`), e o sgoa não tem senha.
// Regra de propriedade: o seed INSERTA linhas em `auth`, nunca cria nem altera
// tabela desse schema.
if (String(process.env.NODE_ENV ?? '').toLowerCase() === 'production' && !process.env.ALLOW_SEED) {
  console.error('[SEED] recusado: NODE_ENV=production. O cadastro de usuário é do saga.');
  process.exit(1);
}

await initDatabase();

await execScript(`
  DELETE FROM sgoa.notificacoes;
  DELETE FROM sgoa.mensagens;
  DELETE FROM sgoa.enlaces_destacados;
  DELETE FROM sgoa.enlaces_overleaf;
  DELETE FROM sgoa.documentos;
  DELETE FROM sgoa.tarefas;
  DELETE FROM sgoa.reunioes;
  DELETE FROM sgoa.co_orientadores;
  DELETE FROM sgoa.orientacoes;
  DELETE FROM sgoa.integracoes_google;
  DELETE FROM sgoa.avaliacoes;
  DELETE FROM sgoa.prompts_avaliacao;
  DELETE FROM sgoa.tipos_documento;
  DELETE FROM sgoa.alunos;
  DELETE FROM sgoa.professores;
  DELETE FROM sgoa.perfis;
  DELETE FROM auth.user_profiles;
  DELETE FROM auth.users;
`);

await ensureTiposBase();

// Sem senha: o sgoa não autentica credencial. Login explícito por usuário
// (o saga infere ALUNO por ^a\d+$; os demais papéis vêm de sgoa.perfis).
async function criarUsuario({ login, name, email, roleBase, papel, matricula, departamento, curso, programaPos, dataMatricula }) {
  const id = uuid();
  await run(
    `INSERT INTO auth.users (id, login, name, email, role_base, profile_complete)
     VALUES (?, ?, ?, ?, ?, true)`,
    [id, login, name, email, roleBase],
  );
  await run(
    `INSERT INTO auth.user_profiles (user_id, matricula, curso, programa_pos, departamento, data_matricula)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, matricula ?? null, curso ?? null, programaPos ?? null, departamento ?? null, dataMatricula ?? null],
  );
  await run('INSERT INTO sgoa.perfis (id_perfil, id_usuario, papel) VALUES (?, ?, ?)', [uuid(), id, papel]);

  const user = { id, login, name, email, role_base: roleBase, papel };

  if (papel === 'Professor') return { user, professor: await ProfessorModel.criar({ idUsuario: id }) };
  if (papel === 'Aluno') return { user, aluno: await AlunoModel.criar({ idUsuario: id }) };
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
  login: 'adm001',
  name: 'Administrador do Sistema',
  email: 'admin@sgoa.dev',
  roleBase: 'UNDEFINIDO',
  papel: 'Administrador',
});

const carlos = await criarUsuario({
  login: 'p1001',
  name: 'Prof. Carlos Almeida',
  email: 'carlos@sgoa.dev',
  roleBase: 'PROFESSOR',
  papel: 'Professor',
  matricula: 'P1001',
  departamento: 'Ciência da Computação',
});

const maria = await criarUsuario({
  login: 'p1002',
  name: 'Prof. Maria Silva',
  email: 'maria@sgoa.dev',
  roleBase: 'PROFESSOR',
  papel: 'Professor',
  matricula: 'P1002',
  departamento: 'Educação',
});

const silvia = await criarUsuario({
  login: 'c1001',
  name: 'Dra. Silvia Nogueira',
  email: 'silvia@sgoa.dev',
  roleBase: 'UNDEFINIDO',
  papel: 'Coordenador',
});

const joao = await criarUsuario({
  login: 'a234561',
  name: 'João Silva',
  email: 'joao@sgoa.dev',
  roleBase: 'ALUNO',
  papel: 'Aluno',
  matricula: 'A2001',
  curso: 'Ciência da Computação',
  dataMatricula: '2024-03-15',
});

const ana = await criarUsuario({
  login: 'a234562',
  name: 'Ana Paula',
  email: 'ana@sgoa.dev',
  roleBase: 'ALUNO',
  papel: 'Aluno',
  matricula: 'A2002',
  curso: 'Pós-graduação em Educação',
  programaPos: 'Mestrado em Educação',
  dataMatricula: '2024-08-01',
});

const pedro = await criarUsuario({
  login: 'a234563',
  name: 'Pedro Costa',
  email: 'pedro@sgoa.dev',
  roleBase: 'ALUNO',
  papel: 'Aluno',
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
  idResponsavel: ana.user.id,
  idCriador: carlos.user.id,
  titulo: 'Revisar capítulo 3',
  descricao: 'Revisar o capítulo 3 da dissertação e enviar os comentários ao orientador.',
  prioridade: 'Alta',
  cor: 'amarelo',
  dataLimite: iso(3),
});
const tarefaRef = await TarefaModel.create({
  idOrientacao: oriAna.id_orientacao,
  idResponsavel: ana.user.id,
  idCriador: carlos.user.id,
  titulo: 'Pesquisar referências',
  descricao: 'Levantar referências atualizadas sobre IA na educação superior.',
  prioridade: 'Média',
  cor: 'azul',
  dataLimite: iso(-7),
});
await TarefaModel.updateStatus(tarefaRef.id_tarefa, 'Concluída');
await TarefaModel.create({
  idOrientacao: oriAna.id_orientacao,
  idResponsavel: ana.user.id,
  idCriador: carlos.user.id,
  titulo: 'Preparar apresentação para banca',
  descricao: 'Montar os slides da defesa e revisar o roteiro de apresentação.',
  prioridade: 'Alta',
  cor: 'lilas',
  status: 'Em Andamento',
  dataLimite: iso(45),
});
await TarefaModel.create({
  idOrientacao: oriAna.id_orientacao,
  idResponsavel: ana.user.id,
  idCriador: carlos.user.id,
  titulo: 'Escrever seção de metodologia',
  descricao: 'Detalhar o método de coleta e análise dos dados da pesquisa.',
  prioridade: 'Média',
  cor: 'menta',
  status: 'Em Andamento',
  dataLimite: iso(20),
});
await TarefaModel.create({
  idOrientacao: oriAna.id_orientacao,
  idResponsavel: ana.user.id,
  idCriador: carlos.user.id,
  titulo: 'Revisar formatação ABNT',
  descricao: 'Conferir citações, referências e formatação geral do documento.',
  prioridade: 'Baixa',
  cor: 'neutro',
  dataLimite: iso(60),
});
await TarefaModel.create({
  idOrientacao: oriJoao.id_orientacao,
  idResponsavel: joao.user.id,
  idCriador: carlos.user.id,
  titulo: 'Pesquisar referências do TCC',
  descricao: 'Selecionar artigos sobre aprendizado de máquina aplicado à educação.',
  prioridade: 'Alta',
  cor: 'menta',
  dataLimite: iso(5),
});
await TarefaModel.create({
  idOrientacao: oriJoao.id_orientacao,
  idResponsavel: joao.user.id,
  idCriador: carlos.user.id,
  titulo: 'Definir cronograma',
  descricao: 'Organizar as etapas restantes do TCC até a entrega final.',
  prioridade: 'Média',
  cor: 'amarelo',
  dataLimite: iso(15),
});
await TarefaModel.create({
  idOrientacao: oriPedro.id_orientacao,
  idResponsavel: pedro.user.id,
  idCriador: carlos.user.id,
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
  participantes: [carlos.user.id, ana.user.id, maria.user.id],
});

// Enlaces Overleaf (RF.OV) — o aluno registra o link do projeto institucional.
const enlaceDissertacao = await EnlaceModel.create({
  idOrientacao: oriAna.id_orientacao,
  idCriador: ana.user.id,
  categoria: 'Dissertação',
  url: 'https://overleaf.utfpr.edu.br/project/demo-dissertacao-ana',
  observacao: 'Capítulos 1 a 3 em revisão.',
});
await EnlaceModel.create({
  idOrientacao: oriAna.id_orientacao,
  idCriador: ana.user.id,
  categoria: 'Projeto de Mestrado',
  url: 'https://overleaf.utfpr.edu.br/read/demo-projeto-mestrado-ana',
  status: 'Encerrado',
});
await EnlaceModel.create({
  idOrientacao: oriJoao.id_orientacao,
  idCriador: joao.user.id,
  categoria: 'TCC1',
  url: 'https://overleaf.utfpr.edu.br/project/demo-tcc1-joao',
});
// Destaque é por usuário: fixar para o professor não muda a lista da aluna.
await EnlaceModel.alternarDestaque(enlaceDissertacao.id_enlace, carlos.user.id);

await MensagemModel.create({
  idOrientacao: oriAna.id_orientacao,
  idRemetente: ana.user.id,
  conteudo: 'Professor, enviei o capítulo 2 para revisão. Aguardando feedback.',
});
await MensagemModel.create({
  idOrientacao: oriAna.id_orientacao,
  idRemetente: carlos.user.id,
  conteudo: 'Perfeito Ana, vou revisar até o final da semana.',
});

// Prompts-padrão de avaliação IA para cada professor.
await garantirPadroes(carlos.professor.id_professor);
await garantirPadroes(maria.professor.id_professor);

console.log('Seed concluído com sucesso.');
console.log('Logins de exemplo (a sessão vem do saga — não há senha no sgoa):');
for (const [nome, login] of [
  ['Administrador', 'adm001'],
  ['Professor Carlos', 'p1001'],
  ['Coordenadora Silvia', 'c1001'],
  ['Aluna Ana Paula', 'a234562'],
  ['Aluno João Silva', 'a234561'],
]) {
  console.log(`  ${nome.padEnd(20)} ${login}`);
}
