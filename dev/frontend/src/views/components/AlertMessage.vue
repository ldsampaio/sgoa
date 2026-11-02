<template>
  <div v-if="mensagem" class="alerta" :class="tipo" role="alert">
    <Icon :name="nome_icon" :size="20" class="alerta-icone" />
    <span>{{ mensagem }}</span>
  </div>
</template>

<script setup>
/**
 * Alerta clay: ícone + mensagem. Ícones decorativos (o texto carrega a informação).
 */
import { computed } from 'vue';
import Icon from './Icon.vue';

const props = defineProps({
  mensagem: { type: String, default: '' },
  tipo: { type: String, default: 'dica' },
});

const ICONES_ALERTA = { erro: 'warning', sucesso: 'check', dica: 'bulb' };

const nome_icon = computed(() => ICONES_ALERTA[props.tipo] ?? 'info');
</script>

<style scoped>
.alerta-icone {
  margin-top: 2px;
}
</style>
