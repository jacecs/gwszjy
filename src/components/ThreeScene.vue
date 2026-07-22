<template>
  <div class="three-wrapper" ref="wrapperRef">
    <div class="three-container" ref="container"></div>

    <div class="gltf-loading" v-if="glbLoading">
      <span>正在加载模型<span id="js-loading-progress">{{progress}}</span>%,请稍等...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, shallowRef, markRaw } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
// import { setThree } from '@/main.js'
import ThreeEvents from '@/utils/ThreeEvents.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import GLOBAL from '@/utils/GLOBAL.js'
import TWEEN from '@tweenjs/tween.js';
import { useAppStore } from '@/store/modules/app';
const appStore = useAppStore();

const props = defineProps({
  currentMode: {
    type: String,
    default: 'overview'
  }
})

const emit = defineEmits(['popup', 'flyToBuilding', 'initSuccess', 'threeReady'])

const wrapperRef = ref(null)
const container = ref(null)

const progress = ref(0)
const glbLoading = ref(false)


let scene, camera, renderer, controls, animationId, labelRenderer
let raycaster, mouse

// Mode-specific objects
let particleFence = null
let testfieldObjects = []
let workshopBuildings = []
let warehouseBuildings = []
let groundMesh = null

// Animation state
let particleAngle = 0

watch(() => appStore.LoadingProgress, (newValue) => {
  progress.value = newValue
})
watch(() => appStore.GlbLoading, (newValue) => {
  glbLoading.value = newValue
})

async function initThree() {
  scene = markRaw(new THREE.Scene())
  scene.background = new THREE.Color(0x020408)

  camera = markRaw(new THREE.PerspectiveCamera(60, container.value.clientWidth / container.value.clientHeight, 0.1, 500000))
  camera.position.set(0, 300, 400)
  camera.lookAt(0, 0, 0)

  renderer = markRaw(new THREE.WebGLRenderer({ antialias: true, alpha: false }))
  renderer.setClearColor(0x020408, 1)
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  container.value.appendChild(renderer.domElement)

  raycaster = markRaw(new THREE.Raycaster())
  mouse = markRaw(new THREE.Vector2())

  controls = markRaw(new OrbitControls(camera, renderer.domElement))
  controls.enableRotate = true
  controls.rotateSpeed = 0.4
  controls.enablePan = true
  controls.panSpeed = 0.4
  controls.enableZoom = true
  controls.zoomSpeed = 0.8
  controls.minDistance = 30
  controls.maxDistance = 2000
  controls.maxPolarAngle = Math.PI / 2 * 0.95
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.autoRotate = false
  controls.autoRotateSpeed = 0.5
  controls.target.set(0, 0, 0)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9)
  dirLight.position.set(100, 200, 100)
  scene.add(dirLight)

  // const dirLight2 = new THREE.DirectionalLight(0x88ffcc, 0.3)
  // dirLight2.position.set(-50, 100, -50)
  // scene.add(dirLight2)
  initLight(scene)

  window.addEventListener('resize', onResize)
  renderer.domElement.addEventListener('click', onMouseClick)



  // 1. 初始化 CSS2DRenderer
  labelRenderer = markRaw(new CSS2DRenderer())
  labelRenderer.setSize(container.value.clientWidth, container.value.clientHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.pointerEvents = 'none'; // 让鼠标事件穿透，不影响 Three.js 点击
  labelRenderer.domElement.style.zIndex = 99; // 让鼠标事件穿透，不影响 Three.js 点击
  document.body.appendChild(labelRenderer.domElement);
  animate()

  // Initialize with overview mode
  // switchMode(props.currentMode)
  
  console.log('✅ ThreeScene initialized, mode:', props.currentMode)
  const three = markRaw({
    scene,
    camera,
    renderer,
    controls,
    raycaster,
    mouse
  })
  ThreeEvents.init(three)
  // setThree(three)
  GLOBAL.three = three
  emit('initSuccess', true)
}


// 天空图
function initSky  (scene) {
    // 1. 加载天空盒纹理
  const loader = new THREE.CubeTextureLoader();
  const texture = loader.load([
      './static/img/sky/sky.right.jpg',   // 右侧
      './static/img/sky/sky.left.jpg',    // 左侧
      './static/img/sky/sky.top.jpg',     // 顶部
      './static/img/sky/sky.bottom.jpg',  // 底部
      './static/img/sky/sky.front.jpg',   // 前面
      './static/img/sky/sky.back.jpg'     // 后面
  ]);
  scene.background = texture;
}

// 增加光源
function initLight (scene) {

  // // --- 原有光照 ---
  // const ambientLight = new THREE.AmbientLight(0xffffff, 0.6) // 稍微降低环境光，让方向光更明显
  // scene.add(ambientLight)

  // // --- 新增：四周光源布局 ---
  
  // // 1. 主光源 (模拟太阳，右上方)
  // const mainDirLight = new THREE.DirectionalLight(0xffffff, 1.0)
  // mainDirLight.position.set(100, 200, 100)
  // mainDirLight.castShadow = true // 如果后续需要阴影，可开启
  // scene.add(mainDirLight)

  // // 2. 补光 1 (左侧，平衡右侧阴影)
  // const leftLight = new THREE.DirectionalLight(0xffffff, 0.5)
  // leftLight.position.set(-100, 100, 0)
  // scene.add(leftLight)

  // // 3. 补光 2 (后方，照亮背面)
  // const backLight = new THREE.DirectionalLight(0xffffff, 0.4)
  // backLight.position.set(0, 100, -100)
  // scene.add(backLight)

  // // 4. 顶部柔光 (模拟天光，减少顶部死黑)
  // const topLight = new THREE.DirectionalLight(0xffffff, 0.3)
  // topLight.position.set(0, 300, 0)
  // scene.add(topLight)
    // 1. 环境光：基础保底亮度，提高强度
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7) // 从 0.6 提升到 1.2
  scene.add(ambientLight)

  // 2. 半球光：模拟天空散射光，让背光面不再死黑（非常有效）
  // 参数：天空颜色, 地面颜色, 强度
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7)
  hemiLight.position.set(0, 200, 0)
  scene.add(hemiLight)

  // 3. 主方向光：模拟太阳，大幅增强强度
  const mainDirLight = new THREE.DirectionalLight(0xffffff, 0.7) // 从 1.0 提升到 2.5
  mainDirLight.position.set(100, 200, 100)
  mainDirLight.castShadow = false // 暂时关闭阴影以提升性能且避免阴影过黑
  scene.add(mainDirLight)

  // 4. 补光：照亮侧面和背面
  const leftLight = new THREE.DirectionalLight(0xffffff, 0.7)
  leftLight.position.set(-100, 100, 0)
  scene.add(leftLight)

  const backLight = new THREE.DirectionalLight(0xffffff, 0.7)
  backLight.position.set(0, 100, -100)
  scene.add(backLight)
}


const loader = new GLTFLoader();
// 创建Draco加载器实例
const dracoLoader = new DRACOLoader();
// 设置Draco解码器路径（本地或CDN）
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
// 或者使用本地路径
// dracoLoader.setDecoderPath('./draco/');

// 将Draco加载器添加到GLTF加载器
loader.setDRACOLoader(dracoLoader);
function renderGLB() {
  // 创建 GLTF 加载器

  // 加载 GLB 模型
  loader.load(
    './static/glb/厂房1.glb', // 模型路径

    // 成功回调函数
    function (gltf) {
      // gltf.scene 包含模型的完整场景图
      scene.add(gltf.scene);

      // 可以对模型进行操作
      gltf.scene.scale.set(1, 1, 1);
      gltf.scene.position.set(0, 0, 1000);

    },

    // 加载进度回调（可选）
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },

    // 错误回调（可选）
    function (error) {
      console.error('An error happened:', error);
    }
  );
}


function addBuildingLabel(text, x, y, z) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.fillRect(0, 0, 256, 64)
  ctx.font = 'bold 28px Arial'
  ctx.fillStyle = '#00FF88'
  ctx.textAlign = 'center'
  ctx.fillText(text, 128, 40)

  const texture = new THREE.CanvasTexture(canvas)
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(spriteMat)
  sprite.position.set(x, y + 35, z)
  sprite.scale.set(40, 10, 1)
  scene.add(sprite)
}

function resetCameraOverview() {
  camera.position.set(0, 250, 350)
  controls.target.set(0, 0, 0)
  controls.update()
}

function resetCameraTestfield() {
  camera.position.set(0, 180, 250)
  controls.target.set(0, 0, 0)
  controls.update()
}

function resetCameraWorkshop() {
  camera.position.set(0, 120, 200)
  controls.target.set(0, 0, 0)
  controls.update()
}

function resetCameraWarehouse() {
  camera.position.set(0, 120, 200)
  controls.target.set(0, 0, 0)
  controls.update()
}

function flyToBuilding(mode, buildingId) {
  let targetPos = new THREE.Vector3()
  if (mode === 'workshop') {
    targetPos = buildingId === 1 ? new THREE.Vector3(-30, 12.5, 0) : new THREE.Vector3(30, 11, 0)
  } else if (mode === 'warehouse') {
    targetPos = buildingId === 1 ? new THREE.Vector3(-35, 9, 0) : new THREE.Vector3(35, 9, 0)
  }

  const offset = new THREE.Vector3(0, 60, 120)
  const startPos = camera.position.clone()
  const startTarget = controls.target.clone()
  const endTarget = targetPos.clone()
  const endPos = targetPos.clone().add(offset)

  let t = 0
  const duration = 2000
  const startTime = performance.now()

  function animateFly() {
    t = (performance.now() - startTime) / duration
    if (t >= 1) {
      camera.position.copy(endPos)
      controls.target.copy(endTarget)
      controls.update()
      return
    }

    const ease = 1 - Math.pow(1 - t, 3)
    camera.position.lerpVectors(startPos, endPos, ease)
    controls.target.lerpVectors(startTarget, endTarget, ease)
    controls.update()

    requestAnimationFrame(animateFly)
  }

  animateFly()
}

function onMouseClick(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)

  const mode = props.currentMode
  let targets = []

  if (mode === 'testfield') {
    targets = testfieldObjects.map(o => o.mesh)
  } else if (mode === 'workshop') {
    targets = workshopBuildings
  } else if (mode === 'warehouse') {
    targets = warehouseBuildings
  }

  if (targets.length === 0) return

  const intersects = raycaster.intersectObjects(targets, true)

  if (intersects.length > 0) {
    let obj = intersects[0].object
    while (obj.parent && !obj.userData.type) {
      obj = obj.parent
    }

    const userData = obj.userData

    if (userData.type === 'testfield') {
      emit('popup', {
        show: true,
        name: userData.data.label,
        moisture: userData.data.moisture,
        temp: userData.data.temp,
        ph: userData.data.ph
      })
    } else if (userData.type === 'workshop' || userData.type === 'warehouse') {
      emit('flyToBuilding', { mode: userData.type, buildingId: userData.buildingId })
    }
  }
}

const MAX_RENDER_FPS = 30
const FRAME_INTERVAL = 1000 / MAX_RENDER_FPS
let lastFrameAt = 0

function animate(timestamp = 0) {
  animationId = requestAnimationFrame(animate)
  if (document.hidden || timestamp - lastFrameAt < FRAME_INTERVAL) return
  lastFrameAt = timestamp

  controls.update()

  // Animate particle fence
  if (particleFence && props.currentMode === 'overview') {
    particleAngle += 0.003
    particleFence.rotation.y = particleAngle

    // Pulse opacity
    const pulse = 0.7 + Math.sin(particleAngle * 2) * 0.3
    particleFence.material.opacity = pulse
  }

  TWEEN.update();

  renderer.render(scene, camera)
  labelRenderer.render(scene, camera); 
}

function onResize() {
  if (!container.value) return
  camera.aspect = container.value.clientWidth / container.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  labelRenderer?.setSize(container.value.clientWidth, container.value.clientHeight)
}

function getScene() { return scene }
function getCamera() { return camera }
function getRenderer() { return renderer }
function getControls() { return controls }

watch(() => props.currentMode, (newMode) => {
  if (scene) {
    //switchMode(newMode)
  }
})

defineExpose({
  getScene,
  getCamera,
  getRenderer,
  getControls,
  flyToBuilding,
  // switchMode
})

onMounted(() => {
  initThree()
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  if (renderer?.domElement) {
    renderer.domElement.removeEventListener('click', onMouseClick)
  }
  if (labelRenderer?.domElement?.parentNode) {
    labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement)
  }
  if (controls) controls.dispose()
  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose?.()
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          Object.values(material).forEach((value) => {
            if (value?.isTexture) value.dispose()
          })
          material.dispose?.()
        })
      }
    })
  }
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss?.()
  }

  emit('initSuccess', false)
})
</script>

<style scoped>
.three-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2;
  pointer-events: none;
  background: #020408;
}

.three-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2;
  pointer-events: auto;
  background: #020408;
}

.three-container canvas {
  cursor: grab;
  pointer-events: auto;
}

.three-container canvas:active {
  cursor: grabbing;
}

.gltf-loading {
  position: absolute;

  z-index: 999;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
</style>
