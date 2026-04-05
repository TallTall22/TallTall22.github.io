<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  msg?: string;
}

defineProps<Props>();

const count = ref(0);
</script>

<template>
  <div class="card">
    <h1>{{ msg }}</h1>

    <div class="card">
      <button @click="count++">count is {{ count }}</button>
      <p>
        Edit
        <code>components/HelloWorld.vue</code> to test HMR
      </p>
    </div>

    <p>
      <a href="https://vitejs.dev/guide/features.html" target="_blank"> Vite Docs </a>
      |
      <a href="https://v3.vuejs.org/" target="_blank"> Vue 3 Docs </a>
    </p>
  </div>
</template>

<style scoped>
.card {
  padding: 2em;
}

a {
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  button {
    background-color: #f9f9f9;
  }
}
</style>
