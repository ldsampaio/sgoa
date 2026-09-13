<template>
  <div class="cartao">
    <h2>Notificações</h2>
    <div v-if="!notificacoes.length" class="linha-vazia">Nenhuma notificação.</div>
    <ul v-else class="linha-tempo" style="max-height: 320px; overflow-y: auto">
      <li v-for="n in notificacoes" :key="n.id_notificacao" :class="{ 'nao-lida': !n.lida }">
        <button
          v-if="!n.lida"
          class="botao"
          style="float: right; padding: 0.2rem 0.6rem; font-size: 0.75rem"
          @click="$emit('ler', n)"
        >
          Marcar lida
        </button>
        <strong>{{ n.titulo }}</strong>
        <div style="font-size: 0.85rem; color: var(--cor-texto-suave)">{{ n.mensagem }}</div>
        <div style="font-size: 0.75rem; color: var(--cor-texto-suave)">{{ formatarDataHora(n.data_criacao) }}</div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { formatarDataHora } from '../../utils/fmt.js';

defineProps({ notificacoes: { type: Array, default: () => [] } });
defineEmits(['ler']);
</script>

<style scoped>
.nao-lida {
  border-left: 3px solid var(--cor-secundaria);
}
</style>