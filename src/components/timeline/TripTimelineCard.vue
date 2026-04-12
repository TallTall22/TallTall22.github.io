<script setup lang="ts">
import { computed } from 'vue';
import type { TripTimelineCardProps } from '@/types/components';

const props = withDefaults(defineProps<TripTimelineCardProps>(), {
  isActive: false,
});

const formattedDate = computed<string>(() => {
  const d = new Date(props.day.date + 'T12:00:00Z');
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d);
});
</script>

<template>
  <v-card
    :class="['timeline-card', { 'timeline-card--active': props.isActive }]"
    elevation="2"
    rounded="lg"
  >
    <!-- Day badge -->
    <div class="day-badge">{{ props.day.dayNumber }}</div>

    <!-- Header -->
    <div
      :class="[
        'card-header',
        props.day.type === 'game_day' ? 'card-header--game' : 'card-header--travel',
      ]"
    >
      <span class="card-date">{{ formattedDate }}</span>
      <span class="card-dow">{{ props.day.dayOfWeek }}</span>
    </div>

    <!-- Game Day content -->
    <template v-if="props.day.type === 'game_day'">
      <div class="card-body">
        <!-- Team logos or nicknames -->
        <div class="matchup-logos">
          <template v-if="props.day.awayTeamLogo">
            <v-img
              :src="props.day.awayTeamLogo"
              width="28"
              height="28"
              :alt="props.day.awayTeamNickname ?? 'Away team'"
              class="team-logo"
            />
          </template>
          <template v-else>
            <span class="team-nickname">{{ props.day.awayTeamNickname ?? 'Away' }}</span>
          </template>

          <span class="at-symbol">@</span>

          <template v-if="props.day.homeTeamLogo">
            <v-img
              :src="props.day.homeTeamLogo"
              width="28"
              height="28"
              :alt="props.day.homeTeamNickname ?? 'Home team'"
              class="team-logo"
            />
          </template>
          <template v-else>
            <span class="team-nickname">{{ props.day.homeTeamNickname ?? 'Home' }}</span>
          </template>
        </div>

        <!-- Matchup label -->
        <div v-if="props.day.matchupLabel" class="matchup-label">
          {{ props.day.matchupLabel }}
        </div>

        <!-- Local time -->
        <div v-if="props.day.localTime" class="game-time">
          🕐 {{ props.day.localTime }}
        </div>

        <!-- Stadium / city -->
        <div v-if="props.day.stadiumName || props.day.city" class="stadium-info">
          {{ props.day.stadiumName
          }}<template v-if="props.day.city">, {{ props.day.city }}</template>
        </div>
      </div>
    </template>

    <!-- Travel Day content -->
    <template v-else>
      <div class="card-body card-body--travel">
        <v-icon icon="mdi-airplane" size="32" color="grey-darken-1" />
        <div class="travel-label">Travel Day</div>
        <div v-if="props.day.distanceKm !== null" class="travel-distance">
          ~{{ Math.round(props.day.distanceKm) }} km
        </div>
        <div v-if="props.day.stadiumName || props.day.city" class="stadium-info">
          {{ props.day.stadiumName
          }}<template v-if="props.day.city">, {{ props.day.city }}</template>
        </div>
      </div>
    </template>
  </v-card>
</template>

<style scoped>
.timeline-card {
  width: 220px;
  min-width: 220px;
  min-height: 160px;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.timeline-card--active {
  outline: 2px solid var(--mlb-primary, #002D72);
}

.day-badge {
  position: absolute;
  top: -10px;
  left: 10px;
  background: var(--mlb-primary, #002D72);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 6px;
  border-radius: 8px 8px 0 0;
}

.card-header--game {
  background: var(--mlb-primary, #002D72);
  color: #fff;
}

.card-header--travel {
  background: #757575;
  color: #fff;
}

.card-date {
  font-size: 12px;
  font-weight: 600;
}

.card-dow {
  font-size: 11px;
  opacity: 0.85;
}

.card-body {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.card-body--travel {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.matchup-logos {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}

.team-logo {
  border-radius: 2px;
}

.at-symbol {
  font-size: 12px;
  color: #555;
  font-weight: 600;
}

.team-nickname {
  font-size: 11px;
  font-weight: 600;
  color: var(--mlb-primary, #002D72);
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.matchup-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--mlb-primary, #002D72);
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.game-time {
  font-size: 11px;
  color: #444;
}

.travel-label {
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-top: 4px;
}

.travel-distance {
  font-size: 11px;
  color: #888;
}

.stadium-info {
  font-size: 10px;
  color: #888;
  margin-top: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
