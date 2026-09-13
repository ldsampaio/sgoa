import 'dotenv/config';
import { db, initDatabase, now } from '../config/database.js';
import { hashPassword } from '../utils/password.js';
import * as UsuarioModel from '../models/usuario.model.js';
import * as ProfessorModel from '../models/professor.model.js';
import * as AlunoModel from '../models/aluno.model.js';
import * as OrientacaoModel from '../models/orientacao.model.js';
import * as TarefaModel from '../models/tarefa.model.js';
import * as ReuniaoModel from '../models/reuniao.model.js';
import * as MensagemModel from '../models/mensagem.model.js';

initDatabase();

db.exec(`
  DELETE FROM notificacoes;
  DELETE FROM mensagens;
  DELETE FROM documentos;
  DELETE FROM tarefas;
  DELETE FROM reunioes;
  DELETE FROM co_orientadores;
  DELETE FROM orientacoes;
  DELETE FROM integracoes_google;
  DELETE FROM alunos;
  DELETE FROM professores;
  DELETE FROM perfis;
  DELETE FROM usuarios;
`);

async function criarUsuario({ nome, email, senha, tipo, matricula, departamento, curso, programaPos }) {
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
    return { user, aluno: await AlunoModel.create({ idUsuario: user.id_usuario, matricula, curso, programaPos }) };
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
});

const ana = await criarUsuario({
  nome: 'Ana Paula',
  email: 'ana@sgoa.dev',
  senha: 'Aluno@1234',
  tipo: 'Aluno',
  matricula: 'A2002',
  curso: 'Pós-graduação em Educação',
  programaPos: 'Mestrado em Educação',
});

const pedro = await criarUsuario({
  nome: 'Pedro Costa',
  email: 'pedro@sgoa.dev',
  senha: 'Aluno@1234',
  tipo: 'Aluno',
  matricula: 'A2003',
  curso: 'Pós-graduação em Ciência da Computação',
  programaPos: 'Doutorado em Ciência da Computação',
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
  descricao: 'Revisar Capítulo 3',
  dataLimite: iso(3),
});
const tarefaRef = await TarefaModel.create({
  idOrientacao: oriAna.id_orientacao,
  idResponsavel: ana.user.id_usuario,
  descricao: 'Pesquisar referências',
  dataLimite: iso(-7),
});
await TarefaModel.updateStatus(tarefaRef.id_tarefa, 'Concluída');
await TarefaModel.create({
  idOrientacao: oriAna.id_orientacao,
  idResponsavel: ana.user.id_usuario,
  descricao: 'Preparar apresentação para banca',
  dataLimite: iso(45),
});
await TarefaModel.create({
  idOrientacao: oriJoao.id_orientacao,
  idResponsavel: joao.user.id_usuario,
  descricao: 'Pesquisar referências do TCC',
  dataLimite: iso(5),
});
await TarefaModel.create({
  idOrientacao: oriPedro.id_orientacao,
  idResponsavel: pedro.user.id_usuario,
  descricao: 'Entregar capítulo de revisão de literatura',
  dataLimite: iso(10),
});

await ReuniaoModel.create({
  idOrientacao: oriAna.id_orientacao,
  dataHora: iso(7) + 'T10:00:00',
  pauta: 'Revisão do capítulo de metodologia e próximos passos da escrita',
  decisoes: 'Ana deve enviar o capítulo 3 até a próxima sexta-feira.',
  participantes: [carlos.user.id_usuario, ana.user.id_usuario, maria.user.id_usuario],
});

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