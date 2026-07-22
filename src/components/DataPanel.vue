<template>
  <div class="panel">
    <div class="panel-title">{{ title }}</div>
    
    <div v-for="(item, index) in data" :key="index" class="data-card">
      <div class="data-header">
        <span class="data-label">{{ item.label }}</span>
        <span v-if="hasDisplayStatus(item.status)" class="data-status" :class="getStatusClass(item.status)">
          {{ item.status }}
        </span>
      </div>
      <div class="data-value">
        {{ item.value }}<span class="data-unit">{{ item.unit }}</span>
      </div>
      <div v-if="item.chart" class="data-chart">
        <Echart v-if="chartReady" :data="item.chart" />
        <div v-else class="chart-placeholder">图表加载中...</div>
        <!-- <div 
          v-for="(h, i) in item.chart" 
          :key="i" 
          class="chart-bar" 
          :style="{ height: h + '%' }"
        ></div> -->
      </div>
    </div>
  </div>
</template>

<script setup>

import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
const Echart = defineAsyncComponent(() => import('./COMS/Echart.vue'))
defineProps({
  title: String,
  data: Array
})

const chartReady = ref(false)
let idleTimer = null

function deferChartLoad() {
  if (typeof window === 'undefined') {
    chartReady.value = true
    return
  }
  if ('requestIdleCallback' in window) {
    idleTimer = window.requestIdleCallback(() => {
      chartReady.value = true
    }, { timeout: 1800 })
    return
  }
  idleTimer = window.setTimeout(() => {
    chartReady.value = true
  }, 800)
}

onMounted(deferChartLoad)

onBeforeUnmount(() => {
  if (!idleTimer || typeof window === 'undefined') return
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(idleTimer)
  } else {
    window.clearTimeout(idleTimer)
  }
})

function hasDisplayStatus(status) {
  return status !== undefined && status !== null && status !== ''
}

function getStatusClass(status) {
  if (status === '正常' || status === '充足' || status === '运行中') return 'status-good'
  if (status === '节能' || status === '68%' || status === '偏低' || status === '偏高') return 'status-warning'
  if (status === '停机' || status === '关闭' || status === '离线' || status === '异常' || status === '告警') return 'status-bad'
  return ''
}
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-title {
  font-size: 13px;
  font-weight: 700;
  color: #27AE60;
  padding-bottom: 8px;
  border-bottom: 2px solid #2ECC71;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.5px;
}

.data-card {
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  padding: 14px;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.data-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.data-label {
  font-size: 12px;
  color: #7F8C8D;
  letter-spacing: 0.5px;
}

.data-status {
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.status-good {
  background: #E8F8F0;
  color: #27AE60;
}

.status-warning {
  background: #FEF5E7;
  color: #E67E22;
}

.status-bad {
  background: #FDEDEC;
  color: #E74C3C;
}

.data-value {
  font-size: 26px;
  font-weight: 700;
  color: #2C3E50;
}

.data-unit {
  font-size: 12px;
  color: #95A5A6;
  margin-left: 4px;
  font-weight: 400;
}

.data-chart {
  height: 100px;
  /* margin-top: 10px;
  display: flex;
  align-items: flex-end;
  gap: 3px; */
}

.chart-placeholder {
  height: 100%;
  border-radius: 6px;
  background: #f2f6f4;
  color: #6f7d75;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.chart-bar {
  flex: 1;
  background: linear-gradient(180deg, #2ECC71 0%, #A9DFBF 100%);
  border-radius: 3px 3px 0 0;
  transition: all 0.3s;
}

.chart-bar:hover {
  background: linear-gradient(180deg, #27AE60 0%, #82E0AA 100%);
}
</style>
