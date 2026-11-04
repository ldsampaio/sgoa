import router from '../router/index.js';
import { AuthController } from '../controllers/AuthController.js';
import { decidirAcao } from './decisaoErro.js';

window.addEventListener('sgoa:auth', (event) => {
  const acao = decidirAcao(event.detail.status, event.detail.body);

  if (acao.tipo === 'redirect') {
    // 401: sessão morta. Redireciona para o saga usando o login_url do corpo.
    AuthController.limpar();
    if (acao.url) window.location.assign(acao.url);
    else router.push({ name: 'login' });
    return;
  }

  if (acao.tipo === 'pagina') {
    // 503: o saga não está respondendo. Página de erro própria, SEM redirect —
    // redirecionar para o serviço que caiu é o loop que se quer evitar.
    AuthController.limpar();
    router.push({ name: acao.rota });
  }
});
