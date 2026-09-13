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
            <label for="senha">Nova senha (deixe vazio para manter)</label>
            <input id="senha" v-model="form.senha" type="password" autocomplete="new-password" placeholder="••••••••" />
          </div>
          <div class="campo">
            <label>Tipo de Usuário</label>
            <input :value="authState.user?.tipo_usuario" type="text" disabled style="background: #f4f6fa" />
          </div>
        </div>
        <button type="submit" class="botao primario" :disabled="salvando">{{ salvando ? 'Salvando...' : 'Salvar alterações' }}</button>
      </form>
    </div>

    <div class="cartao" v-if="authState.user?.perfil">
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

    <div class="cartao" v-if="authState.user?.tipo_usuario === 'Professor'">
      <h2>E-mail institucional (avisos automáticos)</h2>
      <p style="font-size: 0.85rem; color: var(--cor-texto-suave)">
        Os avisos de prazo aos seus alunos partem do seu e-mail institucional, via SMTP da universidade.
        A senha é guardada cifrada e nunca exibida. Trocou a senha institucional? Recadastre-a aqui.
      </p>
      <AlertMessage v-if="emailInfo?.integracao?.requer_reconexao" mensagem="A autenticação com o servidor de e-mail falhou (senha alterada?). Recadastre sua senha institucional abaixo." tipo="erro" />
      <AlertMessage :mensagem="emailErro" tipo="erro" />
      <AlertMessage :mensagem="emailSucesso" tipo="sucesso" />
      <div v-if="emailInfo && !emailInfo.smtp_configurado" class="linha-vazia">
        Envio de e-mail ainda não configurado pelo administrador (modo demonstração: avisos só em tela).
      </div>
      <template v-else>
        <div v-if="emailInfo?.integracao" style="margin-bottom: 0.75rem; font-size: 0.9rem">
          <strong>Remetente:</strong> {{ emailInfo.integracao.email_remetente }} ·
          <strong>Usuário SMTP:</strong> {{ emailInfo.integracao.smtp_user }}
        </div>
        <form class="grid-2" @submit.prevent="salvarEmail">
          <div class="campo">
            <label for="emailRem">E-mail remetente</label>
            <input id="emailRem" v-model="formEmail.email_remetente" type="email" required placeholder="voce@universidade.edu.br" />
          </div>
          <div class="campo">
            <label for="smtpUser">Usuário SMTP institucional</label>
            <input id="smtpUser" v-model="formEmail.smtp_user" type="text" required autocomplete="username" />
          </div>
          <div class="campo">
            <label for="smtpPass">Senha institucional</label>
            <input id="smtpPass" v-model="formEmail.smtp_pass" type="password" required autocomplete="new-password" />
          </div>
          <div style="grid-column: 1 / -1">
            <button type="submit" class="botao primario" :disabled="salvandoEmail">{{ salvandoEmail ? 'Salvando...' : 'Salvar integração' }}</button>
            <button type="button" class="botao secundario" style="margin-left: 0.5rem" :disabled="testandoEmail || !emailInfo?.integracao" @click="testarEmail">
              {{ testandoEmail ? 'Enviando...' : 'Enviar e-mail de teste' }}
            </button>
          </div>
        </form>
      </template>
    </div>

    <div class="cartao" v-if="authState.user?.tipo_usuario === 'Professor'">
      <h2>Prompts de avaliação por IA</h2>
      <p style="font-size: 0.85rem; color: var(--cor-texto-suave)">
        Personalize como o agente de IA avalia os trabalhos dos seus alunos, por categoria.
        Vale para os próximos envios; avaliações já feitas guardam o prompt usado.
      </p>
      <AlertMessage :mensagem="promptErro" tipo="erro" />
      <AlertMessage :mensagem="promptSucesso" tipo="sucesso" />
      <Spinner :carregando="promptState.carregando" />
      <div v-for="p in promptState.prompts" :key="p.id_tipo" class="campo">
        <label :for="'prompt-' + p.id_tipo">Prompt — {{ p.tipo }}</label>
        <textarea :id="'prompt-' + p.id_tipo" v-model="promptsEdit[p.id_tipo]" rows="6"></textarea>
        <div style="margin-top: 0.4rem">
          <button type="button" class="botao primario" :disabled="promptState.salvando[p.id_tipo]" @click="salvarPrompt(p)">
            {{ promptState.salvando[p.id_tipo] ? 'Salvando...' : 'Salvar' }}
          </button>
          <button type="button" class="botao secundario" style="margin-left: 0.5rem" :disabled="promptState.salvando[p.id_tipo]" @click="restaurarPrompt(p)">
            Restaurar padrão
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { authState, AuthController } from '../controllers/AuthController.js';
import PromptAvaliacaoController, { promptState } from '../controllers/PromptAvaliacaoController.js';
import EmailModel from '../models/EmailModel.js';
import AlertMessage from './components/AlertMessage.vue';
import Spinner from './components/Spinner.vue';

const form = reactive({
  nome: authState.user?.nome || '',
  email: authState.user?.email || '',
  senha: '',
});
const erro = ref('');
const sucesso = ref('');
const salvando = ref(false);
const promptsEdit = reactive({});
const promptErro = ref('');
const promptSucesso = ref('');
const emailInfo = ref(null);
const formEmail = reactive({ email_remetente: '', smtp_user: '', smtp_pass: '' });
const emailErro = ref('');
const emailSucesso = ref('');
const salvandoEmail = ref(false);
const testandoEmail = ref(false);

async function salvar() {
  erro.value = '';
  sucesso.value = '';
  salvando.value = true;
  try {
    const dados = { nome: form.nome, email: form.email };
    if (form.senha) dados.senha = form.senha;
    await AuthController.atualizarPerfil(dados);
    form.senha = '';
    sucesso.value = 'Perfil atualizado com sucesso.';
  } catch (err) {
    erro.value = err.message;
  } finally {
    salvando.value = false;
  }
}

onMounted(async () => {
  if (authState.user?.tipo_usuario === 'Professor') {
    await PromptAvaliacaoController.carregar();
    for (const p of promptState.prompts) promptsEdit[p.id_tipo] = p.prompt;
    try {
      emailInfo.value = await EmailModel.minha();
      if (emailInfo.value?.integracao) {
        formEmail.email_remetente = emailInfo.value.integracao.email_remetente || '';
        formEmail.smtp_user = emailInfo.value.integracao.smtp_user || '';
      }
    } catch {
      emailInfo.value = null;
    }
  }
});

async function salvarEmail() {
  emailErro.value = '';
  emailSucesso.value = '';
  salvandoEmail.value = true;
  try {
    emailInfo.value = { ...(emailInfo.value || {}), integracao: await EmailModel.salvar({ ...formEmail }) };
    formEmail.smtp_pass = '';
    emailSucesso.value = 'Integração de e-mail salva.';
  } catch (err) {
    emailErro.value = err.message;
  } finally {
    salvandoEmail.value = false;
  }
}

async function testarEmail() {
  emailErro.value = '';
  emailSucesso.value = '';
  testandoEmail.value = true;
  try {
    const r = await EmailModel.testar();
    emailSucesso.value = `E-mail de teste enviado para ${r.para}.`;
    emailInfo.value = await EmailModel.minha();
  } catch (err) {
    emailErro.value = err.message;
    try {
      emailInfo.value = await EmailModel.minha();
    } catch {
      // mantém estado
    }
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