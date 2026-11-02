<template>
  <div class="item-lista enlace-item" :class="{ 'enlace-destacado': enlace.destacado }">
    <div class="enlace-corpo">
      <div class="enlace-linha">
        <span class="pilula">{{ enlace.categoria }}</span>
        <StatusPill :status="enlace.status" />
        <button
          class="botao botao-mini"
          :aria-pressed="enlace.destacado ? 'true' : 'false'"
          @click="$emit('destacar', enlace)"
        >
          <Icon name="star" :size="14" />
          {{ enlace.destacado ? 'Destacado' : 'Fixar' }}
        </button>
      </div>

      <div class="enlace-url">
        <Icon name="link" :size="14" />
        <a :href="enlace.url" target="_blank" rel="noopener noreferrer">{{ enlace.url }}</a>
      </div>

      <div class="metadado">
        <template v-if="enlace.titulo_provisorio">{{ enlace.titulo_provisorio }} · </template>
        Registrado por {{ enlace.nome_criador }} em {{ formatarDataHora(enlace.criado_em) }}
        <template v-if="enlace.observacao"> · {{ enlace.observacao }}</template>
        <template v-if="enlace.atualizado_em"> · editado em {{ formatarDataHora(enlace.atualizado_em) }}</template>
      </div>

      <form v-if="editando" class="form-enlace desce-2" @submit.prevent="salvar">
        <div class="campo">
          <label :for="`url-${enlace.id_enlace}`">Link</label>
          <input :id="`url-${enlace.id_enlace}`" v-model="form.url" type="url" required />
        </div>
        <div class="campo">
          <label :for="`cat-${enlace.id_enlace}`">Categoria</label>
          <select :id="`cat-${enlace.id_enlace}`" v-model="form.categoria" required>
            <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="campo">
          <label :for="`status-${enlace.id_enlace}`">Situação</label>
          <select :id="`status-${enlace.id_enlace}`" v-model="form.status" required>
            <option value="Vigente">Vigente</option>
            <option value="Encerrado">Encerrado</option>
          </select>
        </div>
        <div class="campo">
          <label :for="`obs-${enlace.id_enlace}`">Observação</label>
          <input :id="`obs-${enlace.id_enlace}`" v-model="form.observacao" type="text" />
        </div>
        <div class="enlace-linha">
          <button type="submit" class="botao primario" :disabled="salvando">
            {{ salvando ? 'Salvando...' : 'Salvar' }}
          </button>
          <button type="button" class="botao secundario" @click="editando = false">Cancelar</button>
        </div>
      </form>
    </div>

    <div class="enlace-acoes">
      <a class="botao primario" :href="enlace.url" target="_blank" rel="noopener noreferrer">
        <Icon name="arrow-right" :size="14" />
        Abrir
      </a>
      <button class="botao secundario" @click="copiar">
        <Icon name="copy" :size="14" />
        {{ copiado ? 'Copiado' : 'Copiar' }}
      </button>
      <button class="botao secundario" @click="editando = !editando">Editar</button>
      <button class="botao secundario" @click="$emit('remover', enlace)">Excluir</button>
    </div>
  </div>
</template>

<script setup>
/**
 * Item de enlace Overleaf (RF.OV) — usado pela aba da orientação, pelo card do
 * dashboard e pela página consolidada. O destaque é sempre do usuário que olha.
 */
import { ref, reactive, watch } from 'vue';
import Icon from './Icon.vue';
import StatusPill from './StatusPill.vue';
import { formatarDataHora } from '../../utils/fmt.js';

const props = defineProps({
  enlace: { type: Object, required: true },
  categorias: { type: Array, default: () => [] },
  salvando: { type: Boolean, default: false },
});
const emit = defineEmits(['destacar', 'salvar', 'remover']);

const editando = ref(false);
const copiado = ref(false);
const form = reactive({ url: '', categoria: '', status: '', observacao: '' });

function abrirForm() {
  form.url = props.enlace.url;
  form.categoria = props.enlace.categoria;
  form.status = props.enlace.status;
  form.observacao = props.enlace.observacao || '';
}

watch(editando, (v) => {
  if (v) abrirForm();
});

async function salvar() {
  emit('salvar', props.enlace, { ...form });
}

async function copiar() {
  try {
    await navigator.clipboard.writeText(props.enlace.url);
    copiado.value = true;
  } catch {
    // Contexto não seguro (http) ou permissão negada: o link já está selecionável na tela.
    copiado.value = false;
  }
}
</script>

<style scoped>
.enlace-item {
  align-items: flex-start;
}

.enlace-corpo {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  min-width: 0;
}

.enlace-linha {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
  align-items: center;
}

/* O link é a informação central: quebra em palavras longas, nunca some da tela */
.enlace-url {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-wrap: anywhere;
  font-size: var(--size-sm);
}

.enlace-url a {
  color: var(--color-primary-strong);
  font-weight: 700;
}

.enlace-acoes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
  align-items: center;
}

/* Destaque: borda primária à esquerda, além do rótulo "Destacado" */
.enlace-destacado {
  border-left: 6px solid var(--color-primary);
  padding-left: var(--spacing-2);
}

.form-enlace {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}
</style>
