<template>
  <div class="cartao">
    <h2>Notificações</h2>
    <div v-if="!notificacoes.length" class="linha-vazia">Nenhuma notificação.</div>
    <ul v-else class="linha-tempo rolagem-notificacoes">
      <li v-for="n in notificacoes" :key="n.id_notificacao" :class="{ 'nao-lida': !n.lida }">
        <button
          v-if="!n.lida"
          class="botao botao-mini notif-acao"
          @click="$emit('ler', n)"
        >
          Marcar lida
        </button>
        <strong>{{ n.titulo }}</strong>
        <div v-if="ehLinkOverleaf(n.mensagem)" class="metadado">
          <a :href="n.mensagem" target="_blank" rel="noopener noreferrer">{{ n.mensagem }}</a>
        </div>
        <div v-else class="metadado">{{ n.mensagem }}</div>
        <div class="metadado-xs">{{ formatarDataHora(n.data_criacao) }}</div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { formatarDataHora } from '../../utils/fmt.js';
import { ehLinkOverleaf } from '../../utils/overleaf.js';

defineProps({ notificacoes: { type: Array, default: () => [] } });
defineEmits(['ler']);
</script>

<style scoped>
/* Painel de notificações rola por conta própria dentro do cartão */
.rolagem-notificacoes {
  max-height: var(--scroll-panel-height);
  overflow-y: auto;
}

/* Não lida: borda primária à esquerda + o botão "Marcar lida" carrega a semântica */
.nao-lida {
  border-left: 4px solid var(--color-primary);
  padding-left: 10px;
}

.notif-acao {
  float: right;
  margin-left: var(--spacing-2);
}
</style>
