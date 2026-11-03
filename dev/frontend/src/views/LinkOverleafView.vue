<template>
  <div>
    <Spinner :carregando="enlaceState.carregando" />
    <AlertMessage v-if="enlaceState.erro" :mensagem="enlaceState.erro" tipo="erro" />
    <AlertMessage v-if="acaoSucesso" :mensagem="acaoSucesso" tipo="sucesso" />

    <div class="cartao">
      <h2>Registrar link Overleaf</h2>
      <form class="form-enlace" @submit.prevent="registrar">
        <div class="campo">
          <label for="grupoEnlace">Orientação</label>
          <select id="grupoEnlace" v-model="form.id_orientacao" required>
            <option v-for="g in grupos" :key="g.id_orientacao" :value="g.id_orientacao">
              {{ g.titulo }} ({{ g.tipo }})
            </option>
          </select>
        </div>
        <div class="campo">
          <label for="catEnlace">Tipo de documento</label>
          <select id="catEnlace" v-model="form.categoria" required>
            <option v-for="c in enlaceState.categorias" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="campo">
          <label for="urlEnlace">Link (domínio {{ hostOverleaf }})</label>
          <input
            id="urlEnlace"
            v-model="form.url"
            type="url"
            :placeholder="`https://${hostOverleaf}/project/...`"
            required
          />
        </div>
        <div class="campo">
          <label for="obsEnlace">Observação (opcional)</label>
          <input id="obsEnlace" v-model="form.observacao" type="text" />
        </div>
        <button type="submit" class="botao primario" :disabled="enlaceState.salvando || !grupos.length">
          {{ enlaceState.salvando ? 'Registrando...' : 'Registrar' }}
        </button>
      </form>
    </div>

    <div class="cartao">
      <h2>Links Overleaf — visão rápida</h2>
      <p class="metadado">
        Os links que <em>você</em> fixou vêm primeiro; fixar um link não muda a lista dos outros.
      </p>

      <div v-if="!grupos.length && !enlaceState.carregando" class="linha-vazia">
        Nenhuma orientação em que você participa.
      </div>

      <div v-for="grupo in grupos" :key="grupo.id_orientacao" class="desce-3">
        <h3>
          {{ grupo.titulo }}
          <span class="pilula">{{ grupo.tipo }}</span>
          <RouterLink :to="{ name: 'orientacao-detalhe', params: { id: grupo.id_orientacao } }" class="link-mais">
            Abrir orientação
            <Icon name="arrow-right" :size="14" />
          </RouterLink>
        </h3>
        <div v-if="!grupo.enlaces.length" class="linha-vazia">Nenhum link nesta orientação.</div>
        <EnlaceItem
          v-for="e in grupo.enlaces"
          :key="e.id_enlace"
          :enlace="e"
          :categorias="enlaceState.categorias"
          :salvando="enlaceState.salvando"
          @destacar="destacar"
          @salvar="salvar"
          @remover="excluir"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue';
import AlertMessage from './components/AlertMessage.vue';
import Spinner from './components/Spinner.vue';
import Icon from './components/Icon.vue';
import EnlaceItem from './components/EnlaceItem.vue';
import EnlaceController, { enlaceState } from '../controllers/EnlaceOverleafController.js';
import OrientacaoModel from '../models/OrientacaoModel.js';
import { HOST_OVERLEAF } from '../utils/overleaf.js';

const hostOverleaf = HOST_OVERLEAF;
const acaoSucesso = ref('');
const orientacoes = ref([]);
const form = reactive({ id_orientacao: '', categoria: '', url: '', observacao: '' });

// Agrupa por orientação (mesmo sem link ainda), com o grupo que tem link fixado primeiro.
const grupos = computed(() => {
  const mapa = new Map();
  for (const o of orientacoes.value) {
    mapa.set(o.id_orientacao, {
      id_orientacao: o.id_orientacao,
      titulo: o.titulo_provisorio || 'Orientação',
      tipo: o.tipo,
      enlaces: [],
    });
  }
  for (const e of enlaceState.lista) {
    if (!mapa.has(e.id_orientacao)) {
      mapa.set(e.id_orientacao, {
        id_orientacao: e.id_orientacao,
        titulo: e.titulo_provisorio || 'Orientação',
        tipo: e.tipo_orientacao,
        enlaces: [],
      });
    }
    mapa.get(e.id_orientacao).enlaces.push(e);
  }
  const lista = [...mapa.values()];
  lista.sort((a, b) => temDestaque(b) - temDestaque(a) || b.enlaces.length - a.enlaces.length);
  return lista;
});

function temDestaque(g) {
  return g.enlaces.some((e) => e.destacado) ? 1 : 0;
}

async function registrar() {
  acaoSucesso.value = '';
  try {
    await EnlaceController.criar(form.id_orientacao, {
      categoria: form.categoria,
      url: form.url,
      observacao: form.observacao || undefined,
    });
    form.url = '';
    form.observacao = '';
    acaoSucesso.value = 'Link registrado e os participantes foram notificados.';
  } catch (err) {
    enlaceState.erro = err.message;
  }
}

async function salvar(enlace, dados) {
  acaoSucesso.value = '';
  try {
    await EnlaceController.atualizar(enlace, dados);
    acaoSucesso.value = 'Link atualizado.';
  } catch (err) {
    enlaceState.erro = err.message;
  }
}

async function excluir(enlace) {
  acaoSucesso.value = '';
  if (!window.confirm('Excluir este link Overleaf?')) return;
  try {
    await EnlaceController.remover(enlace);
    acaoSucesso.value = 'Link excluído.';
  } catch (err) {
    enlaceState.erro = err.message;
  }
}

async function destacar(enlace) {
  try {
    await EnlaceController.destacar(enlace);
  } catch (err) {
    enlaceState.erro = err.message;
  }
}

onMounted(async () => {
  try {
    orientacoes.value = await OrientacaoModel.list();
  } catch {
    orientacoes.value = [];
  }
  await EnlaceController.carregarMeus();
  if (grupos.value.length) form.id_orientacao = grupos.value[0].id_orientacao;
});
</script>

<style scoped>
.form-enlace {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

h3 {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-family: var(--font-display);
}
</style>
