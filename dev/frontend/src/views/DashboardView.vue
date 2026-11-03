<template>
  <div>
    <Spinner :carregando="dashboardState.carregando" />
    <AlertMessage
      v-if="dashboardState.erro"
      :mensagem="dashboardState.erro"
      tipo="erro"
    />

    <template v-if="dashboardState.dados && !dashboardState.carregando">
      <!-- ===== Dashboard do Professor ===== -->
      <div v-if="authState.user?.tipo_usuario === 'Professor'">
        <div class="cartao">
          <h2>
            Minhas Orientações Ativas
            <RouterLink :to="{ name: 'orientacao-nova' }" class="botao primario">
              <Icon name="plus" :size="16" />
              Nova Orientação
            </RouterLink>
          </h2>
          <div v-if="!dashboardState.dados.orientacoes_ativas.length" class="linha-vazia">
            Nenhuma orientação ativa.
          </div>
          <div v-for="o in dashboardState.dados.orientacoes_ativas" :key="o.id_orientacao" class="item-lista">
            <div>
              <strong>{{ o.tipo }}</strong> - {{ o.aluno.nome }} —
              <em>"{{ o.titulo_provisorio }}"</em>
              <StatusPill :status="o.status" />
              <div class="metadado">
                Prazo previsto: {{ formatarData(o.data_previsao_fim) }}
              </div>
            </div>
            <RouterLink :to="{ name: 'orientacao-detalhe', params: { id: o.id_orientacao } }" class="botao secundario">
              Abrir
            </RouterLink>
          </div>
          <RouterLink :to="{ name: 'orientacoes' }" class="link-mais">
            Ver todas as orientações
            <Icon name="arrow-right" :size="14" />
          </RouterLink>
        </div>

        <div class="cartao">
          <h2>
            Links Overleaf
            <RouterLink :to="{ name: 'links-overleaf' }" class="botao secundario">
              Ver todos
              <Icon name="arrow-right" :size="14" />
            </RouterLink>
          </h2>
          <div v-if="!enlaces.length" class="linha-vazia">Nenhum link registrado.</div>
          <div v-for="e in enlaces.slice(0, 6)" :key="e.id_enlace" class="item-lista">
            <div>
              <span class="pilula">{{ e.categoria }}</span>
              <StatusPill :status="e.status" />
              <div class="metadado">
                {{ e.titulo_provisorio }} · {{ formatarDataHora(e.criado_em) }}
              </div>
            </div>
            <a class="botao primario" :href="e.url" target="_blank" rel="noopener noreferrer">
              <Icon name="link" :size="14" />
              Abrir
            </a>
          </div>
        </div>

        <div class="grid-2">
          <div class="cartao">
            <h2>Tarefas e Prazos Próximos</h2>
            <div v-if="!dashboardState.dados.tarefas_pendentes.length" class="linha-vazia">
              Nenhuma tarefa pendente.
            </div>
            <div v-for="t in dashboardState.dados.tarefas_pendentes" :key="t.id_tarefa" class="item-lista">
              <div>
                <strong>{{ t.titulo || t.descricao }}</strong>
                <PrioridadePill :prioridade="t.prioridade" />
                <StatusPill :status="t.status" />
                <div v-if="t.descricao && t.descricao !== t.titulo" class="metadado">{{ t.descricao }}</div>
                <div class="metadado">
                  {{ t.nome_responsavel }} · {{ t.nome_aluno }} ({{ t.tipo }}) · Prazo: {{ formatarData(t.data_limite) }}
                </div>
              </div>
            </div>
          </div>

          <NotificacoesPanel
            :notificacoes="dashboardState.dados.notificacoes"
            @ler="marcarLida"
          />
        </div>
      </div>

      <!-- ===== Dashboard do Aluno ===== -->
      <div v-else-if="authState.user?.tipo_usuario === 'Aluno'">
        <div class="cartao">
          <h2>Minha Orientação Atual</h2>
          <div v-if="!dashboardState.dados.orientacao_atual" class="linha-vazia">
            Você ainda não possui uma orientação ativa.
          </div>
          <template v-else>
            <p>
              <strong>Título:</strong> <em>"{{ dashboardState.dados.orientacao_atual.titulo_provisorio }}"</em>
              <StatusPill :status="dashboardState.dados.orientacao_atual.status" />
            </p>
            <p>
              <strong>Tipo:</strong> {{ dashboardState.dados.orientacao_atual.tipo }}<br />
              <strong>Orientador:</strong> {{ dashboardState.dados.orientacao_atual.orientador.nome }}<br />
              <strong>Co-orientadores:</strong>
              {{ (dashboardState.dados.orientacao_atual.co_orientadores || []).map((c) => c.nome).join(', ') || '—' }}
            </p>
            <RouterLink
              :to="{ name: 'orientacao-detalhe', params: { id: dashboardState.dados.orientacao_atual.id_orientacao } }"
              class="botao"
            >
              Ver detalhes da orientação
            </RouterLink>
          </template>
        </div>

        <div class="cartao">
          <h2>
            Meus Links Overleaf
            <RouterLink :to="{ name: 'links-overleaf' }" class="botao secundario">
              Ver todos
              <Icon name="arrow-right" :size="14" />
            </RouterLink>
          </h2>
          <div v-if="!enlaces.length" class="linha-vazia">Nenhum link registrado.</div>
          <div v-for="e in enlaces.slice(0, 6)" :key="e.id_enlace" class="item-lista">
            <div>
              <span class="pilula">{{ e.categoria }}</span>
              <StatusPill :status="e.status" />
              <div class="metadado">
                {{ e.titulo_provisorio }} · {{ formatarDataHora(e.criado_em) }}
              </div>
            </div>
            <a class="botao primario" :href="e.url" target="_blank" rel="noopener noreferrer">
              <Icon name="link" :size="14" />
              Abrir
            </a>
          </div>
        </div>

        <div class="grid-2">
          <div class="cartao">
            <h2>Minhas Tarefas e Prazos</h2>
            <div v-if="!dashboardState.dados.tarefas_pendentes.length" class="linha-vazia">
              Nenhuma tarefa pendente. Bom trabalho.
            </div>
            <div v-for="t in dashboardState.dados.tarefas_pendentes" :key="t.id_tarefa" class="item-lista">
              <div>
                <strong>{{ t.titulo || t.descricao }}</strong>
                <PrioridadePill :prioridade="t.prioridade" />
                <StatusPill :status="t.status" />
                <div v-if="t.descricao && t.descricao !== t.titulo" class="metadado">{{ t.descricao }}</div>
                <div class="metadado">
                  Prazo: {{ formatarData(t.data_limite) }}
                </div>
              </div>
            </div>
          </div>

          <NotificacoesPanel
            :notificacoes="dashboardState.dados.notificacoes"
            @ler="marcarLida"
          />
        </div>
      </div>

      <!-- ===== Dashboard do Coordenador ===== -->
      <div v-else-if="authState.user?.tipo_usuario === 'Coordenador'">
        <div class="grid-2">
          <div class="cartao">
            <h2>Visão Geral das Orientações</h2>
            <p><strong>Total:</strong> {{ dashboardState.dados.total }}</p>

            <h3 class="desce-3">Por status</h3>
            <ul class="medidores">
              <li v-for="(v, k) in dashboardState.dados.por_status" :key="k" class="medidor">
                <StatusPill :status="k" />
                <span
                  class="medidor-trilha"
                  :class="classeMedidor(k)"
                  role="meter"
                  :aria-valuemin="0"
                  :aria-valuemax="dashboardState.dados.total || 1"
                  :aria-valuenow="v"
                  :aria-label="k + ': ' + v + ' de ' + (dashboardState.dados.total || 1) + ' orientações'"
                >
                  <span class="medidor-fill" :style="{ width: percentual(v) + '%' }"></span>
                </span>
                <span class="medidor-valor">{{ v }} · {{ percentual(v) }}%</span>
              </li>
            </ul>

            <h3 class="desce-3">Por tipo</h3>
            <ul class="medidores">
              <li v-for="(v, k) in dashboardState.dados.por_tipo" :key="k" class="medidor">
                <StatusPill :status="k" />
                <span
                  class="medidor-trilha"
                  role="meter"
                  :aria-valuemin="0"
                  :aria-valuemax="dashboardState.dados.total || 1"
                  :aria-valuenow="v"
                  :aria-label="k + ': ' + v + ' de ' + (dashboardState.dados.total || 1) + ' orientações'"
                >
                  <span class="medidor-fill" :style="{ width: percentual(v) + '%' }"></span>
                </span>
                <span class="medidor-valor">{{ v }} · {{ percentual(v) }}%</span>
              </li>
            </ul>
          </div>

          <NotificacoesPanel
            :notificacoes="dashboardState.dados.notificacoes"
            @ler="marcarLida"
          />
        </div>

        <div class="cartao">
          <h2>Orientações com Prazos Críticos (≤ 60 dias)</h2>
          <div v-if="!dashboardState.dados.prazos_criticos.length" class="linha-vazia">
            Nenhum prazo crítico próximo.
          </div>
          <div v-for="o in dashboardState.dados.prazos_criticos" :key="o.id_orientacao" class="item-lista">
            <div>
              <strong>{{ o.tipo }}</strong> - {{ o.aluno.nome }} ({{ o.orientador.nome }}) —
              <em>"{{ o.titulo_provisorio }}"</em>
              <StatusPill :status="o.status" />
              <span class="pilula empurra-esq">{{ rotuloPrazo(o.tipo_prazo) }}</span>
              <div class="metadado">
                {{ detalhePrazo(o) }} · {{ o.dias_restantes }} dias restantes
              </div>
            </div>
          </div>
        </div>

        <div class="cartao">
          <h2>Carga de Orientação por Professor</h2>
          <ul class="medidores">
            <li v-for="p in dashboardState.dados.carga_professores" :key="p.id_professor" class="medidor">
              <span class="medidor-rotulo">{{ p.nome }}</span>
              <span
                class="medidor-trilha"
                role="meter"
                :aria-valuemin="0"
                :aria-valuemax="maxCarga"
                :aria-valuenow="p.total"
                :aria-label="p.nome + ': ' + p.total + ' orientações ativas'"
              >
                <span class="medidor-fill" :style="{ width: percentualCarga(p.total) + '%' }"></span>
              </span>
              <span class="medidor-valor">{{ p.total }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- ===== Fallback (Administrador) ===== -->
      <div v-else class="cartao">
        <h2>Visão geral (Administrador)</h2>
        <AlertMessage mensagem="O dashboard do administrador ainda não possui um painel dedicado. Acesse a gestão de usuários." tipo="dica" />
        <RouterLink :to="{ name: 'usuarios' }" class="botao">Gerenciar usuários</RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import DashboardController, { dashboardState } from '../controllers/DashboardController.js';
import NotificacaoController from '../controllers/NotificacaoController.js';
import NotificacoesPanel from './components/NotificacoesPanel.vue';
import StatusPill from './components/StatusPill.vue';
import PrioridadePill from './components/PrioridadePill.vue';
import Spinner from './components/Spinner.vue';
import AlertMessage from './components/AlertMessage.vue';
import Icon from './components/Icon.vue';
import { authState } from '../controllers/AuthController.js';
import { formatarData, formatarDataHora } from '../utils/fmt.js';

const enlaces = computed(() => dashboardState.dados?.enlaces ?? []);

onMounted(() => {
  DashboardController.carregar();
});

function percentual(v) {
  const total = dashboardState.dados?.total || 0;
  if (!total) return 0;
  return Math.round((v / total) * 100);
}

const maxCarga = computed(() => Math.max(1, ...(dashboardState.dados?.carga_professores || []).map((p) => p.total)));

function percentualCarga(total) {
  return Math.round((total / maxCarga.value) * 100);
}

/* Cor do medidor segue o status; o número ao lado é o portador da informação */
function classeMedidor(k) {
  const chave = String(k)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  const conhecidos = ['em-andamento', 'pendente', 'concluida', 'atrasada', 'suspensa', 'cancelada'];
  return conhecidos.includes(chave) ? `medidor-${chave}` : '';
}

function rotuloPrazo(tipo) {
  return { previsao_fim: 'Previsão', conclusao_regulamentar: 'Conclusão', qualificacao: 'Qualificação' }[tipo] || 'Prazo';
}

function detalhePrazo(o) {
  if (o.tipo_prazo === 'conclusao_regulamentar') return `Conclusão máx.: ${formatarData(o.prazos?.conclusao)}`;
  if (o.tipo_prazo === 'qualificacao') return `Qualificação máx.: ${formatarData(o.prazos?.qualificacao)}`;
  return `Previsão: ${formatarData(o.data_previsao_fim)}`;
}

async function marcarLida(n) {
  await NotificacaoController.marcarLida(n);
}
</script>