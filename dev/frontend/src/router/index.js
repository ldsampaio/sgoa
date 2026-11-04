import { createRouter, createWebHistory } from 'vue-router';
import { authState, AuthController } from '../controllers/AuthController.js';
import { decidirAcao } from '../plugins/decisaoErro.js';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { publico: true },
  },
  {
    // Página de erro própria (503 IDENTITY_UNAVAILABLE). Não é o caminho do 401:
    // redirecionar para o serviço que caiu é o loop que se quer evitar.
    path: '/indisponivel',
    name: 'indisponivel',
    component: () => import('../views/IndisponivelView.vue'),
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
      { path: 'links-overleaf', name: 'links-overleaf', component: () => import('../views/LinkOverleafView.vue') },
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

router.beforeEach(async (to) => {
  if (to.meta.publico) {
    if (authState.user) return { name: 'dashboard' };
    return true;
  }

  if (!authState.user) {
    try {
      await AuthController.me();
    } catch (err) {
      // 401 e 503 são caminhos distintos: o 503 nunca vira redirect.
      const acao = decidirAcao(err.status, err.data);
      if (acao.tipo === 'pagina') {
        return { name: acao.rota, query: acao.retryAfter ? { retry_after: String(acao.retryAfter) } : {} };
      }
      if (acao.tipo === 'redirect' && acao.url) {
        window.location.assign(acao.url);
        return false;
      }
      return { name: 'login', query: { redirect: to.fullPath } };
    }
  }

  if (to.meta.roles && !to.meta.roles.includes(authState.user?.papel)) {
    return { name: 'dashboard' };
  }
  return true;
});

export default router;
