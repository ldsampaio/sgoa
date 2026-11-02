<template>
  <div class="pagina-login">
    <aside class="lado-visual">
      <div class="brand">
        <Icon name="graduation-cap" :size="24" />
        <span class="logo">SGOA</span>
      </div>
      <h1>Sistema de Gerenciamento de Orientações Acadêmicas</h1>
      <p class="resumo">
        Centralize a gestão de TCC, Mestrado e Doutorado. Acompanhe reuniões, tarefas, documentos e
        comunicação com orientadores e alunos em um só lugar.
      </p>
      <ul class="chips-features">
        <li class="chip-clay"><Icon name="calendar" :size="16" /> Reuniões e prazos</li>
        <li class="chip-clay"><Icon name="file" :size="16" /> Documentos com feedback</li>
        <li class="chip-clay"><Icon name="tasks" :size="16" /> Tarefas e acompanhamento</li>
      </ul>
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

        <button class="botao primario botao-bloco" :disabled="carregando">
          {{ carregando ? 'Entrando...' : 'Entrar' }}
        </button>

        <p class="texto-login">
          <RouterLink to="/recuperar-senha">Esqueci minha senha</RouterLink>
        </p>

        <div class="caixa-demo">
          <strong>Acessos de demonstração</strong>
          <p>Professor: <code>carlos@sgoa.dev</code> / <code>Prof@1234</code></p>
          <p>Aluno: <code>ana@sgoa.dev</code> / <code>Aluno@1234</code></p>
          <p>Coordenador: <code>silvia@sgoa.dev</code> / <code>Coord@1234</code></p>
        </div>
      </form>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { AuthController } from '../controllers/AuthController.js';
import AlertMessage from './components/AlertMessage.vue';
import Icon from './components/Icon.vue';

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