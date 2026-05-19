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
  currentMode: {
    type: String,
    default: 'overview'
  },
  activeAreaId: {
    type: String,
    default: ''
  },
  gltfs: {
    type: Array,
    default: () => [
      {
        url: "./static/glb/厂房1.glb",
        label: "维明农场",
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
        label: "维明农场试验田",
        id: "Farm",
        lon: 120.0973,
        lat: 32.2517,
        height: 0,
        scale: 1.8,
        heading: 89,
        pitch: 0,
        roll: 0,
        point: [120.097195,32.252956],
        lines: [
          120.096171, 32.253432,  // 点1 (经度, 纬度)
          120.097299, 32.253475,  // 点2
          120.097368, 32.253085,  // 点3
          120.098644, 32.253255,  // 点4
          120.098756, 32.252505,   // 闭合回点1
          120.096226, 32.252444, // 闭合回点1
          120.096171, 32.253432,
        ]
      },
      {
        url: "./static/glb/厂房3-无底图.glb",
        name: "政府农场",
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
        label: "仓库",
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
      },
      {
        // url: "./static/glb/仓库2.glb",
        label: "政府试验田",
        id: "Warehouse2",
        lon: 120.027958,
        lat: 32.257392,
        height: 0,
        scale: 0.6,
        heading: 255,
        pitch: 0,
        roll: 0,
        lines: [
          120.027291, 32.257458,  // 点1 (经度, 纬度)
          120.029368, 32.258026,  // 点2
          120.029436, 32.256951,  // 点3
          120.027414, 32.256421,  // 点4
          120.027291, 32.257458   // 闭合回点1
        ]
      }
    ]
  }
})
const emit = defineEmits(['callback'])

const modelEntitys = ref([])
const billboardEntities = ref([])
const overviewParticleEntities = ref([])
const areaParticleGroups = new Map()
let cameraChangedRemove = null
let particleTimer = null
let particleClock = 0
const overviewParticleHideHeight = 1800
watch(() => props.entity, (newMode) => {

})
watch(() => [props.currentMode, props.activeAreaId], () => {
  updateParticleVisibility()
})

onMounted(() => {
  init()

  ViewerEvents.add('LEFT_CLICK', onClick)
  cameraChangedRemove = viewer?.camera?.changed?.addEventListener(updateParticleVisibility)
  particleTimer = setInterval(() => {
    particleClock = performance.now() / 1000
    updateParticleVisibility()
  }, 80)
})

onUnmounted(() => {
  // 删除
  for (let index = 0; index < modelEntitys.value.length; index++) {
    const entity = modelEntitys.value[index];
    viewer.entities.remove(entity)
  }
  for (let index = 0; index < billboardEntities.value.length; index++) {
    viewer.entities.remove(billboardEntities.value[index])
  }
  for (let index = 0; index < overviewParticleEntities.value.length; index++) {
    viewer.entities.remove(overviewParticleEntities.value[index])
  }
  areaParticleGroups.forEach((entities) => {
    entities.forEach((entity) => viewer.entities.remove(entity))
  })
  ViewerEvents.off('LEFT_CLICK', onClick)
  if (cameraChangedRemove) cameraChangedRemove()
  if (particleTimer) clearInterval(particleTimer)
})

function init() {
  createOverviewParticles()
  for (let index = 0; index < props.gltfs.length; index++) {
    const gltf = props.gltfs[index];

    renderGlb(gltf)
    createAreaParticles(gltf)

    // renderLabel(gltf)
  }
  updateParticleVisibility()
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
        pixelOffset: new Cesium.Cartesian2(0, 25), // 像素偏移，向上微调
        disableDepthTestDistance: Number.POSITIVE_INFINITY, // 始终显示在最上层，不被地形遮挡
        showBackground: false, // 是否显示背景框
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.6)'),
        backgroundPadding: new Cesium.Cartesian2(10, 5),
        scaleByDistance: new Cesium.NearFarScalar(1000, 1.0, 1000000, 0.4),
      },
      point: {
        pixelSize: 12,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      },
      billboard: {
        image: createBillboardImage(gltf.iconColor || '#00f6ff'),
        width: 40,
        height: 40,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: new Cesium.CallbackProperty(() => {
          return 1 + Math.sin(particleClock * 3.2 + gltf.lon * 10) * 0.12
        }, false)
      },
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
    createBillboardParticles(gltf)
    // viewer.flyTo(modelEntity)
  }
}

function renderLabel(gltf) {

}

function createBillboardImage(color) {
  const canvas = document.createElement('canvas')
  canvas.width = 80
  canvas.height = 80
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(40, 28, 4, 40, 28, 34)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(0.35, color)
  gradient.addColorStop(1, 'rgba(0, 246, 255, 0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(40, 28, 28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = color
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(40, 72)
  ctx.quadraticCurveTo(17, 39, 17, 26)
  ctx.arc(40, 26, 23, Math.PI, 0, false)
  ctx.quadraticCurveTo(63, 39, 40, 72)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#06232c'
  ctx.beginPath()
  ctx.arc(40, 27, 8, 0, Math.PI * 2)
  ctx.fill()
  return canvas.toDataURL('image/png')
}

function offsetLonLat(lon, lat, eastMeters, northMeters) {
  const metersPerDegree = 111320
  const nextLat = lat + northMeters / metersPerDegree
  const nextLon = lon + eastMeters / (metersPerDegree * Math.cos(Cesium.Math.toRadians(lat)))
  return { lon: nextLon, lat: nextLat }
}

function particlePosition(center, radius, angle, height) {
  const pos = offsetLonLat(center.lon, center.lat, Math.cos(angle) * radius, Math.sin(angle) * radius)
  return Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, height)
}

function createOverviewParticles() {
  const center = { lon: 120.06647, lat: 32.18264 }
  for (let index = 0; index < 120; index++) {
    const baseAngle = Math.random() * Math.PI * 2
    const radius = 600 + Math.random() * 3200
    const height = 80 + Math.random() * 420
    const phase = Math.random() * Math.PI * 2
    const entity = viewer.entities.add({
      position: new Cesium.CallbackProperty(() => {
        return particlePosition(center, radius + Math.sin(particleClock * 0.8 + phase) * 120, baseAngle + particleClock * 0.06, height)
      }, false),
      point: {
        pixelSize: new Cesium.CallbackProperty(() => 8 + Math.sin(particleClock * 2 + phase) * 4, false),
        color: new Cesium.CallbackProperty(() => {
          const alpha = 0.35 + Math.sin(particleClock * 2.4 + phase) * 0.25
          return Cesium.Color.fromCssColorString('#45f5a7').withAlpha(alpha)
        }, false),
        outlineColor: Cesium.Color.fromCssColorString('#eaffff').withAlpha(0.55),
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })
    overviewParticleEntities.value.push(entity)
  }
}

function createBillboardParticles(gltf) {
  const center = { lon: gltf.lon, lat: gltf.lat }
  for (let index = 0; index < 12; index++) {
    const phase = (index / 12) * Math.PI * 2
    const entity = viewer.entities.add({
      position: new Cesium.CallbackProperty(() => {
        const radius = 18 + Math.sin(particleClock * 2.2 + phase) * 8
        return particlePosition(center, radius, phase + particleClock * 1.4, 28 + Math.sin(particleClock * 3 + phase) * 10)
      }, false),
      point: {
        pixelSize: new Cesium.CallbackProperty(() => 4 + Math.sin(particleClock * 4 + phase) * 2, false),
        color: new Cesium.CallbackProperty(() => {
          const alpha = 0.45 + Math.sin(particleClock * 5 + phase) * 0.35
          return Cesium.Color.fromCssColorString('#fff46b').withAlpha(alpha)
        }, false),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })
    billboardEntities.value.push(entity)
  }
}

function createAreaParticles(gltf) {

  let center = { lon: gltf.lon, lat: gltf.lat }
  if (gltf.point) {
    center = {
      lon: gltf.point[0],
      lat: gltf.point[1]
    }
  }

  const entities = []
  for (let index = 0; index < 46; index++) {
    const phase = (index / 46) * Math.PI * 2
    const layer = index % 3
    const entity = viewer.entities.add({
      show: false,
      position: new Cesium.CallbackProperty(() => {
        const radius = 55 + layer * 24 + Math.sin(particleClock * 1.4 + phase) * 12
        return particlePosition(center, radius, phase + particleClock * (0.35 + layer * 0.08), 20 + layer * 16)
      }, false),
      point: {
        pixelSize: new Cesium.CallbackProperty(() => 5 + layer * 1.5 + Math.sin(particleClock * 3 + phase) * 2, false),
        color: new Cesium.CallbackProperty(() => {
          const alpha = 0.35 + Math.sin(particleClock * 3.5 + phase) * 0.3
          return Cesium.Color.fromCssColorString(layer === 1 ? '#26f7ff' : '#60ff9b').withAlpha(alpha)
        }, false),
        outlineColor: Cesium.Color.WHITE.withAlpha(0.35),
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })
    entities.push(entity)
  }
  areaParticleGroups.set(gltf.id, entities)
}

function getNearestAreaId() {
  if (!viewer) return ''
  const position = viewer.camera.positionCartographic
  const lon = Cesium.Math.toDegrees(position.longitude)
  const lat = Cesium.Math.toDegrees(position.latitude)
  let nearest = ''
  let nearestDistance = Number.POSITIVE_INFINITY
  props.gltfs.forEach((gltf) => {
    const distance = Math.hypot(gltf.lon - lon, gltf.lat - lat)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = gltf.id
    }
  })
  return nearest
}

function getActiveAreaId() {
  if (props.activeAreaId) return props.activeAreaId
  if (props.currentMode && props.currentMode !== 'overview') return props.currentMode
  const height = viewer?.camera?.positionCartographic?.height ?? Number.POSITIVE_INFINITY
  return height < overviewParticleHideHeight ? getNearestAreaId() : ''
}

function updateParticleVisibility() {
  if (!viewer) return
  const activeAreaId = getActiveAreaId()
  const height = viewer.camera.positionCartographic.height
  const showOverviewParticles = !activeAreaId && height >= overviewParticleHideHeight
  overviewParticleEntities.value.forEach((entity) => {
    entity.show = showOverviewParticles
  })
  areaParticleGroups.forEach((entities, id) => {
    const show = id === activeAreaId
    entities.forEach((entity) => {
      entity.show = show
    })
  })
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
