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
</template>

<script setup>
// 试验田
import { reactive, ref, onMounted, onUnmounted, watch, getCurrentInstance, computed, markRaw, shallowRef } from 'vue'
import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import ThreeEvents from '@/utils/ThreeEvents.js'
import FlowLine from '@/utils/FlowLine.js'; // 引入上面封装的类
import GLOBAL from '@/utils/GLOBAL.js'
import { useAppStore } from '@/store/modules/app';
import { getDeviceValues } from '@/utils/api.js'
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
let activeDetailModel = null
const pumpVisible = ref(false)

const defaultPumpConfig = {
  url: './static/glb/水泵.glb',
  scale: 35,
  offset: { x: 0, y: 8, z: 0 }
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
})

function onGetInfo(e) {
  const position = camera.position;
  console.log('视角信息', position)
}

function remove() {
  removeTooltip()
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
  removeTooltip()
  if (pumpVisible.value) return
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
    return

    if (isPumpStationObject(name)) {
      showTooltip(item.object, item.point)
      // 定位
    } else if (name.indexOf('水井') > -1 || name.indexOf('shuini') > -1) {
      showTooltip(item)
    } else if (name.indexOf('虫情') > -1 || name.indexOf('测报') > -1) {
      showTooltip(item)
    } else if (name.indexOf('气象') > -1 || name.indexOf('围栏') > -1 || name.toLowerCase().indexOf('weather') > -1) {
      showTooltip(item)
    } else if (name.indexOf('土壤') > -1 || name.toLowerCase().indexOf('soil') > -1) {
      showTooltip(item)
    }
  }
}

function init(obj) {
  remove()// 移除所有对象
  centerAt(obj.threeCamera)
  renderModel(obj)
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
}

function showFieldModels() {
  pageModels.forEach(model => {
    if (model?.scene) model.scene.visible = true
  })
}

function removeTooltip() {
  tooltipRequestId += 1
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
  if (!label?.element || !label?.point) return
  const rect = renderer.domElement.getBoundingClientRect()
  const screenPoint = label.point.clone().project(camera)
  const x = (screenPoint.x * 0.5 + 0.5) * rect.width + rect.left
  const y = (-screenPoint.y * 0.5 + 0.5) * rect.height + rect.top
  label.element.style.left = `${x}px`
  label.element.style.top = `${y}px`
  label.element.style.display = screenPoint.z < 1 ? 'block' : 'none'
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
    "视频监控器": {
      name: "视频监控器",
      id: "2067169374367645696"
    },


    // 红耕农场
    "虫情测报仪001": {
      name: "虫情测报仪",
      id: ""
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
    return
  }


  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
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
  } else if (name.indexOf("视频监控器") > -1 ) {

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
  const anchorPoint = point?.clone?.() ?? model.getWorldPosition(new THREE.Vector3())
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

// function updateModel() {
//   removeLine()
//   createLine()
// }

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
  top: 96px;
  right: 420px;
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
</style>
