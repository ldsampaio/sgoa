<!--
  Campo de data com máscara dd/mm/aaaa.

  Substitui <input type="date"> (que mostra o formato do SO do usuário, nem
  sempre pt-BR) por um campo de texto que sempre digita e exibe dd/mm/aaaa,
  convertendo para o ISO YYYY-MM-DD que a API e o banco esperam.

  Aceita hora opcional (comHora) para substituir type="datetime-local",
  gravando ISO completo (YYYY-MM-DDTHH:mm).
-->
<template>
  <div class="campo-data">
    <input
      :id="id"
      ref="inputRef"
      v-model="texto"
      type="text"
      class="entrada-data"
      :placeholder="mascara"
      :disabled="disabled"
      :required="required"
      :aria-label="ariaLabel || null"
      inputmode="numeric"
      autocomplete="off"
      maxlength="comHora ? 16 : 10"
      @input="aoDigitar"
      @blur="aoSair"
      @keydown="aoTeclar"
    />
    <button
      v-if="limpar && modelo"
      type="button"
      class="limpar-data"
      aria-label="Limpar data"
      :disabled="disabled"
      @click="limparValor"
    >
      ×
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  // Valor no formato da API: YYYY-MM-DD ou YYYY-MM-DDTHH:mm (string) ou null.
  modelValue: { type: String, default: '' },
  id: { type: String, default: undefined },
  comHora: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  limpar: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);
const inputRef = ref(null);
const texto = ref('');

// Rascunho enquanto o usuário digita: só vira valor ao completar a máscara.
const modelo = computed(() => props.modelValue || '');

const mascara = computed(() => (props.comHora ? 'dd/mm/aaaa hh:mm' : 'dd/mm/aaaa'));

function paraISO(br) {
  const m = String(br).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const [, dd, mm, aaaa, hh, min] = m;
  if (Number(mm) < 1 || Number(mm) > 12) return null;
  if (Number(dd) < 1 || Number(dd) > 31) return null;
  if (Number(hh ?? 0) > 23 || Number(min ?? 0) > 59) return null;
  const data = `${aaaa}-${mm}-${dd}`;
  return props.comHora ? `${data}T${hh || '00'}:${min || '00'}` : data;
}

function paraBr(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return '';
  const [, aaaa, mm, dd, hh, min] = m;
  return props.comHora
    ? `${dd}/${mm}/${aaaa} ${hh || '00'}:${min || '00'}`
    : `${dd}/${mm}/${aaaa}`;
}

// Mantém o texto em sincronia quando o valor muda por fora (edição, reset).
watch(
  modelo,
  (v) => {
    const br = paraBr(v);
    if (br !== texto.value) texto.value = br;
  },
  { immediate: true },
);

function aoDigitar(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, props.comHora ? 12 : 8);
  const p = (n) => String(n).padStart(2, '0');
  let out = '';
  if (v.length >= 2) out += `${p(v.slice(0, 2))}/`;
  if (v.length >= 4) out += `${p(v.slice(2, 4))}/`;
  if (v.length >= 6) {
    out += `${v.slice(4, 8)}`;
    if (props.comHora) {
      out += ' ';
      if (v.length >= 8) out += `${p(v.slice(8, 10))}:`;
      if (v.length >= 10) out += p(v.slice(10, 12));
    }
  } else if (props.comHora && v.length > 0) {
    // Data incompleta: mantém só os dígitos já digitados para seguir digitando.
    out = v;
  }
  texto.value = out;
  e.target.value = out;

  if (props.comHora ? out.length === 16 : out.length === 10) {
    const iso = paraISO(out);
    if (iso) emit('update:modelValue', iso);
  } else if (out === '' || out === mascara.value) {
    emit('update:modelValue', '');
  }
}

function aoSair() {
  if (!texto.value) {
    emit('update:modelValue', '');
    return;
  }
  const iso = paraISO(texto.value);
  if (iso) {
    texto.value = paraBr(iso);
    emit('update:modelValue', iso);
  } else {
    // Digitação inválida/incompleta: volta ao último valor válido conhecido.
    texto.value = paraBr(modelo.value);
  }
}

function aoTeclar(e) {
  if (e.key !== 'Enter') return;
  aoSair();
}

function limparValor() {
  texto.value = '';
  emit('update:modelValue', '');
  inputRef.value?.focus();
}
</script>

<style scoped>
.campo-data {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.entrada-data {
  flex: 1;
  min-width: 0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.limpar-data {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--cor-borda);
  background: transparent;
  color: var(--cor-texto-suave);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}

.limpar-data:hover:not(:disabled) {
  color: var(--cor-primaria);
  border-color: var(--cor-primaria);
}

.limpar-data:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
