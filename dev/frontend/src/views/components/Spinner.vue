<template>
  <div v-if="carregando" class="spinner" role="status" aria-label="Carregando"></div>
</template>

<script setup>
defineProps({ carregando: { type: Boolean, default: false } });
</script>