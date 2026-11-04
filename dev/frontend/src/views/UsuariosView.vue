<template>
  <div>
    <div class="cartao cartao-tabela">
      <h2>{{ ehProfessor ? 'Alunos' : 'Gestão de Usuários' }}</h2>

      <AlertMessage :mensagem="erro" tipo="erro" />

      <p class="metadado">
        O cadastro e os dados de papel (matrícula, curso, departamento) são do portal: o SGOA só lê.
      </p>

      <table class="tabela" v-if="usuarios.length">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Login</th>
            <th>E-mail</th>
            <th>Papel</th>
            <th>Matrícula</th>
            <th>Curso/Departamento</th>
            <th v-if="podeEditar">Situação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id">
            <td><strong>{{ u.name }}</strong></td>
            <td><code>{{ u.login }}</code></td>
            <td>{{ u.email }}</td>
            <td><span class="pilula">{{ u.papel }}</span></td>
            <td>{{ u.perfil?.matricula || '—' }}</td>
            <td>{{ u.perfil?.curso || u.perfil?.departamento || '—' }}</td>
            <td v-if="podeEditar"><StatusPill :status="u.ativo === false ? 'Desativada' : 'Ativa'" /></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="linha-vazia">Carregando usuários...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import UsuarioModel from '../models/UsuarioModel.js';
import { authState } from '../controllers/AuthController.js';
import AlertMessage from './components/AlertMessage.vue';
import StatusPill from './components/StatusPill.vue';

const ehProfessor = computed(() => authState.user?.papel === 'Professor');
const podeEditar = computed(() => ['Coordenador', 'Administrador'].includes(authState.user?.papel));

const usuarios = ref([]);
const erro = ref('');

async function carregar() {
  if (ehProfessor.value) {
    // Professor vê os alunos (para incluir em orientações).
    const alunos = await UsuarioModel.listAlunos();
    usuarios.value = alunos.map((a) => ({
      id: a.id_usuario,
      login: a.login,
      name: a.name,
      email: a.email,
      papel: 'Aluno',
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
</script>
