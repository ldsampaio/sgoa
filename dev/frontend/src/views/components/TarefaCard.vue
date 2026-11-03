<template>
  <article
    class="cartao-kanban"
    :class="[`cor-${cor}`, { arrastando }]"
    draggable="true"
    @dragstart="$emit('arrastar', $event, tarefa)"
    @dragend="$emit('fim-arraste')"
  >
    <div class="topo-cartao">
      <PrioridadePill :prioridade="tarefa.prioridade" />
      <div class="acoes-cartao">
        <button
          type="button"
          class="botao-icone"
          :disabled="!podeMoverEsquerda"
          aria-label="Mover para a coluna anterior"
          title="Mover para a coluna anterior"
          @click.stop="$emit('mover', tarefa, -1)"
        >
          <Icon name="arrow-left" :size="14" />
        </button>
        <button
          type="button"
          class="botao-icone"
          :disabled="!podeMoverDireita"
          aria-label="Mover para a próxima coluna"
          title="Mover para a próxima coluna"
          @click.stop="$emit('mover', tarefa, 1)"
        >
          <Icon name="arrow-right" :size="14" />
        </button>
        <button
          type="button"
          class="botao-icone"
          aria-label="Editar cartão"
          title="Editar cartão"
          @click.stop="$emit('editar', tarefa)"
        >
          <Icon name="pencil" :size="14" />
        </button>
      </div>
    </div>

    <h3 class="titulo-cartao">{{ tarefa.titulo || tarefa.descricao }}</h3>
    <p v-if="tarefa.descricao && tarefa.descricao !== tarefa.titulo" class="descricao-cartao">
      {{ tarefa.descricao }}
    </p>

    <div class="rodape-cartao">
      <span class="meta-cartao">
        <Icon name="user-circle" :size="14" />
        {{ tarefa.nome_responsavel || 'Sem responsável' }}
      </span>
      <span class="meta-cartao">
        <Icon name="calendar" :size="14" />
        {{ tarefa.data_limite ? formatarData(tarefa.data_limite) : 'Sem prazo' }}
      </span>
    </div>

    <span v-if="tarefa.status === 'Atrasada'" class="pilula atrasada selo-atrasada">
      <Icon name="warning" :size="14" />
      Atrasada
    </span>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import PrioridadePill from './PrioridadePill.vue';
import Icon from './Icon.vue';
import { formatarData } from '../../utils/fmt.js';
import { colunaDoStatus, COLUNAS_KANBAN } from '../../utils/kanban.js';

const props = defineProps({
  tarefa: { type: Object, required: true },
  arrastando: { type: Boolean, default: false },
});

defineEmits(['arrastar', 'fim-arraste', 'editar', 'mover']);

const cor = computed(() => props.tarefa.cor || 'branco');
const indiceColuna = computed(() =>
  COLUNAS_KANBAN.findIndex((c) => c.status === colunaDoStatus(props.tarefa.status)),
);
const podeMoverEsquerda = computed(() => indiceColuna.value > 0);
const podeMoverDireita = computed(() => indiceColuna.value < COLUNAS_KANBAN.length - 1);
</script>
