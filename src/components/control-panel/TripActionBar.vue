<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTripStore } from '@/stores/tripStore';
import { useMapStore } from '@/stores/mapStore';
import { useHighlightStore } from '@/stores/highlightStore';
import { useExportTrip } from '@/composables/useExportTrip';
import { useTripShare } from '@/composables/useTripShare';
import type { TripActionBarProps } from '@/types/components';

const props = withDefaults(defineProps<TripActionBarProps>(), {
  isBusy: false,
});

const tripStore      = useTripStore();
const mapStore       = useMapStore();
const highlightStore = useHighlightStore();
const { exportJson, exportPdf, isExporting, exportError } = useExportTrip();
const { shareTrip, isSharing, shareError }                = useTripShare();

const hasTrip = computed(() => tripStore.selectedTrip !== null);
const isDisabled = computed(() => !hasTrip.value || props.isBusy);

// ── Snackbar ────────────────────────────────────────────────────────────────
const snackbarVisible  = ref(false);
const snackbarMessage  = ref('');
const snackbarColor    = ref<'success' | 'error'>('success');

function showSnackbar(message: string, color: 'success' | 'error' = 'success'): void {
  snackbarMessage.value = message;
  snackbarColor.value   = color;
  snackbarVisible.value = true;
}

// ── Handlers ────────────────────────────────────────────────────────────────

function handleReset(): void {
  tripStore.reset();
  mapStore.reset();
  highlightStore.clearHovered();
  // Clear any shared URL param so a page refresh doesn't restore the deleted trip
  window.history.replaceState({}, '', window.location.pathname);
  showSnackbar('行程已重置');
}

function handleExportJson(): void {
  exportJson();
  if (exportError.value) {
    showSnackbar('匯出失敗：找不到行程資料', 'error');
  } else {
    showSnackbar('行程已匯出為 JSON');
  }
}

function handleExportPdf(): void {
  exportPdf();
}

async function handleShare(): Promise<void> {
  await shareTrip();
  if (shareError.value === 'NO_TRIP') {
    showSnackbar('請先生成行程再分享', 'error');
  } else if (shareError.value === 'CLIPBOARD_FAIL') {
    showSnackbar('連結已寫入網址列，請手動複製', 'error');
  } else if (shareError.value === 'ENCODE_FAIL') {
    showSnackbar('分享連結產生失敗', 'error');
  } else {
    showSnackbar('分享連結已複製至剪貼簿 🎉');
  }
}
</script>

<template>
  <v-card variant="outlined" class="trip-action-bar pa-3">
    <div class="d-flex align-center gap-2 flex-wrap">
      <!-- F-10.1: Reset -->
      <v-btn
        variant="outlined"
        color="error"
        size="small"
        prepend-icon="mdi-refresh"
        :disabled="isDisabled"
        @click="handleReset"
      >
        重新開始
      </v-btn>

      <!-- F-10.2: Export (dropdown menu) -->
      <v-menu :disabled="isDisabled">
        <template #activator="{ props: menuProps }">
          <v-btn
            variant="outlined"
            color="primary"
            size="small"
            prepend-icon="mdi-download"
            append-icon="mdi-chevron-down"
            :disabled="isDisabled || isExporting"
            v-bind="menuProps"
          >
            匯出行程
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item
            prepend-icon="mdi-code-json"
            title="匯出 JSON"
            @click="handleExportJson"
          />
          <v-list-item
            prepend-icon="mdi-printer"
            title="列印 / 儲存 PDF"
            @click="handleExportPdf"
          />
        </v-list>
      </v-menu>

      <!-- F-10.3: Share -->
      <v-tooltip :text="!hasTrip ? '請先生成行程' : '複製分享連結'" location="top">
        <template #activator="{ props: tooltipProps }">
          <span v-bind="tooltipProps">
            <v-btn
              variant="outlined"
              color="secondary"
              size="small"
              prepend-icon="mdi-share-variant"
              :disabled="isDisabled || isSharing"
              @click="handleShare"
            >
              分享行程
            </v-btn>
          </span>
        </template>
      </v-tooltip>
    </div>

    <!-- Confirmation snackbar -->
    <v-snackbar
      v-model="snackbarVisible"
      :color="snackbarColor"
      :timeout="2500"
      location="bottom"
    >
      {{ snackbarMessage }}
    </v-snackbar>
  </v-card>
</template>

<style scoped>
.trip-action-bar {
  background: #fff;
}

.gap-2 {
  gap: 8px;
}
</style>
