<template>
  <span class="pilula" :class="classe">
    <Icon :name="nomeIcone" :size="14" />
    {{ status }}
  </span>
</template>

<script setup>
/**
 * Pílula de status — cor + ícone + rótulo.
 * Regra do design system: cor NUNCA é o único indicador de estado.
 */
import { computed } from 'vue';
import Icon from './Icon.vue';

const props = defineProps({
  status: { type: [String, Number], required: true },
});

const ICONES_STATUS = {
  'em-andamento': 'circle-notch',
  'em-avaliacao': 'clock',
  pendente: 'clock',
  concluida: 'check',
  atrasada: 'warning',
  suspensa: 'pause',
  cancelada: 'x',
  ativa: 'check',
  desativada: 'pause',
  vigente: 'link',
  encerrado: 'x',
};

function normalizar(status) {
  return String(status ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

const chave = computed(() => normalizar(props.status));

const classe = computed(() => chave.value);
const nomeIcone = computed(() => ICONES_STATUS[chave.value] ?? 'tag');
</script>
