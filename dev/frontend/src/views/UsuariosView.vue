<template>
  <div>
    <div class="cartao">
      <h2>
        {{ ehProfessor ? 'Alunos' : 'Gestão de Usuários' }}
        <button v-if="!mostrarForm" class="botao primario" @click="mostrarForm = true">+ {{ ehProfessor ? 'Novo Aluno' : 'Novo Usuário' }}</button>
      </h2>

      <AlertMessage :mensagem="erro" tipo="erro" />
      <AlertMessage :mensagem="sucesso" tipo="sucesso" />

      <form v-if="mostrarForm" class="grid-2" @submit.prevent="criar">
        <div class="campo">
          <label for="nome">Nome</label>
          <input id="nome" v-model="form.nome" type="text" required />
        </div>
        <div class="campo">
          <label for="email">E-mail</label>
          <input id="email" v-model="form.email" type="email" required />
        </div>
        <div class="campo">
          <label for="senha">Senha</label>
          <input id="senha" v-model="form.senha" type="password" required placeholder="Mín. 8, Maiúsc., minúsc., número e especial" />
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
            <input id="matriculaA" v-model="form.matricula" type="text" required />
          </div>
          <div class="campo">
            <label for="curso">Curso</label>
            <input id="curso" v-model="form.curso" type="text" required />
          </div>
          <div class="campo">
            <label for="dataMatricula">Data de matrícula</label>
            <input id="dataMatricula" v-model="form.data_matricula" type="date" required />
          </div>
          <div class="campo" style="grid-column: 1 / -1">
            <label for="pos">Programa de Pós-graduação (opcional)</label>
            <input id="pos" v-model="form.programa_pos" type="text" placeholder="Ex: Mestrado em Educação" />
          </div>
        </template>

        <div style="grid-column: 1 / -1">
          <button type="submit" class="botao primario" :disabled="salvando">{{ salvando ? 'Salvando...' : 'Criar usuário' }}</button>
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
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id_usuario">
            <td><strong>{{ u.nome }}</strong></td>
            <td>{{ u.email }}</td>
            <td><span class="pilula Em-Andamento">{{ u.tipo_usuario }}</span></td>
            <td>{{ u.perfil?.matricula || u.perfil?.id_aluno || '—' }}</td>
            <td>{{ u.perfil?.curso || u.perfil?.departamento || '—' }}</td>
            <td v-if="ehProfessor">{{ u.perfil?.data_matricula || '—' }}</td>
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

const tipos = ['Professor', 'Aluno', 'Coordenador', 'Administrador'];
const ehProfessor = computed(() => authState.user?.tipo_usuario === 'Professor');
const tiposVisiveis = computed(() => (ehProfessor.value ? ['Aluno'] : tipos));
const mostrarForm = ref(false);
const salvando = ref(false);
const erro = ref('');
const sucesso = ref('');
const usuarios = ref([]);

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
      perfil: { matricula: a.matricula, curso: a.curso, data_matricula: a.data_matricula },
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

function limparForm() {
  mostrarForm.value = false;
  form.nome = '';
  form.email = '';
  form.senha = '';
  form.tipo_usuario = 'Aluno';
  form.matricula = '';
  form.departamento = '';
  form.curso = '';
  form.programa_pos = '';
  form.data_matricula = '';
}

async function criar() {
  erro.value = '';
  sucesso.value = '';
  salvando.value = true;
  try {
    await UsuariosController.criar({ ...form });
    await carregar();
    limparForm();
    sucesso.value = ehProfessor.value ? 'Aluno incluído com sucesso.' : 'Usuário criado com sucesso.';
  } catch (err) {
    erro.value = err.message;
  } finally {
    salvando.value = false;
  }
}
</script>