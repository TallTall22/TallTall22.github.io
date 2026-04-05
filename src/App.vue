<script setup lang="ts">
import { ref } from 'vue';
import HelloWorld from './components/HelloWorld.vue';

const msg = ref('MLB Field - Vue 3 + TypeScript');
</script>

<template>
  <header>
    <h1>{{ msg }}</h1>
  </header>
  <main>
    <HelloWorld msg="Welcome to MLB Field Project" />
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
  padding: 1.5rem;
  text-align: center;
}

header h1 {
  color: #0052cc;
}

main {
  margin: 2rem 0;
}
</style>
