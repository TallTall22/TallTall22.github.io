<script setup lang="ts">
import DateRangePicker from './components/control-panel/DateRangePicker.vue';
</script>

<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-app-bar-title>⚾ MLB Ballpark Tour Planner</v-app-bar-title>
    </v-app-bar>

    <v-main class="pa-4" style="padding-top: 80px !important">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
            <DateRangePicker
              @range-confirmed="(r) => console.log('confirmed', r)"
              @range-cleared="() => console.log('cleared')"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped></style>
