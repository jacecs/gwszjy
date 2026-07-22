<template>
  <div class="page-echart">
    <!-- 图表容器，必须指定宽高 -->
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { init, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

use([BarChart, LineChart, GridComponent, TitleComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  // 假设 data 是 ECharts 的 option 配置项，或者是包含 series/data 的结构
  // 这里假设 data 直接作为 series 数据或者完整的 option 的一部分，具体视父组件传入格式而定
  // 为了通用性，下面示例假设 data 变化时触发重绘，通常父组件会传入完整的 option 或特定数据
  data: {
    type: Array,
    default: () => []
  },
  echartOptions: {
    type: Object,
    default: () => ({})
  }
})

const chartRef = ref(null)
let chartInstance = null

const formatDateLabel = (value) => {
  const text = String(value ?? '')
  const dateMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (dateMatch) return `${Number(dateMatch[2])}-${Number(dateMatch[3])}`
  const shortMatch = text.match(/^(\d{1,2})-(\d{1,2})$/)
  if (shortMatch) return `${Number(shortMatch[1])}-${Number(shortMatch[2])}`
  return text
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return

  // 如果实例已存在，先销毁
  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = init(chartRef.value)

  // 设置初始配置
  updateChart()
}

// 更新图表配置
const updateChart = () => {
  if (!chartInstance) return

  // 这里根据实际需求构建 option
  // 假设 props.data 是系列数据，这里做一个简单的柱状图示例
  // 实际项目中，你可能需要更复杂的逻辑来合并 props.title 和 props.data 到 option 中
  const option = {
    title: {
      text: props.title,
      left: 'center'
    },
    grid: {
      top: 10,
      bottom: '5',
      left: 5,
      right: 5,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: props.data.map((item, index) =>item.time), // 示例：生成X轴数据
       axisLabel: {
          formatter: function (value, index) {
            return formatDateLabel(value)
          }
        },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        // interval: '2',
      },
    },
    series: [
      {
        data: props.data,
        type: 'line',
        itemStyle: {
          color: '#5470c6'
        }
      }
    ],
    ...props.echartOptions
  }

  // 如果父组件传入的是完整的 option 对象，可以直接使用:
  // const option = { ...baseOption, ...props.data } 
  chartInstance.setOption(option, true) // true 表示不合并，完全替换
}

// 监听 data 变化
watch(
 [() => props.data,  () => props.echartOptions],
  (newVal) => {
    if (chartInstance) {
      updateChart()
    }
  },
)

// 监听 title 变化
watch(
  () => props.title,
  () => {
    if (chartInstance) {
      updateChart()
    }
  }
)

// 窗口大小变化时重置图表大小
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

onMounted(() => {
  // 确保 DOM 渲染完成后初始化
  nextTick(() => {
    initChart()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  // 移除事件监听
  window.removeEventListener('resize', handleResize)

  // 销毁 ECharts 实例，防止内存泄漏
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
.page-echart {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart-container {
  width: 100%;
  height: 100%;
}
</style>
