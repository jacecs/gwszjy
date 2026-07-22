<template>

  <!-- <div style="position: fixed; left: 300px; top: 100px;z-index: 9999; padding: 5px">
    <h3>🛠️ 流动线 调试器</h3>
    <div v-for="(item, key) in linePoints" :key="key" class="control-group">
      <label>点号 {{ item.name }}</label>

      <div v-for="(val, i) in item.points" :key="i">
        <input type="number" v-model.number="val.x" :step="1" @input="updateModel">
        <input type="number" v-model.number="val.y" :step="1" @input="updateModel">
        <input type="number" v-model.number="val.z" :step="1" @input="updateModel">
      </div>

        <input type="number" v-model.number="item.dashCount" :step="1" @input="updateModel">
    </div>
  </div> -->
  <template v-if="gltfStatus && supportedInternalScene">
    <label class="internal-scene-btn" :class="{ active: inStatus }">
      <input type="checkbox" v-model="inStatus" @change="changeStatus" />
      内部场景
    </label>
    <button v-if="drillDevice" class="device-back-btn" @click="resetDeviceDrill">{{ isolatedDevice ? '返回内部' : '返回车间' }}</button>
  </template>
</template>

<script setup>
// 烘干
import { reactive, ref, onMounted, onUnmounted, watch, getCurrentInstance, computed, markRaw, shallowRef } from 'vue'
import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import mpegts from 'mpegts.js'
import ThreeEvents from '@/utils/ThreeEvents.js'
import FlowLine from '@/utils/FlowLine.js'; // 引入上面封装的类
import GLOBAL from '@/utils/GLOBAL.js'
import { useAppStore } from '@/store/modules/app';
import { getFacilityDetail } from '@/utils/api.js';
import { getDeviceValues, getListAllDevices } from '@/utils/api.js'
const appStore = useAppStore();


const three = GLOBAL.three;
const { scene,
  camera,
  renderer,
  controls,
  raycaster,
  mouse
} = three

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  videos: {
    type: Array,
    default: () => []
  }
})
const emit = defineEmits(['deviceDrill'])


const inStatus = ref(false)
const gltfStatus = ref(false)
const currentModel = ref(null)
const drillDevice = ref(null)
const isolatedDevice = ref(null)
const supportedInternalScene = computed(() => ['Workshop', 'Workshop3'].includes(currentModel.value?.id))

const loader = new GLTFLoader();
// 创建Draco加载器实例
const dracoLoader = new DRACOLoader();
// 设置Draco解码器路径（本地或CDN）
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
// dracoLoader.setDecoderPath('./static/plugins/ys3d/draco/');
// 将Draco加载器添加到GLTF加载器
loader.setDRACOLoader(dracoLoader);
let model = null;
let mixers = []
let pageModels = markRaw([])
let drillHotspots = markRaw([])
let isolatedVisibility = markRaw(new Map())
let internalSceneVisibility = markRaw(new Map())
let flowLines = markRaw([])
let monitorSprites = markRaw([])
let label
let tooltipRequestId = 0
let tooltipVideoPlayer = null
let activeDryingTowerModel = null
let monitorIconTexture = null

const defaultDryingTowerConfig = {
  url: './static/glb/烘干塔.glb',
  scale: 1,
  offset: { x: 0, y: 0, z: 0 }
}
const modelUrl = computed(() => {
  const map = {
    overview: '🌾 总览',
    testfield: '🌱 试验田',
    workshop: '🏭 烘干车间',
    warehouse: '📦 仓库'
  }
  return map[props.mode] || '🌾 总览'
})
watch(() => props.data, (newMode) => {
  if (newMode) {
    gltfStatus.value = false
    resetWorkshopState()
    currentModel.value = newMode

    console.log(111111, newMode)
    remove()
    init(newMode)
  }
},
  {
    // deep: true,
    immediate: true
  })


onMounted(() => {
  ThreeEvents.add('LEFT_CLICK', onClick)
  ThreeEvents.add('LEFT_CLICK', onGetInfo)
  ThreeEvents.add('DOUBLE_CLICK', onDoubleClick)
})



onUnmounted(() => {
  mixers = []
  ThreeEvents.off('LEFT_CLICK', onClick)
  ThreeEvents.off('LEFT_CLICK', onGetInfo)
  ThreeEvents.off('DOUBLE_CLICK', onDoubleClick)

  resetWorkshopState()
  remove()
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
})

// 双击事件
function onDoubleClick(item) {
  console.log('双击事件1', item)
  if (item) {
    const name = getObjectNamePath(item.object)
    console.log('试验田点击对象:', name, item)
    if (!isCameraObject(name)) return
    showTooltip(item.object, item.point)
  }
}

function resetWorkshopState() {
  restoreIsolatedVisibility()
  restoreInternalSceneVisibility()
  removeDryingTowerDetailModel()
  removeLine()
  removeDryingTowerMonitorSprites()
  inStatus.value = false
  drillDevice.value = null
  isolatedDevice.value = null
  emit('deviceDrill', null)
}

function remove() {
  restoreIsolatedVisibility()
  restoreInternalSceneVisibility()
  removeDryingTowerDetailModel()
  removeLine()
  removeDryingTowerMonitorSprites()
  drillDevice.value = null
  isolatedDevice.value = null
  removeDryingTowerHotspots()
  removeTooltip()
  console.log('remove', model)

  if (pageModels && pageModels.length) {
    for (let index = 0; index < pageModels.length; index++) {
      const model = pageModels[index];

      const modelScene = model.scene;

      if (modelScene) {
        scene.remove(modelScene);
      }
    }
  }

  pageModels = markRaw([])

}
function onGetInfo(e) {
  const position = camera.position;
  console.log('视角信息', position)
}


function onClick(item) {
  removeTooltip()
  if (activeDryingTowerModel) return
  if (item) {
    const name = getObjectNamePath(item.object)
    if (isCameraObject(name)) {
      showTooltip(item.object, item.point)
      return
    }
    if (tryDrillDryingTower(item)) return
    return
    const label = showTooltip(item.object, item.point)
  }
}

function init(obj) {
  centerAt(obj.threeCamera)
  renderModel(obj)
}
function centerAt(camera) {
  const { x, y, z, tx = 0, ty = 0, tz = 0 } = camera ?? { x: 56, y: 500, z: -400, tx: 0, ty: 0, tz: 0 }
  // 定位
  const cameraPos = new THREE.Vector3(x, y, z)
  const lookAt = new THREE.Vector3(tx, ty, tz)
  flyToSmoothly(cameraPos, lookAt)
}
async function renderModel(obj) {

  // 创建 GLTF 加载器
  const gltfs = obj.gltfs
  if (gltfs && gltfs.length) {
    for (let index = 0; index < gltfs.length; index++) {
      const gltf = gltfs[index];
      const key = gltf.url
      console.log('模型', obj)
      if (!GLOBAL[key]) {
        const modal = await appStore.loadGLBModal(loader, gltf.url)
        modal.modelId = gltf.id
        modal.modelUrl = key
        GLOBAL[key] = modal
        console.log('模型加载成功', modal)
      }
      const tmp = markRaw(GLOBAL[key]) // 定义当前模型
      scene.add(GLOBAL[key].scene);
      if (index === 0) {
        model = tmp
      }
      pageModels.push(GLOBAL[key])
      // 可以对模型进行操作
      GLOBAL[key].scene.scale.set(gltf.scale, gltf.scale, gltf.scale);
      GLOBAL[key].scene.position.set(gltf.x, gltf.y, gltf.z);
    }

    createDryingTowerHotspots(obj)
    gltfStatus.value = true
  }
}

function getModelById(id, key = 'modelId') {
  return pageModels.find(item => item[key] === id)
}

function getDryingTowerHotspotConfig(workshopId) {
  const map = {
    Workshop: [
      { name: '烘干塔1', position: [140, 18, 155], lookAt: [140, 12, 155], camera: [140, 78, 235], isolateCamera: [140, 45, 205], heater: [115, 10, 112] },
      { name: '烘干塔2', position: [190, 18, 155], lookAt: [190, 12, 155], camera: [190, 78, 235], isolateCamera: [190, 45, 205], heater: [160, 10, 107] },
      { name: '烘干塔3', position: [243, 18, 145], lookAt: [243, 12, 145], camera: [243, 78, 225], isolateCamera: [243, 45, 195], heater: [230, 10, 100] }
    ],
    Workshop3: [
      { name: '烘干塔1', position: [205, 42, 190], lookAt: [205, 32, 190], camera: [205, 112, 282], isolateCamera: [205, 82, 248], heater: [295, 32, 240] },
      { name: '烘干塔2', position: [145, 42, 75], lookAt: [145, 32, 75], camera: [145, 112, 167], isolateCamera: [145, 82, 133], heater: [245, 32, 165] },
      { name: '烘干塔3', position: [75, 42, -30], lookAt: [75, 32, -30], camera: [75, 112, 62], isolateCamera: [75, 82, 28], heater: [175, 32, 55] }
    ]
  }
  return map[workshopId] || []
}

function createDryingTowerHotspots(obj) {
  removeDryingTowerHotspots()
  if (!['Workshop', 'Workshop3'].includes(obj.id)) return
  const geometry = new THREE.CylinderGeometry(16, 16, obj.id === 'Workshop3' ? 90 : 58, 24)
  const material = new THREE.MeshBasicMaterial({
    color: 0x48ffd0,
    transparent: true,
    opacity: 0.08,
    depthWrite: false
  })
  getDryingTowerHotspotConfig(obj.id).forEach((config) => {
    const hotspot = new THREE.Mesh(geometry.clone(), material.clone())
    hotspot.name = config.name
    hotspot.userData = {
      type: 'dryingTower',
      deviceName: config.name,
      camera: config.camera,
      lookAt: config.lookAt,
      isolateCamera: config.isolateCamera,
      heater: config.heater
    }
    hotspot.position.set(...config.position)
    scene.add(hotspot)
    drillHotspots.push(hotspot)
  })
}

function removeDryingTowerHotspots() {
  drillHotspots.forEach((hotspot) => {
    scene.remove(hotspot)
    hotspot.geometry?.dispose()
    hotspot.material?.dispose()
  })
  drillHotspots = markRaw([])
}

function getMonitorIconTexture() {
  if (!monitorIconTexture) {
    monitorIconTexture = new THREE.TextureLoader().load('/static/img/icon-jiankong.png')
    monitorIconTexture.colorSpace = THREE.SRGBColorSpace
  }
  return monitorIconTexture
}

function createDryingTowerMonitorSprites() {
  removeDryingTowerMonitorSprites()
  if (!inStatus.value || !['Workshop', 'Workshop3'].includes(props.data.id)) return

  const texture = getMonitorIconTexture()
  const yOffset = props.data.id === 'Workshop3' ? 58 : 40
  const zOffset = props.data.id === 'Workshop3' ? 28 : 22
  getDryingTowerHotspotConfig(props.data.id).forEach((config, index) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    }))
    sprite.name = `摄像头001-${config.name}`
    sprite.userData = {
      type: 'camera',
      deviceName: `${config.name}监控`,
      towerName: config.name
    }
    sprite.position.set(config.position[0], config.position[1] + yOffset, config.position[2] + zOffset)
    sprite.scale.set(24, 24, 1)
    sprite.renderOrder = 20 + index
    scene.add(sprite)
    monitorSprites.push(sprite)
  })
}

function removeDryingTowerMonitorSprites() {
  monitorSprites.forEach((sprite) => {
    scene.remove(sprite)
    sprite.material?.dispose()
  })
  monitorSprites = markRaw([])
}

function getObjectNamePath(object) {
  const names = []
  let current = object
  while (current) {
    if (current.name) names.push(current.name)
    current = current.parent
  }
  return names.join('/')
}

function isCameraObject(name = '') {
  const lowerName = name.toLowerCase()
  return ['mesh_input003', '摄像头', '摄像机', '视频监控', '视频监控器', 'camera'].some(keyword => lowerName.includes(keyword.toLowerCase()))
}

function findDryingTowerObject(object) {
  let current = object
  const keywords = ['烘干塔', '干燥塔', 'drying', 'dryer', 'tower']
  while (current) {
    const name = String(current.name || '').toLowerCase()
    if (current.userData?.type === 'dryingTower' || keywords.some((keyword) => name.includes(keyword.toLowerCase()))) {
      return current
    }
    current = current.parent
  }
  return null
}

function tryDrillDryingTower(item) {
  const target = findDryingTowerObject(item.object)
  if (!target) return false
  if (inStatus.value) {
    showDryingTowerDetail(target)
    return true
  }
  const cameraConfig = target.userData?.camera
  const lookAtConfig = target.userData?.lookAt
  const targetWorldPosition = new THREE.Vector3()
  target.getWorldPosition(targetWorldPosition)
  const targetLookAt = lookAtConfig ? new THREE.Vector3(...lookAtConfig) : targetWorldPosition
  const targetPosition = cameraConfig
    ? new THREE.Vector3(...cameraConfig)
    : targetWorldPosition.clone().add(new THREE.Vector3(0, 70, 90))

  drillDevice.value = {
    type: 'dryingTower',
    name: target.userData?.deviceName || target.name || '烘干塔设备',
    subtitle: `${currentModel.value?.name || '烘干车间'} / 设备下钻`,
    camera: cameraConfig,
    lookAt: lookAtConfig
  }
  emit('deviceDrill', drillDevice.value)
  if (inStatus.value) {
    isolateDryingTowerAndHeater(target)
  } else {
    inStatus.value = true
    changeStatus()
    flyTo(targetPosition, targetLookAt)
  }
  showTooltip(target, item.point)
  return true
}

function resetDeviceDrill(notify = true) {
  if (activeDryingTowerModel) {
    removeDryingTowerDetailModel()
    showWorkshopModels()
    inStatus.value = true
    applyInternalScene(true, false)
    isolatedDevice.value = null
    drillDevice.value = null
    if (notify) emit('deviceDrill', null)
    return
  }
  if (isolatedDevice.value) {
    restoreIsolatedVisibility()
    isolatedDevice.value = null
    if (!notify) {
      drillDevice.value = null
      return
    }
    if (drillDevice.value?.camera && drillDevice.value?.lookAt) {
      flyTo(new THREE.Vector3(...drillDevice.value.camera), new THREE.Vector3(...drillDevice.value.lookAt))
    }
    return
  }
  if (!drillDevice.value) return
  drillDevice.value = null
  if (notify) emit('deviceDrill', null)
  if (currentModel.value?.threeCamera) {
    centerAt(currentModel.value.threeCamera)
  }
}

async function showDryingTowerDetail(target) {
  hideWorkshopModels()
  removeTooltip()
  removeLine()
  drillHotspots.forEach((hotspot) => {
    hotspot.visible = false
  })

  const config = currentModel.value?.dryingTowerDetail ?? defaultDryingTowerConfig
  activeDryingTowerModel = markRaw(await appStore.loadGLBModal(loader, config.url ?? defaultDryingTowerConfig.url))
  activeDryingTowerModel.scene.name = target.userData?.deviceName || target.name || '烘干塔设备'
  activeDryingTowerModel.scene.userData.modelId = 'dryingTowerDetail'
  prepareDryingTowerDetailModel(activeDryingTowerModel.scene)
  scene.add(activeDryingTowerModel.scene)

  const targetWorldPosition = new THREE.Vector3()
  target.getWorldPosition(targetWorldPosition)
  const scale = config.scale ?? defaultDryingTowerConfig.scale
  const offset = config.offset ?? defaultDryingTowerConfig.offset
  activeDryingTowerModel.scene.scale.set(scale, scale, scale)
  activeDryingTowerModel.scene.position.set(
    targetWorldPosition.x + (offset.x ?? 0),
    targetWorldPosition.y + (offset.y ?? 0),
    targetWorldPosition.z + (offset.z ?? 0)
  )
  focusDetailModel(activeDryingTowerModel.scene, config.camera)

  isolatedDevice.value = {
    type: 'dryingTowerDetail',
    name: activeDryingTowerModel.scene.name
  }
  drillDevice.value = {
    type: 'dryingTowerDetail',
    name: activeDryingTowerModel.scene.name,
    subtitle: `${currentModel.value?.name || '烘干车间'} / 烘干塔模型`
  }
  emit('deviceDrill', drillDevice.value)
}

function prepareDryingTowerDetailModel(modelScene) {
  modelScene.traverse((object) => {
    const name = String(object.name || '')
    const materialName = String(object.material?.name || '')
    const isLargeGround = name.includes('平面') || materialName.includes('道路')
    if (isLargeGround) {
      object.visible = false
    }
  })
}

function removeDryingTowerDetailModel() {
  if (!activeDryingTowerModel) return
  scene.remove(activeDryingTowerModel.scene)
  disposeModel(activeDryingTowerModel.scene)
  activeDryingTowerModel = null
}

function hideWorkshopModels() {
  pageModels.forEach((model) => {
    if (model?.scene) model.scene.visible = false
  })
}

function showWorkshopModels() {
  pageModels.forEach((model) => {
    if (model?.scene) model.scene.visible = true
  })
  drillHotspots.forEach((hotspot) => {
    hotspot.visible = true
  })
}

function removeTooltip() {
  tooltipRequestId += 1
  destroyTooltipVideoPlayer()
  if (!label) return
  if (label.removeFromParent) {
    label.removeFromParent()
  } else if (label.element?.parentNode) {
    label.element.parentNode.removeChild(label.element)
  }
  label = null
}

function disposeModel(modelScene) {
  modelScene.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose()
    }
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose())
      } else {
        object.material.dispose()
      }
    }
  })
}

function focusDetailModel(modelScene, cameraConfig = {}) {
  modelScene.updateMatrixWorld(true)
  const box = getVisibleMeshBox(modelScene)
  if (box.isEmpty()) return

  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxSize = Math.max(size.x, size.y, size.z)
  const directionConfig = cameraConfig.direction ?? { x: 1, y: 0.7, z: 1 }
  const direction = new THREE.Vector3(directionConfig.x, directionConfig.y, directionConfig.z).normalize()
  const distance = cameraConfig.distance ?? Math.max(maxSize * 1.6, 140)
  const targetPos = center.clone().add(direction.multiplyScalar(distance))

  controls.target.copy(center)
  camera.position.copy(targetPos)
  controls.update()
}

function getVisibleMeshBox(modelScene) {
  const box = new THREE.Box3()
  const meshBox = new THREE.Box3()
  modelScene.traverse((object) => {
    if (!object.isMesh || !object.visible) return
    const name = String(object.name || '')
    const materialName = String(object.material?.name || '')
    if (name.includes('平面') || materialName.includes('道路')) return
    meshBox.setFromObject(object)
    box.union(meshBox)
  })
  return box
}

function getActiveWorkshopModel() {
  if (props.data.id == 'Workshop') return getModelById('./static/glb/厂房1.glb', 'modelUrl')
  if (props.data.id == 'Workshop3') return getModelById('changfang3')
  return model
}

function restoreIsolatedVisibility() {
  isolatedVisibility.forEach((visible, object) => {
    object.visible = visible
  })
  isolatedVisibility = markRaw(new Map())
}

function restoreInternalSceneVisibility() {
  internalSceneVisibility.forEach((visible, object) => {
    object.visible = visible
  })
  internalSceneVisibility = markRaw(new Map())
}

function setObjectVisibleWithCache(object, visible) {
  if (!object || internalSceneVisibility.has(object)) return
  internalSceneVisibility.set(object, object.visible)
  object.visible = visible
}

function getInternalSceneConfig() {
  const currentCamera = currentModel.value?.threeCamera
  const outCamera = currentCamera
    ? {
      position: [currentCamera.x, currentCamera.y, currentCamera.z],
      target: [currentCamera.tx ?? 0, currentCamera.ty ?? 0, currentCamera.tz ?? 0]
    }
    : null
  const configs = {
    Workshop: {
      model: getModelById('./static/glb/厂房1.glb', 'modelUrl'),
      outsideNames: ['太阳能', '太阳能002', '厂房', '厂房001'],
      inCamera: {
        position: [90, 220, -10],
        target: [170, 45, 100]
      },
      outCamera: {
        position: [56, 500, -400],
        target: [0, 0, 0]
      }
    },
    Workshop2: {
      model: getModelById('./static/glb/厂房1.glb', 'modelUrl'),
      outsideNames: ['立方体010_4', '立方体010_1', '立方体010_2', '立方体010_3'],
      inCamera: {
        position: [241, 91, -230],
        target: [367, -11, 44]
      },
      outCamera: outCamera || {
        position: [253, 110, -62],
        target: [370, 0, 35]
      }
    },
    Workshop3: {
      model: getModelById('changfang3'),
      outsideNames: ['002', '002039', 'Cylinder002002', 'Cylinder002002_1', '窗户003', '002041', '002036'],
      outsideKeywords: ['窗户', '小窗户'],
      inCamera: {
        position: [-50, 305, 105],
        target: [170, 45, 100]
      },
      outCamera: {
        position: [10, 550, 1020],
        target: [0, 0, 0]
      }
    },
    Warehouse2: {
      model: getModelById('changfang31') || getModelById('./static/glb/厂房3-有底图.glb', 'modelUrl'),
      outsideNames: ['002_1', '002_3'],
      inCamera: {
        position: [-50, 250, 750],
        target: [-120, 85, 220]
      },
      outCamera: outCamera || {
        position: [61, 140, -52],
        target: [60, 21, -340]
      }
    }
  }

  return configs[props.data.id]
}

function moveToCamera(config) {
  if (!config) return
  flyTo(
    new THREE.Vector3(...config.position),
    new THREE.Vector3(...config.target)
  )
}

function applyInternalScene(value, shouldMoveCamera = true) {
  restoreInternalSceneVisibility()

  const config = getInternalSceneConfig()
  if (!config?.model?.scene) {
    inStatus.value = false
    removeLine()
    return false
  }

  if (!value) {
    removeLine()
    removeDryingTowerMonitorSprites()
    if (shouldMoveCamera) {
      moveToCamera(config.outCamera)
    }
    return true
  }

  config.outsideNames.forEach((name) => {
    const object = getModal(config.model.scene, name)
    if (!object) return

    object.traverse((child) => {
      setObjectVisibleWithCache(child, !value)
    })
    setObjectVisibleWithCache(object, !value)
  })

  config.outsideKeywords?.forEach((keyword) => {
    config.model.scene.traverse((object) => {
      if (!String(object.name || '').includes(keyword)) return
      object.traverse((child) => {
        setObjectVisibleWithCache(child, !value)
      })
      setObjectVisibleWithCache(object, !value)
    })
  })

  removeLine()
  if (props.data.facilityType == 3) {
    // 烘干塔绘制模拟线路
    createLine()
    createDryingTowerMonitorSprites()
  }

  if (shouldMoveCamera) {
    moveToCamera(config.inCamera)
  }

  return true
}

function isolateDryingTowerAndHeater(target) {
  restoreIsolatedVisibility()
  const workshopModel = getActiveWorkshopModel()
  if (!workshopModel?.scene) return

  const towerCenter = new THREE.Vector3()
  target.getWorldPosition(towerCenter)
  const heaterCenter = target.userData?.heater ? new THREE.Vector3(...target.userData.heater) : towerCenter.clone().add(new THREE.Vector3(-35, -8, -45))
  //const keepKeywords =['烘干塔主体', '干燥塔', 'drying', 'dryer', 'tower', '加热', '燃烧', '炉', 'heater', 'burner', 'hot']
  const keepKeywords = ['机器', '机器001', '机器002', '烘干塔主体001', '立方体066', 'drying', 'dryer', 'tower', '加热', '燃烧', '炉', 'heater', 'burner', 'hot']

  workshopModel.scene.traverse((object) => {
    if (!object.isMesh && !object.isGroup) return
    isolatedVisibility.set(object, object.visible)
    const worldPosition = new THREE.Vector3()
    object.getWorldPosition(worldPosition)
    const name = String(object.name || '').toLowerCase()
    const keepByName = keepKeywords.some((keyword) => name.includes(keyword.toLowerCase()))
    const keepByPosition = worldPosition.distanceTo(towerCenter) < 55 || worldPosition.distanceTo(heaterCenter) < 50
    object.visible = keepByName || keepByPosition
  })

  drillHotspots.forEach((hotspot) => {
    isolatedVisibility.set(hotspot, hotspot.visible)
    hotspot.visible = hotspot === target
  })
  removeLine()

  isolatedDevice.value = {
    type: 'dryingTowerHeater',
    name: `${target.userData?.deviceName || '烘干塔'}与加热炉`
  }
  drillDevice.value = {
    ...drillDevice.value,
    name: isolatedDevice.value.name,
    subtitle: `${currentModel.value?.name || '烘干车间'} / 烘干塔与加热炉`
  }
  emit('deviceDrill', drillDevice.value)

  const isolateCamera = target.userData?.isolateCamera ? new THREE.Vector3(...target.userData.isolateCamera) : towerCenter.clone().add(new THREE.Vector3(0, 35, 55))
  const lookAt = new THREE.Vector3().addVectors(towerCenter, heaterCenter).multiplyScalar(0.5)
  flyTo(isolateCamera, lookAt)
}

// 进入到内部
function changeStatus(e) {
  console.log(1111111, props.data, inStatus.value)
  restoreIsolatedVisibility()
  isolatedDevice.value = null
  applyInternalScene(inStatus.value)
}

function getModal(obj, name) {
  let tmp = null
  if (obj.name == name) {
    tmp = obj
    return tmp
  } else if (obj.children && obj.children.length) {
    for (let index = 0; index < obj.children.length; index++) {
      const item = obj.children[index];
      const value = getModal(item, name)
      if (value) {
        tmp = value
        break;
      }
    }
  }
  return tmp
}

function ctrlAnimation() {
  if (model && model.scene) {
    model.animations.forEach((clip, index) => {
      const name = clip.name
      if (name == '高温区机器人' || name == '低温区机器人') {
        const bone = model.scene.getObjectByName(name)
        if (bone) {
          const mixer = new THREE.AnimationMixer(bone)
          mixer.clipAction(clip).play()
          mixers.push(mixer)
        }
      } else {
        const action = this.modalMixer.clipAction(clip);
        action.play();
      }
    });
  }
}

function getDeviceVideoUrl(device = {}) {
  return device.https_flv_url || device.url || device.streamUrl || device.videoUrl || device.flvUrl || ''
}

async function getCameraDevice(obj = {}) {
  let list = []
  try {
    const res = await getListAllDevices()
    list = Array.isArray(res?.data) ? res.data : []
  } catch (e) {
    console.warn('获取摄像机设备列表失败', e)
  }
  const localVideos = [
    ...(Array.isArray(props.videos) ? props.videos : []),
    ...(Array.isArray(props.data?.videos) ? props.data.videos : [])
  ]
  const device = list.find(item => String(item.id) === String(obj.id))
    || list.find(item => isCameraObject(item.name || item.cameraName || '') && getDeviceVideoUrl(item))
    || localVideos.find(item => getDeviceVideoUrl(item))
  return {
    name: device?.name || device?.cameraName || obj.name || '网络摄像机',
    url: getDeviceVideoUrl(device)
  }
}

function updateTooltipPosition() {
  if (!label?.element || !label?.point) return
  const rect = renderer.domElement.getBoundingClientRect()
  const screenPoint = label.point.clone().project(camera)
  const x = (screenPoint.x * 0.5 + 0.5) * rect.width + rect.left
  const y = (-screenPoint.y * 0.5 + 0.5) * rect.height + rect.top
  label.element.style.left = `${x}px`
  label.element.style.top = `${y}px`
  label.element.style.display = screenPoint.z < 1 ? 'block' : 'none'
}

function destroyTooltipVideoPlayer() {
  if (!tooltipVideoPlayer) return
  try {
    tooltipVideoPlayer.pause()
    tooltipVideoPlayer.unload()
    tooltipVideoPlayer.detachMediaElement()
    tooltipVideoPlayer.destroy()
  } catch (e) {}
  tooltipVideoPlayer = null
}

function createTooltipVideoPlayer(video, url) {
  if (!video || !url) return
  if (!mpegts.isSupported()) {
    video.outerHTML = '<div class="farm-video-tip">当前浏览器不支持 MSE/FLV 播放</div>'
    return
  }
  tooltipVideoPlayer = mpegts.createPlayer(
    { type: 'flv', url, isLive: true, hasAudio: false },
    {
      lazyLoad: true,
      fixAudioTimestampGap: false,
      enableWorker: true,
      enableStashBuffer: false,
      stashInitialSize: 128
    }
  )
  tooltipVideoPlayer.attachMediaElement(video)
  tooltipVideoPlayer.load()
  tooltipVideoPlayer.play().catch(() => {})
  tooltipVideoPlayer.on(mpegts.Events.ERROR, () => {
    try {
      tooltipVideoPlayer.unload()
      tooltipVideoPlayer.load()
      tooltipVideoPlayer.play().catch(() => {})
    } catch (e) {}
  })
}

async function showTooltip(model, point) {
  removeTooltip()
  const currentTooltipRequestId = tooltipRequestId

  const name = getObjectNamePath(model)
  console.log('试验田点击对象:', name, model)
  const ids = {
    // 维明农场
    "摄像头001": {
      name: "网络摄像机",
      id: "2057728640132579328"
    },  // 水渠1

    // 红耕农场
    "mesh_input003": {
      name: "网络摄像机",
      id:  props.data.id == 'Workshop3' ? '2057757188239130624' : props.data.id == 'Warehouse2' ? "2057757085382213632" : ""
    },
  }

  let obj
  for (const key in ids) {
    const item = ids[key];
    if (name.indexOf(key) > -1) {
      obj = item
    }
  }

  if (!obj) {
    return
  }


  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  const anchorPoint = point?.clone?.() ?? model.getWorldPosition(new THREE.Vector3())
  const isCameraDevice = isCameraObject(name)

  if (isCameraDevice) {
    const cameraDevice = await getCameraDevice(obj)
    if (currentTooltipRequestId !== tooltipRequestId) return
    tooltip.innerHTML = `
      <div class="js-tooltip" style="width: 360px; padding: 10px; color: #ffffff; display: inline-block; transform: translate(-50%, -100%); background: rgba(2, 8, 12, 0.94); border: 1px solid rgba(46, 204, 113, 0.75); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; color: #69ffc5; font-size: 14px; font-weight: 700;">
          <span>${cameraDevice.name}</span>
          <span style="font-size: 12px; color: ${cameraDevice.url ? '#2ecc71' : '#e67e22'};">${cameraDevice.url ? '在线' : '无信号'}</span>
        </div>
        ${
          cameraDevice.url
            ? '<video class="farm-camera-video" style="display: block; width: 100%; height: 210px; background: #000000; object-fit: cover;" autoplay muted playsinline controls></video>'
            : '<div style="height: 180px; display: flex; align-items: center; justify-content: center; color: #ffffff; background: #111111; font-size: 13px;">暂无视频地址</div>'
        }
      </div>
    `;
    tooltip.style.position = 'fixed'
    tooltip.style.left = '0px'
    tooltip.style.top = '0px'
    tooltip.style.zIndex = '10000'
    tooltip.style.pointerEvents = 'auto'
    document.body.appendChild(tooltip)
    label = {
      element: tooltip,
      point: anchorPoint
    }
    updateTooltipPosition()
    if (cameraDevice.url) {
      createTooltipVideoPlayer(tooltip.querySelector('.farm-camera-video'), cameraDevice.url)
    }
    return label
  }

  const params = {
    deviceId: obj.id
  }
  const res = await loadData(params)
  if (currentTooltipRequestId !== tooltipRequestId) return
  let names = {}
  if (name.indexOf("水井") > -1 || name.indexOf("shuini") > -1) {
    names = {
      v: "工作电压",
      t2: "温度2",
      t1: "温度1",
      status: "状态",
      s: "阀门状态",
      protectTorque: "执行器保护扭矩(推力)",
      pressure2: "压力2",
      pressure1: "压力1",
      pos: "阀门开度",
      i: "执行器保护电流",
    }
  } else if(name.indexOf("电子水尺") > -1) {
    names = {
      waterLevel: "水位值",
      hasWater: "水浸状态",
      status: "状态",
    }
  } else if(name.indexOf("气象站") > -1 || name.indexOf("围栏") > -1) {
    names = {
      t: "温度",
      h: "湿度",
      status: "状态",
    }
  }
  let list = []
  if (res.data) {
    for (const key in res.data) {
      const value = res.data[key];
      list.push({
        name: names[key] ?? key,
        value: value

      })
    }
  }
  tooltip.innerHTML = `
      <div class="js-tooltip" style="padding: 10px; pointer-events: none; color: #000; font-size: 16px; display: inline-block;transform: translate(-50%, -100%);background: #ffffff">
        <div class="modal-name" >
        ${obj.name}
      </div>
      <div class="main-modal-info">
        `
    +
    list.map(item => {
      return `<div class="modal-info" style="display: flex; justify-content: space-between;">
          <div class="modal-info-name" style="width: 80px">${item.name}：</div>
          <div class="modal-info-value">${item.value}</div>
        </div>`
    }).join('')

    +

    `
      </div>
      </div>
  `;
  tooltip.style.position = 'fixed'
  tooltip.style.left = '0px'
  tooltip.style.top = '0px'
  tooltip.style.zIndex = '10000'
  tooltip.style.pointerEvents = 'none'
  document.body.appendChild(tooltip)
  label = {
    element: tooltip,
    point: anchorPoint
  }
  updateTooltipPosition()
  console.log(label, anchorPoint.x, anchorPoint.y, anchorPoint.z)
  return label
}


function loadData() {
  return new Promise(resolve => {
    getFacilityDetail(params).then(res => { 
        resolve([])
    })
    // resolve({
    //   "编号": "厂房",
    //   "参数1": "0.00",
    // })
  })
}

// 2. 定义飞到的函数
function flyToSmoothly(targetPos, focusPoint) {
  // 直接设置目标
  focusPoint && controls.target.copy(focusPoint);

  // 直接设置相机位置
  targetPos && camera.position.copy(targetPos);

}

function flyTo(targetPosition, targetLookAt, duration = 1500) {
  camera.position.set(targetPosition.x, targetPosition.y, targetPosition.z)
  controls.target.set(targetLookAt.x, targetLookAt.y, targetLookAt.z)
  controls.update()
  return
  // 1. 获取当前状态作为起点
  const currentPos = camera.position.clone();
  const currentTarget = controls.target.clone();

  // 如果没有传入目标视角，则保持当前视角不变
  const finalLookAt = targetLookAt || currentTarget;

  new TWEEN.Tween({
    // 动画起点
    x: currentPos.x,
    y: currentPos.y,
    z: currentPos.z,
    tx: currentTarget.x,
    ty: currentTarget.y,
    tz: currentTarget.z,
  })
    .to({
      // 动画终点
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      tx: finalLookAt.x,
      ty: finalLookAt.y,
      tz: finalLookAt.z,
    }, duration)
    .easing(TWEEN.Easing.Quadratic.InOut) // 添加缓动函数，让起步和停下更平滑
    .onUpdate(function (obj) {
      // 【修复】：取消注释，真正动态改变相机位置
      camera.position.set(obj.x, obj.y, obj.z);

      // 动态改变控制器目标点 (也就是视线的焦点)
      controls.target.set(obj.tx, obj.ty, obj.tz);

      // 更新控制器
      controls.update();
    })
    .onComplete(function (obj) {
      controls.target.set(obj.tx, obj.ty, obj.tz);
      controls.update();
    })
    .start();
}


const linePoints1 = reactive([
  {
    x: 230,
    y: -8,
    z: 100
  },
  {
    x: 230,
    y: 4,
    z: 100
  },

  {
    x: 160,
    y: 4,
    z: 106.5
  }
])
function removeLine() {

  if (flowLines && flowLines.length) {
    for (let index = 0; index < flowLines.length; index++) {
      const line = flowLines[index];
      line && line.dispose();
    }
  }
  flowLines = []
}
function updateModel() {
  removeLine()
  createLine()
}

function create1() {

  const points = linePoints1.map(it => new THREE.Vector3(it.x, it.y, it.z))

  // 2. 实例化流动线
  const line = new FlowLine(points, {
    color: getFlowLineColor(),
    radius: 1.0,         // 管道粗细
    speed: 3.0,          // 流动速度 (数值越大越快)
    dashCount: 10,       // 流光的段数 (密度)
    showBaseLine: false   // 是否显示底层管道
  });


  flowLines.push(line)

  console.log(flowLines)

  // 3. 添加到场景
  scene.add(line);

}

function getFlowLineColor() {
  return props.data.id === 'Workshop3' ? 0x2ecc71 : 0xff0000
}

let linePoints = reactive([
  {
    points: [
      {
        x: 205,
        y: 6,
        z: 190
      },
      {
        x: 205,
        y: 50,
        z: 190
      },
      {
        x: 245,
        y: 50,
        z: 165
      },

      {
        x: 295,
        y: 50,
        z: 240
      }
    ],
    name: 'line1'
  },
  {
    points:
      [
        {
          x: 145,
          y: 6,
          z: 75
        },
        {
          x: 145,
          y: 50,
          z: 75
        },
        {
          x: 175,
          y: 50,
          z: 55
        },

        {
          x: 245,
          y: 50,
          z: 165
        }
      ],
    name: 'line2'
  },
  {
    points: [
      {
        x: 75,
        y: 6,
        z: -30
      },
      {
        x: 75,
        y: 50,
        z: -30
      },
      {
        x: 105,
        y: 50,
        z: -50
      },

      {
        x: 175,
        y: 50,
        z: 55
      }
    ],
    name: 'line3'
  },

])

function createLine() {

  // 1. 定义路径点 (比如从 A 点到 B 点到 C 点)
  // let linePoints
  if (props.data.id == 'Workshop') {
    linePoints = [
      {
        points: [
          {
            x: 140,
            y: -8,
            z: 155
          },
          {
            x: 140,
            y: 6,
            z: 155
          },
          {
            x: 140,
            y: 6,
            z: 175
          },

          {
            x: 105,
            y: 6,
            z: 178
          }
        ],
        name: 'line1'
      },
      {
        points:
          [
            {
              x: 190,
              y: -8,
              z: 155
            },
            {
              x: 190,
              y: 6,
              z: 155
            },
            {
              x: 190,
              y: 6,
              z: 170
            },

            {
              x: 150,
              y: 6,
              z: 173
            }
          ],
        name: 'line2'
      },
      {
        points: [
          {
            x: 243,
            y: -8,
            z: 145
          },
          {
            x: 243,
            y: 6,
            z: 145
          },
          {
            x: 245,
            y: 6,
            z: 165
          },

          {
            x: 200,
            y: 6,
            z: 170
          }
        ],
        name: 'line3'
      },

      {
        points: [
          {
            x: 245,
            y: 6,
            z: 165
          },

          {
            x: 265,
            y: 6,
            z: 163
          }
        ],
        name: 'line31',
        dashCount: 4
      },
      {
        points: [
          {
            x: 128,
            y: -8,
            z: 130
          },
          {
            x: 128,
            y: 4,
            z: 130
          },
          {
            x: 125,
            y: 4,
            z: 110
          },

          {
            x: 110,
            y: 4,
            z: 111.5
          }
        ],
        name: 'line4',
        dashCount: 8
      },
      {
        points: [
          {
            x: 125,
            y: 4,
            z: 110
          },

          {
            x: 160,
            y: 4,
            z: 106.5
          }
        ],
        name: 'line41',
        dashCount: 4
      },
      {
        points: [{
          x: 230,
          y: -8,
          z: 100
        },
        {
          x: 230,
          y: 4,
          z: 100
        },

        {
          x: 160,
          y: 4,
          z: 106.5
        }],
        name: 'line5'
      },
    ]
  } else if (props.data.id == 'Workshop3') {
    linePoints = [
      {
        points: [
          {
            x: 205,
            y: 6,
            z: 190
          },
          {
            x: 205,
            y: 50,
            z: 190
          },
          {
            x: 245,
            y: 50,
            z: 165
          },

          {
            x: 295,
            y: 50,
            z: 240
          }
        ],
        name: 'line1'
      },
      {
        points:
          [
            {
              x: 145,
              y: 6,
              z: 75
            },
            {
              x: 145,
              y: 50,
              z: 75
            },
            {
              x: 175,
              y: 50,
              z: 55
            },

            {
              x: 245,
              y: 50,
              z: 165
            }
          ],
        name: 'line2'
      },
      {
        points: [
          {
            x: 75,
            y: 6,
            z: -30
          },
          {
            x: 75,
            y: 50,
            z: -30
          },
          {
            x: 105,
            y: 50,
            z: -50
          },

          {
            x: 175,
            y: 50,
            z: 55
          }
        ],
        name: 'line3'
      },

    ]
  }

  for (let index = 0; index < linePoints.length; index++) {
    const lp = linePoints[index];

    const points = lp.points.map(it => new THREE.Vector3(it.x, it.y, it.z))

    // 2. 实例化流动线
    const line = new FlowLine(points, {
      color: getFlowLineColor(),
      radius: 1.0,         // 管道粗细
      speed: 3.0,          // 流动速度 (数值越大越快)
      dashCount: lp.dashCount ?? 10,       // 流光的段数 (密度)
      showBaseLine: false   // 是否显示底层管道
    });


    flowLines.push(line)

    console.log(flowLines)

    // 3. 添加到场景
    scene.add(line);
  }


}


// --- 4. 动画循环 ---
const clock = new THREE.Clock();
let animationId = null;
const MAX_RENDER_FPS = 30;
const FRAME_INTERVAL = 1000 / MAX_RENDER_FPS;
let lastFrameAt = 0;
function animate(timestamp = 0) {
  animationId = requestAnimationFrame(animate);
  if (document.hidden || timestamp - lastFrameAt < FRAME_INTERVAL) return;
  lastFrameAt = timestamp;
  const time = clock.getElapsedTime();
  updateTooltipPosition()

  // 更新所有流动线路
  if (flowLines && flowLines.length) {
    for (let index = 0; index < flowLines.length; index++) {
      const line = flowLines[index];

      line && line.update(time);
    }
  }

}

animate();

</script>

<style scoped>
.internal-scene-btn,
.device-back-btn {
  position: fixed;
  bottom: 96px;
  z-index: 9999;
  padding: 7px 12px;
  color: #eaffff;
  background: rgba(4, 14, 20, 0.78);
  border: 1px solid rgba(64, 240, 180, 0.45);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  user-select: none;
}

.internal-scene-btn {
  left: 300px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.internal-scene-btn input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: #69ffc5;
}

.device-back-btn {
  left: 410px;
}

.internal-scene-btn:hover,
.internal-scene-btn.active,
.device-back-btn:hover {
  color: #07100d;
  background: #69ffc5;
}
</style>
