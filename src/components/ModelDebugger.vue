<template>
  <div class="debug-panel">
    <h3>🛠️ GLB 调试器</h3>
    <div v-for="(val, key) in config" :key="key" class="control-group">
      <label>{{ getLabel(key) }}: {{ val }}</label>
      <template v-if="key == 'show'">
        <input type="checkbox" v-model="config.show" @input="updateModel">
      </template>
      <template v-else>
        <input type="number" v-model.number="config[key]" :step="getStep(key)" :min="getMin(key)" :max="getMax(key)" @input="updateModel">
      </template>

    </div>
    
    <div class="actions">
      <button @click="copyCode">复制代码</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  viewer: Object,
  entity: Object,
  initialConfig: {
    type: Object,
    default: () => ({
      // lon: 120.089756,
      // lat: 32.246997,
      // height: 0,
      // scale: 0.2,
      // heading: 90,
      // pitch: 0,
      // roll: 0,
        lon: 120.08935,
        lat: 32.24715,
        height: 0,
        scale: 1,
        heading: 88,
        pitch: 0,
        roll: 0,
      show: true
    })
  }
})

const modelEntity = ref(null)

const emit = defineEmits(['configChange'])

// 创建响应式副本
const config = reactive({ 
  // name: "农田",
  // id: "农田",
  lon: 120.0973,
  lat: 32.2517,
  height: 0,
  scale: 1.8,
  heading: 89,
  pitch: 0,
  roll: 0,
  show: true
 })

const labels = {
  lon: '经度', lat: '纬度', height: '高度(m)',
  scale: '缩放', heading: '航向(°)', pitch: '俯仰(°)', roll: '翻滚(°)',
  show: '显示'
}

const steps = { lon: 0.0001, lat: 0.0001, height: 1, scale: 0.01, heading: 1, pitch: 1, roll: 1 }
const mins = { lon: 110, lat: 30, height: -100, scale: 0.01, heading: 0, pitch: -90, roll: -180 }
const maxs = { lon: 1321, lat: 33, height: 1000, scale: 10, heading: 360, pitch: 90, roll: 180 }

function getLabel(key) { return labels[key] || key }
function getStep(key) { return steps[key] || 1 }
function getMin(key) { return mins[key] || 0 }
function getMax(key) { return maxs[key] || 100 }

function updateModel() {

  if (!props.entity) {
    return
  }

  const Cesium = window.Cesium
  const { lon, lat, height, scale, heading, pitch, roll, show } = config

  // 更新位置
  props.entity.position = Cesium.Cartesian3.fromDegrees(lon, lat, height)

  // 更新缩放
  if (props.entity.model) {
    props.entity.model.scale = scale
  }

  // 更新旋转
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(heading),
    Cesium.Math.toRadians(pitch),
    Cesium.Math.toRadians(roll)
  )
  const origin = Cesium.Cartesian3.fromDegrees(lon, lat, height)
  props.entity.orientation = Cesium.Transforms.headingPitchRollQuaternion(origin, hpr)
  props.entity.show = show
  emit('configChange', { ...config })
}

function copyCode() {
  const { lon, lat, height, scale, heading, pitch, roll } = config
  const code = `
// 最终配置
position: Cesium.Cartesian3.fromDegrees(${lon}, ${lat}, ${height}),
model: {
  uri: './static/glb/your_model.glb',
  scale: ${scale},
  orientation: Cesium.Transforms.headingPitchRollQuaternion(
    Cesium.Cartesian3.fromDegrees(${lon}, ${lat}, ${height}),
    new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(${heading}),
      Cesium.Math.toRadians(${pitch}),
      Cesium.Math.toRadians(${roll})
    )
  )
}
  `.trim()
  navigator.clipboard.writeText(code)
  alert('代码已复制')
}

watch(() => props.viewer, (newMode) => {
  if (props.viewer) {
    // init()
  }
})

function init() {
  // return 
  console.log(111111,props, props.viewer)
  modelEntity.value = props.viewer && props.viewer?.entities?.add({
    name: 'Model',
    position: Cesium.Cartesian3.fromDegrees(config.lon, config.lat, config.height),
    show: true,
    model: {
      show: true,
      uri: './static/glb/厂房1.glb',
      color: new Cesium.Color(1.2, 1.2, 1.2, 1.0), // 增加RGB值来提亮
      scale: config.scale,
      // minimumPixelSize: 128,
      // maximumScale: 20000,
      // 开启调试模式
      //debugShowBoundingVolume: true, // 显示包围盒，帮助定位模型
      orientation: Cesium.Transforms.headingPitchRollQuaternion(
        Cesium.Cartesian3.fromDegrees(config.lon, config.lat, config.height),
        new Cesium.HeadingPitchRoll(
          Cesium.Math.toRadians(config.heading),   // 偏航角（绕垂直轴旋转，类似指南针方向）
          Cesium.Math.toRadians(config.pitch),    // 俯仰角（上下倾斜）
          Cesium.Math.toRadians(config.roll)     // 翻滚角（绕模型自身轴旋转）
        )
      )
    }
  })

  props.viewer && props.viewer.flyTo(modelEntity.value);
}
</script>

<style scoped>
/* 复用上面的 CSS */
.debug-panel {
  position: absolute;
  top: 20px;
  left: 300px;
  width: 300px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 15px;
  border-radius: 8px;
  z-index: 100;
  font-family: monospace;
  font-size: 12px;
}
.control-group {
  margin-bottom: 10px;
}
.control-group label {
  display: block;
  margin-bottom: 4px;
  color: #aaa;
}
.control-group input {
  width: 100%;
}
.actions button {
  width: 100%;
  padding: 8px;
  background: #007bff;
  border: none;
  color: white;
  cursor: pointer;
}
</style>