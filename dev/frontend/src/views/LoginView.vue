<template>
  <div class="pagina-login">
    <aside class="lado-visual">
      <div class="brand">
        <span class="logo">🎓 SGOA</span>
      </div>
      <h1>Sistema de Gerenciamento de Orientações Acadêmicas</h1>
      <p class="resumo">
        Centralize a gestão de TCC, Mestrado e Doutorado. Acompanhe reuniões, tarefas, documentos e
        comunicação com orientadores e alunos em um só lugar.
      </p>
    </aside>

    <main class="lado-forms">
      <form class="caixa-login" @submit.prevent="entrar">
        <h2>Entrar no sistema</h2>

        <AlertMessage :mensagem="erro" tipo="erro" />

        <div class="campo">
          <label for="email">E-mail</label>
          <input id="email" v-model="email" type="email" autocomplete="email" required placeholder="voce@instituicao.edu" />
        </div>

        <div class="campo">
          <label for="senha">Senha</label>
          <input id="senha" v-model="senha" type="password" autocomplete="current-password" required placeholder="••••••••" />
        </div>

        <button class="botao primario" style="width: 100%; justify-content: center" :disabled="carregando">
          {{ carregando ? 'Entrando...' : 'Entrar' }}
        </button>

        <p style="margin-top: 0.75rem; font-size: 0.85rem; text-align: center">
          <RouterLink to="/recuperar-senha">Esqueci minha senha</RouterLink>
        </p>

        <p style="margin-top: 1rem; font-size: 0.8rem; color: var(--cor-texto-suave)">
          <strong>Acessos de demonstração:</strong><br />
          Professor: carlos@sgoa.dev / Prof@1234<br />
          Aluno: ana@sgoa.dev / Aluno@1234<br />
          Coordenador: silvia@sgoa.dev / Coord@1234
        </p>
      </form>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { AuthController } from '../controllers/AuthController.js';
import AlertMessage from './components/AlertMessage.vue';

const router = useRouter();
const route = useRoute();

const email = ref('');
const senha = ref('');
const erro = ref('');
const carregando = ref(false);

async function entrar() {
  erro.value = '';
  carregando.value = true;
  try {
    await AuthController.login(email.value, senha.value);
    router.push(route.query.redirect || '/dashboard');
  } catch (err) {
    erro.value = err.message;
  } finally {
    carregando.value = false;
  }
}
</script>