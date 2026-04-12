import { createApp } from 'vue';
import App from './App.vue';

// Leaflet CSS (must be before Vuetify to allow overrides)
import 'leaflet/dist/leaflet.css';

// F-07 marker / popup styles
import '@/assets/main.css';

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

const app = createApp(App);

app.config.errorHandler = (err, _instance, info) => {
  // eslint-disable-next-line no-console
  console.error('[Vue] Unhandled error in', info, err);
};

app.use(vuetify).use(pinia).mount('#app');
