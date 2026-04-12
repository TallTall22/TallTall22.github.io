// src/stores/highlightStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useHighlightStore = defineStore('highlight', () => {
  const hoveredStadiumId = ref<string | null>(null);

  function setHovered(id: string): void {
    hoveredStadiumId.value = id;
  }

  function clearHovered(): void {
    hoveredStadiumId.value = null;
  }

  function reset(): void {
    hoveredStadiumId.value = null;
  }

  return { hoveredStadiumId, setHovered, clearHovered, reset };
});
