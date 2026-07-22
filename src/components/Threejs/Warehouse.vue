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
  </template>
</template>

<script setup>
// 厂房
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

const gltfStatus = ref(false);
const inStatus = ref(false)
const currentModel = ref(null)

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
let label
let tooltipRequestId = 0
let tooltipVideoPlayer = null
const modelUrl = computed(() => {
  const map = {
    overview: '🌾 总览',
    testfield: '🌱 试验田',
    workshop: '🏭 烘干车间',
    warehouse: '📦 仓库'
  }
  return map[props.mode] || '🌾 总览'
})
const supportedInternalScene = computed(() => ['Warehouse', 'Warehouse3'].includes(currentModel.value?.id))
watch(() => props.data, (newMode) => {
  if (newMode) {
    gltfStatus.value = false
    inStatus.value = false
    currentModel.value = newMode
    remove()
    init(newMode)
  }
},
  {
    // deep: true,
    immediate: true
  }
)


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

  remove()
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  removeLine()
})

function onGetInfo(e) {
  const position = camera.position;
  console.log('视角信息', position)
}

function remove() {
  // if (label) {
  //   label.removeFromParent()
  //   label = null
  // }
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

// 双击事件
function onDoubleClick(item) {
  console.log('双击事件', item)
  if (item) {
    const name = getObjectNamePath(item.object)
    console.log('试验田点击对象:', name, item)
    showTooltip(item.object, item.point)
    
  }
}


function onClick(item) {
  removeTooltip()
  if (item) {
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
      const model = markRaw(GLOBAL[key])
      pageModels.push(model)
      scene.add(GLOBAL[key].scene);
      // 可以对模型进行操作
      GLOBAL[key].scene.scale.set(gltf.scale, gltf.scale, gltf.scale);
      GLOBAL[key].scene.position.set(gltf.x, gltf.y, gltf.z);
    }
    gltfStatus.value = true
  }

}

function getModelById(id, key = 'modelId') {
  return pageModels.find(item => item[key] === id)
}

function getCurrentCameraConfig() {
  const currentCamera = currentModel.value?.threeCamera
  if (!currentCamera) return null
  return {
    position: [currentCamera.x, currentCamera.y, currentCamera.z],
    target: [currentCamera.tx ?? 0, currentCamera.ty ?? 0, currentCamera.tz ?? 0]
  }
}

function getInternalSceneConfig() {
  const outCamera = getCurrentCameraConfig()
  const configs = {
    Warehouse: {
      model: getModelById('仓库') || getModelById('./static/glb/仓库1.glb', 'modelUrl'),
      outsideNames: ['立方体010_4'],
      inCamera: {
        position: [241, 91, -230],
        target: [367, -11, 44]
      },
      outCamera
    },
    Warehouse2: {
      model: getModelById('仓库2') || getModelById('changfang31') || getModelById('./static/glb/厂房3-有底图.glb', 'modelUrl'),
      outsideNames: ['Box002029', '002', '002_1'],
      inCamera: {
        position: [-50, 305, 105],
        target: [170, 45, 100]
      },
      outCamera
    },
    Warehouse3: {
      model: getModelById('仓库3') || getModelById('./static/glb/仓库3.glb', 'modelUrl'),
      outsideNames: ['Box002008', 'Box002009'],
      inCamera: {
        position: [0, 80, 120],
        target: [0, 20, 0]
      },
      outCamera
    },
    Workshop2: {
      model: getModelById('./static/glb/厂房1.glb', 'modelUrl'),
      outsideNames: ['立方体010_4'],
      inCamera: {
        position: [241, 91, -230],
        target: [367, -11, 44]
      },
      outCamera
    }
  }
  return configs[props.data.id]
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
  return ['摄像头', '摄像机', '视频监控', '视频监控器', 'camera'].some(keyword => lowerName.includes(keyword.toLowerCase()))
}

function setOutsideVisible(config, visible) {
  config.outsideNames?.forEach((name) => {
    const object = getModal(config.model.scene, name)
    if (!object) return
    object.traverse((child) => { child.visible = visible })
    object.visible = visible
  })

  config.outsideKeywords?.forEach((keyword) => {
    config.model.scene.traverse((object) => {
      if (!String(object.name || '').includes(keyword)) return
      object.traverse((child) => { child.visible = visible })
      object.visible = visible
    })
  })
}

function moveToCamera(config) {
  if (!config) return
  flyTo(
    new THREE.Vector3(...config.position),
    new THREE.Vector3(...config.target)
  )
}

// 进入到内部
function changeStatus(e) {
  const config = getInternalSceneConfig()
  const value = inStatus.value

  console.log(1111111, props.data, config)
  if (!config?.model?.scene) {
    inStatus.value = false
    // removeLine()
    return
  }

  setOutsideVisible(config, !value)
  removeLine()
  if (value) {
    moveToCamera(config.inCamera)
  } else {
    moveToCamera(config.outCamera)
  }
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
    "shuini001": {
      name: "东进水阀",
      id: "2061751426031288320"
    },  // 水渠1
    "shuini007": {
      name: "西进水阀",
      id: "2061751464191066112"
    },  // 水渠1


    // 红耕农场
    "水井001/Scene": {
      name: "排水阀2",
      id: "2061751248582868992"
    },// 
    "水井002/Scene": {
      name: "排水阀3",
      id: "2061751300424466432"
    }, // 
    "水井003/Scene": {
      name: "排水阀4",
      id: "2064515476305739776"
    }, // 排水阀4
  }

  let obj
  for (const key in ids) {

    const item = ids[key];
    if (name.indexOf(key) > -1) {
      obj = item
    }
  }
  if (!obj && isCameraObject(name)) {
    obj = {
      name: "网络摄像机",
      id: ""
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
        ${cameraDevice.url
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
  } else if (name.indexOf("电子水尺") > -1) {
    names = {
      waterLevel: "水位值",
      hasWater: "水浸状态",
      status: "状态",
    }
  } else if (name.indexOf("气象站") > -1 || name.indexOf("围栏") > -1) {
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

function removeTooltip() {
  tooltipRequestId += 1
  destroyTooltipVideoPlayer()
  if (label) {
    if (label.removeFromParent) {
      label.removeFromParent()
    } else if (label.element?.parentNode) {
      label.element.parentNode.removeChild(label.element)
    }
    label = null
  }
}
function loadData(params) {
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


let flowLines = markRaw([])

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
    flowLines = []
  }
}

function updateModel() {
  removeLine()
  createLine()
}

function create1() {

  const points = linePoints1.map(it => new THREE.Vector3(it.x, it.y, it.z))

  // 2. 实例化流动线
  const line = new FlowLine(points, {
    color: 0xff0000,     // 青色流光
    radius: 1.0,         // 管道粗细
    speed: 3.0,          // 流动速度 (数值越大越快)
    dashCount: 10,       // 流光的段数 (密度)
    showBaseLine: false   // 是否显示底层管道
  });


  flowLines.push(line)

  console.log(flowLines)

  // 3. 添加到场景
  scene.add(line);

  return


  // 1. 定义路径点 (比如从 A 点到 B 点到 C 点)

  for (let index = 0; index < linePoints.length; index++) {
    const tmpPoints = linePoints[index];

    const points = tmpPoints.map(it => new THREE.Vector3(it.x, it.y, it.z))

    // 2. 实例化流动线
    const line = new FlowLine(points, {
      color: 0xff0000,     // 青色流光
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


}

const linePoints = reactive([
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
])

function createLine() {

  // 1. 定义路径点 (比如从 A 点到 B 点到 C 点)

  for (let index = 0; index < linePoints.length; index++) {
    const lp = linePoints[index];

    const points = lp.points.map(it => new THREE.Vector3(it.x, it.y, it.z))

    // 2. 实例化流动线
    const line = new FlowLine(points, {
      color: 0xff0000,     // 青色流光
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
.internal-scene-btn {
  position: fixed;
  left: 300px;
  bottom: 96px;
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  gap: 7px;
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

.internal-scene-btn input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: #69ffc5;
}

.internal-scene-btn:hover,
.internal-scene-btn.active {
  color: #07100d;
  background: #69ffc5;
}
</style>
