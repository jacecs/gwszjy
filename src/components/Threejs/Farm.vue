<template>
  <div style="position: fixed; left: 300px; top: 100px;z-index: 9999; padding: 5px">
    <!-- <h3>glb 调试器</h3>
      <div>
        <input type="number" v-model.number="config.x" :step="1" @input="updateModel">
        <input type="number" v-model.number="config.y" :step="1" @input="updateModel">
        <input type="number" v-model.number="config.z" :step="1" @input="updateModel">
        <input type="number" v-model.number="config.scale" :step="1" @input="updateModel">
      </div> -->
  </div>
  <button v-if="pumpVisible" class="farm-back-btn" @click.stop="closePumpModel">
    返回试验田
  </button>
  <div>
    <template v-if="currentModalStatus">
      <div class="farm-modal-card" style="position: fixed; top: 200px; left: 300px; z-index: 1000; min-width: 320px; max-width: 420px; background: rgba(255, 255, 255, 0.96); padding: 16px; border: 1px solid rgba(0, 0, 0, 0.06); border-radius: 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); color: #333; backdrop-filter: blur(6px);">
        <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #eeeeee; font-size: 20px; font-weight: 600; line-height: 1.4; color: #1f2937;">名称： {{currentModalName}}</div>
        <template v-if="currentModalType === 'insect'">
          <div v-if="currentModalList.length" class="farm-insect-grid">
            <div
              v-for="(item, key) in currentModalList"
              :key="`${item.date}-${key}`"
              class="farm-insect-card"
              :class="{ 'farm-insect-card-clickable': item.imageUrl }"
              @click.stop="openInsectImagePreview(item)"
            >
              <div class="farm-insect-image-wrap">
                <img v-if="item.imageUrl" class="farm-insect-image" :src="item.imageUrl" :alt="`${currentModalName} ${item.date}`">
                <div v-else class="farm-insect-empty-image">暂无图片</div>
              </div>
              <div class="farm-insect-date">{{ item.date || '暂无日期' }}</div>
            </div>
          </div>
          <div v-else class="farm-modal-empty">暂无虫情图片</div>
        </template>
        <template v-else-if="currentModalList.length">
          <div v-for="(item, key) in currentModalList" :key="key" class="modal-info" style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 8px 2px; border-bottom: 1px solid #f3f4f6; font-size: 15px; line-height: 1.5;">
            <div class="modal-info-name" style="width: 160px; color: #6b7280; word-break: break-all;">{{item.name}}：</div>
            <div class="modal-info-value" style="flex: 1; min-width: 120px; color: #111827; font-weight: 500; text-align: right; word-break: break-all;">{{item.value}}</div>
          </div>
        </template>
        <div v-else class="farm-modal-empty">暂无数据</div>
      </div>
    </template>
  </div>
  <div v-if="previewInsectImage" class="farm-image-preview" @click.stop="closeInsectImagePreview">
    <button class="farm-image-preview-close" type="button" @click.stop="closeInsectImagePreview">×</button>
    <div class="farm-image-preview-content" @click.stop>
      <img class="farm-image-preview-img" :src="previewInsectImage.imageUrl" :alt="`${currentModalName} ${previewInsectImage.date}`">
      <div class="farm-image-preview-date">{{ previewInsectImage.date || '暂无日期' }}</div>
    </div>
  </div>
</template>

<script setup>
// 试验田
import { reactive, ref, onMounted, onUnmounted, watch, getCurrentInstance, computed, markRaw, shallowRef } from 'vue'
import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import mpegts from 'mpegts.js'
import ThreeEvents from '@/utils/ThreeEvents.js'
import FlowLine from '@/utils/FlowLine.js'; // 引入上面封装的类
import GLOBAL from '@/utils/GLOBAL.js'
import { useAppStore } from '@/store/modules/app';
import { getDeviceValues, getListAllDevices, getInsectDataList } from '@/utils/api.js'
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
  }
})

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

let flowLines = markRaw([])

let label
let tooltipRequestId = 0
let tooltipVideoPlayer = null
let activeDetailModel = null
const pumpVisible = ref(false)

const currentModalName = ref()
const currentModalList = ref([])
const currentModalStatus = ref(false)
const currentModalType = ref('')
const previewInsectImage = ref(null)

let spriteList = markRaw([])
const clickableMarkerKeys = [
  '水泵站',
  'shuini001',
  'shuini007',
  'shuini005',
  '柱体003/虫情测报仪',
  'Cylinder002011_1/气象站',
  '土壤监测站',
  '视频监控器',
  '虫情测报仪001',
  '电子水尺',
  '围栏',
  '水井/Scene',
  '水井001/Scene',
  '水井002/Scene',
  '水井003/Scene'
]
const clickableMarkerRules = [
  { type: 'pumpStation', keywords: ['水泵站'] },
  { type: 'well', keywords: ['水井', 'shuini'] },
  { type: 'pest', keywords: ['虫情', '测报'] },
  { type: 'weather', keywords: ['气象', '围栏', 'weather'] },
  { type: 'soil', keywords: ['土壤', 'soil'] },
  { type: 'camera', keywords: ['视频监控器'] },
  { type: 'waterLevel', keywords: ['电子水尺'] }
]
let clickableMarkerTexture = null

const defaultPumpConfig = {
  url: './static/glb/水泵.glb',
  scale: 35,
  offset: { x: 0, y: 50, z: 17 }
}

const defaultPumpStationConfig = {
  url: './static/glb/泵站.glb',
  scale: 35,
  offset: { x: 0, y: 8, z: 0 },
  camera: {
    distance: 550,
  }

}

const defaultPestConfig = {
  url: './static/glb/虫情测报仪.glb',
  scale: 35,
  offset: { x: 0, y: 0, z: 0 }
}

const defaultWeatherStationConfig = {
  url: './static/glb/气象站.glb',
  scale: 35,
  offset: { x: 0, y: 0, z: 0 }
}

const defaultSoilStationConfig = {
  url: './static/glb/土壤监测站.glb',
  scale: 35,
  offset: { x: 0, y: 0, z: 0 }
}

const config = reactive({
  x: 0,
  y: 0,
  z: 0,
  scale: 1,
})

watch(() => props.data, (newMode) => {
  if (newMode) {
    remove()
    init(newMode)
  }
},
  {
    immediate: true
  })


function updateModel() {
  // 可以对模型进行操作
  const model = getGlb('虫情测报仪')
  if (model) {

    model.scene.scale.set(config.scale, config.scale, config.scale);
    model.scene.position.set(config.x, config.y, config.z);
  }
}


onMounted(() => {
  ThreeEvents.add('LEFT_CLICK', onClick)
  ThreeEvents.add('LEFT_CLICK', onGetInfo)
  window.addEventListener('keydown', onFarmKeydown)
})



onUnmounted(() => {
  mixers = []
  ThreeEvents.off('LEFT_CLICK', onClick)
  ThreeEvents.off('LEFT_CLICK', onGetInfo)
  window.removeEventListener('keydown', onFarmKeydown)

  remove()
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
})

function onGetInfo(e) {
  const position = camera.position;
  console.log('视角信息', position)
}

function onFarmKeydown(e) {
  if (e.key === 'Escape' && previewInsectImage.value) {
    closeInsectImagePreview()
  }
}

function remove() {
  closeModal()
  removeTooltip()
  removeSprite()
  if (activeDetailModel) {
    scene.remove(activeDetailModel.scene)
    disposeModel(activeDetailModel.scene)
    activeDetailModel = null
  }
  pumpVisible.value = false
  if (pageModels && pageModels.length) {
    for (let index = 0; index < pageModels.length; index++) {
      const model = pageModels[index];

      const modelScene = model.scene;

      if (modelScene) {
        scene.remove(modelScene);

        disposeModel(modelScene);
      }
    }
  }

  pageModels = markRaw([])

}

function disposeModel(modelScene) {
  // 【重要】遍历模型，释放几何体和材质，防止内存泄漏
  modelScene.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose();
    }
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  });
}

// 单击事件
function onClick(item) {
  if (pumpVisible.value) return

  closeModal()
  removeTooltip()
  if (item) {
    const name = getObjectNamePath(item.object)
    console.log('试验田点击对象:', name, item)

    if (isPumpStationObject(name)) {
      showPumpStation(item)
      // 定位
    } else if (name.indexOf('水井') > -1 || name.indexOf('shuini') > -1) {
      showPumpAtWell(item)
    } else if (name.indexOf('虫情') > -1 || name.indexOf('测报') > -1) {
      showPestDevice(item)
    } else if (name.indexOf('气象') > -1 || name.indexOf('围栏') > -1 || name.toLowerCase().indexOf('weather') > -1) {
      showWeatherStation(item)
    } else if (name.indexOf('土壤') > -1 || name.toLowerCase().indexOf('soil') > -1) {
      showSoilStation(item)
    }

    showTooltip(item.object, item.point)
  }
}

// 双击事件
function onDoubleClick(item) {
  if (pumpVisible.value) return
  if (item) {
    const name = getObjectNamePath(item.object)
    console.log('试验田点击对象:', name, item)
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
      "shuini005": {
        name: "2061751503294562304",
        id: "北排水阀"
      },  // 水渠1
      "柱体003/虫情测报仪": {
        name: "虫情测报仪",
        id: ""
      },
      "Cylinder002011_1/气象站": {
        name: "气象监测",
        id: "2061329763271704576"
      },
      "土壤监测站": {
        name: "土壤监测站",
        id: ""
      },


      // 红耕农场
      "虫情测报仪001": {
        name: "虫情测报仪",
        id: ""
      },
      "电子水尺": {
        name: "电子水尺",
        id: ""
      },
      "围栏": {
        name: "气象监测",
        id: ""
      }, // 环境监测
      "水井/Scene": {
        name: "排水阀1",
        id: "2061751164268969984"
      },// 排水阀1
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


    showTooltip(item.object, item.point)
  }
}

function init(obj) {
  remove()// 移除所有对象
  centerAt(obj.threeCamera)
  renderModel(obj)

  createSprite(obj.sprites??[])
  // createSprite([
  //   {
  //     x: 1,
  //     y: 1,
  //     z:0
  //   }
  // ])
}
function centerAt(camera) {
  const { x, y, z, tx = 0, ty = 0, tz = 0 } = camera ?? { x: 50, y: 150, z: -150, tx: 0, ty: 0, tz: 0 }
  // 定位
  console.log('centerAt', x, y, z, tx, ty, tz)
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
      const key = gltf.id
      console.log('模型', obj)
      if (!GLOBAL[key]) {
        const modal = await appStore.loadGLBModal(loader, gltf.url)
        modal.modelId = gltf.id
        GLOBAL[key] = modal
        console.log('模型加载成功', modal)
      }
      const model = markRaw(GLOBAL[key])
      scene.add(GLOBAL[key].scene);
      pageModels.push(model)
      // 可以对模型进行操作
      GLOBAL[key].scene.scale.set(gltf.scale, gltf.scale, gltf.scale);
      GLOBAL[key].scene.position.set(gltf.x, gltf.y, gltf.z);
    }
    createClickableObjectSprites()
  }
}
function getModelById(id) {
  return pageModels.find(item => item.modelId === id)
}


function getGlb(id) {
  return GLOBAL[id] ?? null
}

function isPumpStationObject(name) {
  return name.indexOf('水泵站') > -1
}

async function showPumpStation(item) {
  const pumpStationConfig = props.data?.pumpStation ?? defaultPumpStationConfig
  showDetailModel(item, pumpStationConfig, '泵站')
}

async function showPumpAtWell(item) {
  const pumpConfig = props.data?.waterPump ?? defaultPumpConfig
  showDetailModel(item, pumpConfig, '水泵')
}

async function showPestDevice(item) {
  const pestConfig = props.data?.pestDevice ?? defaultPestConfig
  showDetailModel(item, pestConfig, '虫情测报仪')
}

async function showWeatherStation(item) {
  const weatherConfig = props.data?.weatherStation ?? defaultWeatherStationConfig
  showDetailModel(item, weatherConfig, '气象站')
}

async function showSoilStation(item) {
  const soilConfig = props.data?.soilStation ?? defaultSoilStationConfig
  showDetailModel(item, soilConfig, '土壤监测站')
}

async function showDetailModel(item, config, modelName) {
  const point = item?.point
  if (!point) return

  hideFieldModels()
  closeModal()
  removeTooltip()
  if (activeDetailModel) {
    scene.remove(activeDetailModel.scene)
    disposeModel(activeDetailModel.scene)
  }
  activeDetailModel = markRaw(await appStore.loadGLBModal(loader, config.url))
  activeDetailModel.scene.name = modelName
  activeDetailModel.scene.userData.modelId = modelName
  scene.add(activeDetailModel.scene)

  const scale = config.scale ?? 1
  const offset = config.offset ?? { x: 0, y: 0, z: 0 }
  activeDetailModel.scene.visible = true
  activeDetailModel.scene.scale.set(scale, scale, scale)
  activeDetailModel.scene.position.set(
    point.x + (offset.x ?? 0),
    point.y + (offset.y ?? 0),
    point.z + (offset.z ?? 0)
  )
  focusDetailModel(activeDetailModel.scene, config.camera)
  pumpVisible.value = true
}

function focusDetailModel(modelScene, cameraConfig = {}) {
  modelScene.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(modelScene)
  if (box.isEmpty()) return

  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxSize = Math.max(size.x, size.y, size.z)
  const directionConfig = cameraConfig.direction ?? { x: 1, y: 0.65, z: 1 }
  const direction = new THREE.Vector3(directionConfig.x, directionConfig.y, directionConfig.z).normalize()
  const distance = cameraConfig.distance ?? Math.max(maxSize * 2.3, 80)
  const targetPos = center.clone().add(direction.multiplyScalar(distance))

  controls.target.copy(center)
  camera.position.copy(targetPos)
  controls.update()
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

function hideFieldModels() {
  pageModels.forEach(model => {
    if (model?.scene) model.scene.visible = false
  })
  setClickableMarkersVisible(false)
}

function showFieldModels() {
  pageModels.forEach(model => {
    if (model?.scene) model.scene.visible = true
  })
  setClickableMarkersVisible(true)
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

function updateTooltipPosition() {
  // if (!label?.element) return
  // label.element.style.left = '50%'
  // label.element.style.top = '120px'
  // label.element.style.transform = 'translateX(-50%)'
  // label.element.style.display = 'block'

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
  } catch (e) { }
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
      enableWorker: false,
      enableStashBuffer: false,
      stashInitialSize: 128
    }
  )
  tooltipVideoPlayer.attachMediaElement(video)
  tooltipVideoPlayer.load()
  tooltipVideoPlayer.play().catch(() => { })
  tooltipVideoPlayer.on(mpegts.Events.ERROR, () => {
    try {
      tooltipVideoPlayer.unload()
      tooltipVideoPlayer.load()
      tooltipVideoPlayer.play().catch(() => { })
    } catch (e) { }
  })
}

function getDeviceVideoUrl(device = {}) {
  return device.https_flv_url || device.url || device.streamUrl || device.videoUrl || device.flvUrl || ''
}

async function getCameraDevice(obj) {
  let list = []
  try {
    const res = await getListAllDevices()
    list = Array.isArray(res?.data) ? res.data : []
  } catch (e) {
    console.warn('获取摄像机设备列表失败', e)
  }
  const device = list.find(item => String(item.id) === String(obj.id))
    || (props.data?.videos || []).find(item => getDeviceVideoUrl(item))
  return {
    name: device?.name || device?.cameraName || obj.name,
    url: getDeviceVideoUrl(device)
  }
}

function closePumpModel() {
  if (activeDetailModel) {
    scene.remove(activeDetailModel.scene)
    disposeModel(activeDetailModel.scene)
    activeDetailModel = null
  }
  pumpVisible.value = false
  showFieldModels()
  centerAt(props.data?.threeCamera)

  // 隐藏设备信息
  closeModal()
  removeTooltip()
}

function closeModal() {
  currentModalStatus.value = false
  currentModalList.value = []
  currentModalName.value = ''
  currentModalType.value = ''
  closeInsectImagePreview()
}

function openInsectImagePreview(item) {
  if (!item?.imageUrl) return
  previewInsectImage.value = item
}

function closeInsectImagePreview() {
  previewInsectImage.value = null
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

async function showTooltip(model, point) {
  removeTooltip()
  closeModal()
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
    "shuini005": {
      name: "北排水阀",
      id: "2061751503294562304"
    },  // 水渠1
    "柱体003/虫情测报仪": {
      name: "虫情测报仪",
      id: "ft202603010"
    },
    "Cylinder002011_1/气象站": {
      name: "气象监测",
      id: "2061329763271704576"
    },
    "土壤监测站": {
      name: "土壤监测站",
      id: ""
    },
    "视频监控器": {
      name: "视频监控器",
      id: "2067169374367645696",
      //url: "https://hualin.xyune.com:8443/api/gb/httpflv/live/34020000001310000012.flv?streamtype=1&token=11223344"
    },


    // 红耕农场
    "虫情测报仪001": {
      name: "虫情测报仪",
      id: "ft202604001"
    },
    "电子水尺": {
      name: "水位计",
      id: "2061753475154313216"
    },
    "围栏": {
      name: "气象监测",
      id: "2061329373797023744"
    }, // 环境监测
    "水井/Scene": {
      name: "排水阀1",
      id: "2061751164268969984"
    },// 排水阀1
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
  if (!obj) {
    currentModalStatus.value = false
    currentModalType.value = ''
    return
  }

  const isCameraDevice = name.indexOf("视频监控器") > -1

  const isInsectDevice = name.indexOf("虫情测报仪") > -1
  if (isInsectDevice) {
    // 虫情设备
    const params = {
      imei: obj.id,
      page: 1,
      size: 10,
      _t: new Date().getTime()
      
    }
    return getInsectDataList(params).then(res => {
      if (currentTooltipRequestId !== tooltipRequestId) return
      const records = Array.isArray(res?.data?.records) ? res.data.records : []
      const list = records.map(item => {
        return {
          date: formatInsectRecordTime(item.recordTime || item.captureTime || item.createTime || item.updateTime),
          imageUrl: getInsectImageUrl(item)
        }
      })
      currentModalType.value = 'insect'
      currentModalList.value = list
      currentModalName.value = obj.name
      currentModalStatus.value = true
    }).catch(e => {
      console.warn('获取虫情图片列表失败', e)
      if (currentTooltipRequestId !== tooltipRequestId) return
      currentModalType.value = 'insect'
      currentModalList.value = []
      currentModalName.value = obj.name
      currentModalStatus.value = true
    })
  } else if (isCameraDevice) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    const anchorPoint = point?.clone?.() ?? model.getWorldPosition(new THREE.Vector3())


    const cameraDevice = await getCameraDevice(obj)
    if (currentTooltipRequestId !== tooltipRequestId) return
    tooltip.innerHTML = `
      <div class="js-tooltip" style="width: 360px; padding: 10px; color: #ffffff; display: inline-block; background: rgba(2, 8, 12, 0.94); border: 1px solid rgba(46, 204, 113, 0.75); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);">
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
  } else {
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
      if (name.indexOf("水井") > -1 || name.indexOf("shuini") > -1) {
        const snum = res.data['s']
        list = getStatusLabel(snum)
        list.push({
          name: "状态",
          value: res.data['status'] == 1 ? '在线' : '离线'
        })
      } else {
        for (const key in res.data) {
          let value = res.data[key];
          if (Object.prototype.toString.call(value) !== '[object Null]') {
            if (key == 'status') {
              value = value == 1 ? '在线' : '离线'
            }
            list.push({
              name: names[key] ?? key,
              value: value
            })
          }
        }
      }
    }

    currentModalStatus.value = true
    currentModalType.value = ''
    currentModalList.value = list
    currentModalName.value = obj.name

  }
}

function getInsectImageUrl(item = {}) {
  return item.plotImageUrl
    || item.imageUrl
    || item.imgUrl
    || item.pictureUrl
    || item.fileUrl
    || ''
}

function formatInsectRecordTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').replace(/\.\d+Z?$/, '').trim()
}

function getStatusLabel(s) {
  const strictValveStatus = [
    { name: "阀门中间状态", 0: "", 1: "中间" },           // Bit 0
    { name: "阀门全关状态", 0: "", 1: "全关" },           // Bit 1
    { name: "阀门全开状态", 0: "", 1: "全开" },           // Bit 2
    { name: "执行器过热", 0: "", 1: "过热" },           // Bit 3
    { name: "执行器缺相", 0: "", 1: "缺相" },           // Bit 4
    { name: "执行器开过力矩", 0: "", 1: "开过力矩" },     // Bit 5
    { name: "执行器关过力矩", 0: "", 1: "关过力矩" },     // Bit 6
    { name: "角度超限", 0: "", 1: "角度超限" },       // Bit 7
    { name: "执行器综合报警", 0: "正常", 1: "综合故障" }, // Bit 8
    { name: "执行器工作模式", 0: "就地", 1: "远程" },     // Bit 9
    { name: "阀门ESD状态", 0: "", 1: "关阀" },       // Bit 10
    { name: "阀门ESD状态", 0: "", 1: "关阀" },       // Bit 10
    { name: "ESD保位", 0: "", 1: "保位" },           // Bit 11 (推测补全，因截图有16行位置)
    { name: "阀门正在关", 0: "", 1: "正在关" },         // Bit 12
    { name: "阀门正在开", 0: "", 1: "正在开" },         // Bit 13
    { name: "控制模式", 0: "开关量控制", 1: "总线控制" } // Bit 14/15 (截图最后一行)
  ];
  const nums = decTo16BitBinFormatted(+s)
  const numArray = nums.split("")

  const tmp = []
  for (let index = 0; index < strictValveStatus.length; index++) {
    const item = strictValveStatus[index];
    const value = item[numArray[index]]
    if (value) {
      tmp.push({
        name: item.name,
        value: value
      })
    }
  }
  return tmp
}
// 转换为16位二进制
function decTo16BitBinFormatted(decimalNum) {

  // 1. 检查数值是否在 16 位无符号整数范围内 (0 ~ 65535)
  if (!Number.isInteger(decimalNum) || decimalNum < 0 || decimalNum > 65535) {
    throw new Error("输入的数字必须是 0 到 65535 之间的整数。");
  }

  // 2. 将十进制转换为二进制字符串 (toString(2))
  const binStr = decimalNum.toString(2);

  // 3. 在左侧补 '0'，直到字符串长度达到 16 位 (padStart)
  return binStr.padStart(16, '0');
}

function loadData(options) {
  return new Promise(resolve => {
    getDeviceValues(options).then(res => {
      resolve(res)
    })
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

function removeLine() {

  if (flowLines && flowLines.length) {
    for (let index = 0; index < flowLines.length; index++) {
      const line = flowLines[index];
      line && line.dispose();
    }
    flowLines = []
  }
}

function createClickableObjectSprites() {
  const markerTargets = new Map()
  pageModels.forEach(model => {
    if (!model?.scene) return
    model.scene.updateMatrixWorld(true)
    model.scene.traverse((object) => {
      const namePath = getObjectNamePath(object)
      const markerKey = getClickableMarkerKey(namePath)
      if (!markerKey || markerTargets.has(markerKey)) return
      markerTargets.set(markerKey, object)
    })
  })

  markerTargets.forEach(object => {
    createClickableMarkerSprite(object)
  })
}

function getClickableMarkerKey(namePath = '') {
  const lowerNamePath = namePath.toLowerCase()
  for (let index = 0; index < clickableMarkerKeys.length; index++) {
    const key = clickableMarkerKeys[index]
    if (namePath.indexOf(key) > -1 || lowerNamePath.indexOf(key.toLowerCase()) > -1) {
      return key
    }
  }

  for (let index = 0; index < clickableMarkerRules.length; index++) {
    const rule = clickableMarkerRules[index]
    const matchedName = getMatchedMarkerName(namePath, rule.keywords)
    if (matchedName) {
      return `${rule.type}:${matchedName}`
    }
  }

  return ''
}

function getMatchedMarkerName(namePath, keywords) {
  const names = namePath.split('/').filter(Boolean)
  for (let index = 0; index < names.length; index++) {
    const name = names[index]
    const lowerName = name.toLowerCase()
    if (keywords.some(keyword => name.indexOf(keyword) > -1 || lowerName.indexOf(keyword.toLowerCase()) > -1)) {
      return name
    }
  }
  return ''
}

function getClickableMarkerTexture() {
  if (!clickableMarkerTexture) {
    clickableMarkerTexture = new THREE.TextureLoader().load('./static/img/red.png')
  }
  return clickableMarkerTexture
}

function getClickableMarkerPlacement(object) {
  object.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(object)
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxSize = Math.max(size.x, size.y, size.z)
    const lift = Math.max(size.y * 0.18, 1)
    return {
      position: new THREE.Vector3(center.x, box.max.y + lift, center.z),
      scale: THREE.MathUtils.clamp(maxSize * 0.18, 1.2, 8)
    }
  }

  return {
    position: object.getWorldPosition(new THREE.Vector3()),
    scale: 2
  }
}

function createClickableMarkerSprite(object) {
  const { position, scale } = getClickableMarkerPlacement(object)
  const spriteMaterial = new THREE.SpriteMaterial({
    map: getClickableMarkerTexture(),
    transparent: true,
    depthTest: false,
    depthWrite: false
  })
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.position.copy(position)
  sprite.scale.set(scale, scale, 1)
  sprite.renderOrder = 999
  sprite.userData.isClickableMarker = true
  sprite.raycast = () => {}
  spriteList.push(sprite)
  scene.add(sprite)
}

function setClickableMarkersVisible(visible) {
  spriteList.forEach(sprite => {
    if (sprite?.userData?.isClickableMarker) {
      sprite.visible = visible
    }
  })
}

// 绘制精灵图片
function createSprite(list=[]) {


const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('./static/img/red.png'); // 替换为你的图片路径
  for (let index = 0; index < list.length; index++) {
    const options = list[index];
    
    const { x, y, z } = options
    // 2. 创建精灵材质
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true // 如果图片有透明背景，务必开启此项
    });

    // 3. 创建精灵并设置位置
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(x, y, z); // 设置标记点的 3D 坐标
    sprite.scale.set(1, 1, 1);    // 设置精灵的宽高
    spriteList.push(sprite)
    // 4. 添加到场景
    scene.add(sprite);
  }
}
function removeSprite() {
  for (let index = 0; index < spriteList.length; index++) {
    const item = spriteList[index];
    scene.remove(item)
  }
  spriteList = []
}

// --- 4. 动画循环 ---
const clock = new THREE.Clock();
let animationId = null;
function animate() {
  animationId = requestAnimationFrame(animate);
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
.farm-back-btn {
  position: fixed;
  bottom: 96px;
  left: 420px;
  z-index: 10000;
  padding: 10px 18px;
  border: 1px solid rgba(46, 204, 113, 0.55);
  border-radius: 6px;
  background: rgba(5, 18, 16, 0.82);
  color: #e8f8f0;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
}

.farm-back-btn:hover {
  background: rgba(39, 174, 96, 0.9);
}

.farm-modal-card {
  max-height: 62vh;
  overflow-y: auto;
}

.farm-insect-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.farm-insect-card {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.farm-insect-card-clickable {
  cursor: zoom-in;
}

.farm-insect-card-clickable:hover {
  border-color: #16a34a;
  box-shadow: 0 6px 18px rgba(22, 163, 74, 0.16);
}

.farm-insect-image-wrap {
  height: 112px;
  background: #eef2f7;
}

.farm-insect-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.farm-insect-empty-image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #9ca3af;
  font-size: 13px;
}

.farm-insect-date {
  padding: 8px 10px;
  color: #374151;
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
  word-break: break-all;
  background: #ffffff;
}

.farm-modal-empty {
  padding: 18px 0 6px;
  color: #9ca3af;
  font-size: 14px;
  text-align: center;
}

.farm-image-preview {
  position: fixed;
  inset: 0;
  z-index: 20000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: rgba(0, 0, 0, 0.72);
  cursor: zoom-out;
}

.farm-image-preview-content {
  position: relative;
  max-width: min(86vw, 1080px);
  max-height: 86vh;
  cursor: default;
}

.farm-image-preview-img {
  display: block;
  max-width: 100%;
  max-height: calc(86vh - 44px);
  border-radius: 8px;
  background: #111827;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
  object-fit: contain;
}

.farm-image-preview-date {
  margin-top: 10px;
  padding: 8px 14px;
  border-radius: 6px;
  color: #f9fafb;
  font-size: 14px;
  line-height: 1.4;
  text-align: center;
  background: rgba(17, 24, 39, 0.88);
}

.farm-image-preview-close {
  position: fixed;
  top: 28px;
  right: 34px;
  z-index: 20001;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 50%;
  background: rgba(17, 24, 39, 0.72);
  color: #ffffff;
  font-size: 28px;
  line-height: 34px;
  cursor: pointer;
}

.farm-image-preview-close:hover {
  background: rgba(22, 163, 74, 0.9);
}
</style>
