<template>
  <div>
    <Spinner :carregando="orientacaoState.carregando" />
    <AlertMessage v-if="orientacaoState.erro" :mensagem="orientacaoState.erro" tipo="erro" />

    <div class="cartao">
      <h2>
        Orientações
        <RouterLink
          v-if="['Professor', 'Administrador'].includes(authState.user?.tipo_usuario)"
          :to="{ name: 'orientacao-nova' }"
          class="botao primario"
        >
          + Nova Orientação
        </RouterLink>
      </h2>

      <div v-if="!orientacaoState.lista.length && !orientacaoState.carregando" class="linha-vazia">
        Nenhuma orientação encontrada.
      </div>

      <div v-for="o in orientacaoState.lista" :key="o.id_orientacao" class="item-lista">
        <div>
          <strong>{{ o.tipo }}</strong> - {{ o.aluno.nome }} —
          <em>"{{ o.titulo_provisorio }}"</em>
          <StatusPill :status="o.status" />
          <div style="font-size: 0.85rem; color: var(--cor-texto-suave)">
            Orientador: {{ o.orientador.nome }}
            <template v-if="o.co_orientadores?.length"> · Co-orientadores: {{ o.co_orientadores.map((c) => c.nome).join(', ') }}</template>
            · Prazo: {{ formatarData(o.data_previsao_fim) }}
          </div>
        </div>
        <RouterLink :to="{ name: 'orientacao-detalhe', params: { id: o.id_orientacao } }" class="botao secundario">
          Abrir
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import OrientacaoController, { orientacaoState } from '../controllers/OrientacaoController.js';
import StatusPill from './components/StatusPill.vue';
import Spinner from './components/Spinner.vue';
import AlertMessage from './components/AlertMessage.vue';
import { authState } from '../controllers/AuthController.js';
import { formatarData } from '../utils/fmt.js';

onMounted(() => {
  OrientacaoController.listar();
});
</script>