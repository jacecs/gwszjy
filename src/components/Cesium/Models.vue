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
        label: "厂房1",
        id: "Workshop",
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
        label: "监控农田",
        id: "Farm",
        lon: 120.0492,
        lat: 32.2657,
        height: 0,
        scale: 47.5,
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
        label: "厂房2",
        id: "Workshop2",
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
        label: "农田",
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

    // renderLabel(gltf)
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
      },
      label: {
        text: gltf.label || gltf.name, // 显示名称
        font: '14pt Source Han Sans CN, Microsoft YaHei, sans-serif', // 字体
        style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 填充并描边
        fillColor: Cesium.Color.WHITE, // 文字颜色
        outlineColor: Cesium.Color.BLACK, // 描边颜色
        outlineWidth: 2, // 描边宽度
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM, // 垂直对齐方式：底部对齐到位置点
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER, // 水平对齐方式：居中
        pixelOffset: new Cesium.Cartesian2(0, -10), // 像素偏移，向上微调
       
        disableDepthTestDistance: Number.POSITIVE_INFINITY, // 始终显示在最上层，不被地形遮挡
        showBackground: false, // 是否显示背景框
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.6)'),
        backgroundPadding: new Cesium.Cartesian2(10, 5)
      },
      point: {
        pixelSize: 12,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      }
    });
    modelEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(origin, hpr)
    modelEntity1.value = modelEntity
    modelEntitys.value.push(modelEntity)
    // viewer.flyTo(modelEntity)
  }
}

function renderLabel(gltf) {

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
