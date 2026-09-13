import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import './plugins/auth.js';
import './assets/css/main.css';

createApp(App).use(router).mount('#app');