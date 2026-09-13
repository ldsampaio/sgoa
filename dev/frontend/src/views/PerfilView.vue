<template>
  <div>
    <div class="cartao">
      <h2>Meu Perfil</h2>
      <AlertMessage :mensagem="erro" tipo="erro" />
      <AlertMessage :mensagem="sucesso" tipo="sucesso" />

      <form @submit.prevent="salvar">
        <div class="grid-2">
          <div class="campo">
            <label for="nome">Nome</label>
            <input id="nome" v-model="form.nome" type="text" required />
          </div>
          <div class="campo">
            <label for="email">E-mail</label>
            <input id="email" v-model="form.email" type="email" required />
          </div>
          <div class="campo">
            <label for="senha">Nova senha (deixe vazio para manter)</label>
            <input id="senha" v-model="form.senha" type="password" autocomplete="new-password" placeholder="••••••••" />
          </div>
          <div class="campo">
            <label>Tipo de Usuário</label>
            <input :value="authState.user?.tipo_usuario" type="text" disabled style="background: #f4f6fa" />
          </div>
        </div>
        <button type="submit" class="botao primario" :disabled="salvando">{{ salvando ? 'Salvando...' : 'Salvar alterações' }}</button>
      </form>
    </div>

    <div class="cartao" v-if="authState.user?.perfil">
      <h2>Dados Acadêmicos</h2>
      <table class="tabela">
        <tbody>
          <tr v-if="authState.user.perfil.matricula">
            <td><strong>Matrícula</strong></td>
            <td>{{ authState.user.perfil.matricula }}</td>
          </tr>
          <tr v-if="authState.user.perfil.departamento">
            <td><strong>Departamento</strong></td>
            <td>{{ authState.user.perfil.departamento }}</td>
          </tr>
          <tr v-if="authState.user.perfil.curso">
            <td><strong>Curso</strong></td>
            <td>{{ authState.user.perfil.curso }}</td>
          </tr>
          <tr v-if="authState.user.perfil.programa_pos">
            <td><strong>Programa de Pós-graduação</strong></td>
            <td>{{ authState.user.perfil.programa_pos }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { authState, AuthController } from '../controllers/AuthController.js';
import AlertMessage from './components/AlertMessage.vue';

const form = reactive({
  nome: authState.user?.nome || '',
  email: authState.user?.email || '',
  senha: '',
});
const erro = ref('');
const sucesso = ref('');
const salvando = ref(false);

async function salvar() {
  erro.value = '';
  sucesso.value = '';
  salvando.value = true;
  try {
    const dados = { nome: form.nome, email: form.email };
    if (form.senha) dados.senha = form.senha;
    await AuthController.atualizarPerfil(dados);
    form.senha = '';
    sucesso.value = 'Perfil atualizado com sucesso.';
  } catch (err) {
    erro.value = err.message;
  } finally {
    salvando.value = false;
  }
}
</script>