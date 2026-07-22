<template>
  <div class="panel">
    <div class="panel-title">{{ title }}</div>
    <div class="data-card">
      <!-- <div v-for="(item, index) in list" :key="index" class="data-card">
        <div class="data-header">
          <span class="data-label">{{ item.name }}</span>
        
        </div>
        <div class="data-value">
          {{ item.value }}<span class="data-unit">个</span>
        </div>
      </div> -->
      <div class="data-chart">
        <Echart v-if="chartReady" :data="list" :echartOptions="echartOptions" />
        <div v-else class="chart-placeholder">图表加载中...</div>
      </div>
    </div>
  </div>
</template>

<script setup>

import { defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAppStore } from '@/store/modules/app';
import { getInsectStatistics } from '@/utils/api'

const Echart = defineAsyncComponent(() => import('./COMS/Echart.vue'))
const props = defineProps({
  title: String,
  data: Array
})

const list = ref([])
const echartOptions = ref({})
const chartReady = ref(false)
let idleTimer = null

function setChartData(data = []) {
  if (!data.length) return
  list.value = data.map(item => ({
    name: item.name || item.label,
    value: item.value ?? item.count ?? 0
  }))
  echartOptions.value = {
    xAxis: {
      type: 'category',
      data: list.value.map(item => item.name),
    },
    yAxis: {
      type: 'value',
      axisLabel: {},
    },
    series: [
      {
        data: list.value.map(item => item.value),
        type: 'bar',
        itemStyle: {
          color: '#5470c6'
        },
        label: {
          show: true,
          position: 'top',
          color: '#333',
        }
      }
    ],
  }
}

watch(() => props.data, (data) => {
  setChartData(data)
}, {
  immediate: true,
  deep: true
})

onMounted(() => {
  deferChartLoad()
  if (props.data && props.data.length) return
  const appStore = useAppStore();
  const params = {
    etime: "",
    stime: "",
    appName: appStore.appInfo.name,
    token: appStore.appInfo.token,
    imei: "ft202604001",
  }
  getInsectStatistics(params).then(res => {
    console.log(res)
    if (res.code === 200) {
      // list.value = res.data.sort((a, b) => {
      //   return b.value - a.value
      // }).map(item => {
      //   return {
      //     name: item.name,
      //     value: item.value
      //   }
      // })

      echartOptions.value = {
        xAxis: {
          type: 'category',
          data: res.data.map((item, index) => item.name), // 示例：生成X轴数据
         
        },
        yAxis: {
          type: 'value',
          axisLabel: {
          },
        },
        series: [
          {
            data: res.data.map((item, index) => item.value ?? item.count ?? 0),
            type: 'bar',
            itemStyle: {
              color: '#5470c6'
            },
            label: {
                show: true,          // 开启显示
                position: 'top',     // 设置数字显示的位置（'top'表示柱子顶部）
                color: '#333',       // （可选）设置数字的颜色
            }
          }
        ],
      }

    }
  })
})

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

onBeforeUnmount(() => {
  if (!idleTimer || typeof window === 'undefined') return
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(idleTimer)
  } else {
    window.clearTimeout(idleTimer)
  }
})

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
  color: #27ae60;
  padding-bottom: 8px;
  border-bottom: 2px solid #2ecc71;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.5px;
}

.panel-list {
  display: flex;
  flex-direction: column;
  /* height: 300px; */
  /* overflow-y: auto; */
  gap: 12px;
}

.data-card {
  background: #ffffff;
  border: 1px solid #e8e8e8;
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
  color: #7f8c8d;
  letter-spacing: 0.5px;
}

.data-status {
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.status-good {
  background: #e8f8f0;
  color: #27ae60;
}

.status-warning {
  background: #fef5e7;
  color: #e67e22;
}

.status-bad {
  background: #fdedec;
  color: #e74c3c;
}

.data-value {
  font-size: 26px;
  font-weight: 700;
  color: #2c3e50;
}

.data-unit {
  font-size: 12px;
  color: #95a5a6;
  margin-left: 4px;
  font-weight: 400;
}

.data-chart {
  height: 150px;
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
  background: linear-gradient(180deg, #2ecc71 0%, #a9dfbf 100%);
  border-radius: 3px 3px 0 0;
  transition: all 0.3s;
}

.chart-bar:hover {
  background: linear-gradient(180deg, #27ae60 0%, #82e0aa 100%);
}
</style>
