<template>

</template>

<script setup>
// 总揽模式
import { reactive, ref, onMounted, onUnmounted, watch,getCurrentInstance } from 'vue'

// const instance = getCurrentInstance();
// const viewer = instance.appContext.config.globalProperties.$viewer;
import GLOBAL from '@/utils/GLOBAL.js'
const viewer = GLOBAL.viewer;
const props = defineProps({

})

watch(() => props.data, (newMode) => {
  init()
})


onMounted(() => {
})

onUnmounted(() => {
})

function init() {
  //   viewer.camera.flyTo({
  //   destination: Cesium.Cartesian3.fromDegrees(120.08949750428685, 32.239695454280, 900),
  //   orientation: {
  //     heading: Cesium.Math.toRadians(0),
  //     pitch: Cesium.Math.toRadians(-45),
  //     roll: 0
  //   },
  //   duration: 1.5
  // })
}

</script>
