import { createApp } from 'vue';
import App from './App.vue';

// Vuetify
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

// Pinia
import { createPinia } from 'pinia';

const vuetify = createVuetify({
  components,
  directives,
  icons: { defaultSet: 'mdi' },
  theme: {
    themes: {
      light: {
        colors: {
          primary:   '#002D72',
          secondary: '#FFD700',
          error:     '#D32F2E',
          warning:   '#FF6B35',
          success:   '#10A947',
        },
      },
    },
  },
});

const pinia = createPinia();

createApp(App).use(vuetify).use(pinia).mount('#app');
