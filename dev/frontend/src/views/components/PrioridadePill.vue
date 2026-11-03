<template>
  <span class="pilula prioridade" :class="`prioridade-${chave}`">
    <Icon :name="icone" :size="14" />
    {{ prioridade }}
  </span>
</template>

<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';

const props = defineProps({
  prioridade: { type: String, default: 'Média' },
});

const ICONES = { baixa: 'arrow-down', media: 'arrow-right', alta: 'arrow-up' };

const chave = computed(() =>
  String(props.prioridade ?? 'Média')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase(),
);

const icone = computed(() => ICONES[chave.value] ?? 'tag');
</script>
