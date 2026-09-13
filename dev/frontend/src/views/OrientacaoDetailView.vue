<template>
  <div>
    <RouterLink :to="{ name: 'dashboard' }">← Voltar para Dashboard</RouterLink>

    <Spinner :carregando="orientacaoState.carregando" />
    <AlertMessage v-if="orientacaoState.erro" :mensagem="orientacaoState.erro" tipo="erro" />

    <template v-if="orientacaoState.atual">
      <div class="cartao">
        <h2>
          Orientação: {{ orientacaoState.atual.tipo }} - {{ orientacaoState.atual.aluno.nome }} -
          <em>"{{ orientacaoState.atual.titulo_provisorio }}"</em>
        </h2>
        <p style="margin: 0.25rem 0">
          <strong>Orientador:</strong> {{ orientacaoState.atual.orientador.nome }} ·
          <strong>Co-orientador(es):</strong>
          {{ (orientacaoState.atual.co_orientadores || []).map((c) => c.nome).join(', ') || '—' }} ·
          <strong>Status:</strong> <StatusPill :status="orientacaoState.atual.status" /><br />
          <span style="color: var(--cor-texto-suave)">
            Início: {{ formatarData(orientacaoState.atual.data_inicio) }} ·
            Previsão de fim: {{ formatarData(orientacaoState.atual.data_previsao_fim) }}<br />
            <template v-if="orientacaoState.atual.prazos && (orientacaoState.atual.prazos.conclusao || orientacaoState.atual.prazos.qualificacao)">
              Matrícula do aluno: {{ formatarData(orientacaoState.atual.aluno?.data_matricula) }} ·
              Prazo máx. conclusão: {{ formatarData(orientacaoState.atual.prazos.conclusao) }} ({{ textoDias(orientacaoState.atual.prazos.dias_para_conclusao) }}) ·
              Exame de qualificação: {{ formatarData(orientacaoState.atual.prazos.qualificacao) }} ({{ textoDias(orientacaoState.atual.prazos.dias_para_qualificacao) }})
            </template>
          </span>
        </p>
        <RouterLink
          v-if="podeEditar"
          :to="{ name: 'orientacao-editar', params: { id: orientacaoState.atual.id_orientacao } }"
          class="botao secundario"
        >
          Editar orientação
        </RouterLink>
      </div>

      <div class="cartao">
        <h2>Etapas e Avisos Automáticos</h2>
        <div v-if="orientacaoState.atual.tipo !== 'TCC'">
          <strong>Qualificação:</strong>
          {{ orientacaoState.atual.etapas?.qualificacao_concluida_em
            ? `concluída em ${formatarData(orientacaoState.atual.etapas.qualificacao_concluida_em)}`
            : `prazo máx. ${formatarData(orientacaoState.atual.prazos?.qualificacao)} (${textoDias(orientacaoState.atual.prazos?.dias_para_qualificacao)})` }}
        </div>
        <div style="margin-top: 0.4rem">
          <strong>Defesa:</strong>
          {{ orientacaoState.atual.etapas?.defesa_concluida_em
            ? `concluída em ${formatarData(orientacaoState.atual.etapas.defesa_concluida_em)}`
            : `prazo máx. ${formatarData(orientacaoState.atual.prazos?.conclusao)} (${textoDias(orientacaoState.atual.prazos?.dias_para_conclusao)})` }}
        </div>

        <template v-if="podeGerenciarEtapas">
          <h3 style="margin-top: 1rem">Marcar conclusão de etapa</h3>
          <form class="grid-2" @submit.prevent="salvarEtapas">
            <div class="campo" v-if="orientacaoState.atual.tipo !== 'TCC'">
              <label for="qualiEm">Qualificação concluída em</label>
              <input id="qualiEm" v-model="formEtapas.qualificacao_concluida_em" type="date" />
            </div>
            <div class="campo">
              <label for="defesaEm">Defesa concluída em</label>
              <input id="defesaEm" v-model="formEtapas.defesa_concluida_em" type="date" />
            </div>
            <div style="grid-column: 1 / -1">
              <button type="submit" class="botao primario" :disabled="salvandoEtapas">{{ salvandoEtapas ? 'Salvando...' : 'Salvar etapas' }}</button>
            </div>
          </form>

          <h3 style="margin-top: 1rem">Configuração dos avisos</h3>
          <form class="grid-2" @submit.prevent="salvarConfigAvisos">
            <div class="campo" v-if="orientacaoState.atual.tipo !== 'TCC'">
              <label for="diasQuali">Dias antes da qualificação</label>
              <input id="diasQuali" v-model.number="formAvisos.dias_antes_qualificacao" type="number" min="0" step="1" required />
            </div>
            <div class="campo">
              <label for="diasDefesa">Dias antes da defesa</label>
              <input id="diasDefesa" v-model.number="formAvisos.dias_antes_defesa" type="number" min="0" step="1" required />
            </div>
            <div class="campo">
              <label for="freq">Frequência de envio</label>
              <select id="freq" v-model="formAvisos.frequencia" required>
                <option value="diaria">Diária</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>
            <div style="grid-column: 1 / -1">
              <button type="submit" class="botao primario" :disabled="salvandoAvisos">{{ salvandoAvisos ? 'Salvando...' : 'Salvar configuração' }}</button>
            </div>
          </form>

          <div v-if="envios.length" style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--cor-texto-suave)">
            Últimos avisos enviados: {{ envios.slice(0, 5).map((e) => `${e.etapa} em ${formatarDataHora(e.data_envio)}`).join(' · ') }}
          </div>
        </template>
      </div>

      <AlertMessage :mensagem="acaoErro" tipo="erro" />
      <AlertMessage :mensagem="acaoSucesso" tipo="sucesso" />

      <div class="abas">
        <button class="aba" :class="{ ativa: aba === 'visao' }" @click="aba = 'visao'">Visão Geral</button>
        <button class="aba" :class="{ ativa: aba === 'tarefas' }" @click="abrir('tarefas')">Tarefas</button>
        <button class="aba" :class="{ ativa: aba === 'reunioes' }" @click="abrir('reunioes')">Reuniões</button>
        <button class="aba" :class="{ ativa: aba === 'documentos' }" @click="abrir('documentos')">Documentos</button>
        <button class="aba" :class="{ ativa: aba === 'mensagens' }" @click="abrir('mensagens')">Mensagens</button>
      </div>

      <!-- ===== Visão Geral (linha do tempo) ===== -->
      <div v-if="aba === 'visao'" class="cartao">
        <h2>Linha do Tempo / Atividades</h2>
        <Spinner :carregando="orientacaoState.carregando" />
        <ul v-if="atividades.length" class="linha-tempo">
          <li v-for="(a, i) in atividades" :key="i">
            <StatusPill :status="a.tipo" />
            <strong>{{ a.titulo }}</strong>
            <div style="font-size: 0.85rem; color: var(--cor-texto-suave)">
              {{ a.descricao }} · {{ a.autor ? a.autor + ' · ' : '' }}{{ formatarDataHora(a.quando) }}
            </div>
          </li>
        </ul>
        <div v-else-if="!orientacaoState.carregando" class="linha-vazia">Nenhuma atividade registrada ainda.</div>
      </div>

      <!-- ===== Aba Tarefas ===== -->
      <div v-else-if="aba === 'tarefas'">
        <div class="cartao">
          <h2>
            Tarefas e Prazos
            <button v-if="!mostrarFormTarefa && podeCriarTarefa" class="botao primario" @click="mostrarFormTarefa = true">
              + Nova Tarefa
            </button>
          </h2>

          <form v-if="mostrarFormTarefa" class="grid-2" @submit.prevent="criarTarefa">
            <div class="campo">
              <label for="resp">Responsável</label>
              <select id="resp" v-model="formTarefa.id_responsavel" required>
                <option value="" disabled>Selecionar...</option>
                <option v-for="u in responsaveis" :key="u.id_usuario" :value="u.id_usuario">{{ u.nome }}</option>
              </select>
            </div>
            <div class="campo">
              <label for="prazo">Data Limite</label>
              <input id="prazo" v-model="formTarefa.data_limite" type="date" />
            </div>
            <div class="campo" style="grid-column: 1 / -1">
              <label for="desc">Descrição</label>
              <textarea id="desc" v-model="formTarefa.descricao" rows="2" required placeholder="Ex: Revisar capítulo 3"></textarea>
            </div>
            <div>
              <button type="submit" class="botao primario" :disabled="tarefaState.salvando">Salvar</button>
              <button type="button" class="botao secundario" style="margin-left: 0.5rem" @click="mostrarFormTarefa = false">Cancelar</button>
            </div>
          </form>

          <Spinner :carregando="tarefaState.carregando" />
          <div v-if="!tarefaState.lista.length && !tarefaState.carregando" class="linha-vazia">
            Nenhuma tarefa cadastrada.
          </div>
          <div v-for="t in ordenarTarefas" :key="t.id_tarefa" class="item-lista">
            <div>
              <button
                v-if="podeAtualizarTarefa(t)"
                class="caixa-check"
                :aria-label="'Marcar ' + (t.status === 'Concluída' ? 'pendente' : 'concluída')"
                :title="t.status === 'Concluída' ? 'Reabrir tarefa' : 'Marcar como concluída'"
                @click="avancarStatus(t)"
              >
                {{ t.status === 'Concluída' ? '✓' : '' }}
              </button>
              <span v-else class="caixa-check" :class="{ concluida: t.status === 'Concluída' }">{{ t.status === 'Concluída' ? '✓' : '' }}</span>
              {{ t.descricao }}
              <StatusPill :status="t.status" />
              <div style="font-size: 0.85rem; color: var(--cor-texto-suave)">
                Responsável: {{ t.nome_responsavel }} · Prazo: {{ formatarData(t.data_limite) }}
                <span v-if="t.concluida_em"> · Concluída em {{ formatarDataHora(t.concluida_em) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Aba Reuniões ===== -->
      <div v-else-if="aba === 'reunioes'">
        <div class="cartao">
          <h2>
            Reuniões
            <button v-if="!mostrarFormReuniao && podeCriarReuniao" class="botao primario" @click="mostrarFormReuniao = true">
              + Registrar Reunião
            </button>
          </h2>

          <div v-if="podeCriarReuniao" class="google-status" style="margin-bottom: 0.75rem; font-size: 0.85rem">
            <span v-if="googleState.carregando">Verificando Google Calendar...</span>
            <template v-else-if="googleState.conectado">
              📅 Google conectado como <strong>{{ googleState.emailGoogle }}</strong>
              <button type="button" class="botao secundario" style="margin-left: 0.5rem" @click="desconectarGoogle">
                Desconectar
              </button>
            </template>
            <template v-else>
              📅 Google Calendar não conectado.
              <button type="button" class="botao secundario" style="margin-left: 0.5rem" @click="conectarGoogle">
                Conectar Google
              </button>
            </template>
          </div>

          <form v-if="mostrarFormReuniao" @submit.prevent="criarReuniao(true)">
            <div class="campo">
              <label for="dh">Data e Hora</label>
              <input id="dh" v-model="formReuniao.data_hora" type="datetime-local" required />
            </div>
            <div class="campo">
              <label for="dur">Duração (minutos)</label>
              <input id="dur" v-model.number="formReuniao.duracaoMinutos" type="number" min="15" max="480" step="15" />
            </div>
            <div class="campo">
              <label for="pauta">Pauta / Assuntos</label>
              <textarea id="pauta" v-model="formReuniao.pauta" rows="2" placeholder="O que foi discutido"></textarea>
            </div>
            <div class="campo">
              <label for="dec">Decisões / Próximos Passos</label>
              <textarea id="dec" v-model="formReuniao.decisoes_proximos_passos" rows="2"></textarea>
            </div>
            <div class="campo">
              <label for="link">Link da reunião (preenchido sozinho ao agendar com Google)</label>
              <input id="link" v-model="formReuniao.link" type="url" placeholder="https://meet.google.com/..." />
            </div>
            <label style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem">
              <input v-model="formReuniao.criarNoGoogle" type="checkbox" />
              Criar evento no Google Calendar com link Meet
            </label>
            <button type="submit" class="botao primario" :disabled="reuniaoState.salvando">
              {{ reuniaoState.salvando ? 'Agendando...' : 'Salvar + Agendar' }}
            </button>
            <button type="button" class="botao secundario" style="margin-left: 0.5rem" :disabled="reuniaoState.salvando" @click="criarReuniao(false)">
              Salvar sem Google
            </button>
            <button type="button" class="botao secundario" style="margin-left: 0.5rem" @click="mostrarFormReuniao = false">Cancelar</button>
          </form>

          <Spinner :carregando="reuniaoState.carregando" />
          <div v-if="!reuniaoState.lista.length && !reuniaoState.carregando" class="linha-vazia">
            Nenhuma reunião registrada.
          </div>
          <div v-for="r in reuniaoState.lista" :key="r.id_reuniao" class="item-lista">
            <div>
              <strong>{{ formatarDataHora(r.data_hora) }}</strong>
              <span v-if="r.google_event_id" title="Sincronizada com o Google Calendar"> 📅</span>
              <div v-if="r.pauta" style="margin-top: 0.2rem">{{ r.pauta }}</div>
              <div v-if="r.decisoes_proximos_passos" style="font-size: 0.85rem; color: var(--cor-texto-suave)">
                <strong>Decisões:</strong> {{ r.decisoes_proximos_passos }}
              </div>
              <div v-if="r.link" style="margin-top: 0.3rem">
                <a :href="r.link" target="_blank" rel="noopener">Entrar no Meet</a>
              </div>
            </div>
            <button v-if="podeCriarReuniao" type="button" class="botao secundario" :disabled="reuniaoState.salvando" @click="excluirReuniao(r)">
              Excluir
            </button>
          </div>
        </div>
      </div>

      <!-- ===== Aba Documentos ===== -->
      <div v-else-if="aba === 'documentos'">
        <div class="cartao">
          <h2>
            Documentos
            <button v-if="!mostrarFormDoc && podeEnviarDoc" class="botao primario" @click="mostrarFormDoc = true">
              + Upload Documento
            </button>
          </h2>

          <form v-if="mostrarFormDoc" @submit.prevent="enviarDocumento">
            <div class="campo">
              <label for="arquivo">Arquivo</label>
              <input id="arquivo" ref="inputArquivo" type="file" required />
            </div>
            <div class="campo">
              <label for="descDoc">Descrição (opcional)</label>
              <input id="descDoc" v-model="formDoc.descricao" type="text" placeholder="Ex: Capítulo 2 - Metodologia" />
            </div>
            <div class="campo">
              <label for="catDoc">Categoria (define o prompt da avaliação IA)</label>
              <select id="catDoc" v-model="formDoc.id_tipo">
                <option value="">Padrão da orientação ({{ orientacaoState.atual?.tipo }})</option>
                <option v-for="t in tipoDocumentoState.lista" :key="t.id_tipo" :value="t.id_tipo">{{ t.nome }}</option>
              </select>
            </div>
            <button type="submit" class="botao primario" :disabled="documentoState.enviando">
              {{ documentoState.enviando ? 'Enviando...' : 'Enviar' }}
            </button>
            <button type="button" class="botao secundario" style="margin-left: 0.5rem" @click="mostrarFormDoc = false">Cancelar</button>
          </form>

          <Spinner :carregando="documentoState.carregando" />
          <div v-if="!documentoState.lista.length && !documentoState.carregando" class="linha-vazia">
            Nenhum documento enviado.
          </div>
          <div v-for="d in documentoState.lista" :key="d.id_documento" class="item-lista">
            <div>
              📄 {{ d.nome_arquivo }} <span class="pilula Concluida">v{{ d.versao }}</span>
              <span v-if="d.categoria" class="pilula">{{ d.categoria }}</span>
              <div style="font-size: 0.85rem; color: var(--cor-texto-suave)">
                Enviado por {{ d.nome_uploader }} em {{ formatarDataHora(d.data_upload) }}
                <template v-if="d.descricao"> · {{ d.descricao }}</template>
              </div>
              <div v-if="avaliacaoDe(d.id_documento)" style="margin-top: 0.3rem; font-size: 0.85rem">
                <StatusPill :status="rotuloAvaliacao(avaliacaoDe(d.id_documento).status)" />
                <button
                  v-if="avaliacaoDe(d.id_documento).status === 'concluída'"
                  type="button" class="botao secundario" style="margin-left: 0.5rem"
                  @click="verAvaliacao(d.id_documento)"
                >
                  Ver avaliação
                </button>
                <button
                  v-if="['falha', 'pendente'].includes(avaliacaoDe(d.id_documento).status) && podeCriarReuniao"
                  type="button" class="botao secundario" style="margin-left: 0.5rem"
                  @click="reenviarAvaliacao(d.id_documento)"
                >
                  Reenviar
                </button>
              </div>
            </div>
            <a class="botao secundario" :href="DocumentoController.urlDownload(d.id_documento)" download>Baixar</a>
          </div>

          <div v-if="avaliacaoState.detalhe" class="cartao" style="margin-top: 1rem; border-left: 4px solid var(--cor-primaria-clara)">
            <h3>Avaliação por IA — {{ avaliacaoState.detalhe.nome_arquivo }} (v{{ avaliacaoState.detalhe.versao }})</h3>
            <p style="font-size: 0.85rem; color: var(--cor-texto-suave)">
              Categoria: {{ avaliacaoState.detalhe.tipo }} · Tentativa {{ avaliacaoState.detalhe.tentativas }}
              <template v-if="avaliacaoState.detalhe.nota"> · Nota: {{ avaliacaoState.detalhe.nota }}</template>
            </p>
            <div style="white-space: pre-wrap">{{ avaliacaoState.detalhe.resultado }}</div>
            <details style="margin-top: 0.5rem">
              <summary style="cursor: pointer; font-size: 0.85rem">Prompt utilizado</summary>
              <div style="white-space: pre-wrap; font-size: 0.85rem; color: var(--cor-texto-suave)">{{ avaliacaoState.detalhe.prompt_usado }}</div>
            </details>
            <button type="button" class="botao secundario" style="margin-top: 0.5rem" @click="AvaliacaoController.fecharDetalhe()">Fechar</button>
          </div>
        </div>
      </div>

      <!-- ===== Aba Mensagens ===== -->
      <div v-else-if="aba === 'mensagens'">
        <div class="cartao">
          <h2>Mensagens</h2>
          <Spinner :carregando="mensagemState.carregando" />
          <div style="max-height: 420px; overflow-y: auto" ref="areaMensagens">
            <div v-if="!mensagemState.lista.length && !mensagemState.carregando" class="linha-vazia">
              Nenhuma mensagem ainda. Seja o primeiro a escrever!
            </div>
            <div
              v-for="m in mensagemState.lista"
              :key="m.id_mensagem"
              class="mensagem-balao"
              :class="{ minha: m.id_remetente === authState.user?.id_usuario }"
            >
              <div class="autor">{{ m.nome_remetente }} · {{ formatarDataHora(m.data_envio) }}</div>
              {{ m.conteudo }}
            </div>
          </div>
          <form style="display: flex; gap: 0.5rem; margin-top: 1rem" @submit.prevent="enviarMensagem">
            <input v-model="novaMensagem" type="text" placeholder="Escreva uma mensagem..." style="flex: 1" required />
            <button type="submit" class="botao primario" :disabled="mensagemState.enviando">Enviar</button>
          </form>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import OrientacaoController, { orientacaoState } from '../controllers/OrientacaoController.js';
import TarefaController, { tarefaState } from '../controllers/TarefaController.js';
import ReuniaoController, { reuniaoState } from '../controllers/ReuniaoController.js';
import GoogleController, { googleState } from '../controllers/GoogleController.js';
import DocumentoController, { documentoState } from '../controllers/DocumentoController.js';
import AvaliacaoController, { avaliacaoState } from '../controllers/AvaliacaoController.js';
import TipoDocumentoController, { tipoDocumentoState } from '../controllers/TipoDocumentoController.js';
import MensagemController, { mensagemState } from '../controllers/MensagemController.js';
import LembreteModel from '../models/LembreteModel.js';
import { authState } from '../controllers/AuthController.js';
import StatusPill from './components/StatusPill.vue';
import Spinner from './components/Spinner.vue';
import AlertMessage from './components/AlertMessage.vue';
import { formatarData, formatarDataHora } from '../utils/fmt.js';

const route = useRoute();
const aba = ref('visao');
const atividades = ref([]);
const acaoErro = ref('');
const acaoSucesso = ref('');

const mostrarFormTarefa = ref(false);
const mostrarFormReuniao = ref(false);
const mostrarFormDoc = ref(false);
const novaMensagem = ref('');
const inputArquivo = ref(null);
const areaMensagens = ref(null);

const formTarefa = reactive({ id_responsavel: '', descricao: '', data_limite: '' });
const formReuniao = reactive({ data_hora: '', pauta: '', decisoes_proximos_passos: '', link: '', duracaoMinutos: 60, criarNoGoogle: true });
const formDoc = reactive({ descricao: '', id_tipo: '' });

const id = computed(() => route.params.id);

function textoDias(dias) {
  if (dias == null) return 'sem prazo';
  if (dias < 0) return `${Math.abs(dias)} dias em atraso`;
  if (dias === 0) return 'vence hoje';
  return `${dias} dias restantes`;
}

const podeEditar = computed(() =>
  ['Professor', 'Coordenador', 'Administrador'].includes(authState.user?.tipo_usuario),
);
const podeCriarTarefa = computed(() => ['Professor', 'Coordenador', 'Administrador'].includes(authState.user?.tipo_usuario));
const podeCriarReuniao = computed(() => podeCriarTarefa.value);
const podeEnviarDoc = computed(() => true);
const podeAtualizarTarefa = computed(() =>
  (t) => ['Professor', 'Coordenador', 'Administrador'].includes(authState.user?.tipo_usuario) || t.id_responsavel === authState.user?.id_usuario,
);

const podeGerenciarEtapas = computed(() => {
  const o = orientacaoState.atual;
  if (!o) return false;
  if (['Coordenador', 'Administrador'].includes(authState.user?.tipo_usuario)) return true;
  return authState.user?.tipo_usuario === 'Professor' && o.orientador?.id_usuario === authState.user?.id_usuario;
});

const formEtapas = reactive({ qualificacao_concluida_em: '', defesa_concluida_em: '' });
const formAvisos = reactive({ dias_antes_qualificacao: 30, dias_antes_defesa: 30, frequencia: 'semanal' });
const envios = ref([]);
const salvandoEtapas = ref(false);
const salvandoAvisos = ref(false);

const responsaveis = computed(() => {
  const lista = [];
  const o = orientacaoState.atual;
  if (!o) return lista;
  lista.push({ id_usuario: o.orientador.id_usuario, nome: o.orientador.nome });
  for (const c of o.co_orientadores || []) {
    lista.push({ id_usuario: c.id_usuario, nome: c.nome });
  }
  lista.push({ id_usuario: o.aluno.id_usuario, nome: o.aluno.nome });
  return lista;
});

const ordenarTarefas = computed(() => {
  const ordem = { Pendente: 0, 'Em Andamento': 1, Atrasada: 2, Concluída: 3 };
  return [...tarefaState.lista].sort((a, b) => (ordem[a.status] ?? 9) - (ordem[b.status] ?? 9));
});

async function abrir(nome) {
  aba.value = nome;
  acaoErro.value = '';
  if (nome === 'tarefas') await TarefaController.carregar(id.value);
  if (nome === 'reunioes') {
    await ReuniaoController.carregar(id.value);
    if (podeCriarReuniao.value) await GoogleController.carregarStatus().catch(() => {});
  }
  if (nome === 'documentos') {
    await DocumentoController.carregar(id.value);
    await AvaliacaoController.carregarPorOrientacao(id.value);
    await TipoDocumentoController.carregar();
  }
  if (nome === 'mensagens') await MensagemController.carregar(id.value);
}

async function criarTarefa() {
  acaoErro.value = '';
  acaoSucesso.value = '';
  try {
    await TarefaController.criar(id.value, { ...formTarefa });
    formTarefa.id_responsavel = '';
    formTarefa.descricao = '';
    formTarefa.data_limite = '';
    mostrarFormTarefa.value = false;
    acaoSucesso.value = 'Tarefa criada.';
    await TarefaController.carregar(id.value);
  } catch (err) {
    acaoErro.value = err.message;
  }
}

async function avancarStatus(t) {
  acaoErro.value = '';
  try {
    await TarefaController.avancarStatus(t);
  } catch (err) {
    acaoErro.value = err.message;
  }
}

async function criarReuniao(agendarNoGoogle) {
  acaoErro.value = '';
  acaoSucesso.value = '';
  try {
    const payload = { ...formReuniao, criarNoGoogle: agendarNoGoogle && formReuniao.criarNoGoogle };
    if (!payload.criarNoGoogle) {
      delete payload.criarNoGoogle;
      delete payload.duracaoMinutos;
    }
    if (!payload.link) delete payload.link;
    await ReuniaoController.criar(id.value, payload);
    formReuniao.data_hora = '';
    formReuniao.pauta = '';
    formReuniao.decisoes_proximos_passos = '';
    formReuniao.link = '';
    formReuniao.duracaoMinutos = 60;
    mostrarFormReuniao.value = false;
    acaoSucesso.value = payload.criarNoGoogle ? 'Reunião agendada com link Meet.' : 'Reunião registrada.';
    await ReuniaoController.carregar(id.value);
  } catch (err) {
    if (err.data?.code === 'GOOGLE_NAO_CONECTADO' || err.data?.code === 'GOOGLE_RECONECTAR') {
      acaoErro.value = `${err.message} Conecte sua conta Google e tente de novo.`;
      try {
        await GoogleController.conectar();
      } catch {
        // Redirecionamento ao Google; nada a fazer.
      }
      return;
    }
    acaoErro.value = err.message;
  }
}

async function excluirReuniao(r) {
  acaoErro.value = '';
  acaoSucesso.value = '';
  const extra = r.google_event_id ? ' Também será removida do Google Calendar.' : '';
  if (!window.confirm(`Excluir esta reunião?${extra}`)) return;
  try {
    await ReuniaoController.excluir(id.value, r.id_reuniao);
    acaoSucesso.value = 'Reunião excluída.';
  } catch (err) {
    acaoErro.value = err.message;
  }
}

async function conectarGoogle() {
  acaoErro.value = '';
  try {
    await GoogleController.conectar();
  } catch (err) {
    acaoErro.value = err.message;
  }
}

async function desconectarGoogle() {
  acaoErro.value = '';
  try {
    await GoogleController.desconectar();
  } catch (err) {
    acaoErro.value = err.message;
  }
}

async function enviarDocumento() {
  acaoErro.value = '';
  acaoSucesso.value = '';
  const arquivo = inputArquivo.value?.files?.[0];
  if (!arquivo) {
    acaoErro.value = 'Selecione um arquivo.';
    return;
  }
  try {
    await DocumentoController.enviar(id.value, arquivo, formDoc.descricao, formDoc.id_tipo || undefined);
    formDoc.descricao = '';
    formDoc.id_tipo = '';
    if (inputArquivo.value) inputArquivo.value.value = '';
    mostrarFormDoc.value = false;
    acaoSucesso.value = 'Documento enviado.';
    await DocumentoController.carregar(id.value);
    await AvaliacaoController.carregarPorOrientacao(id.value);
  } catch (err) {
    acaoErro.value = err.message;
  }
}

function avaliacaoDe(idDocumento) {
  return AvaliacaoController.avaliacaoDoDocumento(id.value, idDocumento);
}

function rotuloAvaliacao(status) {
  return { pendente: 'Avaliação pendente', processando: 'Avaliando...', concluída: 'Avaliado por IA', falha: 'Avaliação falhou' }[status] || status;
}

async function verAvaliacao(idDocumento) {
  acaoErro.value = '';
  try {
    await AvaliacaoController.verDetalhe(idDocumento);
  } catch (err) {
    acaoErro.value = err.message;
  }
}

async function reenviarAvaliacao(idDocumento) {
  acaoErro.value = '';
  acaoSucesso.value = '';
  const av = avaliacaoDe(idDocumento);
  if (!av) return;
  try {
    await AvaliacaoController.reenviar(id.value, av.id_avaliacao);
    acaoSucesso.value = 'Avaliação reenviada para a fila.';
  } catch (err) {
    acaoErro.value = err.message;
  }
}

async function enviarMensagem() {
  acaoErro.value = '';
  const texto = novaMensagem.value.trim();
  if (!texto) return;
  try {
    await MensagemController.enviar(id.value, texto);
    novaMensagem.value = '';
    await nextTick();
    if (areaMensagens.value) areaMensagens.value.scrollTop = areaMensagens.value.scrollHeight;
  } catch (err) {
    acaoErro.value = err.message;
  }
}

watch(id, async () => {
  aba.value = 'visao';
  tarefaState.lista = [];
  reuniaoState.lista = [];
  documentoState.lista = [];
  mensagemState.lista = [];
  mostrarFormTarefa.value = false;
  mostrarFormReuniao.value = false;
  mostrarFormDoc.value = false;
  await carregarOrientacao();
});

async function carregarOrientacao() {
  await OrientacaoController.carregar(id.value);
  orientacaoState.atividades = [];
  if (orientacaoState.atual) {
    await OrientacaoController.carregarAtividades(id.value);
    atividades.value = orientacaoState.atividades;
    await carregarEtapasAvisos();
  }
}

async function carregarEtapasAvisos() {
  const o = orientacaoState.atual;
  formEtapas.qualificacao_concluida_em = o.etapas?.qualificacao_concluida_em || '';
  formEtapas.defesa_concluida_em = o.etapas?.defesa_concluida_em || '';
  try {
    const cfg = await LembreteModel.getConfig(id.value);
    formAvisos.dias_antes_qualificacao = cfg.dias_antes_qualificacao;
    formAvisos.dias_antes_defesa = cfg.dias_antes_defesa;
    formAvisos.frequencia = cfg.frequencia;
    envios.value = await LembreteModel.listarEnvios(id.value);
  } catch {
    envios.value = [];
  }
}

async function salvarEtapas() {
  acaoErro.value = '';
  acaoSucesso.value = '';
  salvandoEtapas.value = true;
  try {
    const dados = {};
    if (formEtapas.qualificacao_concluida_em) dados.qualificacao_concluida_em = formEtapas.qualificacao_concluida_em;
    if (formEtapas.defesa_concluida_em) dados.defesa_concluida_em = formEtapas.defesa_concluida_em;
    await LembreteModel.marcarEtapas(id.value, dados);
    await OrientacaoController.carregar(id.value);
    await carregarEtapasAvisos();
    acaoSucesso.value = 'Etapas atualizadas.';
  } catch (err) {
    acaoErro.value = err.message;
  } finally {
    salvandoEtapas.value = false;
  }
}

async function salvarConfigAvisos() {
  acaoErro.value = '';
  acaoSucesso.value = '';
  salvandoAvisos.value = true;
  try {
    await LembreteModel.updateConfig(id.value, { ...formAvisos });
    envios.value = await LembreteModel.listarEnvios(id.value);
    acaoSucesso.value = 'Configuração de avisos salva.';
  } catch (err) {
    acaoErro.value = err.message;
  } finally {
    salvandoAvisos.value = false;
  }
}

onMounted(carregarOrientacao);
</script>

<style scoped>
.caixa-check {
  width: 20px;
  height: 20px;
  border: 2px solid var(--cor-primaria-clara);
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.5rem;
  vertical-align: middle;
  background: #fff;
}

button.caixa-check {
  cursor: pointer;
  color: var(--cor-primaria-clara);
  font-weight: 800;
}

.caixa-check.concluida {
  background: var(--cor-concluida);
  border-color: var(--cor-concluida);
  color: #fff;
}
</style>