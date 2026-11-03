<template>
  <div class="kanban-wrap">
    <div class="kanban-topo">
      <div>
        <h2>Quadro Kanban</h2>
        <p class="metadado">
          Arraste os cartões entre as colunas. Use as setas nos cartões para mover sem arrastar.
        </p>
      </div>
      <button v-if="podeCriar" type="button" class="botao primario" @click="abrirNovo">
        <Icon name="plus" :size="16" />
        Novo cartão
      </button>
    </div>

    <AlertMessage :mensagem="erro" tipo="erro" />
    <AlertMessage :mensagem="sucesso" tipo="sucesso" />
    <AlertMessage :mensagem="tarefaState.erro" tipo="erro" />

    <Spinner :carregando="carregando" />

    <div class="kanban" :aria-busy="carregando">
      <section
        v-for="coluna in colunas"
        :key="coluna.status"
        class="coluna-kanban"
        :class="{ 'coluna-destino': destino.status === coluna.status }"
        @dragover.prevent="marcarDestino(coluna.status, null)"
        @dragleave.self="limparDestino"
        @drop.prevent.stop="soltarNoFim($event, coluna)"
      >
        <header class="cabecalho-coluna">
          <span class="ponto-status" :class="classeStatus(coluna.status)" aria-hidden="true"></span>
          <h3>{{ coluna.titulo }}</h3>
          <span class="contador-coluna">{{ coluna.cartoes.length }}</span>
        </header>

        <div class="cartoes-coluna">
          <div
            v-for="tarefa in coluna.cartoes"
            :key="tarefa.id_tarefa"
            class="slot-cartao"
            :class="{ 'slot-destino': destino.antesDe === tarefa.id_tarefa }"
            @dragover.prevent.stop="marcarDestino(coluna.status, tarefa.id_tarefa)"
            @drop.prevent.stop="soltarAntes($event, coluna, tarefa)"
          >
            <TarefaCard
              :tarefa="tarefa"
              :arrastando="arrastandoId === tarefa.id_tarefa"
              @arrastar="iniciarArraste"
              @fim-arraste="fimArraste"
              @editar="abrirEdicao"
              @mover="moverColuna"
            />
          </div>

          <div v-if="!coluna.cartoes.length" class="coluna-vazia">
            Nenhum cartão em {{ coluna.titulo.toLowerCase() }}.
          </div>
        </div>
      </section>
    </div>

    <div v-if="modalAberto" class="modal-fundo" @click.self="fecharModal">
      <div class="modal-cartao" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-cartao">
        <div class="modal-cabecalho">
          <h2 id="titulo-modal-cartao">{{ editando ? 'Editar cartão' : 'Novo cartão' }}</h2>
          <button type="button" class="botao-icone" aria-label="Fechar" @click="fecharModal">
            <Icon name="x" :size="18" />
          </button>
        </div>

        <form @submit.prevent="salvar">
          <div class="campo">
            <label for="kanban-titulo">Título</label>
            <input
              id="kanban-titulo"
              v-model="form.titulo"
              type="text"
              maxlength="160"
              placeholder="Ex: Revisar capítulo 3"
              required
            />
          </div>

          <div class="campo">
            <label for="kanban-descricao">Descrição</label>
            <textarea
              id="kanban-descricao"
              v-model="form.descricao"
              rows="3"
              maxlength="2000"
              placeholder="Detalhe o que precisa ser feito"
              required
            ></textarea>
          </div>

          <div class="grid-2">
            <div class="campo">
              <label for="kanban-responsavel">Responsável</label>
              <select id="kanban-responsavel" v-model="form.id_responsavel" required>
                <option value="" disabled>Selecionar...</option>
                <option v-for="u in responsaveis" :key="u.id_usuario" :value="u.id_usuario">
                  {{ u.nome }}
                </option>
              </select>
            </div>
            <div class="campo">
              <label for="kanban-prazo">Prazo</label>
              <CampoData id="kanban-prazo" v-model="form.data_limite" limpar />
            </div>
            <div class="campo">
              <label for="kanban-prioridade">Prioridade</label>
              <select id="kanban-prioridade" v-model="form.prioridade">
                <option v-for="p in PRIORIDADES_KANBAN" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
          </div>

          <fieldset class="campo grupo-cores">
            <legend>Cor do cartão</legend>
            <div class="paleta-cores">
              <button
                v-for="c in CORES_KANBAN"
                :key="c.chave"
                type="button"
                class="swatch-cor"
                :class="[`swatch-${c.chave}`, { selecionado: form.cor === c.chave }]"
                :aria-pressed="form.cor === c.chave"
                :aria-label="`Cor ${c.rotulo}`"
                :title="c.rotulo"
                @click="form.cor = c.chave"
              >
                <Icon v-if="form.cor === c.chave" name="check" :size="14" />
              </button>
            </div>
          </fieldset>

          <div class="modal-acoes">
            <button type="submit" class="botao primario" :disabled="tarefaState.salvando">
              {{ tarefaState.salvando ? 'Salvando...' : 'Salvar cartão' }}
            </button>
            <button type="button" class="botao secundario" @click="fecharModal">Cancelar</button>
            <button
              v-if="editando && podeArquivar(editando)"
              type="button"
              class="botao perigo empurra-esq"
              :disabled="tarefaState.salvando"
              @click="arquivar(editando)"
            >
              Arquivar cartão
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import TarefaController, { tarefaState } from '../../controllers/TarefaController.js';
import { authState } from '../../controllers/AuthController.js';
import {
  COLUNAS_KANBAN,
  CORES_KANBAN,
  PRIORIDADES_KANBAN,
  calcularOrdem,
  colunaDoStatus,
  statusDaColunaVizinha,
} from '../../utils/kanban.js';
import TarefaCard from './TarefaCard.vue';
import AlertMessage from './AlertMessage.vue';
import CampoData from './CampoData.vue';
import Icon from './Icon.vue';
import Spinner from './Spinner.vue';

const props = defineProps({
  idOrientacao: { type: String, required: true },
  tarefas: { type: Array, default: () => [] },
  responsaveis: { type: Array, default: () => [] },
  podeCriar: { type: Boolean, default: false },
  carregando: { type: Boolean, default: false },
});

const emit = defineEmits(['arquivado']);

const erro = ref('');
const sucesso = ref('');
const modalAberto = ref(false);
const editando = ref(null);
const arrastandoId = ref(null);
const destino = ref({ status: null, antesDe: null });

const form = reactive({
  titulo: '',
  descricao: '',
  id_responsavel: '',
  data_limite: '',
  prioridade: 'Média',
  cor: 'branco',
});

const colunas = computed(() =>
  COLUNAS_KANBAN.map((coluna) => ({
    ...coluna,
    cartoes: props.tarefas
      .filter((t) => colunaDoStatus(t.status) === coluna.status)
      .sort(
        (a, b) =>
          Number(a.ordem) - Number(b.ordem) ||
          String(a.data_cadastro || '').localeCompare(String(b.data_cadastro || '')),
      ),
  })),
);

function classeStatus(status) {
  return {
    Pendente: 'status-pendente',
    'Em Andamento': 'status-andamento',
    Concluída: 'status-concluida',
  }[status];
}

function resetForm() {
  form.titulo = '';
  form.descricao = '';
  form.id_responsavel = props.responsaveis[0]?.id_usuario || '';
  form.data_limite = '';
  form.prioridade = 'Média';
  form.cor = 'branco';
}

function abrirNovo() {
  erro.value = '';
  sucesso.value = '';
  editando.value = null;
  resetForm();
  modalAberto.value = true;
}

function abrirEdicao(tarefa) {
  erro.value = '';
  sucesso.value = '';
  editando.value = tarefa;
  form.titulo = tarefa.titulo || tarefa.descricao || '';
  form.descricao = tarefa.descricao || '';
  form.id_responsavel = tarefa.id_responsavel || '';
  form.data_limite = tarefa.data_limite || '';
  form.prioridade = tarefa.prioridade || 'Média';
  form.cor = tarefa.cor || 'branco';
  modalAberto.value = true;
}

function fecharModal() {
  modalAberto.value = false;
  editando.value = null;
  erro.value = '';
}

function payload() {
  return {
    titulo: form.titulo,
    descricao: form.descricao,
    id_responsavel: form.id_responsavel,
    data_limite: form.data_limite || null,
    prioridade: form.prioridade,
    cor: form.cor,
  };
}

async function salvar() {
  erro.value = '';
  sucesso.value = '';
  try {
    if (editando.value) {
      await TarefaController.atualizar(editando.value, payload());
      sucesso.value = 'Cartão atualizado.';
    } else {
      await TarefaController.criar(props.idOrientacao, payload());
      sucesso.value = 'Cartão criado.';
    }
    fecharModal();
  } catch (err) {
    erro.value = err.message;
  }
}

function podeArquivar(tarefa) {
  const usuario = authState.user;
  if (!usuario || !tarefa) return false;
  if (['Professor', 'Coordenador', 'Administrador'].includes(usuario.tipo_usuario)) return true;
  return Boolean(tarefa.id_criador) && tarefa.id_criador === usuario.id_usuario;
}

async function arquivar(tarefa) {
  if (!window.confirm('Arquivar este cartão? Ele sairá do Kanban, da lista e do dashboard.')) return;
  erro.value = '';
  sucesso.value = '';
  try {
    await TarefaController.arquivar(tarefa);
    fecharModal();
    sucesso.value = 'Cartão arquivado.';
    emit('arquivado');
  } catch (err) {
    erro.value = err.message;
  }
}

function iniciarArraste(event, tarefa) {
  arrastandoId.value = tarefa.id_tarefa;
  destino.value = { status: null, antesDe: null };
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tarefa.id_tarefa);
  }
}

function fimArraste() {
  arrastandoId.value = null;
  destino.value = { status: null, antesDe: null };
}

function limparDestino() {
  if (!arrastandoId.value) destino.value = { status: null, antesDe: null };
}

function marcarDestino(status, antesDe) {
  if (!arrastandoId.value) return;
  destino.value = { status, antesDe };
}

async function executarMover(tarefa, status, ordem) {
  erro.value = '';
  try {
    await TarefaController.mover(tarefa, status, ordem);
  } catch (err) {
    erro.value = err.message;
  } finally {
    fimArraste();
  }
}

function soltarAntes(event, coluna, alvo) {
  event.preventDefault();
  event.stopPropagation();
  const tarefa = props.tarefas.find((t) => t.id_tarefa === arrastandoId.value);
  if (!tarefa || tarefa.id_tarefa === alvo.id_tarefa) {
    fimArraste();
    return;
  }
  const lista = coluna.cartoes.filter((t) => t.id_tarefa !== tarefa.id_tarefa);
  let indice = lista.findIndex((t) => t.id_tarefa === alvo.id_tarefa);
  if (indice < 0) indice = lista.length;
  executarMover(tarefa, coluna.status, calcularOrdem(lista, indice));
}

function soltarNoFim(event, coluna) {
  event.preventDefault();
  const tarefa = props.tarefas.find((t) => t.id_tarefa === arrastandoId.value);
  if (!tarefa) {
    fimArraste();
    return;
  }
  const lista = coluna.cartoes.filter((t) => t.id_tarefa !== tarefa.id_tarefa);
  executarMover(tarefa, coluna.status, calcularOrdem(lista, lista.length));
}

async function moverColuna(tarefa, direcao) {
  const status = statusDaColunaVizinha(tarefa.status, direcao);
  if (!status) return;
  const coluna = colunas.value.find((c) => c.status === status);
  const lista = coluna?.cartoes || [];
  await executarMover(tarefa, status, calcularOrdem(lista, lista.length));
}

function aoTeclar(event) {
  if (event.key === 'Escape' && modalAberto.value) fecharModal();
}

onMounted(() => window.addEventListener('keydown', aoTeclar));
onBeforeUnmount(() => window.removeEventListener('keydown', aoTeclar));
</script>
