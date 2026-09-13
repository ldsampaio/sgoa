<template>
  <div>
    <RouterLink :to="{ name: edicao ? 'orientacao-detalhe' : 'orientacoes', params: edicao ? { id: orientacaoState.atual?.id_orientacao } : {} }">
      ← Voltar
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
            <div style="display: flex; gap: 1rem">
              <label v-for="tipo in tipos" :key="tipo" style="font-weight: 400">
                <input v-model="form.tipo" type="radio" :value="tipo" />
                {{ tipo }}
              </label>
            </div>
          </div>

          <div class="campo" style="grid-column: 1 / -1">
            <label for="titulo">Título Provisório do Trabalho</label>
            <input id="titulo" v-model="form.titulo_provisorio" type="text" placeholder="Ex: Impacto da IA na Educação Superior" />
          </div>

          <div class="campo">
            <label for="inicio">Data de Início</label>
            <input id="inicio" v-model="form.data_inicio" type="date" />
          </div>

          <div class="campo">
            <label for="previsao">Data de Previsão de Fim</label>
            <input id="previsao" v-model="form.data_previsao_fim" type="date" />
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
              <div style="display: flex; gap: 0.5rem">
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
              <div v-if="coAtuais.length" style="margin-top: 0.5rem">
                <span v-for="co in coAtuais" :key="co.id_professor" class="pilula Em-Ativo" style="background: #dbeafe; color: var(--cor-primaria); margin-right: 0.4rem">
                  {{ co.nome }} <button type="button" style="background: none; border: none; cursor: pointer; color: inherit" @click="removerCoOrientador(co)">✕</button>
                </span>
              </div>
            </div>
          </template>
        </div>

        <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem">
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