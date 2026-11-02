<template>
  <div class="pagina-login">
    <aside class="lado-visual">
      <div class="brand">
        <Icon name="graduation-cap" :size="24" />
        <span class="logo">SGOA</span>
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
          <button class="botao primario botao-bloco" :disabled="carregando">
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
          <button class="botao primario botao-bloco" :disabled="carregando">
            {{ carregando ? 'Verificando...' : 'Verificar código' }}
          </button>
          <div class="acoes-secundarias">
            <button type="button" class="botao secundario" :disabled="carregando || cooldown > 0" @click="reenviar">
              {{ cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código' }}
            </button>
            <button type="button" class="link-acao" :disabled="carregando" @click="voltarEmail">Trocar e-mail</button>
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
          <button class="botao primario botao-bloco" :disabled="carregando">
            {{ carregando ? 'Salvando...' : 'Redefinir senha' }}
          </button>
          <div v-if="concluido" class="acoes-secundarias">
            <RouterLink to="/login" class="botao secundario">Voltar ao login</RouterLink>
          </div>
        </template>

        <p class="voltar">
          <RouterLink to="/login" class="link-voltar">
            <Icon name="arrow-left" :size="14" />
            Voltar ao login
          </RouterLink>
        </p>
      </form>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AuthModel from '../models/AuthModel.js';
import AlertMessage from './components/AlertMessage.vue';
import Icon from './components/Icon.vue';

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
/* Passos: pílulas clay (ativo = primário-soft com borda ink) */
.passos {
  display: flex;
  gap: var(--spacing-1);
  list-style: none;
  margin: 0 0 var(--spacing-3);
  padding: 0;
}

.passos li {
  flex: 1;
  padding: 6px 10px;
  border-radius: var(--radius-pill);
  border: 2px solid var(--color-border-soft);
  background: var(--color-card);
  text-align: center;
  font-family: var(--font-display);
  font-size: var(--size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
}

.passos li.ativo {
  background: var(--color-primary-soft);
  border-color: var(--color-border);
  color: var(--color-primary-strong);
  box-shadow: var(--shadow-flat);
}

.passos li.feito {
  border-color: var(--color-border-soft);
  color: var(--color-primary-strong);
}

/* Código OTP: espaçado e centralizado, DM Sans bold grande */
.codigo-input {
  letter-spacing: 0.4em;
  text-align: center;
  font-size: var(--size-lg);
  font-weight: 700;
  font-family: var(--font-display);
}

.dica {
  font-size: var(--size-sm);
  color: var(--color-text-muted);
}

.acoes-secundarias {
  display: flex;
  gap: var(--spacing-1);
  align-items: center;
  margin-top: var(--spacing-2);
  flex-wrap: wrap;
}

/* Link-ação (Trocar e-mail): touch target 44px, nunca só pela cor */
.link-acao {
  background: none;
  border: 2px solid transparent;
  color: var(--color-primary-strong);
  cursor: pointer;
  min-height: var(--touch-min-target);
  padding: 0 var(--spacing-2);
  border-radius: var(--radius-pill);
  font-size: var(--size-sm);
  font-weight: 700;
  font-family: var(--font-display);
}

.link-acao:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.voltar {
  margin-top: var(--spacing-3);
  text-align: center;
}

/* Link "Voltar ao login" com ícone de seta: flex alinhado */
.link-voltar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>

