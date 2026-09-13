<template>
  <span class="pilula" :class="classe">{{ status }}</span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: { type: String, required: true },
});

const classe = computed(() => String(props.status).replace(/\s+/g, '-'));
</script>