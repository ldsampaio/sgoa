import { createRouter, createWebHistory } from 'vue-router';
import { authState } from '../controllers/AuthController.js';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { publico: true },
  },
  {
    path: '/',
    component: () => import('../views/LayoutView.vue'),
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
      { path: 'orientacoes', name: 'orientacoes', component: () => import('../views/OrientacaoListView.vue') },
      { path: 'orientacoes/nova', name: 'orientacao-nova', component: () => import('../views/OrientacaoFormView.vue') },
      {
        path: 'orientacoes/:id',
        name: 'orientacao-detalhe',
        component: () => import('../views/OrientacaoDetailView.vue'),
      },
      {
        path: 'orientacoes/:id/editar',
        name: 'orientacao-editar',
        component: () => import('../views/OrientacaoFormView.vue'),
      },
      { path: 'perfil', name: 'perfil', component: () => import('../views/PerfilView.vue') },
      {
        path: 'usuarios',
        name: 'usuarios',
        component: () => import('../views/UsuariosView.vue'),
        meta: { roles: ['Administrador'] },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const autenticado = !!authState.user;

  if (to.meta.publico && autenticado) return { name: 'dashboard' };
  if (!to.meta.publico && !autenticado) return { name: 'login', query: { redirect: to.fullPath } };

  if (to.meta.roles && !to.meta.roles.includes(authState.user?.tipo_usuario)) {
    return { name: 'dashboard' };
  }
  return true;
});

export default router;