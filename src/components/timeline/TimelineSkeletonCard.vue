<template>
  <div class="skeleton-card" aria-hidden="true">
    <div class="skeleton-header" />
    <div class="skeleton-body">
      <div class="skeleton-line skeleton-line--wide" />
      <div class="skeleton-line skeleton-line--medium" />
      <div class="skeleton-line skeleton-line--narrow" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-card {
  width: 220px;
  min-width: 220px;
  min-height: 160px;
  border-radius: 8px;
  overflow: hidden;
  background: #e0e0e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.skeleton-header {
  height: 36px;
  background: linear-gradient(90deg, #d0d0d0 25%, #e8e8e8 50%, #d0d0d0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #d0d0d0 25%, #e8e8e8 50%, #d0d0d0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-line--wide   { width: 80%; }
.skeleton-line--medium { width: 60%; }
.skeleton-line--narrow { width: 40%; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
