<template>
  <div class="scene-header">
    <div class="location-badge">
      <span class="icon">📍</span>
      <span class="text">{{ location }}</span>
      <span class="coords">{{ coords }}</span>
    </div>
    <div class="mode-indicator">
      <div class="mode-tag">{{ modeText }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mode: String,
  location: String,
  coords: String,
  label: String
})

const modeText = computed(() => {
  const map = {
    overview: '🌾 总览',
    testfield: '🌱 试验田',
    workshop: '🏭 烘干车间',
    warehouse: '📦 仓库'
  }
  return map[props.mode] || '🌾 总览'
})
</script>

<style scoped>
.scene-header {
  position: absolute;
  top: 66px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(46, 204, 113, 0.25);
  z-index: 90;
}

.location-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #E8F8F0;
  border: 1px solid #A9DFBF;
  border-radius: 8px;
  padding: 8px 16px;
}

.location-badge .icon {
  font-size: 14px;
}

.location-badge .text {
  font-size: 13px;
  color: #27AE60;
  font-weight: 500;
}

.location-badge .coords {
  font-size: 11px;
  color: #7F8C8D;
  font-family: 'Roboto Mono', monospace;
  margin-left: 8px;
  border-left: 1px solid #A9DFBF;
  padding-left: 8px;
}

.mode-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mode-tag {
  background: linear-gradient(135deg, #2ECC71, #27AE60);
  color: white;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
}
</style>
