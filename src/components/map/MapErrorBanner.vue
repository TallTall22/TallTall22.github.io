<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  message:  string;
  onRetry?: (() => void) | null;
}>();

const dismissed = ref(false);

watch(() => props.message, () => {
  dismissed.value = false;
});
</script>

<template>
  <Transition name="slide-down">
    <div v-if="!dismissed" class="map-error-banner">
      <v-alert
        type="error"
        variant="tonal"
        closable
        density="compact"
        @click:close="dismissed = true"
      >
        <div class="error-content">
          <span>{{ message }}</span>
          <v-btn
            v-if="props.onRetry"
            size="x-small"
            variant="outlined"
            color="error"
            class="ml-2"
            @click="props.onRetry()"
          >
            重試
          </v-btn>
        </div>
      </v-alert>
    </div>
  </Transition>
</template>

<style scoped>
.map-error-banner {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  z-index: 10;
}

.error-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

