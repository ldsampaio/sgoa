<template>
  <div>
    <div class="cartao">
      <h2>
        Categorias de documento para avaliação IA
        <button v-if="!mostrarForm" class="botao primario" @click="abrirNovo">+ Nova categoria</button>
      </h2>
      <AlertMessage :mensagem="erro" tipo="erro" />
      <AlertMessage :mensagem="sucesso" tipo="sucesso" />
      <Spinner :carregando="tipoDocumentoState.carregando" />

      <form v-if="mostrarForm" @submit.prevent="salvar">
        <div class="campo">
          <label for="nome">Nome</label>
          <input id="nome" v-model="form.nome" type="text" required placeholder="Ex: Artigo" />
        </div>
        <div class="campo">
          <label for="descricao">Descrição</label>
          <input id="descricao" v-model="form.descricao" type="text" placeholder="Ex: Rascunho de artigo científico" />
        </div>
        <div class="campo">
          <label for="prompt">Prompt-padrão (herdado pelos professores)</label>
          <textarea id="prompt" v-model="form.prompt_padrao" rows="6" required></textarea>
        </div>
        <button type="submit" class="botao primario" :disabled="salvando">{{ salvando ? 'Salvando...' : 'Salvar' }}</button>
        <button type="button" class="botao secundario" style="margin-left: 0.5rem" @click="fecharForm">Cancelar</button>
      </form>

      <table class="tabela" style="margin-top: 1rem">
        <thead>
          <tr><th>Nome</th><th>Descrição</th><th>Status</th><th>Ações</th></tr>
        </thead>
        <tbody>
          <tr v-for="t in tipoDocumentoState.lista" :key="t.id_tipo">
            <td><strong>{{ t.nome }}</strong></td>
            <td>{{ t.descricao || '—' }}</td>
            <td>{{ t.ativo ? 'Ativa' : 'Desativada' }}</td>
            <td style="white-space: nowrap">
              <button type="button" class="botao secundario" @click="abrirEditar(t)">Editar</button>
              <button type="button" class="botao secundario" style="margin-left: 0.4rem" @click="alternar(t)">
                {{ t.ativo ? 'Desativar' : 'Ativar' }}
              </button>
              <button type="button" class="botao secundario" style="margin-left: 0.4rem" @click="excluir(t)">Excluir</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import TipoDocumentoModel from '../models/TipoDocumentoModel.js';
import TipoDocumentoController, { tipoDocumentoState } from '../controllers/TipoDocumentoController.js';
import AlertMessage from './components/AlertMessage.vue';
import Spinner from './components/Spinner.vue';

const erro = ref('');
const sucesso = ref('');
const salvando = ref(false);
const mostrarForm = ref(false);
const editando = ref(null);
const form = reactive({ nome: '', descricao: '', prompt_padrao: '' });

function abrirNovo() {
  editando.value = null;
  form.nome = '';
  form.descricao = '';
  form.prompt_padrao = '';
  mostrarForm.value = true;
}

function abrirEditar(t) {
  editando.value = t;
  form.nome = t.nome;
  form.descricao = t.descricao || '';
  form.prompt_padrao = t.prompt_padrao;
  mostrarForm.value = true;
}

function fecharForm() {
  mostrarForm.value = false;
  editando.value = null;
}

async function recarregar() {
  await TipoDocumentoController.carregar(true);
}

async function salvar() {
  erro.value = '';
  sucesso.value = '';
  salvando.value = true;
  try {
    if (editando.value) {
      await TipoDocumentoModel.atualizar(editando.value.id_tipo, {
        nome: form.nome,
        descricao: form.descricao,
        prompt_padrao: form.prompt_padrao,
      });
      sucesso.value = 'Categoria atualizada.';
    } else {
      await TipoDocumentoModel.criar({ nome: form.nome, descricao: form.descricao, prompt_padrao: form.prompt_padrao });
      sucesso.value = 'Categoria criada. Professores herdaram o padrão.';
    }
    fecharForm();
    await recarregar();
  } catch (err) {
    erro.value = err.message;
  } finally {
    salvando.value = false;
  }
}

async function alternar(t) {
  erro.value = '';
  sucesso.value = '';
  try {
    await TipoDocumentoModel.alternarAtivo(t.id_tipo);
    sucesso.value = `Categoria "${t.nome}" ${t.ativo ? 'desativada' : 'ativada'}.`;
    await recarregar();
  } catch (err) {
    erro.value = err.message;
  }
}

async function excluir(t) {
  erro.value = '';
  sucesso.value = '';
  if (!window.confirm(`Excluir a categoria "${t.nome}"? Só é possível se nunca foi usada.`)) return;
  try {
    await TipoDocumentoModel.remover(t.id_tipo);
    sucesso.value = 'Categoria excluída.';
    await recarregar();
  } catch (err) {
    erro.value = err.message;
  }
}

onMounted(recarregar);
</script>
