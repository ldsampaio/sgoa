<template>
  <div>
    <div class="cartao">
      <h2>Prazos do Regulamento</h2>
      <p style="color: var(--cor-texto-suave)">
        Prazos máximos em meses contados da <strong>data de matrícula</strong> do aluno.
        Vazios (—) significam sem prazo. Alterações valem para os cálculos seguintes.
      </p>
      <AlertMessage :mensagem="erro" tipo="erro" />
      <AlertMessage :mensagem="sucesso" tipo="sucesso" />

      <table class="tabela" v-if="linhas.length">
        <thead>
          <tr><th>Nível</th><th>Conclusão (meses)</th><th>Qualificação (meses)</th><th>Ações</th></tr>
        </thead>
        <tbody>
          <tr v-for="l in linhas" :key="l.nivel">
            <td><strong>{{ l.nivel }}</strong></td>
            <td>
              <span v-if="editando !== l.nivel">{{ l.prazo_conclusao_meses ?? '—' }}</span>
              <input
                v-else v-model.number="form.prazo_conclusao_meses" type="number" min="0" step="1"
                placeholder="—" style="width: 6rem"
              />
            </td>
            <td>
              <span v-if="editando !== l.nivel">{{ l.prazo_qualificacao_meses ?? '—' }}</span>
              <input
                v-else v-model.number="form.prazo_qualificacao_meses" type="number" min="0" step="1"
                placeholder="—" style="width: 6rem"
              />
            </td>
            <td style="white-space: nowrap">
              <button v-if="editando !== l.nivel" type="button" class="botao secundario" @click="abrirEditar(l)">Editar</button>
              <template v-else>
                <button type="button" class="botao primario" :disabled="salvando" @click="salvar(l.nivel)">
                  {{ salvando ? 'Salvando...' : 'Salvar' }}
                </button>
                <button type="button" class="botao secundario" style="margin-left: 0.4rem" @click="editando = null">Cancelar</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="linha-vazia">Carregando parâmetros...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import ParametroModel from '../models/ParametroModel.js';
import AlertMessage from './components/AlertMessage.vue';

const linhas = ref([]);
const editando = ref(null);
const salvando = ref(false);
const erro = ref('');
const sucesso = ref('');
const form = reactive({ prazo_conclusao_meses: null, prazo_qualificacao_meses: null });

onMounted(async () => {
  try {
    linhas.value = await ParametroModel.list();
  } catch (err) {
    erro.value = err.message;
  }
});

function normalizar(v) {
  if (v === '' || v === null || v === undefined || Number.isNaN(v)) return null;
  return Number(v);
}

function abrirEditar(l) {
  erro.value = '';
  sucesso.value = '';
  editando.value = l.nivel;
  form.prazo_conclusao_meses = l.prazo_conclusao_meses;
  form.prazo_qualificacao_meses = l.prazo_qualificacao_meses;
}

async function salvar(nivel) {
  erro.value = '';
  sucesso.value = '';
  salvando.value = true;
  try {
    const atualizado = await ParametroModel.update(nivel, {
      prazo_conclusao_meses: normalizar(form.prazo_conclusao_meses),
      prazo_qualificacao_meses: normalizar(form.prazo_qualificacao_meses),
    });
    const i = linhas.value.findIndex((l) => l.nivel === nivel);
    if (i >= 0) linhas.value[i] = atualizado;
    editando.value = null;
    sucesso.value = `Prazos de ${nivel} atualizados.`;
  } catch (err) {
    erro.value = err.message;
  } finally {
    salvando.value = false;
  }
}
</script>
