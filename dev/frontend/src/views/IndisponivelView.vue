<template>
  <div class="cartao cartao-estreito">
    <h2><Icon name="warning" :size="20" /> Identidade indisponível</h2>

    <p class="copy-erro">
      Não foi possível confirmar sua identidade. Acesso negado. O serviço de autenticação não está
      respondendo.
    </p>

    <p v-if="retryAfter" class="metadado">
      Tentar novamente em {{ retryAfter }} segundos.
    </p>

    <button type="button" class="botao primario botao-bloco" :disabled="carregando" @click="tentarDeNovo">
      {{ carregando ? 'Confirmando...' : 'Tentar de novo' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AuthController } from '../controllers/AuthController.js';
import Icon from './components/Icon.vue';

// Página de erro própria do sgoa (contrato §4.1): renderizada pelo sgoa porque o
// saga é justamente o que caiu. Não revela claims do token, `sid` nem estado
// interno — só a copy comum e o Retry-After.
const route = useRoute();
const router = useRouter();

const carregando = ref(false);
const retryAfter = computed(() => route.query.retry_after || null);

async function tentarDeNovo() {
  carregando.value = true;
  try {
    const me = await AuthController.me();
    router.push({ name: 'dashboard' });
    return me;
  } catch (err) {
    if (err.status === 503) return null; // continua na página de erro, sem redirect
    router.push({ name: 'login' });
    return null;
  } finally {
    carregando.value = false;
  }
}
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
