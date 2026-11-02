<template>
  <div>
    <RouterLink :to="{ name: edicao ? 'orientacao-detalhe' : 'orientacoes', params: edicao ? { id: orientacaoState.atual?.id_orientacao } : {} }" class="voltar-topo">
      <Icon name="arrow-left" :size="14" />
      Voltar
    </RouterLink>

    <Spinner :carregando="orientacaoState.carregando" />

    <div class="cartao" v-if="!edicao || orientacaoState.atual">
      <h2>{{ edicao ? 'Editar Orientação' : 'Criar Nova Orientação' }}</h2>

      <AlertMessage :mensagem="erro" tipo="erro" />
      <AlertMessage :mensagem="sucesso" tipo="sucesso" />

      <form @submit.prevent="salvar" novalidate>
        <div class="grid-2">
          <div class="campo">
            <label for="aluno">Aluno</label>
            <select id="aluno" v-model="form.id_aluno" required :disabled="edicao">
              <option value="" disabled>Selecionar aluno...</option>
              <option v-for="a in orientacaoState.alunos" :key="a.id_aluno" :value="a.id_aluno">
                {{ a.nome }} - {{ a.curso }}{{ a.programa_pos ? ' (' + a.programa_pos + ')' : '' }}
              </option>
            </select>
          </div>

          <div class="campo">
            <label>Tipo de Orientação</label>
            <div class="grupo-radio">
              <label v-for="tipo in tipos" :key="tipo">
                <input v-model="form.tipo" type="radio" :value="tipo" />
                {{ tipo }}
              </label>
            </div>
          </div>

          <div class="campo span-total">
            <label for="titulo">Título Provisório do Trabalho</label>
            <input id="titulo" v-model="form.titulo_provisorio" type="text" placeholder="Ex: Impacto da IA na Educação Superior" />
          </div>

          <div class="campo">
            <label for="inicio">Data de Início</label>
            <CampoData id="inicio" v-model="form.data_inicio" limpar />
          </div>

          <div class="campo">
            <label for="previsao">Data de Previsão de Fim</label>
            <CampoData id="previsao" v-model="form.data_previsao_fim" limpar />
          </div>

          <template v-if="edicao">
            <div class="campo">
              <label for="status">Status da Orientação</label>
              <select id="status" v-model="form.status">
                <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div class="campo">
              <label for="coorientador">Adicionar Co-orientador</label>
              <div class="linha-input">
                <select id="coorientador" v-model="coSelecionado">
                  <option value="" disabled>Selecionar professor...</option>
                  <option v-for="p in professoresDisponiveis" :key="p.id_professor" :value="p.id_professor">
                    {{ p.nome }}
                  </option>
                </select>
                <button type="button" class="botao secundario" :disabled="!coSelecionado" @click="adicionarCoOrientador">
                  Adicionar
                </button>
              </div>
              <div v-if="coAtuais.length" class="desce-1">
                <span v-for="co in coAtuais" :key="co.id_professor" class="pilula co-orientador">
                  {{ co.nome }}
                  <button type="button" class="remover-co" aria-label="Remover co-orientador" @click="removerCoOrientador(co)">
                    <Icon name="x" :size="14" />
                  </button>
                </span>
              </div>
            </div>
          </template>
        </div>

        <div class="linha-acoes">
          <button type="submit" class="botao primario" :disabled="orientacaoState.salvando">
            {{ orientacaoState.salvando ? 'Salvando...' : 'Salvar Orientação' }}
          </button>
          <RouterLink
            :to="{ name: edicao ? 'orientacao-detalhe' : 'orientacoes', params: edicao ? { id: orientacaoState.atual?.id_orientacao } : {} }"
            class="botao secundario"
          >
            Cancelar
          </RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import OrientacaoController, { orientacaoState } from '../controllers/OrientacaoController.js';
import Spinner from './components/Spinner.vue';
import AlertMessage from './components/AlertMessage.vue';
import CampoData from './components/CampoData.vue';
import Icon from './components/Icon.vue';

const route = useRoute();
const router = useRouter();

const edicao = computed(() => route.name === 'orientacao-editar');
const tipos = ['TCC', 'Mestrado', 'Doutorado'];
const statuses = ['Em Andamento', 'Concluída', 'Suspensa', 'Cancelada'];

const form = reactive({
  id_aluno: '',
  tipo: 'TCC',
  titulo_provisorio: '',
  data_inicio: '',
  data_previsao_fim: '',
  status: 'Em Andamento',
});

const erro = ref('');
const sucesso = ref('');
const coSelecionado = ref('');

const professoresDisponiveis = computed(() => {
  const atuais = orientacaoState.atual?.co_orientadores?.map((c) => c.id_professor) || [];
  const orientadorId = orientacaoState.atual?.orientador?.id_professor;
  return orientacaoState.professores.filter((p) => !atuais.includes(p.id_professor) && p.id_professor !== orientadorId);
});

const coAtuais = computed(() => orientacaoState.atual?.co_orientadores || []);

onMounted(async () => {
  erro.value = '';
  if (edicao.value) {
    await OrientacaoController.carregar(route.params.id);
    const o = orientacaoState.atual;
    if (o) {
      form.id_aluno = o.aluno.id_aluno;
      form.tipo = o.tipo;
      form.titulo_provisorio = o.titulo_provisorio || '';
      form.data_inicio = o.data_inicio || '';
      form.data_previsao_fim = o.data_previsao_fim || '';
      form.status = o.status;
    }
  } else {
    await OrientacaoController.buscarAlunos();
  }
  await OrientacaoController.buscarProfessores();
});

async function salvar() {
  erro.value = '';
  sucesso.value = '';
  try {
    const resultado = edicao.value
      ? await OrientacaoController.salvar(route.params.id, {
          titulo_provisorio: form.titulo_provisorio,
          status: form.status,
          data_previsao_fim: form.data_previsao_fim,
        })
      : await OrientacaoController.criar({
          id_aluno: form.id_aluno,
          tipo: form.tipo,
          titulo_provisorio: form.titulo_provisorio,
          data_inicio: form.data_inicio,
          data_previsao_fim: form.data_previsao_fim,
        });
    sucesso.value = 'Orientação salva com sucesso.';
    router.push({ name: 'orientacao-detalhe', params: { id: resultado.id_orientacao } });
  } catch (err) {
    erro.value = err.message;
  }
}

async function adicionarCoOrientador() {
  erro.value = '';
  try {
    await OrientacaoController.adicionarCoOrientador(route.params.id, coSelecionado.value);
    coSelecionado.value = '';
  } catch (err) {
    erro.value = err.message;
  }
}

async function removerCoOrientador(co) {
  erro.value = '';
  try {
    await OrientacaoController.removerCoOrientador(route.params.id, co.id_professor);
  } catch (err) {
    erro.value = err.message;
  }
}
</script>

<style scoped>
/* Grupo de radios do tipo de orientação */
.grupo-radio {
  display: flex;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.grupo-radio label {
  font-weight: 400;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: var(--touch-min-target);
  font-size: var(--size-base);
}

/* Linha select + botão (adicionar co-orientador) */
.linha-input {
  display: flex;
  gap: var(--spacing-1);
}

.linha-input select {
  flex: 1;
  min-width: 0;
}

/* Ações do fim do formulário */
.linha-acoes {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-1);
  flex-wrap: wrap;
}

/* Pílulas de co-orientador já atribuído */
.co-orientador {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  margin-right: var(--spacing-1);
  margin-bottom: 4px;
}

.remover-co {
  background: none;
  border: 2px solid transparent;
  border-radius: var(--radius-pill);
  padding: 1px;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: var(--size-xs);
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.remover-co:hover {
  color: var(--color-destructive);
}
</style>