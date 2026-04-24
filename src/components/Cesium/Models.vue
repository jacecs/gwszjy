<template>
  <div>
    <!-- <ModelDebugger :v-if="viewerOBj" :entity="modelEntity1" :viewer="viewerOBj" /> -->
  </div>
</template>

<script setup>
// 模型
import { reactive, ref, onMounted, onUnmounted, watch, getCurrentInstance } from 'vue'
import ModelDebugger from './../ModelDebugger.vue'
import ViewerEvents from '@/utils/ViewerEvents.js'
// const instance = getCurrentInstance();
// const viewer = instance.appContext.config.globalProperties.$viewer;
import GLOBAL from '@/utils/GLOBAL.js'
const viewer = GLOBAL.viewer;


const props = defineProps({
  gltfs: {
    type: Array,
    default: () => [
      {
        url: "./static/glb/场景/厂房1.glb",
        name: "厂房1",
        id: "厂房1",
        lon: 120.08935,
        lat: 32.24715,
        height: 10,
        scale: 0.285,
        heading: 88,
        pitch: 0,
        roll: 0
      },
      // {
      //   url: "./static/glb/厂房23.glb",
      //   name: "厂房2",
      //   id: "厂房2",
      //   lon: 120.0299,
      //   lat: 32.2559,
      //   height: 0,
      //   scale: 0.7,
      //   heading: 268,
      //   pitch: 0,
      //   roll: 0
      // },
      // {
      //   url: "./static/glb/厂房3.glb",
      //   name: "厂房3",
      //   id: "厂房3",
      //   lon: 120.08935,
      //   lat: 32.24715,
      //   height: 10,
      //   scale: 0.285,
      //   heading: 88,
      //   pitch: 0,
      //   roll: 0
      // },
      {
        url: "./static/glb/场景/监控农田.glb",
        name: "农田",
        id: "农田",
        lon: 121.08935,
        lat: 32.24715,
        height: 0,
        scale: 1,
        heading: 88,
        pitch: 0,
        roll: 0
      },
      // {
      //   url: "./static/glb/水泵站.glb",
      //   name: "水泵站",
      //   id: "水泵站",
      //   lon: 120.08935,
      //   lat: 32.24715,
      //   height: 10,
      //   scale: 0.285,
      //   heading: 88,
      //   pitch: 0,
      //   roll: 0
      // },
      // {
      //   url: "./static/glb/厂房2.glb",
      //   name: "仓库1",
      //   id: "仓库1",
      //   lon: 120.0298,
      //   lat: 32.2558,
      //   height: 0,
      //   scale: 0.79,
      //   heading: 253,
      //   pitch: 0,
      //   roll: 0
      // },
      {
        url: "./static/glb/厂房21.glb",
        name: "厂房21",
        id: "厂房21",
        lon: 120.02965,
        lat: 32.255789,
        height: 0,
        scale: 0.52,
        heading: 255,
        pitch: 0,
        roll: 0
      },

      
      {
        url: "./static/glb/场景/泵站.glb",
        name: "农田",
        id: "农田",
        lon: 121.08935,
        lat: 32.24715,
        height: 0,
        scale: 1,
        heading: 88,
        pitch: 0,
        roll: 0
      },
    ]
  }
})
const emit = defineEmits(['callback'])

const modelEntitys = ref([])
watch(() => props.entity, (newMode) => {

})

onMounted(() => {
  init()

  ViewerEvents.add('LEFT_CLICK', onClick)
})

onUnmounted(() => {
  // 删除
  for (let index = 0; index < modelEntitys.value; index++) {
    const entity = modelEntitys.value[index];
    viewer.entities.remove(entity)
  }
  ViewerEvents.off('LEFT_CLICK', onClick)
})

function init() {
  const gltfs = [
    {
      url: "./static/glb/厂房1.glb",
      name: "厂房1",
      lon: 120.08935,
      lat: 32.24715,
      height: 10,
      scale: 0.285,
      heading: 88,
      pitch: 0,
      roll: 0
    },
    {
      url: "./static/glb/厂房2.glb",
      name: "厂房2",
      lon: 120.08935,
      lat: 32.24715,
      height: 10,
      scale: 0.285,
      heading: 88,
      pitch: 0,
      roll: 0
    },
    {
      url: "./static/glb/厂房3.glb",
      name: "厂房3",
      lon: 120.08935,
      lat: 32.24715,
      height: 10,
      scale: 0.285,
      heading: 88,
      pitch: 0,
      roll: 0
    },
    {
      url: "./static/glb/农田.glb",
      name: "农田",
      lon: 120.08935,
      lat: 32.24715,
      height: 10,
      scale: 0.285,
      heading: 88,
      pitch: 0,
      roll: 0
    },
    {
      url: "./static/glb/水泵站.glb",
      name: "水泵站",
      lon: 120.08935,
      lat: 32.24715,
      height: 10,
      scale: 0.285,
      heading: 88,
      pitch: 0,
      roll: 0
    }
  ]
  for (let index = 0; index < props.gltfs.length; index++) {
    const gltf = props.gltfs[index];
    renderGlb(gltf)
  }
}

const modelEntity1 = ref(null)

function renderGlb(gltf) {
  // 创建模型实体
  // 更新旋转
  const hpr = new window.Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(gltf.heading),
    Cesium.Math.toRadians(gltf.pitch),
    Cesium.Math.toRadians(gltf.roll)
  )
  const origin = Cesium.Cartesian3.fromDegrees(gltf.lon, gltf.lat, gltf.height)

  console.log(viewer)
  if (viewer) {
    const modelEntity = viewer.entities.add({
      name: gltf.id ?? 'model',
      position: Cesium.Cartesian3.fromDegrees(gltf.lon, gltf.lat, gltf.height),
      model: {
        show: true,
        uri: gltf.url,
        color: new Cesium.Color(1.2, 1.2, 1.2, 1.0), // 增加RGB值来提亮
        scale: gltf.scale,
      }
    });
    modelEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(origin, hpr)
    modelEntity1.value = modelEntity
    modelEntitys.value.push(modelEntity)
    // viewer.flyTo(modelEntity)
  }
}
//  点击事件
function onClick(click) {
  var pickedObject = viewer.scene.pick(click.position);
  console.log('pickedObject', pickedObject)
  if (Cesium.defined(pickedObject) && pickedObject.id) {
    const name = pickedObject.id?.name;
    const obj = props.gltfs.find((it) => it.id == name);

    if (obj) {
      emit('callback', {
        type: "model_click",
        id: obj.id ?? "",
      })
    }
  }
};
</script>
