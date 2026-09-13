import router from '../router/index.js';
import { AuthController } from '../controllers/AuthController.js';

window.addEventListener('sgoa:unauthorized', () => {
  AuthController.logout();
  router.push({ name: 'login' });
});