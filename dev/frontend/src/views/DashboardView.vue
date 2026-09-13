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
            <RouterLink :to="{ name: 'orientacao-nova' }" class="botao primario">+ Nova Orientação</RouterLink>
          </h2>
          <div v-if="!dashboardState.dados.orientacoes_ativas.length" class="linha-vazia">
            Nenhuma orientação ativa.
          </div>
          <div v-for="o in dashboardState.dados.orientacoes_ativas" :key="o.id_orientacao" class="item-lista">
            <div>
              <strong>{{ o.tipo }}</strong> - {{ o.aluno.nome }} —
              <em>"{{ o.titulo_provisorio }}"</em>
              <StatusPill :status="o.status" />
              <div style="font-size: 0.85rem; color: var(--cor-texto-suave)">
                Prazo previsto: {{ formatarData(o.data_previsao_fim) }}
              </div>
            </div>
            <RouterLink :to="{ name: 'orientacao-detalhe', params: { id: o.id_orientacao } }" class="botao secundario">
              Abrir
            </RouterLink>
          </div>
          <RouterLink :to="{ name: 'orientacoes' }" style="display: inline-block; margin-top: 0.75rem">
            Ver todas as orientações →
          </RouterLink>
        </div>

        <div class="grid-2">
          <div class="cartao">
            <h2>Tarefas e Prazos Próximos</h2>
            <div v-if="!dashboardState.dados.tarefas_pendentes.length" class="linha-vazia">
              Nenhuma tarefa pendente.
            </div>
            <div v-for="t in dashboardState.dados.tarefas_pendentes" :key="t.id_tarefa" class="item-lista">
              <div>
                {{ t.descricao }}
                <StatusPill :status="t.status" />
                <div style="font-size: 0.85rem; color: var(--cor-texto-suave)">
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

        <div class="grid-2">
          <div class="cartao">
            <h2>Minhas Tarefas e Prazos</h2>
            <div v-if="!dashboardState.dados.tarefas_pendentes.length" class="linha-vazia">
              Nenhuma tarefa pendente. 🎉
            </div>
            <div v-for="t in dashboardState.dados.tarefas_pendentes" :key="t.id_tarefa" class="item-lista">
              <div>
                {{ t.descricao }}
                <StatusPill :status="t.status" />
                <div style="font-size: 0.85rem; color: var(--cor-texto-suave)">
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
            <div class="grade-3">
              <div v-for="(v, k) in dashboardState.dados.por_status" :key="k" class="cartao" style="margin: 0; text-align: center">
                <strong style="font-size: 1.4rem">{{ v }}</strong>
                <div style="font-size: 0.85rem">{{ k }}</div>
              </div>
            </div>
            <h3 style="margin-top: 1rem">Por tipo</h3>
            <div class="grade-3">
              <div v-for="(v, k) in dashboardState.dados.por_tipo" :key="k" class="cartao" style="margin: 0; text-align: center">
                <strong style="font-size: 1.4rem">{{ v }}</strong>
                <div style="font-size: 0.85rem">{{ k }}</div>
              </div>
            </div>
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
              <div style="font-size: 0.85rem; color: var(--cor-texto-suave)">
                Previsão: {{ formatarData(o.data_previsao_fim) }} · {{ o.dias_restantes }} dias restantes
              </div>
            </div>
          </div>
        </div>

        <div class="cartao">
          <h2>Carga de Orientação por Professor</h2>
          <div v-for="p in dashboardState.dados.carga_professores" :key="p.id_professor" class="item-lista">
            <span><strong>{{ p.nome }}</strong></span>
            <span>{{ p.total }} orientações ativas</span>
          </div>
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
import { onMounted } from 'vue';
import DashboardController, { dashboardState } from '../controllers/DashboardController.js';
import NotificacaoController from '../controllers/NotificacaoController.js';
import NotificacoesPanel from './components/NotificacoesPanel.vue';
import StatusPill from './components/StatusPill.vue';
import Spinner from './components/Spinner.vue';
import AlertMessage from './components/AlertMessage.vue';
import { authState } from '../controllers/AuthController.js';
import { formatarData } from '../utils/fmt.js';

onMounted(() => {
  DashboardController.carregar();
});

async function marcarLida(n) {
  await NotificacaoController.marcarLida(n);
}
</script>