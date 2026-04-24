<template>
  <div class="three-wrapper" ref="wrapperRef">
    <div class="three-container" ref="container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { setSene } from '@/main.js'

const props = defineProps({
  currentMode: {
    type: String,
    default: 'overview'
  }
})

const emit = defineEmits(['popup', 'flyToBuilding', 'initSuccess'])

const wrapperRef = ref(null)
const container = ref(null)

let scene, camera, renderer, controls, animationId
let raycaster, mouse

// Mode-specific objects
let particleFence = null
let testfieldObjects = []
let workshopBuildings = []
let warehouseBuildings = []
let groundMesh = null

// Animation state
let particleAngle = 0

const PARTICLE_COUNT = 800
const PARTICLE_COLOR = 0x00FF88
const FENCE_RADIUS = 120 // ~20亩的围栏半径

// 7个试验田数据
const testfieldData = [
  { id: 1, moisture: 45, temp: 25, ph: 6.8, label: '试验区 1' },
  { id: 2, moisture: 52, temp: 24, ph: 6.5, label: '试验区 2' },
  { id: 3, moisture: 38, temp: 26, ph: 7.2, label: '试验区 3' },
  { id: 4, moisture: 61, temp: 23, ph: 6.3, label: '试验区 4' },
  { id: 5, moisture: 44, temp: 25, ph: 6.9, label: '试验区 5' },
  { id: 6, moisture: 57, temp: 24, ph: 6.6, label: '试验区 6' },
  { id: 7, moisture: 41, temp: 27, ph: 7.0, label: '试验区 7' }
]

async function initThree() {
  scene = new THREE.Scene()
  scene.background = null

  camera = new THREE.PerspectiveCamera(60, container.value.clientWidth / container.value.clientHeight, 0.1, 500000)
  camera.position.set(0, 300, 400)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.value.appendChild(renderer.domElement)

  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  controls = new OrbitControls(camera, renderer.domElement)
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

  const dirLight2 = new THREE.DirectionalLight(0x88ffcc, 0.3)
  dirLight2.position.set(-50, 100, -50)
  scene.add(dirLight2)

  window.addEventListener('resize', onResize)
  renderer.domElement.addEventListener('click', onMouseClick)

  animate()

  // Initialize with overview mode
  switchMode(props.currentMode)
  
  console.log('✅ ThreeScene initialized, mode:', props.currentMode)
  setSene(scene)
  emit('initSuccess', true)
}

function clearAllObjects() {
  if (particleFence) {
    scene.remove(particleFence)
    particleFence.geometry.dispose()
    particleFence.material.dispose()
    particleFence = null
  }

  testfieldObjects.forEach(obj => {
    scene.remove(obj.mesh)
    obj.mesh.geometry.dispose()
    obj.mesh.material.dispose()
  })
  testfieldObjects = []

  workshopBuildings.forEach(obj => {
    scene.remove(obj.mesh)
    obj.mesh.geometry.dispose()
    obj.mesh.material.dispose()
  })
  workshopBuildings = []

  warehouseBuildings.forEach(obj => {
    scene.remove(obj.mesh)
    obj.mesh.geometry.dispose()
    obj.mesh.material.dispose()
  })
  warehouseBuildings = []

  if (groundMesh) {
    scene.remove(groundMesh)
    groundMesh.geometry.dispose()
    groundMesh.material.dispose()
    groundMesh = null
  }
}

function switchMode(mode) {
  clearAllObjects()
  switch (mode) {
    case 'overview':
      createParticleFence()
      resetCameraOverview()
      break
    case 'testfield':
      createTestfield()
      resetCameraTestfield()
      break
    case 'workshop':
      createWorkshop()
      resetCameraWorkshop()
      break
    case 'warehouse':
      createWarehouse()
      resetCameraWarehouse()
      break
  }

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


function createParticleFence() {
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const colors = new Float32Array(PARTICLE_COUNT * 3)

  const color = new THREE.Color(PARTICLE_COLOR)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2
    const radiusVariation = FENCE_RADIUS + (Math.random() - 0.5) * 20
    const height = 20 + Math.random() * 40

    positions[i * 3] = Math.cos(angle) * radiusVariation
    positions[i * 3 + 1] = height
    positions[i * 3 + 2] = Math.sin(angle) * radiusVariation

    const brightness = 0.6 + Math.random() * 0.4
    colors[i * 3] = color.r * brightness
    colors[i * 3 + 1] = color.g * brightness
    colors[i * 3 + 2] = color.b * brightness
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  })

  particleFence = new THREE.Points(geometry, material)
  scene.add(particleFence)

  // Add ground glow ring
  const ringGeo = new THREE.RingGeometry(FENCE_RADIUS - 5, FENCE_RADIUS + 5, 64)
  const ringMat = new THREE.MeshBasicMaterial({
    color: PARTICLE_COLOR,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.5
  scene.add(ring)

  // Add center marker
  const centerGeo = new THREE.CylinderGeometry(5, 5, 1, 32)
  const centerMat = new THREE.MeshBasicMaterial({
    color: PARTICLE_COLOR,
    transparent: true,
    opacity: 0.3
  })
  const centerMarker = new THREE.Mesh(centerGeo, centerMat)
  centerMarker.position.y = 0.5
  scene.add(centerMarker)
}

function createTestfield() {
  // Green ground plane
  const groundGeo = new THREE.PlaneGeometry(400, 400, 20, 20)
  const groundMat = new THREE.MeshLambertMaterial({
    color: 0x1a4d2e,
    transparent: true,
    opacity: 0.95
  })
  groundMesh = new THREE.Mesh(groundGeo, groundMat)
  groundMesh.rotation.x = -Math.PI / 2
  groundMesh.position.y = 0
  scene.add(groundMesh)

  // Add grid lines on ground
  const gridHelper = new THREE.GridHelper(400, 40, 0x00aa44, 0x003322)
  gridHelper.position.y = 0.2
  scene.add(gridHelper)

  // 7 white film boxes scattered across the field
  const filmPositions = [
    { x: -80, z: -60 },
    { x: -30, z: -70 },
    { x: 20, z: -40 },
    { x: -50, z: 10 },
    { x: 10, z: 20 },
    { x: 60, z: -10 },
    { x: 40, z: 60 }
  ]

  filmPositions.forEach((pos, idx) => {
    const data = testfieldData[idx]
    const geo = new THREE.BoxGeometry(16, 0.5, 12)
    const mat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      emissive: 0x004422,
      emissiveIntensity: 0.1
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(pos.x, 0.05, pos.z)
    mesh.userData = {
      type: 'testfield',
      data: data,
      idx: idx
    }
    scene.add(mesh)
    testfieldObjects.push({ mesh, data })

    // Add subtle border glow
    const edgeGeo = new THREE.EdgesGeometry(geo)
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x00FF88, transparent: true, opacity: 0.5 })
    const edges = new THREE.LineSegments(edgeGeo, edgeMat)
    mesh.add(edges)
  })
}

function createWorkshop() {
  // Concrete ground
  const groundGeo = new THREE.PlaneGeometry(300, 300)
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a })
  groundMesh = new THREE.Mesh(groundGeo, groundMat)
  groundMesh.rotation.x = -Math.PI / 2
  scene.add(groundMesh)

  // Grid
  const grid = new THREE.GridHelper(300, 30, 0x555555, 0x333333)
  grid.position.y = 0.1
  scene.add(grid)

  // Building 1
  const b1Geo = new THREE.BoxGeometry(40, 25, 60)
  const b1Mat = new THREE.MeshLambertMaterial({ color: 0xcccccc, transparent: true, opacity: 0.85 })
  const b1 = new THREE.Mesh(b1Geo, b1Mat)
  b1.position.set(-30, 12.5, 0)
  b1.userData = { type: 'workshop', buildingId: 1, name: '烘干车间 A' }
  scene.add(b1)
  workshopBuildings.push(b1)

  const b1Edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(b1Geo),
    new THREE.LineBasicMaterial({ color: 0x00FF88, transparent: true, opacity: 0.4 })
  )
  b1.add(b1Edge)

  // Building 2
  const b2Geo = new THREE.BoxGeometry(35, 22, 55)
  const b2Mat = new THREE.MeshLambertMaterial({ color: 0xdddddd, transparent: true, opacity: 0.85 })
  const b2 = new THREE.Mesh(b2Geo, b2Mat)
  b2.position.set(30, 11, 0)
  b2.userData = { type: 'workshop', buildingId: 2, name: '烘干车间 B' }
  scene.add(b2)
  workshopBuildings.push(b2)

  const b2Edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(b2Geo),
    new THREE.LineBasicMaterial({ color: 0x00FF88, transparent: true, opacity: 0.4 })
  )
  b2.add(b2Edge)

  // Ground labels
  addBuildingLabel('烘干车间 A', -30, 0, 0)
  addBuildingLabel('烘干车间 B', 30, 0, 0)
}

function createWarehouse() {
  // Concrete ground
  const groundGeo = new THREE.PlaneGeometry(300, 300)
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a })
  groundMesh = new THREE.Mesh(groundGeo, groundMat)
  groundMesh.rotation.x = -Math.PI / 2
  scene.add(groundMesh)

  const grid = new THREE.GridHelper(300, 30, 0x555555, 0x333333)
  grid.position.y = 0.1
  scene.add(grid)

  // Warehouse 1
  const w1Geo = new THREE.BoxGeometry(50, 18, 80)
  const w1Mat = new THREE.MeshLambertMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.85 })
  const w1 = new THREE.Mesh(w1Geo, w1Mat)
  w1.position.set(-35, 9, 0)
  w1.userData = { type: 'warehouse', buildingId: 1, name: '仓库 A' }
  scene.add(w1)
  warehouseBuildings.push(w1)

  const w1Edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(w1Geo),
    new THREE.LineBasicMaterial({ color: 0x00FF88, transparent: true, opacity: 0.4 })
  )
  w1.add(w1Edge)

  // Warehouse 2
  const w2Geo = new THREE.BoxGeometry(50, 18, 80)
  const w2Mat = new THREE.MeshLambertMaterial({ color: 0xcccccc, transparent: true, opacity: 0.85 })
  const w2 = new THREE.Mesh(w2Geo, w2Mat)
  w2.position.set(35, 9, 0)
  w2.userData = { type: 'warehouse', buildingId: 2, name: '仓库 B' }
  scene.add(w2)
  warehouseBuildings.push(w2)

  const w2Edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(w2Geo),
    new THREE.LineBasicMaterial({ color: 0x00FF88, transparent: true, opacity: 0.4 })
  )
  w2.add(w2Edge)

  addBuildingLabel('仓库 A', -35, 0, 0)
  addBuildingLabel('仓库 B', 35, 0, 0)
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

function animate() {
  animationId = requestAnimationFrame(animate)

  controls.update()

  // Animate particle fence
  if (particleFence && props.currentMode === 'overview') {
    particleAngle += 0.003
    particleFence.rotation.y = particleAngle

    // Pulse opacity
    const pulse = 0.7 + Math.sin(particleAngle * 2) * 0.3
    particleFence.material.opacity = pulse
  }

  renderer.render(scene, camera)
}

function onResize() {
  if (!container.value) return
  camera.aspect = container.value.clientWidth / container.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
}

function getScene() { return scene }
function getCamera() { return camera }
function getRenderer() { return renderer }
function getControls() { return controls }

watch(() => props.currentMode, (newMode) => {
  if (scene) {
    switchMode(newMode)
  }
})

defineExpose({
  getScene,
  getCamera,
  getRenderer,
  getControls,
  flyToBuilding,
  switchMode
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
  if (controls) controls.dispose()
  if (renderer) renderer.dispose()  

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
  background: transparent;
}

.three-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2;
  pointer-events: auto;
}

.three-container canvas {
  cursor: grab;
  pointer-events: auto;
}

.three-container canvas:active {
  cursor: grabbing;
}
</style>
