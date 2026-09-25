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
            <span class="nome-usuario">{{ authState.user?.nome }}</span>
            <span class="avatar" :title="authState.user?.nome">{{ inicial(authState.user?.nome) }}</span>
          </div>
          <button class="botao secundario sair" @click="sair">Sair</button>
          <button
            class="menu-toggle"
            :aria-expanded="menuAberto"
            aria-label="Abrir menu de navegação"
            @click="menuAberto = !menuAberto"
          >
            ☰
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

const router = useRouter();
const menuAberto = ref(false);

const tipo = computed(() => authState.user?.tipo_usuario);
const ehAdministrador = computed(() => tipo.value === 'Administrador');
const ehCoordenador = computed(() => tipo.value === 'Coordenador');
const ehCoordenadorOuAdmin = computed(() => ['Coordenador', 'Administrador'].includes(tipo.value));
const ehProfessorOuCoordenador = computed(() => ['Coordenador', 'Professor'].includes(tipo.value));

const titulo = computed(() => {
  const mapa = {
    dashboard: 'Dashboard',
    orientacoes: 'Orientações',
    'orientacao-nova': 'Nova Orientação',
    'orientacao-detalhe': 'Detalhes da Orientação',
    'orientacao-editar': 'Editar Orientação',
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

function sair() {
  AuthController.logout();
  router.push({ name: 'login' });
}
</script>

<style scoped>
.sair {
  padding: 8px 18px;
  min-height: 40px;
  font-size: 0.85rem;
}

.navbar-acoes .usuario-atual {
  gap: 0.5rem;
}
</style>
