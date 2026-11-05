<template>
  <div class="layout">
    <!-- Barra de navegação flush no topo: a única superfície clara da página. -->
    <header class="navbar">
      <div class="navbar-inner">
        <RouterLink :to="{ name: 'dashboard' }" class="brand">
          <span class="marca" aria-hidden="true"></span>
          <span class="logo">SGOA</span>
        </RouterLink>

        <nav class="menu-nav" :class="{ aberto: menuAberto }" aria-label="Navegação principal">
          <RouterLink :to="{ name: 'dashboard' }" @click="menuAberto = false">Dashboard</RouterLink>
          <RouterLink :to="{ name: 'orientacoes' }" @click="menuAberto = false">Orientações</RouterLink>
          <RouterLink :to="{ name: 'links-overleaf' }" @click="menuAberto = false">Links Overleaf</RouterLink>
          <RouterLink :to="{ name: 'perfil' }" @click="menuAberto = false">Meu Perfil</RouterLink>
          <RouterLink v-if="ehAdministrador" :to="{ name: 'usuarios' }" @click="menuAberto = false">
            Usuários
          </RouterLink>
          <RouterLink v-else-if="ehProfessorOuCoordenador" :to="{ name: 'usuarios' }" @click="menuAberto = false">
            Alunos
          </RouterLink>
          <RouterLink v-if="ehCoordenador" :to="{ name: 'parametros-prazos' }" @click="menuAberto = false">
            Prazos do Regulamento
          </RouterLink>
          <RouterLink v-if="ehCoordenadorOuAdmin" :to="{ name: 'tipos-documento' }" @click="menuAberto = false">
            Categorias IA
          </RouterLink>
        </nav>

        <div class="navbar-acoes">
          <div class="usuario-atual">
            <span class="nome-usuario">{{ authState.user?.name }}</span>
            <span class="avatar" :title="authState.user?.name">{{ inicial(authState.user?.name) }}</span>
          </div>
          <button class="botao secundario sair" @click="sair">
            <Icon name="signout" :size="16" />
            Sair
          </button>
          <button
            class="menu-toggle"
            :aria-expanded="menuAberto"
            :aria-label="menuAberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação'"
            @click="menuAberto = !menuAberto"
          >
            <Icon name="menu" :size="20" v-if="!menuAberto" />
            <Icon name="x" :size="20" v-else />
          </button>
        </div>
      </div>
    </header>

    <main class="conteudo">
      <header class="cabecalho-topo">
        <h1>{{ titulo }}</h1>
      </header>

      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { authState, AuthController } from '../controllers/AuthController.js';
import { inicial } from '../utils/fmt.js';
import { temPapel } from '../utils/papeis.js';
import Icon from './components/Icon.vue';

const router = useRouter();
const menuAberto = ref(false);

const ehAdministrador = computed(() => temPapel(authState.user, 'Administrador'));
const ehCoordenador = computed(() => temPapel(authState.user, 'Coordenador'));
const ehCoordenadorOuAdmin = computed(() => temPapel(authState.user, 'Coordenador', 'Administrador'));
const ehProfessorOuCoordenador = computed(() => temPapel(authState.user, 'Coordenador', 'Professor'));

const titulo = computed(() => {
  const mapa = {
    dashboard: 'Dashboard',
    orientacoes: 'Orientações',
    'orientacao-nova': 'Nova Orientação',
    'orientacao-detalhe': 'Detalhes da Orientação',
    'orientacao-editar': 'Editar Orientação',
    'links-overleaf': 'Links Overleaf',
    perfil: 'Meu Perfil',
    usuarios: ehAdministrador.value ? 'Gestão de Usuários' : 'Alunos',
    'tipos-documento': 'Categorias de Avaliação IA',
    'parametros-prazos': 'Prazos do Regulamento',
  };
  return mapa[router.currentRoute.value.name] ?? 'SGOA';
});

// Fecha o menu mobile ao navegar.
watch(() => router.currentRoute.value.fullPath, () => {
  menuAberto.value = false;
});

// O logout é do saga (derruba a sessão no Redis e remove o cookie compartilhado).
// O sgoa limpa o estado local e vai para a página de redirecionamento, que usa o
// login_url do corpo do 401.
function sair() {
  AuthController.limpar();
  router.push({ name: 'login' });
}
</script>

<style scoped>
/* Sair: botão de nav, menor que o CTA de página mas mantendo o target de toque */
.sair {
  font-size: var(--size-sm);
  padding: var(--spacing-1) var(--spacing-2);
}

.navbar-acoes .usuario-atual {
  gap: var(--spacing-1);
}
</style>
