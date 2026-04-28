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
import GLOBAL from '@/utils/GLOBAL.js'
import ElectronicFence from '@/utils/ElectronicFence.js'
const viewer = GLOBAL.viewer;


const props = defineProps({
  gltfs: {
    type: Array,
    default: () => [
      {
        url: "./static/glb/厂房1.glb",
        label: "厂房1",
        id: "Workshop",
        lon: 120.08935,
        lat: 32.24715,
        height: 10,
        scale: 0.285,
        heading: 88,
        pitch: 0,
        roll: 0,
        lines: [
          120.088662, 32.247261,  // 点1 (经度, 纬度)
          120.088779, 32.246539,  // 点2
          120.090681, 32.246755,  // 点3
          120.090565, 32.247514,  // 点4
          120.088662, 32.247261   // 闭合回点1
        ]
      },
      {
        url: "./static/glb/泵站与农田设备(1).glb",
        // url: "./static/glb/场景/监控农田.glb",
        label: "监控农田",
        id: "Farm",
        lon: 120.0973,
        lat: 32.2517,
        height: 0,
        scale: 1.8,
        heading: 89,
        pitch: 0,
        roll: 0,
        lines: [
          120.096220, 32.252449,  // 点1 (经度, 纬度)
          120.096274, 32.251585,  // 点2
          120.098377, 32.251689,  // 点3
          120.098396, 32.252478,  // 点4
          120.096220, 32.252449   // 闭合回点1
        ]
      },
      {
        url: "./static/glb/厂房3-无底图.glb",
        name: "厂房3",
        id: "Workshop3",
        lon: 120.0172,
        lat: 32.2565,
        height: 0,
        scale: 0.088,
        heading: 87,
        pitch: 0,
        roll: 0,
        lines: [
          120.017523, 32.256777,  // 点1 (经度, 纬度)
          120.016665, 32.256261,  // 点2
          120.017207, 32.255734,  // 点3
          120.017947, 32.256303,  // 点4
          120.017523, 32.256777   // 闭合回点1
        ]
      },
      {
        url: "./static/glb/仓库2.glb",
        label: "仓库2",
        id: "Warehouse2",
        lon: 120.0298,
        lat: 32.2558,
        height: 0,
        scale: 0.6,
        heading: 255,
        pitch: 0,
        roll: 0,
        lines: [
          120.029499, 32.255953,  // 点1 (经度, 纬度)
          120.029525, 32.255610,  // 点2
          120.030050, 32.255715,  // 点3
          120.030005, 32.256058,  // 点4
          120.029499, 32.255953   // 闭合回点1
        ]
      }
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
       // 1. 扩散圆环控制
    let radius = 0;
    const maxRadius = 100; // 圆环最大扩散半径（米）
    const scanSpeed = 5;   // 扩散速度

    // 2. 中心点呼吸控制
    let pointSize = 5;
    let isGrowing = true;
    const maxPointSize = 10;
    const minPointSize = 5;
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
        pixelOffset: new Cesium.Cartesian2(0, -15), // 像素偏移，向上微调
        disableDepthTestDistance: Number.POSITIVE_INFINITY, // 始终显示在最上层，不被地形遮挡
        showBackground: false, // 是否显示背景框
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.6)'),
        backgroundPadding: new Cesium.Cartesian2(10, 5)
      },
      point: {
        pixelSize: 12,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      }
    });
    modelEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(origin, hpr)
    if (gltf.lines) {
       const fence1 = ElectronicFence.create(viewer, {
        positions: gltf.lines,
        height: 30,                               // 高度 400 米
        color: Cesium.Color.CYAN.withAlpha(0.6),   // 颜色：青色
        duration: 1500,                            // 扫描动画周期（毫秒）
        density: 60.0,                             // 立柱密度（越长/越大的多边形建议改大此值）
        // bloom: true                                // 自动开启发光特效
      });
    }
    if (gltf.id == 'Farm') {
      modelEntity1.value = modelEntity
     
    }
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
