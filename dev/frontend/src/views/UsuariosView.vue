<template>
  <div>
    <div class="cartao">
      <h2>
        {{ ehProfessor ? 'Alunos' : 'Gestão de Usuários' }}
        <button v-if="!mostrarForm" class="botao primario" @click="abrirNovo">+ {{ ehProfessor ? 'Novo Aluno' : 'Novo Usuário' }}</button>
      </h2>

      <AlertMessage :mensagem="erro" tipo="erro" />
      <AlertMessage :mensagem="sucesso" tipo="sucesso" />

      <form v-if="mostrarForm" class="grid-2" @submit.prevent="criar">
        <div class="campo">
          <label for="nome">Nome</label>
          <input id="nome" v-model="form.nome" type="text" :disabled="ehProfessor && !!editandoId" required />
        </div>
        <div class="campo">
          <label for="email">E-mail institucional</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            placeholder="nome@utfpr.edu.br"
            :disabled="ehProfessor && !!editandoId"
          />
        </div>
        <div class="campo">
          <label for="senha">Senha{{ editandoId ? ' (não alterada na edição)' : '' }}</label>
          <input id="senha" v-model="form.senha" type="password" :required="!editandoId" placeholder="Mín. 8, Maiúsc., minúsc., número e especial" :disabled="!!editandoId" />
        </div>
        <div class="campo">
          <label for="tipo">Tipo de Usuário</label>
          <select id="tipo" v-model="form.tipo_usuario" :disabled="ehProfessor">
            <option v-for="t in tiposVisiveis" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <template v-if="form.tipo_usuario === 'Professor'">
          <div class="campo">
            <label for="matricula">Matrícula</label>
            <input id="matricula" v-model="form.matricula" type="text" required />
          </div>
          <div class="campo">
            <label for="departamento">Departamento</label>
            <input id="departamento" v-model="form.departamento" type="text" />
          </div>
        </template>

        <template v-if="form.tipo_usuario === 'Aluno'">
          <div class="campo">
            <label for="matriculaA">Matrícula</label>
            <input id="matriculaA" v-model="form.matricula" type="text" :required="!editandoId" />
          </div>
          <div class="campo">
            <label for="curso">Curso</label>
            <input id="curso" v-model="form.curso" type="text" :required="!editandoId" />
          </div>
          <div class="campo">
            <label for="dataMatricula">Data de matrícula</label>
            <CampoData
              id="dataMatricula"
              v-model="form.data_matricula"
              limpar
              :required="!editandoId"
            />
          </div>
          <div class="campo" style="grid-column: 1 / -1">
            <label for="pos">Programa de Pós-graduação (opcional)</label>
            <input id="pos" v-model="form.programa_pos" type="text" placeholder="Ex: Mestrado em Educação" />
          </div>
        </template>

        <div v-if="editandoId && podeEditar" class="campo" style="grid-column: 1 / -1">
          <label><input v-model="form.ativo" type="checkbox" /> Usuário ativo</label>
        </div>

        <div style="grid-column: 1 / -1">
          <button type="submit" class="botao primario" :disabled="salvando">{{ salvando ? 'Salvando...' : (editandoId ? 'Salvar alterações' : 'Criar usuário') }}</button>
          <button type="button" class="botao secundario" style="margin-left: 0.5rem" @click="limparForm">Cancelar</button>
        </div>
      </form>

      <table class="tabela" v-if="usuarios.length">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Tipo</th>
            <th>Matrícula</th>
            <th>Curso/Departamento</th>
            <th v-if="ehProfessor">Data de matrícula</th>
            <th v-if="podeEditar">Situação</th>
            <th v-if="podeEditar || ehProfessor">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id_usuario">
            <td><strong>{{ u.nome }}</strong></td>
            <td>{{ u.email }}</td>
            <td><span class="pilula Em-Andamento">{{ u.tipo_usuario }}</span></td>
            <td>{{ u.perfil?.matricula || u.perfil?.id_aluno || '—' }}</td>
            <td>{{ u.perfil?.curso || u.perfil?.departamento || '—' }}</td>
            <td v-if="ehProfessor">{{ u.perfil?.data_matricula ? formatarData(u.perfil.data_matricula) : '—' }}</td>
            <td v-if="podeEditar">{{ u.ativo === false ? 'Inativo' : 'Ativo' }}</td>
            <td v-if="podeEditar || ehProfessor" style="white-space: nowrap">
              <button type="button" class="botao secundario" @click="abrirEditar(u)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="linha-vazia">Carregando usuários...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import UsuarioModel from '../models/UsuarioModel.js';
import UsuariosController from '../controllers/UsuariosController.js';
import { authState } from '../controllers/AuthController.js';
import AlertMessage from './components/AlertMessage.vue';
import CampoData from './components/CampoData.vue';
import { formatarData } from '../utils/fmt.js';

const tipos = ['Professor', 'Aluno', 'Coordenador', 'Administrador'];
const ehProfessor = computed(() => authState.user?.tipo_usuario === 'Professor');
const podeEditar = computed(() => ['Coordenador', 'Administrador'].includes(authState.user?.tipo_usuario));
const tiposVisiveis = computed(() => (ehProfessor.value ? ['Aluno'] : tipos));
const mostrarForm = ref(false);
const salvando = ref(false);
const erro = ref('');
const sucesso = ref('');
const usuarios = ref([]);
const editandoId = ref(null);

const form = reactive({
  nome: '',
  email: '',
  senha: '',
  tipo_usuario: 'Aluno',
  matricula: '',
  departamento: '',
  curso: '',
  programa_pos: '',
  data_matricula: '',
  ativo: true,
});

async function carregar() {
  if (ehProfessor.value) {
    // Professor vê os alunos já cadastrados (para incluir em orientações) e cadastra novos.
    const alunos = await UsuarioModel.listAlunos();
    usuarios.value = alunos.map((a) => ({
      id_usuario: a.id_usuario,
      nome: a.nome,
      email: a.email,
      tipo_usuario: 'Aluno',
      ativo: a.ativo,
      perfil: {
        matricula: a.matricula,
        curso: a.curso,
        programa_pos: a.programa_pos,
        data_matricula: a.data_matricula,
      },
    }));
  } else {
    usuarios.value = await UsuarioModel.list();
  }
}

onMounted(async () => {
  try {
    await carregar();
  } catch (err) {
    erro.value = err.message;
  }
});

function abrirNovo() {
  limparForm();
  mostrarForm.value = true;
}

function abrirEditar(u) {
  erro.value = '';
  sucesso.value = '';
  editandoId.value = u.id_usuario;
  form.nome = u.nome || '';
  form.email = u.email || '';
  form.senha = '';
  form.tipo_usuario = u.tipo_usuario || 'Aluno';
  form.matricula = u.perfil?.matricula || '';
  form.departamento = u.perfil?.departamento || '';
  form.curso = u.perfil?.curso || '';
  form.programa_pos = u.perfil?.programa_pos || '';
  form.data_matricula = u.perfil?.data_matricula || '';
  form.ativo = u.ativo !== false;
  mostrarForm.value = true;
}

function limparForm() {
  mostrarForm.value = false;
  editandoId.value = null;
  form.nome = '';
  form.email = '';
  form.senha = '';
  form.tipo_usuario = 'Aluno';
  form.matricula = '';
  form.departamento = '';
  form.curso = '';
  form.programa_pos = '';
  form.data_matricula = '';
  form.ativo = true;
}

async function criar() {
  erro.value = '';
  sucesso.value = '';
  salvando.value = true;
  try {
    if (editandoId.value) {
      const dados = {
        nome: form.nome,
        email: form.email,
        tipo_usuario: form.tipo_usuario,
        ativo: form.ativo,
      };
      if (form.tipo_usuario === 'Professor') {
        dados.matricula = form.matricula;
        dados.departamento = form.departamento;
      }
      if (form.tipo_usuario === 'Aluno') {
        dados.matricula = form.matricula;
        dados.curso = form.curso;
        dados.programa_pos = form.programa_pos;
        if (form.data_matricula) dados.data_matricula = form.data_matricula;
      }
      // Professor edita só dados acadêmicos: a API rejeita e-mail/tipo/ativo.
      if (ehProfessor.value) {
        delete dados.email;
        delete dados.tipo_usuario;
        delete dados.ativo;
      }
      await UsuarioModel.update(editandoId.value, dados);
      sucesso.value = 'Usuário atualizado com sucesso.';
    } else {
      await UsuariosController.criar({ ...form });
      sucesso.value = ehProfessor.value ? 'Aluno incluído com sucesso.' : 'Usuário criado com sucesso.';
    }
    await carregar();
    limparForm();
  } catch (err) {
    erro.value = err.message;
  } finally {
    salvando.value = false;
  }
}
</script>