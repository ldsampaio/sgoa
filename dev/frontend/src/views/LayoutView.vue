<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <span class="logo">🎓 SGOA</span>
        <small>Sistema de Orientações</small>
      </div>

      <nav class="menu-nav">
        <RouterLink :to="{ name: 'dashboard' }">📊 Dashboard</RouterLink>
        <RouterLink :to="{ name: 'orientacoes' }">🎯 Orientações</RouterLink>
        <RouterLink :to="{ name: 'perfil' }">👤 Meu Perfil</RouterLink>
        <RouterLink v-if="authState.user?.tipo_usuario === 'Administrador'" :to="{ name: 'usuarios' }">
          🧑‍💼 Usuários
        </RouterLink>
        <RouterLink
          v-if="['Coordenador', 'Professor'].includes(authState.user?.tipo_usuario)"
          :to="{ name: 'usuarios' }"
        >
          🎓 Alunos
        </RouterLink>
        <RouterLink v-if="authState.user?.tipo_usuario === 'Coordenador'" :to="{ name: 'parametros-prazos' }">
          ⏱️ Prazos do Regulamento
        </RouterLink>
        <RouterLink
          v-if="['Coordenador', 'Administrador'].includes(authState.user?.tipo_usuario)"
          :to="{ name: 'tipos-documento' }"
        >
          🏷️ Categorias IA
        </RouterLink>
      </nav>
    </aside>

    <main class="conteudo">
      <header class="cabecalho-topo">
        <h1 style="margin: 0">{{ titulo }}</h1>
        <div class="usuario-atual">
          <span style="color: var(--cor-texto-suave)">{{ authState.user?.nome }}</span>
          <span class="avatar">{{ inicial(authState.user?.nome) }}</span>
          <button class="botao secundario" style="padding: 0.4rem 0.75rem" @click="sair">Sair</button>
        </div>
      </header>

      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { authState, AuthController } from '../controllers/AuthController.js';
import { inicial } from '../utils/fmt.js';

const router = useRouter();

const titulo = computed(() => {
  const mapa = {
    dashboard: 'Dashboard',
    orientacoes: 'Orientações',
    'orientacao-nova': 'Nova Orientação',
    'orientacao-detalhe': 'Detalhes da Orientação',
    'orientacao-editar': 'Editar Orientação',
    perfil: 'Meu Perfil',
    usuarios: 'Gestão de Usuários',
    'tipos-documento': 'Categorias de Avaliação IA',
    'parametros-prazos': 'Prazos do Regulamento',
  };
  return mapa[router.currentRoute.value.name] ?? 'SGOA';
});

function sair() {
  AuthController.logout();
  router.push({ name: 'login' });
}
</script>