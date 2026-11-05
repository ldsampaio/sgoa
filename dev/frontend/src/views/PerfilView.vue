<template>
  <div>
    <div class="cartao">
      <h2>Meu Perfil</h2>
      <AlertMessage :mensagem="erro" tipo="erro" />
      <AlertMessage :mensagem="sucesso" tipo="sucesso" />

      <form @submit.prevent="salvar">
        <div class="grid-2">
          <div class="campo">
            <label for="nome">Nome</label>
            <input id="nome" v-model="form.nome" type="text" required />
          </div>
          <div class="campo">
            <label for="email">E-mail institucional</label>
            <input id="email" v-model="form.email" type="email" required placeholder="nome@utfpr.edu.br" />
          </div>
          <div class="campo">
            <label>Papel no SGOA</label>
            <input :value="papeisNaTela" type="text" disabled />
          </div>
        </div>
        <p class="metadado">
          Conta no SGOA: <strong>{{ papeisNaTela }}</strong>
          <template v-if="authState.user?.conta">
            · id {{ authState.user.conta.id_aluno || authState.user.conta.id_professor }}
          </template>
          <template v-else>· sem conta vinculada a este papel</template>
        </p>
        <button type="submit" class="botao primario" :disabled="salvando">{{ salvando ? 'Salvando...' : 'Salvar alterações' }}</button>
      </form>
    </div>

    <div class="cartao cartao-tabela" v-if="authState.user?.perfil">
      <h2>Dados Acadêmicos</h2>
      <table class="tabela">
        <tbody>
          <tr v-if="authState.user.perfil.matricula">
            <td><strong>Matrícula</strong></td>
            <td>{{ authState.user.perfil.matricula }}</td>
          </tr>
          <tr v-if="authState.user.perfil.departamento">
            <td><strong>Departamento</strong></td>
            <td>{{ authState.user.perfil.departamento }}</td>
          </tr>
          <tr v-if="authState.user.perfil.curso">
            <td><strong>Curso</strong></td>
            <td>{{ authState.user.perfil.curso }}</td>
          </tr>
          <tr v-if="authState.user.perfil.programa_pos">
            <td><strong>Programa de Pós-graduação</strong></td>
            <td>{{ authState.user.perfil.programa_pos }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="cartao" v-if="temPapel(authState.user, 'Administrador')">
      <h2>E-mail institucional (conta do projeto)</h2>
      <p class="metadado">
        Os avisos de prazo partem da conta institucional única, configurada via ambiente no servidor
        (SMTP_USER/SMTP_FROM). Use o botão abaixo para testar o envio.
      </p>
      <AlertMessage :mensagem="emailErro" tipo="erro" />
      <AlertMessage :mensagem="emailSucesso" tipo="sucesso" />
      <button type="button" class="botao primario" :disabled="testandoEmail" @click="testarEmail">
        {{ testandoEmail ? 'Enviando...' : 'Enviar e-mail de teste' }}
      </button>
    </div>

    <div class="cartao" v-if="temPapel(authState.user, 'Professor')">
      <h2>Prompts de avaliação por IA</h2>
      <p class="metadado">
        Personalize como o agente de IA avalia os trabalhos dos seus alunos, por categoria.
        Vale para os próximos envios; avaliações já feitas guardam o prompt usado.
      </p>
      <AlertMessage :mensagem="promptErro" tipo="erro" />
      <AlertMessage :mensagem="promptSucesso" tipo="sucesso" />
      <Spinner :carregando="promptState.carregando" />
      <div v-for="p in promptState.prompts" :key="p.id_tipo" class="campo">
        <label :for="'prompt-' + p.id_tipo">Prompt — {{ p.tipo }}</label>
        <textarea :id="'prompt-' + p.id_tipo" v-model="promptsEdit[p.id_tipo]" rows="6"></textarea>
        <div class="desce-1">
          <button type="button" class="botao primario" :disabled="promptState.salvando[p.id_tipo]" @click="salvarPrompt(p)">
            {{ promptState.salvando[p.id_tipo] ? 'Salvando...' : 'Salvar' }}
          </button>
          <button type="button" class="botao secundario empurra-esq" :disabled="promptState.salvando[p.id_tipo]" @click="restaurarPrompt(p)">
            Restaurar padrão
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { authState, AuthController } from '../controllers/AuthController.js';
import { temPapel } from '../utils/papeis.js';
import PromptAvaliacaoController, { promptState } from '../controllers/PromptAvaliacaoController.js';
import EmailModel from '../models/EmailModel.js';
import AlertMessage from './components/AlertMessage.vue';
import Spinner from './components/Spinner.vue';

const form = reactive({
  nome: authState.user?.name || '',
  email: authState.user?.email || '',
});

// Um usuário pode ter mais de um papel no sgoa (ex. Administrador + Professor).
const papeisNaTela = computed(() => {
  const p = authState.user?.papeis;
  const lista = (Array.isArray(p) && p.length ? p : [authState.user?.papel]).filter(Boolean);
  return lista.join(' + ') || 'não identificada';
});
const erro = ref('');
const sucesso = ref('');
const salvando = ref(false);
const promptsEdit = reactive({});
const promptErro = ref('');
const promptSucesso = ref('');
const emailErro = ref('');
const emailSucesso = ref('');
const testandoEmail = ref(false);

async function salvar() {
  erro.value = '';
  sucesso.value = '';
  salvando.value = true;
  try {
    await AuthController.atualizarPerfil({ nome: form.nome, email: form.email });
    sucesso.value = 'Perfil atualizado com sucesso.';
  } catch (err) {
    erro.value = err.message;
  } finally {
    salvando.value = false;
  }
}

onMounted(async () => {
  if (temPapel(authState.user, 'Professor')) {
    await PromptAvaliacaoController.carregar();
    for (const p of promptState.prompts) promptsEdit[p.id_tipo] = p.prompt;
  }
});

async function testarEmail() {
  emailErro.value = '';
  emailSucesso.value = '';
  testandoEmail.value = true;
  try {
    const r = await EmailModel.testar();
    emailSucesso.value = `E-mail de teste enviado para ${r.para}.`;
  } catch (err) {
    emailErro.value = err.message;
  } finally {
    testandoEmail.value = false;
  }
}

async function salvarPrompt(p) {
  promptErro.value = '';
  promptSucesso.value = '';
  try {
    await PromptAvaliacaoController.salvar(p.id_tipo, promptsEdit[p.id_tipo]);
    promptSucesso.value = `Prompt de ${p.tipo} salvo.`;
  } catch (err) {
    promptErro.value = err.message;
  }
}

async function restaurarPrompt(p) {
  promptErro.value = '';
  promptSucesso.value = '';
  try {
    promptsEdit[p.id_tipo] = await PromptAvaliacaoController.restaurar(p.id_tipo);
    promptSucesso.value = `Prompt de ${p.tipo} restaurado ao padrão.`;
  } catch (err) {
    promptErro.value = err.message;
  }
}
</script>