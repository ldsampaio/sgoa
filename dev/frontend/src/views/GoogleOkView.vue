<template>
  <div class="cartao" style="max-width: 560px; margin: 2rem auto">
    <h2>Integração com Google Calendar</h2>
    <AlertMessage v-if="erro" :mensagem="erro" tipo="erro" />
    <AlertMessage v-if="sucesso" :mensagem="sucesso" tipo="sucesso" />
    <RouterLink :to="{ name: 'orientacoes' }" class="botao primario">Voltar para orientações</RouterLink>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AlertMessage from './components/AlertMessage.vue';
import GoogleController from '../controllers/GoogleController.js';

const route = useRoute();
const erro = ref('');
const sucesso = ref('');

const MENSAGENS_ERRO = {
  oauth_invalido: 'Retorno do Google inválido. Tente conectar novamente.',
  state_invalido: 'Sessão de conexão expirada. Tente conectar novamente.',
  dominio_invalido: 'Use sua conta Workspace da instituição para conectar.',
  access_denied: 'Conexão cancelada no Google. Nenhuma alteração foi feita.',
};

onMounted(async () => {
  const q = route.query;
  if (q.google === 'conectado') {
    sucesso.value = q.email ? `Google conectado como ${q.email}.` : 'Google conectado com sucesso.';
  } else if (q.erro) {
    const chave = String(q.erro);
    erro.value = MENSAGENS_ERRO[chave] || `Falha ao conectar: ${decodeURIComponent(chave)}`;
  }
  await GoogleController.carregarStatus().catch(() => {});
});
</script>
