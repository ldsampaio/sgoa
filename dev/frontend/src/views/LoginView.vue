<template>
  <div class="cartao cartao-estreito">
    <h2><Icon name="graduation-cap" :size="20" /> Entrar no SGOA</h2>

    <p class="copy-erro">
      O SGOA não autentica credencial: a identidade é confirmada pelo portal. Redirecionando para o
      login do saga…
    </p>

    <AlertMessage v-if="erro" :mensagem="erro" tipo="erro" />

    <button v-if="erro" type="button" class="botao primario botao-bloco" :disabled="carregando" @click="entrar">
      {{ carregando ? 'Confirmando...' : 'Tentar de novo' }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AuthController } from '../controllers/AuthController.js';
import { decidirAcao } from '../plugins/decisaoErro.js';
import AlertMessage from './components/AlertMessage.vue';
import Icon from './components/Icon.vue';

// Página de redirecionamento: não há formulário de login nem recuperação de senha
// no sgoa. Se a sessão não está confirmada, o guard usa o `login_url` do corpo do
// 401; um 503 é caminho próprio (página de erro), nunca redirect.
const route = useRoute();
const router = useRouter();

const erro = ref('');
const carregando = ref(false);

async function entrar() {
  erro.value = '';
  carregando.value = true;
  try {
    await AuthController.me();
    router.push(route.query.redirect || '/dashboard');
  } catch (err) {
    const acao = decidirAcao(err.status, err.data);
    if (acao.tipo === 'pagina') {
      router.push({ name: acao.rota, query: acao.retryAfter ? { retry_after: String(acao.retryAfter) } : {} });
    } else if (acao.tipo === 'redirect' && acao.url) {
      window.location.assign(acao.url);
    } else {
      erro.value = 'Não foi possível confirmar sua identidade. Acesso negado.';
    }
  } finally {
    carregando.value = false;
  }
}

entrar();
</script>

<style scoped>
.cartao-estreito {
  max-width: 560px;
  margin: var(--spacing-4) auto;
}

.cartao-estreito h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-start;
}

.copy-erro {
  margin: 0 0 var(--spacing-3);
  line-height: 1.5;
}
</style>
