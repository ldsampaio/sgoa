<template>
  <component :is="icone" :size="size" :weight="peso" aria-hidden="true" role="presentation" />
</template>

<script setup>
/**
 * Camada de ícones (Phosphor) — substitui emojis estruturais.
 * Regras do design system (MASTER.md):
 *  - Tamanhos fixos: 14 | 16 | 20 | 24 (tokens de escala, sem valores arbitrários);
 *  - Peso do traço consistente por nível de UI (default "bold" a partir de 16px);
 *  - currentColor: herda a cor do texto do contexto (contraste vem do tema);
 *  - Sempre decorativo (aria-hidden): ícone ao lado de rótulo nunca é o único portador
 *    de informação — o texto carrega a semântica;
 *  - Imports nomeados: o mapa abaixo deve conter SOMENTE os ícones usados
 *    (cada componente de ícone embute os 5 pesos e pesa ~3kB no bundle).
 *    Amplie aditivamente por onda, junto ao uso que o pede.
 */
import {
  PhArrowDown,
  PhArrowLeft,
  PhArrowRight,
  PhArrowUp,
  PhCalendarBlank,
  PhCalendarCheck,
  PhCheckCircle,
  PhCircleNotch,
  PhClock,
  PhCopy,
  PhFile,
  PhGraduationCap,
  PhInfo,
  PhLightbulb,
  PhList,
  PhListChecks,
  PhLinkSimple,
  PhPauseCircle,
  PhPaperPlaneRight,
  PhPencilSimple,
  PhPlay,
  PhPlus,
  PhStar,
  PhSignOut,
  PhSparkle,
  PhTag,
  PhUserCircle,
  PhWarning,
  PhXCircle,
} from '@phosphor-icons/vue';
import { computed } from 'vue';

const ICONES = {
  'arrow-down': PhArrowDown,
  'arrow-left': PhArrowLeft,
  'arrow-right': PhArrowRight,
  'arrow-up': PhArrowUp,
  calendar: PhCalendarBlank,
  'calendar-check': PhCalendarCheck,
  copy: PhCopy,
  'graduation-cap': PhGraduationCap,
  link: PhLinkSimple,
  tasks: PhListChecks,
  check: PhCheckCircle,
  'circle-notch': PhCircleNotch,
  clock: PhClock,
  file: PhFile,
  info: PhInfo,
  bulb: PhLightbulb,
  menu: PhList,
  pause: PhPauseCircle,
  pencil: PhPencilSimple,
  send: PhPaperPlaneRight,
  play: PhPlay,
  plus: PhPlus,
  signout: PhSignOut,
  sparkle: PhSparkle,
  tag: PhTag,
  'user-circle': PhUserCircle,
  warning: PhWarning,
  x: PhXCircle,
};

const props = defineProps({
  /** nome do ícone, ver ICONES */
  name: { type: String, required: true },
  /** token de escala: 14 | 16 | 20 | 24 */
  size: {
    type: Number,
    default: 16,
    validator: (v) => [14, 16, 20, 24].includes(v),
  },
  /** peso lógico do traço (Phosphor weight) — manter consistente por nível de UI */
  peso: {
    type: String,
    default: 'bold',
    validator: (v) => ['light', 'regular', 'bold', 'fill'].includes(v),
  },
});

const icone = computed(() => ICONES[props.name] ?? PhInfo);
</script>
