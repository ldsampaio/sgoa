<template>
  <div class="pagina-login">
    <aside class="lado-visual">
      <div class="brand">
        <span class="logo">🎓 SGOA</span>
      </div>
      <h1>Recuperação de senha</h1>
      <p class="resumo">
        Enviamos um código de 6 dígitos para o seu e-mail cadastrado. Digite o código para definir
        uma nova senha e voltar a acessar o sistema.
      </p>
    </aside>

    <main class="lado-forms">
      <form class="caixa-login" @submit.prevent="acaoPrincipal">
        <h2>Recuperar senha</h2>

        <ol class="passos">
          <li :class="{ ativo: etapa === 1, feito: etapa > 1 }">1. E-mail</li>
          <li :class="{ ativo: etapa === 2, feito: etapa > 2 }">2. Código</li>
          <li :class="{ ativo: etapa === 3 }">3. Nova senha</li>
        </ol>

        <AlertMessage :mensagem="erro" tipo="erro" />
        <AlertMessage :mensagem="info" tipo="sucesso" />

        <!-- Passo 1 -->
        <template v-if="etapa === 1">
          <div class="campo">
            <label for="email">E-mail cadastrado</label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="voce@instituicao.edu"
            />
          </div>
          <button class="botao primario" style="width: 100%; justify-content: center" :disabled="carregando">
            {{ carregando ? 'Enviando...' : 'Enviar código' }}
          </button>
        </template>

        <!-- Passo 2 -->
        <template v-else-if="etapa === 2">
          <p class="dica">Enviamos um código de 6 dígitos para <strong>{{ email }}</strong>. Ele vale por 15 minutos.</p>
          <div class="campo">
            <label for="codigo">Código de 6 dígitos</label>
            <input
              id="codigo"
              v-model="codigo"
              inputmode="numeric"
              autocomplete="one-time-code"
              required
              maxlength="6"
              minlength="6"
              placeholder="000000"
              class="codigo-input"
            />
          </div>
          <button class="botao primario" style="width: 100%; justify-content: center" :disabled="carregando">
            {{ carregando ? 'Verificando...' : 'Verificar código' }}
          </button>
          <div class="acoes-secundarias">
            <button type="button" class="botao secundario" :disabled="carregando || cooldown > 0" @click="reenviar">
              {{ cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código' }}
            </button>
            <button type="button" class="link" :disabled="carregando" @click="voltarEmail">Trocar e-mail</button>
          </div>
        </template>

        <!-- Passo 3 -->
        <template v-else>
          <div class="campo">
            <label for="novaSenha">Nova senha</label>
            <input
              id="novaSenha"
              v-model="novaSenha"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              placeholder="••••••••"
            />
          </div>
          <div class="campo">
            <label for="confirmar">Confirmar nova senha</label>
            <input
              id="confirmar"
              v-model="confirmar"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              placeholder="••••••••"
            />
          </div>
          <p class="dica">Mínimo 8 caracteres, com maiúsculas, minúsculas, números e caracter especial.</p>
          <button class="botao primario" style="width: 100%; justify-content: center" :disabled="carregando">
            {{ carregando ? 'Salvando...' : 'Redefinir senha' }}
          </button>
          <div v-if="concluido" class="acoes-secundarias">
            <RouterLink to="/login" class="botao secundario">Voltar ao login</RouterLink>
          </div>
        </template>

        <p class="voltar">
          <RouterLink to="/login">← Voltar ao login</RouterLink>
        </p>
      </form>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AuthModel from '../models/AuthModel.js';
import AlertMessage from './components/AlertMessage.vue';

const etapa = ref(1);
const email = ref('');
const codigo = ref('');
const novaSenha = ref('');
const confirmar = ref('');
const erro = ref('');
const info = ref('');
const carregando = ref(false);
const concluido = ref(false);
const cooldown = ref(0);
let timer = null;

function iniciarCooldown() {
  cooldown.value = 60;
  clearInterval(timer);
  timer = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0) clearInterval(timer);
  }, 1000);
}

async function acaoPrincipal() {
  if (etapa.value === 1) return solicitar();
  if (etapa.value === 2) return verificar();
  return redefinir();
}

async function solicitar() {
  erro.value = '';
  info.value = '';
  carregando.value = true;
  try {
    const r = await AuthModel.solicitarCodigo(email.value.trim());
    info.value = r?.mensagem || 'Se o e-mail estiver cadastrado, enviamos um código de recuperação.';
    etapa.value = 2;
    iniciarCooldown();
  } catch (err) {
    erro.value = err.message;
  } finally {
    carregando.value = false;
  }
}

async function reenviar() {
  await solicitar();
}

function voltarEmail() {
  erro.value = '';
  info.value = '';
  etapa.value = 1;
}

async function verificar() {
  erro.value = '';
  info.value = '';
  if (!/^\d{6}$/.test(codigo.value.trim())) {
    erro.value = 'Digite o código de 6 dígitos recebido por e-mail.';
    return;
  }
  carregando.value = true;
  try {
    await AuthModel.verificarCodigo(email.value.trim(), codigo.value.trim());
    info.value = 'Código válido. Defina sua nova senha.';
    etapa.value = 3;
  } catch (err) {
    erro.value = err.message;
  } finally {
    carregando.value = false;
  }
}

async function redefinir() {
  erro.value = '';
  info.value = '';
  if (novaSenha.value !== confirmar.value) {
    erro.value = 'As senhas não conferem.';
    return;
  }
  carregando.value = true;
  try {
    const r = await AuthModel.redefinirSenha(email.value.trim(), codigo.value.trim(), novaSenha.value);
    info.value = r?.mensagem || 'Senha redefinida com sucesso. Faça login com a nova senha.';
    concluido.value = true;
  } catch (err) {
    erro.value = err.message;
  } finally {
    carregando.value = false;
  }
}
</script>

<style scoped>
.passos {
  display: flex;
  gap: 0.5rem;
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cor-texto-suave);
}
.passos li {
  flex: 1;
  padding: 0.35rem 0.5rem;
  border-radius: 999px;
  background: #eef2f7;
  text-align: center;
}
.passos li.ativo {
  background: var(--cor-primaria);
  color: #fff;
}
.passos li.feito {
  background: #dcfce7;
  color: #166534;
}
.codigo-input {
  letter-spacing: 0.4em;
  text-align: center;
  font-size: 1.3rem;
  font-weight: 700;
}
.dica {
  font-size: 0.85rem;
  color: var(--cor-texto-suave);
}
.acoes-secundarias {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.75rem;
}
.link {
  background: none;
  border: none;
  color: var(--cor-primaria-clara);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}
.voltar {
  margin-top: 1rem;
  font-size: 0.85rem;
}
</style>
