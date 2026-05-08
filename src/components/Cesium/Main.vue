<template>

</template>

<script setup>
// 总揽模式
import { reactive, ref, onMounted, onUnmounted, watch, getCurrentInstance } from 'vue'
// const instance = getCurrentInstance();
// const viewer = instance.appContext.config.globalProperties.$viewer;
import GLOBAL from '@/utils/GLOBAL.js'
const viewer = GLOBAL.viewer;

const props = defineProps({

})

const modelEntity = ref(null)
watch(() => props.data, (newMode) => {
  init(newMode)
},
{
  immediate: true
})

onMounted(() => {
})

onUnmounted(() => {
})

function init(obj) {
}

</script>
