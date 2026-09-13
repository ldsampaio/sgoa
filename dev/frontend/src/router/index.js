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
      { path: 'google-ok', name: 'google-ok', component: () => import('../views/GoogleOkView.vue') },
      {
        path: 'usuarios',
        name: 'usuarios',
        component: () => import('../views/UsuariosView.vue'),
        meta: { roles: ['Administrador', 'Coordenador', 'Professor'] },
      },
      {
        path: 'tipos-documento',
        name: 'tipos-documento',
        component: () => import('../views/TiposDocumentoView.vue'),
        meta: { roles: ['Coordenador', 'Administrador'] },
      },
      {
        path: 'parametros-prazos',
        name: 'parametros-prazos',
        component: () => import('../views/ParametrosPrazosView.vue'),
        meta: { roles: ['Coordenador'] },
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