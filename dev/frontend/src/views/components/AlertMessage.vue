<template>
  <div v-if="mensagem" class="alerta" :class="tipo" role="alert">
    {{ mensagem }}
  </div>
</template>

<script setup>
defineProps({
  mensagem: { type: String, default: '' },
  tipo: { type: String, default: 'dica' },
});
</script>