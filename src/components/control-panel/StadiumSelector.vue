<script setup lang="ts">
import { useStadiumSelector } from '@/composables/useStadiumSelector';
import type { StadiumSelectorProps, StadiumSelectorOption } from '@/types/components';

const props = withDefaults(defineProps<StadiumSelectorProps>(), {
  disabled: false,
  label: '選擇主場球隊',
});

const {
  options,
  selectedOption,
  isLoading,
  loadError,
  onSelect,
} = useStadiumSelector();

function handleUpdate(value: StadiumSelectorOption | null): void {
  onSelect(value);
}

function handleLogoError(event: Event): void {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}
</script>

<template>
  <v-card variant="outlined" class="pa-4">
    <v-card-title class="text-primary">
      <v-icon class="mr-2">mdi-stadium</v-icon>
      選擇起點球場
    </v-card-title>

    <!-- Error state -->
    <v-alert
      v-if="loadError"
      type="error"
      variant="tonal"
      class="mt-2"
      density="compact"
    >
      無法載入球隊資料，請重新整理頁面
    </v-alert>

    <v-autocomplete
      v-else
      :model-value="selectedOption"
      :items="options"
      :item-title="'label'"
      :item-value="(o: StadiumSelectorOption) => o"
      :loading="isLoading"
      :disabled="props.disabled || isLoading || !!loadError"
      :label="props.label"
      :placeholder="isLoading ? '載入中...' : '搜尋城市、球隊或球場名稱'"
      clearable
      return-object
      no-data-text="沒有符合的球隊"
      prepend-inner-icon="mdi-magnify"
      class="mt-2"
      @update:model-value="handleUpdate"
    >
      <!-- Custom item slot: show logo + team name + stadium name -->
      <template #item="{ item, props: itemProps }">
        <v-list-item v-bind="itemProps" :title="undefined">
          <template #prepend>
            <div class="logo-wrapper mr-3">
              <img
                :src="(item.raw as StadiumSelectorOption).stadium.logoUrl"
                :alt="(item.raw as StadiumSelectorOption).stadium.teamNickname + ' logo'"
                width="32"
                height="32"
                @error="handleLogoError"
              />
              <span class="logo-fallback">⚾</span>
            </div>
          </template>
          <v-list-item-title>{{ (item.raw as StadiumSelectorOption).stadium.teamName }}</v-list-item-title>
          <v-list-item-subtitle>
            {{ (item.raw as StadiumSelectorOption).stadium.stadiumName }} · {{ (item.raw as StadiumSelectorOption).stadium.city }}, {{ (item.raw as StadiumSelectorOption).stadium.state }}
          </v-list-item-subtitle>
        </v-list-item>
      </template>

      <!-- Custom selection chip: show logo + team name -->
      <template #selection="{ item }">
        <div class="d-flex align-center ga-2">
          <img
            :src="(item.raw as StadiumSelectorOption).stadium.logoUrl"
            :alt="(item.raw as StadiumSelectorOption).stadium.teamNickname"
            width="24"
            height="24"
            @error="handleLogoError"
          />
          <span>{{ (item.raw as StadiumSelectorOption).stadium.teamName }}</span>
        </div>
      </template>
    </v-autocomplete>
  </v-card>
</template>

<style scoped>
.logo-wrapper {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-wrapper img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-fallback {
  font-size: 20px;
}
</style>
