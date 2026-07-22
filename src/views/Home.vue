<template>
  <div class="app-container">
    <!-- 顶部栏 -->
    <header class="top-bar">
      <div class="logo">
        <div class="logo-icon">
          <svg viewBox="0 0 100 100" width="36" height="36">
            <circle cx="50" cy="50" r="48" fill="#2ECC71" />
            <path d="M50 20 Q30 40 30 60 Q30 80 50 85 Q70 80 70 60 Q70 40 50 20" fill="none" stroke="#E8F8F0" stroke-width="4" stroke-linecap="round" />
            <line x1="50" y1="30" x2="50" y2="75" stroke="#E8F8F0" stroke-width="3" stroke-linecap="round" />
            <line x1="50" y1="45" x2="38" y2="55" stroke="#E8F8F0" stroke-width="2" stroke-linecap="round" />
            <line x1="50" y1="55" x2="62" y2="50" stroke="#E8F8F0" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
        <a href="https://e6lemviix2yqm.ok.kimi.link/#" target="_blank" class="logo-link">泰兴市根思乡</a>
      </div>
      <div class="top-center">
        <div class="time-display">{{ currentTime }}</div>
        <div class="date-display">
          <div>{{ currentDate }}</div>
          <div class="week">{{ currentWeek }}</div>
        </div>
      </div>
      <div class="top-info">

        <div class="info-pill inspection-pill" :class="{ active: autoInspectionRunning }" @click="toggleAutoInspection">
          <span>{{ autoInspectionRunning ? '⏹ 退出巡检' : '▶ 自动巡检' }}</span>
        </div>
        <div class="info-pill" @click="toggleAllDrawers">
          <span>{{ allDrawersOpen ? '📊 收起数据' : '📊 展开数据' }}</span>
        </div>
        <!-- <div class="info-pill alert-entry" @click="openAlertDetail(defaultAlert)">
          <span class="status-dot red pulse"></span>
          <span>紧急预警：{{ defaultAlert.type }} · 点击查看详情</span>
        </div> -->
        <div class="info-pill camera-entry" @click="openCameraMonitor">
          <span class="status-dot blue"></span>
          <span>📹 视频监控中心</span>
        </div>
        <!-- <div class="info-pill">
          <span class="status-dot"></span>
          <span>系统在线</span>
        </div>
        <div class="info-pill">
          <span>📍</span>
          <span>江苏省泰州市</span>
        </div>
        <div class="info-pill">
          <span>🌤</span>
          <span>晴 26°C</span>
        </div> -->
      </div>
    </header>

    <!-- 主内容区 - 全屏GIS地图 -->
    <main class="main-scene">
      <SceneHeader :mode="currentMode" :location="currentLocation" :coords="currentCoords" />

      <!-- 左侧数据抽屉 -->
      <aside v-if="!isWarehouseMode" class="drawer-panel left-drawer" :class="{ collapsed: !leftDrawerOpen }">
        <Swiper
          v-if="isOverviewMode"
          class="overview-env-swiper"
          :modules="overviewSwiperModules"
          :slides-per-view="1"
          :loop="overviewEnvironmentSlides.length > 1"
          :autoplay="overviewSwiperAutoplay"
          :pagination="{ clickable: true }"
          @slideChange="handleOverviewEnvironmentSlideChange"
        >
          <SwiperSlide v-for="slide in overviewEnvironmentSlides" :key="slide.id">
            <DataPanel :title="`🌡 环境监测 · ${slide.name}`" :data="slide.data" />
          </SwiperSlide>
        </Swiper>
        <DataPanel v-else :title="leftPrimaryPanelTitle" :data="leftPrimaryPanelData" />
        <Swiper
          v-if="isOverviewMode"
          class="overview-panel-swiper"
          :modules="overviewSwiperModules"
          :slides-per-view="1"
          :loop="overviewSoilSlides.length > 1"
          :autoplay="overviewSwiperAutoplay"
          :pagination="{ clickable: true }"
        >
          <SwiperSlide v-for="slide in overviewSoilSlides" :key="slide.id">
            <DataPanel :title="`🌱 土壤监测 · ${slide.name}`" :data="slide.data" />
          </SwiperSlide>
        </Swiper>
        <DataPanel v-else :title="leftSecondaryPanelTitle" :data="leftSecondaryPanelData" />

        <DataPanel v-if="isFarmMode && activeFieldHydraulicData.length" title="💧 水利设备" :data="activeFieldHydraulicData" />
      </aside>

      <!-- 左侧抽屉开关 -->
      <button v-if="!isWarehouseMode" class="drawer-toggle left-toggle" @click="leftDrawerOpen = !leftDrawerOpen">
        <span>{{ leftDrawerOpen ? '◀' : '▶' }}</span>
      </button>

      <!-- 右侧数据抽屉 -->
      <aside v-if="!isWarehouseMode" class="drawer-panel right-drawer" :class="{ collapsed: !rightDrawerOpen }">
        <Swiper
          v-if="isOverviewMode"
          class="overview-panel-swiper"
          :modules="overviewSwiperModules"
          :slides-per-view="1"
          :loop="overviewWeatherSlides.length > 1"
          :autoplay="overviewSwiperAutoplay"
          :pagination="{ clickable: true }"
        >
          <SwiperSlide v-for="slide in overviewWeatherSlides" :key="slide.id">
            <DevicePanel :title="`⚙️ 气象监测 · ${slide.name}`" :devices="slide.data" />
          </SwiperSlide>
        </Swiper>
        <template v-else>
          <DevicePanel v-if="!isDryingTowerMode" :title="rightPrimaryPanelTitle" :devices="rightPrimaryPanelData" />
        </template>

        <DataPanel v-if="isDryingTowerMode && rightSecondaryPanelData.length" :title="rightSecondaryPanelTitle" :data="rightSecondaryPanelData" />
        <Swiper
          v-if="isOverviewMode"
          class="overview-panel-swiper"
          :modules="overviewSwiperModules"
          :slides-per-view="1"
          :loop="overviewPestSlides.length > 1"
          :autoplay="overviewSwiperAutoplay"
          :pagination="{ clickable: true }"
        >
          <SwiperSlide v-for="slide in overviewPestSlides" :key="slide.id">
            <DataPest :title="`📊 虫情监测 · ${slide.name}`" :data="slide.data" />
          </SwiperSlide>
        </Swiper>
        <DataPest v-else-if="isFarmMode || (!isDryingTowerMode && !isWarehouseMode)" title="📊 虫情监测" :data="activeFieldPestData" />

        <Swiper
          v-if="isOverviewMode"
          class="overview-panel-swiper"
          :modules="overviewSwiperModules"
          :slides-per-view="1"
          :loop="overviewVideoSlides.length > 1"
          :autoplay="overviewSwiperAutoplay"
          :pagination="{ clickable: true }"
        >
          <SwiperSlide v-for="slide in overviewVideoSlides" :key="slide.id">
            <DataVideo :title="`🎥 视频监控 · ${slide.name}`" :data="slide.data" />
          </SwiperSlide>
        </Swiper>
        <DataVideo v-else :title="videoPanelTitle" :data="videoPanelData" />
      </aside>

      <!-- 右侧抽屉开关 -->
      <button v-if="!isWarehouseMode" class="drawer-toggle right-toggle" @click="rightDrawerOpen = !rightDrawerOpen">
        <span>{{ rightDrawerOpen ? '▶' : '◀' }}</span>
      </button>

      <div class="scene-viewport" :class="{ 'three-only': showThreeJS }">
        <CesiumMap ref="cesiumMap" @mapClick="handleMapClick" @initSuccess="initCesium" />
        <!-- threejs绘制区域 -->
        <template v-if="showThreeJS ">
          <!-- 总览 -->
          <ThreeScene ref="threeScene" :currentMode="currentMode" @popup="handlePopup" @flyToBuilding="handleFlyToBuilding" @initSuccess="initThreeJS" />
          <template v-if="threejsStatus">

            <template v-if="['Warehouse', 'Warehouse3' ].includes(currentMode)">
              <ThreeWarehouse :data="currentModel" :videos="videoPanelData"></ThreeWarehouse>
            </template>
            <template v-if="['Farm', 'Farm2', 'Farm3'].includes(currentMode)">
              <ThreeFarm :data="currentModel" />
            </template>
            <template v-if="['Workshop', 'Workshop2', 'Workshop3', 'Warehouse2'].includes(currentMode)">
              <ThreeWorkshop :data="currentModel" :videos="videoPanelData" @device-drill="handleDeviceDrill" />
            </template>

          </template>
        </template>

        <BubblePopup v-if="showPopup" :show="showPopup" :data="popupData" :style="popupStyle" @close="showPopup = false" />
      </div>
    </main>

    <!-- cesium绘制区域 -->
    <template v-if="cesiumStatus">
      <Models :current-mode="currentMode" :gltfs="gltfModels" :active-area-id="activeParticleArea" @callback="cesiumClick"></Models>
      <template v-if="currentMode == 'overview'">
        <!-- 总览 -->
        <Main></Main>
      </template>
      <template>
        <!-- 农田 -->
        <Farm></Farm>
      </template>
      <template>
        <!-- 厂房 -->
        <Warehouse></Warehouse>
      </template>
    </template>

    <!-- 底部菜单 -->
    <nav class="bottom-menu" v-if="menus && menus.length">
      <div v-for="menu in menus" :key="menu.id" class="menu-group">
        <!-- 一级菜单按钮 -->
        <button class="menu-btn" :class="{ active: currentMode === menu.id || (activeParentMenu === menu.id && menu.children)  }" @click="switchMode(menu.id, menu)">
          <span class="menu-icon">{{ menu.icon }}</span>
          <span>{{ menu.name }}</span>
        </button>

        <!-- 二级菜单（悬浮时显示在上方） -->
        <div v-if="menu.children" class="submenu top-submenu">
          <button v-for="child in menu.children" :key="child.id" class="submenu-btn" @click="switchMode(child.id, child)">
            <span class="menu-icon">{{ child.icon }}</span>
            <span>{{ child.name }}</span>
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
const router = useRouter();

import DataPanel from '@/components/DataPanel.vue'
import DevicePanel from '@/components/DevicePanel.vue'
import SceneHeader from '@/components/SceneHeader.vue'
import BubblePopup from '@/components/BubblePopup.vue'
import GLOBAL from '@/utils/GLOBAL.js'
import { getOverview, getTestfieldSensors, getDryingSensors, getStorageSensors } from '@/utils/api.js'

const CesiumMap = defineAsyncComponent(() => import('@/components/CesiumMap.vue'))
const DataPest = defineAsyncComponent(() => import('@/components/DataPest.vue'))
const DataVideo = defineAsyncComponent(() => import('@/components/DataVideo.vue'))
const Main = defineAsyncComponent(() => import('@/components/Cesium/Main.vue'))
const Models = defineAsyncComponent(() => import('@/components/Cesium/Models.vue'))
const Farm = defineAsyncComponent(() => import('@/components/Cesium/Farm.vue'))
const Warehouse = defineAsyncComponent(() => import('@/components/Cesium/Warehouse.vue'))
const ThreeScene = defineAsyncComponent(() => import('@/components/ThreeScene.vue'))
const ThreeWarehouse = defineAsyncComponent(() => import('@/components/Threejs/Warehouse.vue'))
const ThreeFarm = defineAsyncComponent(() => import('@/components/Threejs/Farm.vue'))
const ThreeWorkshop = defineAsyncComponent(() => import('@/components/Threejs/Workshop.vue'))

const cesiumMap = ref(null)
const threeScene = ref(null)

const currentMode = ref('overview')
const overviewEnvironmentIndex = ref(0)
const overviewSwiperModules = [Autoplay, Pagination]
const overviewSwiperAutoplay = { delay: 8000, disableOnInteraction: false }
const activeParticleArea = ref('')
const showThreeJS = ref(false)
const autoInspectionRunning = ref(false)
const autoInspectionIndex = ref(0)
const autoInspectionTimer = ref(null)
const autoInspectionOverviewDelay = 2500
const autoInspectionModelDelay = 12000

const showPopup = ref(false)
const popupData = ref({})
const popupStyle = ref({})
const leftDrawerOpen = ref(true)
const rightDrawerOpen = ref(true)
const allDrawersOpen = ref(true)
const gltfModels = ref([
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
        labelPosition: {
          x:120.08935,
          y:32.24715
        },
        lines: [
          120.088662, 32.247261,  // 点1 (经度, 纬度)
          120.088779, 32.246539,  // 点2
          120.090681, 32.246755,  // 点3
          120.090565, 32.247514,  // 点4
          120.088662, 32.247261   // 闭合回点1
        ]
      },
      {
        url: "./static/glb/试验田_1.glb",
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
        labelPosition: {
          x:120.097127,
          y:32.252929
        },
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
        name: "红耕农场",
        id: "Workshop3",
        lon: 120.0172,
        lat: 32.2565,
        height: 0,
        scale: 0.088,
        heading: 87,
        pitch: 0,
        roll: 0,
        labelPosition: {
          x:120.0172,
          y:32.2565
        },
        lines: [
          120.017523, 32.256777,  // 点1 (经度, 纬度)
          120.016665, 32.256261,  // 点2
          120.017207, 32.255734,  // 点3
          120.017947, 32.256303,  // 点4
          120.017523, 32.256777   // 闭合回点1
        ]
      },
      {
        url: "./static/glb/试验田_2.glb",
        label: "红耕农场试验田",
        id: "Farm2",
        lon: 120.0289,
        lat: 32.2574,
        height: 0,
        scale: 1.72,
        heading: 89,
        pitch: 0,
        roll: 0,
        labelPosition: {
          x:120.028316,
          y:32.258015
        },
        lines: [
          120.027347, 32.258261,  // 点1 (经度, 纬度)
          120.029314, 32.259169,  // 点2
          120.029424, 32.257773,  // 点3
          120.027429, 32.256879,  // 点4
          120.027347, 32.258261   // 闭合回点1
        ]
      }
    ])

const activeParentMenu = ref(null)
const currentModel = ref({})
const activeModelDevice = ref(null)

const dashData = ref({})

const alertPanelCollapsed = ref(false)
const isOverviewMode = computed(() => currentMode.value === 'overview')

const defaultAlert = reactive({
  code: 'E-HIGH-TEMP-001',
  type: '烘干塔温度异常',
  level: '严重',
  message: '塔内温度持续高于阈值上限（>72°C），持续时长超过 15 分钟',
  triggeredAt: new Date(Date.now() - 18 * 60 * 1000).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
  durationMin: 18,
  threshold: { min: 45, max: 72, unit: '°C' },
  currentValue: 78.4,
  status: '未处理',
  handler: null
})

const activeAlerts = reactive([
  { ...defaultAlert },
  {
    code: 'W-HUMID-002',
    type: '仓库湿度偏高',
    level: '警告',
    message: '仓库 A 区湿度持续高于 65%，已达 1 小时',
    triggeredAt: new Date(Date.now() - 70 * 60 * 1000).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    durationMin: 70,
    threshold: { min: 40, max: 65, unit: '%' },
    currentValue: 71,
    status: '未处理',
    handler: null
  },
  {
    code: 'I-POWER-003',
    type: '灌溉功率异常',
    level: '提示',
    message: '2 号水泵瞬时功率波动大于正常范围 15%',
    triggeredAt: new Date(Date.now() - 140 * 60 * 1000).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    durationMin: 8,
    threshold: { min: 30, max: 60, unit: 'kW' },
    currentValue: 64.2,
    status: '已解决',
    handler: '王工'
  }
])

const defaultDeviceForAlert = {
  id: 'DEV-20260601-001',
  name: '烘干塔主机',
  model: '5H-30',
  type: 'dryingTower',
  location: '泰兴市根思乡烘干车间',
  lon: 120.089928,
  lat: 32.244513,
  manufacturer: '中储粮精工',
  installedAt: '2024-08-12',
  maintainer: '王工 / 13800000000',
  facilityId: 9
}

function openAlertDetail(alertItem) {
  // 根据报警类型组装设备信息（此处复用示例设备作为演示，真实项目中可由接口返回）
  const device = { ...defaultDeviceForAlert }
  if (alertItem.code?.startsWith('W-HUMID')) {
    Object.assign(device, {
      id: 'DEV-WAREHOUSE-002',
      name: '仓库 A 区',
      model: 'WH-A1',
      type: 'warehouse',
      location: '泰兴市根思乡仓储区'
    })
  } else if (alertItem.code?.startsWith('I-POWER')) {
    Object.assign(device, {
      id: 'DEV-IRRIGATION-003',
      name: '2 号水泵',
      model: 'IRR-P-2',
      type: 'irrigation',
      location: '维明农场试验田东侧'
    })
  }
  const payload = {
    device,
    alert: alertItem,
    history: activeAlerts.slice(0, 8)
  }
  router.push({
    path: '/alert-detail',
    query: { data: encodeURIComponent(JSON.stringify(payload)) }
  });
}

function openCameraMonitor() {
  router.push({ path: '/camera-monitor' });
}

// 旧版简化版跳转已统一为完整版路径，函数保留便于切换
// function openAlertDetailLite(alertItem) { ... }

function toggleAllDrawers() {
  allDrawersOpen.value = !allDrawersOpen.value
  leftDrawerOpen.value = allDrawersOpen.value
  rightDrawerOpen.value = allDrawersOpen.value
}

const currentTime = ref('00:00:00')
const currentDate = ref('2026-06-12')
const currentWeek = ref('星期五')

const menus = reactive([
  {
    "id": "overview",
    "name": "总览",
    "icon": "🌍",
    "position": {
      "lon": "120.07",
      "lat": "32.18"
    },
    "camera": {
      "lon": 120.06647,
      "lat": 32.18264,
      "height": 9700.3,
      "heading": 0,
      "pitch": -50,
      "roll": 0
    }
  },
  {
    "id": "nongtian1",
    "name": "维明农场",
    "icon": "🌱",
    "children": [
      {
        "id": "Farm",
        "name": "试验田",
        "icon": "🌱",
        "facilityId": 1,
        "facilityType": 1,
        "position": {
          "lon": "120.097",
          "lat": "32.250"
        },
        "gltfs": [
          {
            "id": "监控农田",
            "url": "./static/glb/试验田_1.glb",
            "x": 0,
            "y": 0,
            "z": 0,
            "scale": 1
          }
        ],
        "threeCamera": {
          "x": 0,
          "y": 50,
          "z": 18,
          "tx": -11,
          "ty": 1.8,
          "tz": -50
        },
        "waterPump": {
          "url": "./static/glb/水泵.glb",
          "scale": 35,
          "offset": {
            "x": 0,
            "y": 8,
            "z": 0
          }
        },
        "pumpStation": {
          "url": "./static/glb/泵站.glb",
          "scale": 35,
          "offset": {
            "x": 0,
            "y": 8,
            "z": 0
          },
          camera: {
            distance: 550,
          }
        },
        "pestDevice": {
          "url": "./static/glb/虫情测报仪.glb",
          "scale": 35,
          "offset": {
            "x": 0,
            "y": 0,
            "z": 0
          }
        },
        "camera": {
          "lon": 120.09738,
          "lat": 32.24902,
          "height": 422.6,
          "heading": 0,
          "pitch": -50,
          "roll": 0
        }
      },
      {
        "id": "Workshop",
        "name": "烘干车间",
        "icon": "🏭",
        "facilityId": 9,
        "facilityType": 3,
        "position": {
          "lon": "120.089928",
          "lat": "32.244513"
        },
        "gltfs": [
          {
            "id": "changfang1",
            "url": "./static/glb/厂房1.glb",
            "x": 0,
            "y": 0,
            "z": 0,
            "scale": 1
          }
        ],
        "threeCamera": {
          "x": 200,
          "y": 200,
          "z": -300,
          "tx": 200,
          "ty": 0,
          "tz": 0
        },
        "dryingTowerDetail": {
          "url": "./static/glb/烘干塔.glb",
          "scale": 1,
          "offset": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "camera": {
            "distance": 100,
            "direction": { "x": -1, "y": 0.7, "z": -1 }
          }
        },
        "camera": {
          "lon": 120.08971,
          "lat": 32.24951,
          "height": 304,
          "heading": 182,
          "pitch": -46.9,
          "roll": 0
        }
      },
      {
        "id": "Workshop2",
        "name": "仓库",
        "icon": "📦",
        "facilityId": 7,
        "facilityType": 2,
        "position": {
          "lon": "120.089928",
          "lat": "32.244513"
        },
        "gltfs": [
          {
            "id": "仓库",
            "url": "./static/glb/厂房1.glb",
            "x": 0,
            "y": 0,
            "z": 0,
            "scale": 1
          }
        ],
        "threeCamera": {
          x: 458,
          y: 33,
          z: -75,
          tx: 480,
          ty: -29,
          tz: 105
        },
        "camera": {
          "lon": 120.08971,
          "lat": 32.24951,
          "height": 304,
          "heading": 182,
          "pitch": -46.9,
          "roll": 0
        }
      }
    ]
  },
  {
    "id": "nongtian2",
    "name": "红耕农场",
    "icon": "🌱",
    "children": [
      {
        "id": "Farm2",
        "name": "试验田",
        "facilityId": 2,
        "facilityType": 1,
        "icon": "🌱",
        "position": {
          "lon": "120.097",
          "lat": "32.250"
        },
        "gltfs": [
          {
            "id": "试验田2",
            "url": "./static/glb/试验田_2.glb",
            "x": 0,
            "y": 0,
            "z": 0,
            "scale": 1
          }
        ],
        "threeCamera": {
          "x": 4,
          "y": 100,
          "z": 128,
          "tx": 1,
          "ty": 0,
          "tz": 9,
        },
        "waterPump": {
          "url": "./static/glb/水泵.glb",
          "scale": 35,
          "offset": {
            "x": 0,
            "y": 8,
            "z": 0
          }
        },
        "pestDevice": {
          "url": "./static/glb/虫情测报仪.glb",
          "scale": 35,
          "offset": {
            "x": 0,
            "y": 0,
            "z": 0
          }
        },
        "camera": {
            "lon": 120.02816,
            "lat": 32.25275,
            "height": 704.7,
            "heading": 0,
            "pitch": -51,
            "roll": 0
        }
      },
      {
        "id": "Workshop3",
        "facilityId": 10,
        "name": "烘干车间",
        "icon": "🏭",
        "facilityType": 3,
        "position": {
          "lon": "120.089928",
          "lat": "32.244513"
        },
        "gltfs": [
          {
            "id": "changfang3",
            "url": "./static/glb/厂房3-有底图.glb",
            "x": 0,
            "y": 0,
            "z": 0,
            "scale": 1
          }
        ],
        "threeCamera": {

          x:-40.21708620037208,
          y:396.9229629085448,
          z:848.1922030425228,
          tx:192.94146514444802,
          ty:144.58059352091888,
          tz:281.8067008580556
        },
        "dryingTowerDetail": {
          "url": "./static/glb/烘干塔1.glb",
          "scale": 1,
          "offset": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "camera": {
            "distance": 520
          }
        },
        "camera": {
          "lon": 120.01789,
          "lat": 32.25442,
          "height": 101.6,
          "heading": 346.1,
          "pitch": -23,
          "roll": 0
        }
      },
      {
        "id": "Warehouse2",
        "name": "仓库",
        "icon": "📦",
        "facilityId": 6,
        "facilityType": 2,
        "position": {
          "lon": "120.089928",
          "lat": "32.244513"
        },
        "gltfs": [
          {
            "id": "changfang31",
            "url": "./static/glb/厂房3-无底图.glb",
            "x": 0,
            "y": 0,
            "z": 0,
            "scale": 1
          }
        ],
        "threeCamera": {
          x: -163,
          y: 58,
          z: 178,
          tx: -23,
          ty: -5,
          tz: 108
        },
        "camera": {
          "lon": 120.0299,
          "lat": 32.25767,
          "height": 123.8,
          "heading": 182.7,
          "pitch": -28.7,
          "roll": 0
        }
      }
    ]
  }
])
const currentLocation = ref('泰兴市根思乡')
const currentCoords = ref('32.18°N, 120.07°E')

const envData = reactive([
  {
    label: '温度', value: '16.75', unit: '°C', status: '正常', chart: [
      {
        time: '2026-06-07',
        value: 16.15
      },
      {
        time: '2026-06-08',
        value: 16.55
      },
      {
        time: '2026-06-09',
        value: 16.45
      },
      {
        time: '2026-06-10',
        value: 16.5
      },
      {
        time: '2026-06-11',
        value: 16.35
      },
      {
        time: '2026-06-12',
        value: 16.5
      },
    ]
  },
  {
    label: '空气湿度', value: '68', unit: '%', status: '正常', chart:
      [
        {
          time: '2026-06-07',
          value: 55
        },
        {
          time: '2026-06-08',
          value: 60
        },
        {
          time: '2026-06-09',
          value: 58
        },
        {
          time: '2026-06-10',
          value: 65
        },
        {
          time: '2026-06-11',
          value: 70
        },
        {
          time: '2026-06-12',
          value: 68
        },
      ]
  },
  {
    label: '光照强度', value: '83909', unit: 'lux', status: '充足', chart:
      [
        {
          time: '2026-06-07',
          value: 90
        },
        {
          time: '2026-06-08',
          value: 85
        },
        {
          time: '2026-06-09',
          value: 92
        },
        {
          time: '2026-06-10',
          value: 88
        },
        {
          time: '2026-06-11',
          value: 95
        },
        {
          time: '2026-06-12',
          value: 91
        },
      ]
  }
])

const soilData = reactive([
  { label: '土壤 pH 值', value: '6.8', status: '6.8' },
  { label: '氮 N', value: '45', unit: '' },
  { label: '磷 P', value: '32', unit: '' },
  { label: '钾 K', value: '180', unit: '' }
])

const devices = reactive([
  { name: '气压', text: '102.37KPa' },
  { name: '电源', text: '14.2V' },
  { name: '信号强度', text: '31dBm' },
  { name: '风速', text: '0.5m/s' },
  { name: '累计雨量', text: '105.8m' },
  { name: '风向', text: '180°' },
  { name: '总辐射', text: '6.62HW/m2' }
])

const productionData = reactive([
  { label: '土壤温度', value: '10.89', unit: '°C' },
  { label: '土壤湿度', value: '26.57', unit: '%', },
])
const productionData1 = reactive([
  { label: '臭蝽', value: '574', unit: '个', },
  { label: '蝼蛄', value: '105', unit: '个' },
  { label: '金龟子', value: '67', unit: '个' }
])

const fieldPanelData = reactive({
  Farm: {
    name: '维明农场试验田',
    sensors: [
      { label: '空气温度', value: '16.75', unit: '°C', status: '正常' },
      { label: '空气湿度', value: '68', unit: '%', status: '正常' },
      { label: '光照强度', value: '83909', unit: 'lux', status: '充足' },
      { label: 'CO₂浓度', value: '421', unit: 'ppm', status: '正常' }
    ],
    soil: [
      { label: '土壤温度', value: '10.89', unit: '°C', status: '正常' },
      { label: '土壤湿度', value: '26.57', unit: '%', status: '偏低' },
      { label: '土壤 pH', value: '6.8', unit: '', status: '正常' },
      { label: '土壤电导率', value: '0.42', unit: 'mS/cm', status: '正常' }
    ],
    weather: [
      { name: '风速', text: '0.5m/s', status: 'online' },
      { name: '风向', text: '180°', status: 'online' },
      { name: '累计雨量', text: '105.8mm', status: 'online' },
      { name: '气压', text: '102.37KPa', status: 'online' },
      { name: '总辐射', text: '6.62W/m²', status: 'online' }
    ],
    irrigation: [
      { label: '灌溉阀门', value: '1号开启', unit: '', status: '运行中' },
      { label: '瞬时流量', value: '12.4', unit: 'm³/h', status: '正常' },
      { label: '管网压力', value: '0.31', unit: 'MPa', status: '正常' },
      { label: '今日用水', value: '18.6', unit: 'm³', status: '节能' }
    ],
    pests: [
      { label: '稻飞虱', value: 186, unit: '个' },
      { label: '稻纵卷叶螟', value: 48, unit: '个' },
      { label: '二化螟', value: 22, unit: '个' }
    ],
    videos: [
      { name: '田块东侧摄像头', url: 'http://localhost/live/farm1-east.flv' },
      { name: '田块西侧摄像头', url: 'http://localhost/live/farm1-west.flv' },
      { name: '泵站摄像头', url: 'http://localhost/live/farm1-pump.flv' }
    ]
  },
  Farm2: {
    name: '红耕农场试验田',
    sensors: [
      { label: '空气温度', value: '17.20', unit: '°C', status: '正常' },
      { label: '空气湿度', value: '64', unit: '%', status: '正常' },
      { label: '光照强度', value: '81260', unit: 'lux', status: '充足' },
      { label: '叶面湿度', value: '42', unit: '%', status: '正常' }
    ],
    soil: [
      { label: '土壤温度', value: '11.26', unit: '°C', status: '正常' },
      { label: '土壤湿度', value: '31.08', unit: '%', status: '正常' },
      { label: '土壤 pH', value: '6.6', unit: '', status: '正常' },
      { label: '氮磷钾指数', value: '82', unit: '', status: '正常' }
    ],
    weather: [
      { name: '风速', text: '0.8m/s', status: 'online' },
      { name: '风向', text: '165°', status: 'online' },
      { name: '累计雨量', text: '98.2mm', status: 'online' },
      { name: '气压', text: '102.11KPa', status: 'online' },
      { name: '总辐射', text: '6.18W/m²', status: 'online' }
    ],
    irrigation: [
      { label: '灌溉阀门', value: '待机', unit: '', status: '正常' },
      { label: '瞬时流量', value: '0.0', unit: 'm³/h', status: '正常' },
      { label: '管网压力', value: '0.28', unit: 'MPa', status: '正常' },
      { label: '今日用水', value: '9.3', unit: 'm³', status: '节能' }
    ],
    pests: [
      { label: '稻飞虱', value: 142, unit: '个' },
      { label: '稻纵卷叶螟', value: 36, unit: '个' },
      { label: '二化螟', value: 18, unit: '个' }
    ],
    videos: [
      { name: '田块北侧摄像头', url: 'http://localhost/live/farm2-north.flv' },
      { name: '田块南侧摄像头', url: 'http://localhost/live/farm2-south.flv' },
      { name: '灌溉渠摄像头', url: 'http://localhost/live/farm2-irrigation.flv' }
    ]
  },
  Farm3: {
    name: '农场3试验田',
    sensors: [
      { label: '空气温度', value: '16.90', unit: '°C', status: '正常' },
      { label: '空气湿度', value: '66', unit: '%', status: '正常' },
      { label: '光照强度', value: '79840', unit: 'lux', status: '充足' },
      { label: '虫情诱捕状态', value: '在线', unit: '', status: '正常' }
    ],
    soil: [
      { label: '土壤温度', value: '10.74', unit: '°C', status: '正常' },
      { label: '土壤湿度', value: '29.80', unit: '%', status: '正常' },
      { label: '土壤 pH', value: '6.7', unit: '', status: '正常' },
      { label: '盐分', value: '0.18', unit: '%', status: '正常' }
    ],
    weather: [
      { name: '风速', text: '0.6m/s', status: 'online' },
      { name: '风向', text: '172°', status: 'online' },
      { name: '累计雨量', text: '101.5mm', status: 'online' },
      { name: '气压', text: '102.29KPa', status: 'online' },
      { name: '总辐射', text: '6.44W/m²', status: 'online' }
    ],
    irrigation: [
      { label: '灌溉阀门', value: '2号开启', unit: '', status: '运行中' },
      { label: '瞬时流量', value: '10.8', unit: 'm³/h', status: '正常' },
      { label: '管网压力', value: '0.30', unit: 'MPa', status: '正常' },
      { label: '今日用水', value: '16.1', unit: 'm³', status: '节能' }
    ],
    pests: [
      { label: '稻飞虱', value: 168, unit: '个' },
      { label: '稻纵卷叶螟', value: 42, unit: '个' },
      { label: '二化螟', value: 20, unit: '个' }
    ],
    videos: [
      { name: '田块入口摄像头', url: 'http://localhost/live/farm3-entry.flv' },
      { name: '田块中心摄像头', url: 'http://localhost/live/farm3-center.flv' }
    ]
  }
})

const activeFieldMode = computed(() => resolveFarmMode(currentMode.value, currentModel.value))
const isFarmMode = computed(() => currentModel.value.facilityType == 1 || !!activeFieldMode.value)
const activeFieldData = computed(() => fieldPanelData[activeFieldMode.value] || fieldPanelData.Farm)
const activeFieldName = computed(() => activeFieldData.value.name)
const activeFieldPestData = computed(() => activeFieldData.value.pests?.length ? activeFieldData.value.pests : productionData1)
const activeFieldHydraulicData = computed(() => activeFieldData.value.irrigation || [])
const dryingTowerData = reactive({
  name: '烘干塔设备',
  status: '运行中',
  temperature: '58.6°C',
  humidity: '13.2%',
  windTemp: '72.4°C',
  capacity: '8.5t/h',
  grain: '稻谷',
  moistureDrop: '4.8%',
  sensors: [
    { label: '塔内温度', value: '58.6', unit: '°C', status: '正常' },
    { label: '热风温度', value: '72.4', unit: '°C', status: '正常' },
    { label: '出粮水分', value: '13.2', unit: '%', status: '正常' }
  ],
  process: [
    { label: '处理粮种', value: '稻谷', unit: '', status: '运行中' },
    { label: '处理能力', value: '8.5', unit: 't/h', status: '正常' },
    { label: '降水幅度', value: '4.8', unit: '%', status: '正常' },
    { label: '预计完成', value: '42', unit: 'min', status: '正常' }
  ],
  equipment: [
    { name: '提升机', text: '运行中', status: 'online' },
    { name: '循环风机', text: '1450rpm', status: 'online' },
    { name: '燃烧器', text: '稳定', status: 'online' },
    { name: '排粮阀', text: '自动', status: 'online' },
    { name: '除尘风机', text: '运行中', status: 'online' }
  ],
  energy: [
    { label: '瞬时功率', value: '--', unit: 'kW', status: '正常' },
    { label: '今日耗电', value: '318', unit: 'kWh', status: '节能' },
    { label: '管道温度', value: '65', unit: ' °C', status: '正常' },
    { label: '告警数量', value: '0', unit: '条', status: '正常' }
  ],
  videos: [
    { name: '烘干塔顶部', url: 'http://localhost/live/dryer-top.flv' },
    { name: '烘干塔出粮口', url: 'http://localhost/live/dryer-outlet.flv' }
  ]
})
const isDryingTowerMode = computed(() => currentModel.value.facilityType == 3 || activeModelDevice.value?.type === 'dryingTower')
const warehouseData = reactive({
  name: '仓库',
  sensors: [
    { label: '库内温度', value: '18.4', unit: '°C', status: '正常' },
    { label: '库内湿度', value: '56', unit: '%', status: '正常' },
    { label: '粮堆温度', value: '16.9', unit: '°C', status: '正常' },
    { label: '氧气浓度', value: '20.8', unit: '%', status: '正常' }
  ],
  positions: [
    { label: 'A区库位', value: '1-12', unit: '号', status: '正常' },
    { label: 'B区库位', value: '13-24', unit: '号', status: '正常' },
    { label: '当前库容', value: '78', unit: '%', status: '正常' },
    { label: '可用库位', value: '6', unit: '个', status: '正常' }
  ],
  equipment: [
    { name: '通风系统', text: '自动', status: 'online' },
    { name: '除湿设备', text: '待机', status: 'online' },
    { name: '门禁状态', text: '关闭', status: 'online' },
    { name: '消防水压', text: '0.42MPa', status: 'online' },
    { name: '安防巡检', text: '正常', status: 'online' }
  ],
  stock: [
    { label: '库存粮种', value: '稻谷', unit: '', status: '正常' },
    { label: '库存重量', value: '286', unit: 't', status: '正常' },
    { label: '入库批次', value: '8', unit: '批', status: '正常' },
    { label: '异常告警', value: '0', unit: '条', status: '正常' }
  ],
  videos: [
    { name: '仓库入口', url: 'http://localhost/live/warehouse-entry.flv' },
    { name: '仓库A区', url: 'http://localhost/live/warehouse-a.flv' },
    { name: '仓库B区', url: 'http://localhost/live/warehouse-b.flv' }
  ]
})
const isWarehouseMode = computed(() => currentModel.value.facilityType == 2 || isWarehouseModeId(currentMode.value))
const overviewEnvironmentFarms = ['Farm', 'Farm2']
const overviewVideoSlides = computed(() => buildOverviewFarmSlides((farm, farmId, index) => {
  const panelData = dashData.value?.panelData
  const panel = Array.isArray(panelData) ? panelData[index] : null
  const apiVideos = panel
    ? normalizeVideoMonitor(panel.cameras || panel.videos?.cameras || panel.videoMonitorData?.cameras || panel.videoMonitor?.cameras || panel.videoMonitor, '农场摄像头')
    : []

  return apiVideos.length ? apiVideos : (farm?.videos || [])
}))
const overviewVideoPanelData = computed(() => overviewVideoSlides.value.flatMap(slide => slide.data.map(item => ({
  ...item,
  name: `${slide.name} · ${item.name || '摄像头'}`
}))))
const overviewEnvironmentSlides = computed(() => overviewEnvironmentFarms.map((farmId, index) => {
  const farm = fieldPanelData[farmId] || fieldPanelData.Farm
  return {
    id: farmId,
    name: farm.name?.replace('试验田', '') || `农场${index + 1}`,
    data: buildOverviewEnvironmentMetrics(farmId, farm)
  }
}))
const overviewSoilSlides = computed(() => buildOverviewFarmSlides(farm => buildFieldSoilOverviewData(farm)))
const overviewWeatherSlides = computed(() => buildOverviewFarmSlides(farm => farm.weather || []))
const overviewPestSlides = computed(() => buildOverviewFarmSlides(farm => farm.pests?.length ? farm.pests : productionData1))
const activeOverviewEnvironmentSlide = computed(() => {
  const slides = overviewEnvironmentSlides.value
  return slides[overviewEnvironmentIndex.value % slides.length] || slides[0]
})
const currentEnvironmentPanelName = computed(() => {
  if (isFarmMode.value) return activeFieldName.value?.replace('试验田', '') || ''
  return activeOverviewEnvironmentSlide.value?.name || ''
})
const currentEnvironmentPanelData = computed(() => {
  if (isFarmMode.value) return buildOverviewEnvironmentMetrics(activeFieldMode.value, activeFieldData.value)
  return activeOverviewEnvironmentSlide.value?.data || envData
})
const leftPrimaryPanelTitle = computed(() => isDryingTowerMode.value ? '🌾 烘干工艺数据' : (isWarehouseMode.value ? '📡 仓库传感器' : `🌡 环境监测 · ${currentEnvironmentPanelName.value}`))
const leftPrimaryPanelData = computed(() => isDryingTowerMode.value ? dryingTowerData.process : (isWarehouseMode.value ? warehouseData.sensors : currentEnvironmentPanelData.value))
const leftSecondaryPanelTitle = computed(() => isDryingTowerMode.value ? '🌡 烘干塔传感器' : (isWarehouseMode.value ? '📍 库位与位置' : '🌱 土壤监测'))
const leftSecondaryPanelData = computed(() => isDryingTowerMode.value ? dryingTowerData.sensors : (isWarehouseMode.value ? warehouseData.positions : (isFarmMode.value ? buildFieldSoilOverviewData(activeFieldData.value) : soilData)))
const rightPrimaryPanelTitle = computed(() => isDryingTowerMode.value ? '⚙️ 烘干塔设备' : (isWarehouseMode.value ? '⚙️ 仓库设备' : '⚙️ 气象监测'))
const rightPrimaryPanelData = computed(() => isDryingTowerMode.value ? dryingTowerData.equipment : (isWarehouseMode.value ? warehouseData.equipment : (isFarmMode.value ? activeFieldData.value.weather : devices)))
const rightSecondaryPanelTitle = computed(() => isDryingTowerMode.value ? '⚡ 能耗与告警' : (isWarehouseMode.value ? '📦 库存状态' : '📊 墒情数据'))
const rightSecondaryPanelData = computed(() => isDryingTowerMode.value ? dryingTowerData.energy : (isWarehouseMode.value ? warehouseData.stock : (isFarmMode.value ? buildFieldMoistureOverviewData(activeFieldData.value) : productionData)))
const videoPanelTitle = computed(() => isDryingTowerMode.value ? '🎥 烘干塔视频' : (isWarehouseMode.value ? '🎥 仓库视频' : (isFarmMode.value ? '🎥 地块视频' : '📊 视频监控')))
const videoPanelData = computed(() => isDryingTowerMode.value ? dryingTowerData.videos : (isWarehouseMode.value ? warehouseData.videos : (isFarmMode.value ? activeFieldData.value.videos : overviewVideoPanelData.value)))
const modelDataTitle = computed(() => isDryingTowerMode.value ? dryingTowerData.name : (isWarehouseMode.value ? warehouseData.name : (activeModelDevice.value?.name || currentModel.value?.name || activeFieldName.value || '当前模型')))
const modelDataSubtitle = computed(() => {
  if (activeModelDevice.value) return activeModelDevice.value.subtitle || '设备下钻视图'
  const position = currentModel.value?.position
  if (!position?.lon || !position?.lat) return '独立模型场景'
  return `${position.lon}°E, ${position.lat}°N`
})
const modelDataItems = computed(() => {
  if (isDryingTowerMode.value) {
    return [
      { label: '运行状态', value: dryingTowerData.status },
      { label: '塔内温度', value: dryingTowerData.temperature },
      { label: '出粮水分', value: dryingTowerData.humidity },
      { label: '热风温度', value: dryingTowerData.windTemp }
    ]
  }
  if (isFarmMode.value) {
    return [
      { label: '传感器', value: `${activeFieldData.value.sensors.length}项` },
      { label: '土壤湿度', value: `${activeFieldData.value.soil[1]?.value}${activeFieldData.value.soil[1]?.unit || ''}` },
      { label: '灌溉状态', value: activeFieldData.value.irrigation[0]?.value || '正常' },
      { label: '视频点位', value: `${activeFieldData.value.videos.length}路` }
    ]
  }
  if (isWarehouseMode.value) {
    return [
      { label: '库内温度', value: `${warehouseData.sensors[0].value}${warehouseData.sensors[0].unit}` },
      { label: '当前库容', value: `${warehouseData.positions[2].value}${warehouseData.positions[2].unit}` },
      { label: '库存重量', value: `${warehouseData.stock[1].value}${warehouseData.stock[1].unit}` },
      { label: '可用库位', value: `${warehouseData.positions[3].value}${warehouseData.positions[3].unit}` }
    ]
  }
  if (['Workshop', 'Workshop2', 'Workshop3'].includes(currentMode.value)) {
    return [
      { label: '模型类型', value: currentModel.value?.name || '烘干车间' },
      { label: '运行状态', value: '在线' },
      { label: '监测项', value: `${rightPrimaryPanelData.value.length}项` },
      { label: '视角模式', value: '独立展示' }
    ]
  }
  if (['Warehouse', 'Warehouse2', 'Warehouse3'].includes(currentMode.value)) {
    return [
      { label: '模型类型', value: currentModel.value?.name || '仓库' },
      { label: '库存状态', value: '正常' },
      { label: '监测项', value: `${rightPrimaryPanelData.value.length}项` },
      { label: '视角模式', value: '独立展示' }
    ]
  }
  return [
    { label: '模型', value: currentModel.value?.name || '当前模型' },
    { label: '状态', value: '在线' },
    { label: '场景', value: '黑底独立' },
    { label: '数据', value: '实时' }
  ]
})

function switchMode(mode, obj) {
  if (obj.children && obj.children.length) {
    const defaultChild = obj.children.find(child => child.facilityType == 1 || isFarmModeId(child.id)) || obj.children[0]
    if (defaultChild) {
      activeParentMenu.value = obj.id
      switchMode(defaultChild.id, defaultChild)
    }
    return
  }

  flyToMenuCamera(obj)
  currentMode.value = mode
  activeParticleArea.value = mode === 'overview' ? '' : mode
  showPopup.value = false
  activeModelDevice.value = null
  if (['Farm', 'Farm2', 'Farm3', 'Workshop', 'Workshop3', 'Workshop2', 'Warehouse', 'Warehouse2', 'Warehouse3'].includes(mode)) {
    leftDrawerOpen.value = true
    rightDrawerOpen.value = true
    allDrawersOpen.value = true
  }

  currentModel.value = obj

  startActiveMenuDataPolling(mode, obj)

  if (obj.facilityType == 3) {
    getDryingOverview(obj?.facilityId)
  } else if (obj.facilityType == 2) {
    getStorageOverview(obj?.facilityId)
  }


  // 找到父级菜单
  const parent = menus.find(menu =>
    menu.children?.some(child => child.id === mode)
  )
  activeParentMenu.value = parent ? parent.id : null


  // const locations = {
  //   overview: { loc: '根思乡', coords: '32.18°N, 120.07°E' },
  //   testfield: { loc: '泰兴市新街镇试验田', coords: '32.250635, 120.097553°E' },
  //   workshop: { loc: '根蔡线附近', coords: '32.244513°N, 120.089928°E' },
  //   warehouse: { loc: '根蔡线附近', coords: '32.244513°N, 120.089928°E' }
  // }

  // 总览模式默认隐藏3D模型，其他模式显示
  showThreeJS.value = mode !== 'overview'

  if (obj) {
    currentLocation.value = obj.name
    currentCoords.value = `${obj.position?.lon}°E, ${obj.position?.lat}°N`
  }


}

function flyToMenuCamera(menu) {
  if (!menu?.camera || !GLOBAL.viewer) return

  const camera = menu.camera
  GLOBAL.viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(camera.lon, camera.lat, camera.height),
    orientation: {
      heading: Cesium.Math.toRadians(camera.heading),
      pitch: Cesium.Math.toRadians(camera.pitch),
      roll: camera.roll
    },
    duration: 2
  })
}

function toggleAutoInspection() {
  if (autoInspectionRunning.value) {
    stopAutoInspection()
    return
  }

  startAutoInspection()
}

function startAutoInspection() {
  const targets = getAutoInspectionTargets()
  if (!targets.length) return

  clearAutoInspectionTimer()
  autoInspectionRunning.value = true
  autoInspectionIndex.value = 0
  runAutoInspectionOverview()
}

function stopAutoInspection() {
  clearAutoInspectionTimer()
  autoInspectionRunning.value = false
  const overview = getMenuObjById('overview')
  if (overview) {
    switchMode('overview', overview)
  }
}

function clearAutoInspectionTimer() {
  if (autoInspectionTimer.value) {
    clearTimeout(autoInspectionTimer.value)
    autoInspectionTimer.value = null
  }
}

function setAutoInspectionTimer(callback, delay) {
  clearAutoInspectionTimer()
  autoInspectionTimer.value = setTimeout(callback, delay)
}

function runAutoInspectionOverview() {
  if (!autoInspectionRunning.value) return

  const targets = getAutoInspectionTargets()
  if (!targets.length || autoInspectionIndex.value >= targets.length) {
    stopAutoInspection()
    return
  }

  const overview = getMenuObjById('overview')
  if (overview) {
    switchMode('overview', overview)
  }

  setAutoInspectionTimer(runAutoInspectionTarget, autoInspectionOverviewDelay)
}

function runAutoInspectionTarget() {
  if (!autoInspectionRunning.value) return

  const targets = getAutoInspectionTargets()
  if (!targets.length || autoInspectionIndex.value >= targets.length) {
    stopAutoInspection()
    return
  }

  const target = targets[autoInspectionIndex.value]
  switchMode(target.id, target)
  autoInspectionIndex.value += 1
  setAutoInspectionTimer(runAutoInspectionOverview, autoInspectionModelDelay)
}

function getAutoInspectionTargets() {
  return menus.flatMap(menu => {
    if (Array.isArray(menu.children) && menu.children.length) {
      return menu.children.filter(isAutoInspectionTarget)
    }
    return isAutoInspectionTarget(menu) ? [menu] : []
  })
}

function isAutoInspectionTarget(menu) {
  return menu?.id && menu.id !== 'overview' && !menu.children?.length
}

function isFarmModeId(mode) {
  return ['Farm', 'Farm2', 'Farm3'].includes(mode)
}

function resolveFarmMode(mode, menu = {}) {
  if (isFarmModeId(mode)) return mode

  const map = {
    nongtian1: 'Farm',
    nongtian2: 'Farm2',
    nongtian3: 'Farm3'
  }
  if (map[mode]) return map[mode]

  const farmChild = menu?.children?.find(child => child?.facilityType == 1 || isFarmModeId(child?.id))
  if (farmChild?.id) return farmChild.id

  if (menu?.facilityType == 1) return mode
  if (menu?.name?.includes('维明')) return 'Farm'
  if (menu?.name?.includes('红耕')) return 'Farm2'
  return ''
}

function isDryingTowerModeId(mode) {
  return ['Workshop', 'Workshop3'].includes(mode)
}

function isWarehouseModeId(mode) {
  return ['Workshop2', 'Warehouse', 'Warehouse2', 'Warehouse3'].includes(mode)
}

function handleDeviceDrill(device) {
  activeModelDevice.value = device
  if (device?.type === 'dryingTower') {
    getDryingOverview(device.facilityId || currentModel.value?.facilityId)
  }
}

function handleMapClick({ lon, lat }) {
  currentCoords.value = `${lon}°E, ${lat}°N`
}

function handlePopup(data) {
  popupData.value = {
    name: data.name,
    moisture: data.moisture,
    temp: data.temp,
    ph: data.ph
  }
  showPopup.value = true

  // Position popup in center-top area of viewport
  popupStyle.value = {
    position: 'absolute',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 200
  }
}

function handleFlyToBuilding({ mode, buildingId }) {
  if (threeScene.value) {
    threeScene.value.flyToBuilding(mode, buildingId)
  }

  // Also fly Cesium camera
  if (cesiumMap.value) {
    cesiumMap.value.flyTo(mode)
  }
}

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  currentDate.value = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentWeek.value = weeks[now.getDay()]
}

const DATA_REFRESH_DELAY = 60 * 1000
let timeInterval = null
let dataRefreshInterval = null

onMounted(() => {
  const overview = getMenuObjById('overview')
  startActiveMenuDataPolling('overview', overview)
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
  // Fly to initial location
  // setTimeout(() => {
  //   if (cesiumMap.value) {
  //     cesiumMap.value.flyTo('overview')
  //   }
  // }, 500)


})

const cesiumStatus = ref(false)
const threejsStatus = ref(false)
function initCesium(status) {
  console.log('initCesium, ready to load Cesium')
  cesiumStatus.value = status
}
function initThreeJS(status) {
  console.log('initThreeJS, ready to load Cesium')
  threejsStatus.value = status
}

function handleOverviewEnvironmentSlideChange(swiper) {
  const slideCount = overviewEnvironmentSlides.value.length || 1
  overviewEnvironmentIndex.value = swiper.realIndex % slideCount
}

function cesiumClick(obj) {
  console.log('cesiumClick', obj)
  // 定位
  if (obj.type == 'model_click') {
    const id = obj.id
    activeParticleArea.value = id
    const menu = getMenuObjById(id)
    if (!menu) return
    const { camera } = menu
    if (camera) {
      GLOBAL.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(camera.lon, camera.lat, camera.height),
        orientation: {
          heading: Cesium.Math.toRadians(camera.heading),
          pitch: Cesium.Math.toRadians(camera.pitch),
          roll: camera.roll
        },
        duration: 1
      })
    }
    // switchMode(id, menu)
  }
}

function getMenuObjById(id) {
  for (const menu of menus) {
    // 检查当前层级
    if (menu.id === id) {
      return menu
    }
    // 检查子菜单
    if (menu.children && menu.children.length > 0) {
      const found = menu.children.find(child => child.id === id)
      if (found) {
        return found
      }
    }
  }
  return null
}

// 获取总览数据
function getOverviewData() {
  getOverview().then(res => {
    console.log(res)
    if (res.code == 200 && res.data) {
      bindOverviewData(res.data)
    }
  })
}

function startActiveMenuDataPolling(mode, obj) {
  stopActiveMenuDataPolling()

  const refresh = getActiveMenuRefreshHandler(mode, obj)
  if (!refresh) return

  refresh()
  dataRefreshInterval = setInterval(refresh, DATA_REFRESH_DELAY)
}

function stopActiveMenuDataPolling() {
  if (dataRefreshInterval) {
    clearInterval(dataRefreshInterval)
    dataRefreshInterval = null
  }
}

function getActiveMenuRefreshHandler(mode, obj) {
  if (mode === 'overview') {
    return getOverviewData
  }

  if (obj?.facilityType == 1 || isFarmModeId(mode)) {
    const facilityId = obj?.facilityId
    return () => getTestfieldOverview(facilityId, mode)
  }

  return null
}

function bindOverviewData(data) {
  dashData.value = data

  if (Array.isArray(data.menus)) {
   menus.splice(0, menus.length, ...data.menus)
  }
  gltfModels.value = normalizeGltfModels(Array.isArray(data.gltfs) ? data.gltfs : (data.gltfModels || []))

  const farmPanels = Array.isArray(data.panelData) ? data.panelData : []
  if (farmPanels.length) {
    bindOverviewFarmPanelList(farmPanels)
    const firstFarm = farmPanels[0] || {}
    bindOverviewSummaryPanels(firstFarm)
    return
  }

  const panelData = data.panelData || data
  bindOverviewSummaryPanels(panelData)
}

function normalizeGltfModels(models = []) {
  return models.map(item => ({
    ...item,
    label: item.label || item.name || item.id,
    name: item.name || item.label || item.id
  }))
}

function bindOverviewFarmPanelList(farmPanels = []) {
  farmPanels.forEach((panel, index) => {
    const farmId = resolvePanelFarmId(panel, index)
    const target = fieldPanelData[farmId]
    if (!target) return

    target.name = panel.farmName ? `${panel.farmName}试验田` : target.name
    target.environment = Array.isArray(panel.environment) ? panel.environment : []

    const latestEnvironment = target.environment[target.environment.length - 1] || {}
    const weather = panel.weather || {}
    const soil = panel.soil || {}
    const pestStats = normalizeInsectStatistics(panel.insect?.statistics || [])
    const latestPestRecord = panel.insect?.latestRecord || {}

    target.sensors.splice(0, target.sensors.length, ...[
      overviewMetric('空气温度', latestEnvironment.ambientTemperature ?? latestEnvironment.temperature, '°C'),
      overviewMetric('空气湿度', latestEnvironment.ambientHumidity ?? latestEnvironment.airHumidity, '%'),
      overviewMetric('光照强度', weather.lightIntensity, 'lux', '正常', true),
      overviewMetric('CO₂浓度', weather.co2, 'ppm')
    ].filter(Boolean))

    target.soil.splice(0, target.soil.length, ...[
      overviewMetric('土壤 pH', soil.soilPh ?? soil.ph, ''),
      overviewMetric('土壤温度', soil.soilTemperature ?? latestEnvironment.soilTemperature, '°C'),
      overviewMetric('土壤湿度', soil.soilMoisture ?? latestEnvironment.soilMoisture, '%'),
      overviewMetric('土壤电导率', soil.soilConductivity ?? latestEnvironment.soilConductivity, 'mS/cm')
    ].filter(Boolean))

    target.weather.splice(0, target.weather.length, ...[
      overviewDevice('气压', weather.pressure, 'KPa'),
      overviewDevice('光照', weather.lightIntensity, 'lux', true),
      overviewDevice('风速', weather.windSpeed, 'm/s'),
      overviewDevice('累计雨量', weather.rainfall ?? weather.cumulativeRainfall, 'mm', true),
      overviewDevice('露点温度', weather.dewTemp, '°C'),
      overviewDevice('CO₂', weather.co2, 'ppm')
    ].filter(Boolean))

    const normalizedPests = pestStats.length ? pestStats : normalizeLatestInsectRecord(latestPestRecord)
    if (normalizedPests.length) {
      target.pests.splice(0, target.pests.length, ...normalizedPests)
    }

    const normalizedVideos = normalizeVideoMonitor(panel.cameras || panel.videos?.cameras || panel.videoMonitorData?.cameras || panel.videoMonitor?.cameras || panel.videoMonitor, '农场摄像头')
    if (normalizedVideos.length) {
      target.videos.splice(0, target.videos.length, ...normalizedVideos)
    }
  })
}

function resolvePanelFarmId(panel = {}, index = 0) {
  const name = panel.farmName || panel.name || ''
  if (name.includes('红耕')) return 'Farm2'
  if (name.includes('维明')) return 'Farm'
  return overviewEnvironmentFarms[index] || `Farm${index + 1}`
}

function overviewMetric(label, value, unit = '', status = '正常', allowZero = false) {
  if (!hasOverviewValue(value, allowZero)) return null
  return {
    label,
    value,
    unit,
    status
  }
}

function overviewDevice(name, value, unit = '', allowZero = false) {
  if (!hasOverviewValue(value, allowZero)) return null
  return {
    name,
    text: `${value}${unit}`,
    status: 'online'
  }
}

function hasOverviewValue(value, allowZero = false) {
  if (value === undefined || value === null || value === '' || value === '--') return false
  const num = Number(value)
  if (!Number.isNaN(num) && num === 0) return allowZero
  return true
}

function normalizeLatestInsectRecord(record = {}) {
  if (!record.objectCount) return []
  return [{
    label: record.devName || '虫情数量',
    name: record.devName || '虫情数量',
    value: record.objectCount,
    unit: '个'
  }]
}

function bindOverviewSummaryPanelsFromFarm(farmId = 'Farm') {
  const farm = fieldPanelData[farmId] || fieldPanelData.Farm
  envData.splice(0, envData.length, ...buildOverviewEnvironmentMetrics(farmId, farm))
  soilData.splice(0, soilData.length, ...buildFieldSoilOverviewData(farm))
  devices.splice(0, devices.length, ...(farm.weather || []))
  productionData.splice(0, productionData.length, ...buildFieldMoistureOverviewData(farm))
  productionData1.splice(0, productionData1.length, ...(farm.pests?.length ? farm.pests : productionData1))
}

function bindOverviewSummaryPanels(panelData = {}) {
  if (panelData?.farmName) {
    bindOverviewSummaryPanelsFromFarm(resolvePanelFarmId(panelData, 0))
    return
  }
  const weather = panelData.weather || panelData.latestRecord || {}
  const soil = panelData.soil || {}
  const soilMoisture = panelData.soilMoisture || {}
  const environment = Array.isArray(panelData.environment) ? panelData.environment : []
  const latestEnvironment = environment[environment.length - 1] || {}

  const pick = (raw, fallback) => {
    if (raw === undefined || raw === null || raw === '' || raw === '--') return fallback
    const num = Number(raw)
    if (!isNaN(num) && num === 0) return fallback
    return raw
  }

  soilData.splice(0, soilData.length, ...[
    { label: '土壤 pH 值', value: pick(soil.ph ?? soil.soilPh, 6.8), status: '正常' },
    { label: '氮 N', value: pick(soil.nitrogen, 142), unit: 'mg/kg' },
    { label: '磷 P', value: pick(soil.phosphorus, 36), unit: 'mg/kg' },
    { label: '钾 K', value: pick(soil.potassium, 188), unit: 'mg/kg' }
  ])

  devices.splice(0, devices.length, ...[
    { name: '气压', text: `${pick(weather.pressure, 1013.8)}hPa` },
    { name: '光照', text: `${pick(weather.lightIntensity, 84200)}lux` },
    { name: '风速', text: `${pick(weather.windSpeed, 2.4)}m/s` },
    { name: '累计雨量', text: `${pick(weather.cumulativeRainfall ?? weather.rainfall, 8.6)}mm` },
    { name: '风向', text: `${pick(weather.windDirection, 180)}°` },
    { name: '总辐射', text: `${pick(weather.totalRadiation, 18.4)}W/m²` },
    { name: '光合有效辐射', text: `${pick(weather.photosyntheticRadiation, 1420)}μmol/m²/s` }
  ])

  productionData.splice(0, productionData.length, ...[
    { label: '土壤温度', value: pick(latestEnvironment.temperature, 22.4), unit: '°C' },
    { label: '土壤湿度', value: pick(soilMoisture.soilMoisture, 28.6), unit: '%', status: soilMoisture.status === 'pending' ? '' : '正常' }
  ])

  envData.splice(0, envData.length, ...[
    {
      label: '温度',
      value: pick(latestEnvironment.temperature ?? latestEnvironment.ambientTemperature, 24.6),
      unit: '°C',
      status: '正常',
      chart: buildEnvironmentChart(environment, 'temperature', [23.1, 22.8, 23.6, 24.1, 24.5, 24.6])
    },
    {
      label: '空气湿度',
      value: pick(latestEnvironment.airHumidity ?? latestEnvironment.ambientHumidity, 62),
      unit: '%',
      status: '正常',
      chart: buildEnvironmentChart(environment, 'airHumidity', [68, 65, 63, 66, 64, 62])
    },
    {
      label: '土壤电导率',
      value: pick(latestEnvironment.soilConductivity, 1.42),
      unit: 'mS/cm',
      status: '充足',
      chart: buildEnvironmentChart(environment, 'soilConductivity', [1.28, 1.31, 1.34, 1.38, 1.40, 1.42])
    }
  ])

  const insectStats = normalizeInsectStatistics(panelData.insect?.statistics || [])
  const hasRealInsect = insectStats.some(i => Number(i.value) > 0)
  productionData1.splice(0, productionData1.length, ...hasRealInsect ? insectStats : [
    { label: '稻飞虱', value: 286, unit: '个' },
    { label: '稻纵卷叶螟', value: 94, unit: '个' },
    { label: '二化螟', value: 52, unit: '个' }
  ])
}
// 获取试验田总览数据
function getTestfieldOverview(facilityId, mode = currentMode.value) {
  const params = facilityId ? { facilityId: facilityId } : {}
  getTestfieldSensors(params).then(res => {
    console.log('getTestfieldOverview', res)
    if (res.code == 200 && res.data) {
      bindTestfieldOverview(mode, res.data)
    }
  })
}

function bindTestfieldOverview(mode, data) {
  const payload = data.overview || data.detail || data
  const target = fieldPanelData[mode]
  if (!target) return

  if (Array.isArray(payload.environment) || payload.weather || payload.soil || payload.insectData) {
    bindFlatTestfieldOverview(target, payload)
    return
  }

  const facility = payload.facility || {}
  const baseData = payload.baseData || {}
  const envSensorData = payload.envSensorData || {}
  const soilData = payload.soilData || {}
  const weatherData = payload.weatherData || {}
  const irrigationData = payload.irrigationData || {}
  const videoMonitorData = payload.videoMonitorData || {}
  const realtimeSensor = payload.realtimeSensor || {}
  const soil = payload.soil || {}
  const weather = payload.weather || {}
  const weatherInfo = payload.weatherInfo || {}
  const facilityStatus = payload.facilityStatus || {}
  const irrigationControl = payload.irrigationControl || {}

  target.name = facility.name || payload.name || target.name

  target.sensors.splice(0, target.sensors.length, ...[
    readMetric(envSensorData.airTemperature, '空气温度', '°C', realtimeSensor.airTemperature ?? 25.4),
    readMetric(envSensorData.airHumidity, '空气湿度', '%', realtimeSensor.airHumidity ?? 64),
    readMetric(envSensorData.lightIntensity, '光照强度', 'lux', realtimeSensor.lightIntensity ?? 86400, '充足'),
    readMetric(envSensorData.co2Concentration, 'CO₂浓度', 'ppm', realtimeSensor.co2Concentration ?? 432)
  ])

  target.soil.splice(0, target.soil.length, ...[
    readMetric(soilData.soilTemperature, '土壤温度', '°C', realtimeSensor.soilTemperature ?? soil.temperature ?? 22.6),
    readMetric(soilData.soilMoisture, '土壤湿度', '%', realtimeSensor.soilHumidity ?? soil.moisture ?? stripUnit(baseData.soilMoisture) ?? 30.2),
    readMetric(soilData.phValue, '土壤 pH', '', realtimeSensor.soilPh ?? soil.ph ?? 6.8),
    readMetric(soilData.soilConductivity, '土壤电导率', 'mS/cm', soil.ec ?? 1.38),
    readMetric(soilData.nitrogen, '氮 N', 'mg/kg', soil.nitrogen ?? 152),
    readMetric(soilData.phosphorus, '磷 P', 'mg/kg', soil.phosphorus ?? 38),
    readMetric(soilData.potassium, '钾 K', 'mg/kg', soil.potassium ?? 196)
  ])

  target.weather.splice(0, target.weather.length, ...[
    metricToDevice(weatherData.temperature, '气温', '°C', weather.temperature ?? 24.8),
    metricToDevice(weatherData.humidity, '湿度', '%', weather.humidity ?? 62),
    metricToDevice(weatherData.windSpeed, '风速', 'm/s', weatherInfo.windSpeed ?? weather.windSpeed ?? 2.6),
    { name: '风向', text: `${weatherData.windDirection || weatherInfo.windDirection || weather.windDirection || 168}°`, status: 'online' },
    metricToDevice(weatherData.pressure, '气压', 'hPa', weatherInfo.airPressure ?? weather.pressure ?? 1014.2),
    metricToDevice(weatherData.totalRadiation, '总辐射', 'W/m²', weatherInfo.totalRadiation ?? 19.2)
  ])

  target.irrigation.splice(0, target.irrigation.length, ...[
    { label: '灌溉阀门', value: irrigationData.valveStatus || irrigationControl.valveStatus || facilityStatus.irrigationStatus || baseData.irrigationStatus || '运行中', unit: '', status: '运行中' },
    readMetric(irrigationData.instantFlow, '瞬时流量', 'm³/h', irrigationControl.instantFlow ?? 12.4),
    readMetric(irrigationData.pipePressure, '管网压力', 'MPa', irrigationControl.pipePressure ?? 0.38),
    readMetric(irrigationData.todayWaterUsage, '今日用水', 'm³', irrigationControl.todayWaterConsumption ?? 86.2, '节能'),
    { label: '预警数量', value: irrigationData.alertCount ?? facilityStatus.warningCount ?? '2', unit: '条', status: irrigationData.alertStatus || '正常' }
  ])

  target.videos.splice(0, target.videos.length, ...normalizeVideoMonitor(videoMonitorData.cameras || payload.insectDetection, '试验田摄像头'))
  const fieldInsectStats = normalizeInsectStatistics(payload.insectData?.statistics || [])
  const hasFieldInsect = fieldInsectStats.some(i => Number(i.value) > 0)
  const normalizedPests = hasFieldInsect ? fieldInsectStats : [
    { label: '稻飞虱', value: 186, unit: '个' },
    { label: '稻纵卷叶螟', value: 48, unit: '个' },
    { label: '二化螟', value: 22, unit: '个' }
  ]
  target.pests.splice(0, target.pests.length, ...normalizedPests)
  productionData1.splice(0, productionData1.length, ...normalizedPests)
}

function bindFlatTestfieldOverview(target, payload = {}) {
  const environment = Array.isArray(payload.environment) ? payload.environment : []
  const latestEnvironment = environment[environment.length - 1] || {}
  const soil = payload.soil || {}
  const weather = payload.weather || {}
  const valves = Array.isArray(payload.valves) ? payload.valves : []
  const valve = valves[0] || payload.valve || {}
  const waterMeter = payload.waterMeter || {}

  target.environment = environment

  target.sensors.splice(0, target.sensors.length, ...[
    overviewMetric('空气温度', latestEnvironment.ambientTemperature ?? latestEnvironment.temperature, '°C'),
    overviewMetric('空气湿度', latestEnvironment.ambientHumidity ?? latestEnvironment.airHumidity, '%'),
    overviewMetric('光照强度', weather.lightIntensity, 'lux', '正常', true),
    overviewMetric('CO₂浓度', weather.co2, 'ppm')
  ].filter(Boolean))

  target.soil.splice(0, target.soil.length, ...[
    overviewMetric('土壤 pH', soil.soilPh ?? soil.ph, ''),
    overviewMetric('土壤温度', soil.soilTemperature ?? latestEnvironment.soilTemperature, '°C'),
    overviewMetric('土壤湿度', soil.soilMoisture ?? latestEnvironment.soilMoisture, '%'),
    overviewMetric('土壤电导率', soil.soilConductivity ?? latestEnvironment.soilConductivity, 'mS/cm')
  ].filter(Boolean))

  target.weather.splice(0, target.weather.length, ...[
    overviewDevice('气压', weather.pressure, 'KPa'),
    overviewDevice('光照', weather.lightIntensity, 'lux', true),
    overviewDevice('风速', weather.windSpeed, 'm/s'),
    overviewDevice('累计雨量', weather.rainfall ?? weather.cumulativeRainfall, 'mm', true),
    overviewDevice('露点温度', weather.dewTemp, '°C'),
    overviewDevice('CO₂', weather.co2, 'ppm')
  ].filter(Boolean))

  const hydraulicData = [
    ...normalizeValveMetrics(valves),
    overviewMetric(`${waterMeter.name || '水位计'}水位`, waterMeter.waterLevel, waterMeter.unit || 'cm', normalizeDeviceRunStatus(waterMeter.status), true),
    overviewMetric('有水状态', normalizeHasWater(waterMeter.hasWater), '', normalizeDeviceRunStatus(waterMeter.status)),
    overviewMetric('瞬时流量', waterMeter.instantFlow ?? valve.instantFlow, 'm³/h'),
    overviewMetric('累计用水', waterMeter.totalFlow ?? waterMeter.todayWaterUsage, 'm³'),
    overviewMetric('管网压力', valve.pipePressure ?? waterMeter.pipePressure, 'MPa')
  ].filter(Boolean)

  if (hydraulicData.length) {
    target.irrigation.splice(0, target.irrigation.length, ...hydraulicData)
  }

  const fieldInsectStats = normalizeInsectStatistics(payload.insectData?.statistics || [])
  const normalizedPests = fieldInsectStats.length ? fieldInsectStats : normalizeLatestInsectRecord(payload.insectData?.latestRecord)
  if (normalizedPests.length) {
    target.pests.splice(0, target.pests.length, ...normalizedPests)
    productionData1.splice(0, productionData1.length, ...normalizedPests)
  }
}

function buildEnvironmentChart(environment, key, fallbackValues = []) {
  // 优先使用接口返回的真实数据
  if (Array.isArray(environment) && environment.length > 0) {
    const keyAliases = {
      temperature: ['temperature', 'ambientTemperature'],
      airHumidity: ['airHumidity', 'ambientHumidity', 'humidity'],
      soilConductivity: ['soilConductivity']
    }
    const keys = keyAliases[key] || [key]
    const list = environment.map(item => ({
      time: item.date,
      value: Number(keys.map(k => item[k]).find(value => value !== undefined && value !== null && value !== '') ?? 0)
    }))
    // 如果接口返回的值不全为 0，则用接口数据
    if (list.some(i => i.value > 0)) return list
  }
  // 否则使用 fallbackValues（最后一条作为最新日期 2026-06-12）
  const baseDate = new Date('2026-06-12')
  const len = fallbackValues.length
  return fallbackValues.map((v, idx) => {
    const d = new Date(baseDate.getTime() - (len - 1 - idx) * 24 * 3600 * 1000)
    const pad = n => String(n).padStart(2, '0')
    return {
      time: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      value: v
    }
  })
}

function buildOverviewEnvironmentMetrics(farmId, farm) {
  const temperature = findSensorMetric(farm?.sensors, ['空气温度', '温度'])
  const humidity = findSensorMetric(farm?.sensors, ['空气湿度', '湿度'])
  const environment = Array.isArray(farm?.environment) ? farm.environment : []
  const fallbackCharts = {
    Farm: {
      temperature: [16.15, 16.55, 16.45, 16.5, 16.35, Number(temperature?.value) || 16.75],
      humidity: [55, 60, 58, 65, 70, Number(humidity?.value) || 68]
    },
    Farm2: {
      temperature: [16.6, 16.9, 17.1, 16.85, 17.05, Number(temperature?.value) || 17.2],
      humidity: [61, 63, 62, 65, 66, Number(humidity?.value) || 64]
    }
  }
  const charts = fallbackCharts[farmId] || fallbackCharts.Farm

  return [
    {
      label: '温度',
      value: temperature?.value ?? '16.75',
      unit: temperature?.unit ?? '°C',
      status: temperature?.status || '正常',
      chart: buildEnvironmentChart(environment, 'temperature', charts.temperature)
    },
    {
      label: '湿度',
      value: humidity?.value ?? '68',
      unit: humidity?.unit ?? '%',
      status: humidity?.status || '正常',
      chart: buildEnvironmentChart(environment, 'airHumidity', charts.humidity)
    }
  ]
}

function buildOverviewFarmSlides(buildData) {
  return overviewEnvironmentFarms.map((farmId, index) => {
    const farm = fieldPanelData[farmId] || fieldPanelData.Farm
    return {
      id: farmId,
      name: farm.name?.replace('试验田', '') || `农场${index + 1}`,
      data: buildData(farm, farmId, index)
    }
  })
}

function buildFieldSoilOverviewData(farm) {
  const ph = findSensorMetric(farm?.soil, ['土壤 pH', '土壤 pH 值'])
  const nitrogen = findSensorMetric(farm?.soil, ['氮'])
  const phosphorus = findSensorMetric(farm?.soil, ['磷'])
  const potassium = findSensorMetric(farm?.soil, ['钾'])
  const metrics = [
    ph && { label: '土壤 pH 值', value: ph.value, unit: ph.unit ?? '', status: ph.status || '正常' },
    nitrogen && { label: '氮 N', value: nitrogen.value, unit: nitrogen.unit ?? 'mg/kg', status: nitrogen.status },
    phosphorus && { label: '磷 P', value: phosphorus.value, unit: phosphorus.unit ?? 'mg/kg', status: phosphorus.status },
    potassium && { label: '钾 K', value: potassium.value, unit: potassium.unit ?? 'mg/kg', status: potassium.status }
  ].filter(Boolean)

  if (metrics.length) return metrics

  return [
    { label: '土壤 pH 值', value: '6.8', unit: '', status: '正常' },
    { label: '氮 N', value: '142', unit: 'mg/kg' },
    { label: '磷 P', value: '36', unit: 'mg/kg' },
    { label: '钾 K', value: '188', unit: 'mg/kg' }
  ]
}

function buildFieldMoistureOverviewData(farm) {
  const soilTemperature = findSensorMetric(farm?.soil, ['土壤温度'])
  const soilMoisture = findSensorMetric(farm?.soil, ['土壤湿度'])

  return [
    {
      label: '土壤温度',
      value: pickPanelValue(soilTemperature?.value, '22.4'),
      unit: soilTemperature?.unit ?? '°C',
      status: soilTemperature?.status
    },
    {
      label: '土壤湿度',
      value: pickPanelValue(soilMoisture?.value, '28.6'),
      unit: soilMoisture?.unit ?? '%',
      status: soilMoisture?.status || '正常'
    }
  ]
}

function pickPanelValue(value, fallback) {
  return isMeaningful(value) ? value : fallback
}

function findSensorMetric(sensors = [], labels = []) {
  return sensors.find(item => labels.some(label => item.label?.includes(label)))
}

function normalizeInsectStatistics(statistics = []) {
  return statistics.map(item => ({
    label: item.name || item.label || '未知虫害',
    name: item.name || item.label || '未知虫害',
    value: item.value ?? item.count ?? 0,
    unit: '个'
  }))
}

function normalizeValveMetrics(valves = []) {
  return valves.map((valve, index) => {
    const name = valve.name || valve.deviceName || `水阀${index + 1}`
    return overviewMetric(name, valve.pos ?? valve.opening ?? valve.valveOpening, '%', normalizeDeviceRunStatus(valve.status), true)
  }).filter(Boolean)
}

function normalizeDeviceRunStatus(status) {
  if (status === undefined || status === null || status === '') return '正常'
  const text = String(status)
  if (['1', 'online', 'normal', '正常'].includes(text)) return '正常'
  if (text === '0') return '关闭'
  if (['offline', '离线'].includes(text)) return '离线'
  if (text === '关闭') return '关闭'
  if (['2', 'warning', '告警', '异常'].includes(text)) return '异常'
  return text
}

function normalizeHasWater(hasWater) {
  if (hasWater === undefined || hasWater === null || hasWater === '') return null
  return ['1', 'true', '有水'].includes(String(hasWater)) ? '有水' : '无水'
}

// 判断"是否为有效数值"：非 null/undefined/''/'--'/0
function isMeaningful(v) {
  if (v === undefined || v === null || v === '' || v === '--') return false
  const num = Number(v)
  return !isNaN(num) ? num !== 0 : true
}

function readMetric(metric, label, defaultUnit = '', fallbackValue = undefined, fallbackStatus = '正常') {
  const raw = metric?.value ?? fallbackValue ?? '--'
  return {
    label,
    value: isMeaningful(metric?.value) ? metric.value : (isMeaningful(fallbackValue) ? fallbackValue : (metric?.value ?? '--')),
    unit: metric?.unit ?? defaultUnit,
    status: metric?.status || fallbackStatus
  }
}

function metricToDevice(metric, name, defaultUnit = '', fallbackValue = undefined) {
  const raw = metric?.value ?? fallbackValue ?? '--'
  const v = isMeaningful(metric?.value) ? metric.value : (isMeaningful(fallbackValue) ? fallbackValue : raw)
  return {
    name,
    text: `${v}${metric?.unit ?? defaultUnit}`,
    status: 'online'
  }
}

function normalizePanelData(list) {
  return list.map(item => ({
    label: item.label || item.name || item.sensorName || '',
    value: item.value ?? item.dataValue ?? item.text ?? '',
    unit: item.unit || '',
    status: item.status || '正常',
    chart: item.chart
  }))
}

function normalizeDeviceData(list) {
  return list.map(item => ({
    name: item.name || item.label || item.deviceName || '',
    text: item.text || `${item.value ?? item.dataValue ?? ''}${item.unit || ''}`,
    status: item.status || 'online'
  }))
}

function normalizeVideoMonitor(videoMonitor, prefix) {
  if (!videoMonitor) return []
  if (Array.isArray(videoMonitor)) {
    return videoMonitor.map((item, index) => ({
      name: item.name || item.label || item.cameraName || item.deviceName || `${prefix}${index + 1}`,
      url: item.url || item.streamUrl || item.videoUrl || item.flvUrl || item.https_flv_url || item.http_flv_url || item.httpsFlvUrl || item.httpFlvUrl || '',
      deviceId: item.deviceId || item.id,
      status: item.status,
      stationName: item.stationName || item.station_name,
      templateName: item.templateName || item.template_name
    })).filter(item => item.url)
  }
  return Object.entries(videoMonitor).map(([key, value], index) => ({
    name: `${prefix}${index + 1}`,
    url: value,
    channel: key
  })).filter(item => item.url)
}

function normalizeInsectData(insectData = []) {
  const pestMap = new Map()
  insectData.forEach(item => {
    try {
      const result = JSON.parse(item.detectResult || '{}')
      const pests = Array.isArray(result.pests) ? result.pests : []
      pests.forEach(pest => {
        const name = pest.type || '其他'
        const count = Number(pest.count || 0)
        pestMap.set(name, (pestMap.get(name) || 0) + count)
      })
    } catch (error) {
      if (item.objectCount !== undefined) {
        pestMap.set(item.devName || '虫情数量', (pestMap.get(item.devName || '虫情数量') || 0) + Number(item.objectCount || 0))
      }
    }
  })
  return Array.from(pestMap.entries()).map(([label, value]) => ({
    label,
    name: label,
    value,
    unit: '个'
  }))
}

function pickValue(primary, secondary, keys, fallback = '--') {
  for (const key of keys) {
    const value = primary?.[key] ?? secondary?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return fallback
}

function formatDeviceValue(value, unit) {
  if (value === '--') return value
  const text = String(value)
  return unit && text.includes(unit) ? text : `${text}${unit}`
}
// 获取烘干塔总览数据
function getDryingOverview(facilityId) {
  const params = facilityId ? { facilityId: facilityId } : {}
  getDryingSensors(params).then(res => {
    console.log('getDryingOverview', res)
    if (res.code == 200 && res.data) {
      bindDryingOverview(res.data)
    }
  })
}

function bindDryingOverview(data) {
  const payload = data.overview || data.detail || data
  const facility = payload.facility || {}
  const baseInfo = payload.baseInfo || {}
  const dryingSensor = payload.dryingSensor || {}
  const dryingProcess = payload.dryingProcess || {}
  const dryingEquipment = payload.dryingEquipment || {}
  const energyAlarm = payload.energyAlarm || {}
  const operationStatus = payload.operationStatus || {}
  const realtimeSensor = payload.realtimeSensor || {}
  const processData = payload.processData || {}
  const energyConsumption = payload.energyConsumption || {}
  const deviceStatus = payload.deviceStatus || {}
  const recentBatch = Array.isArray(payload.recentBatches) ? payload.recentBatches[0] || {} : {}

  dryingTowerData.name = facility.name || payload.name || payload.towerName || dryingTowerData.name
  dryingTowerData.status = baseInfo.runStatus || operationStatus.runStatus || dryingProcess.runStatus || '运行中'
  dryingTowerData.temperature = formatDeviceValue(baseInfo.innerTemperature ?? dryingSensor.innerTemperature?.value ?? operationStatus.innerTemperature ?? realtimeSensor.innerTemperature ?? stripUnit(dryingTowerData.temperature) ?? 38.6, '°C')
  dryingTowerData.humidity = formatDeviceValue(baseInfo.outletMoisture ?? dryingSensor.outletMoisture?.value ?? operationStatus.outletMoisture ?? realtimeSensor.outletMoisture ?? recentBatch.currentMoisture ?? stripUnit(dryingTowerData.humidity) ?? 14.2, '%')
  dryingTowerData.windTemp = formatDeviceValue(baseInfo.hotAirTemperature ?? dryingSensor.hotAirTemperature?.value ?? operationStatus.hotAirTemperature ?? realtimeSensor.hotAirTemperature ?? stripUnit(dryingTowerData.windTemp) ?? 86.4, '°C')
  dryingTowerData.capacity = formatDeviceValue(dryingProcess.processingCapacity ?? processData.processingCapacity ?? stripUnit(dryingTowerData.capacity) ?? 12.8, 't/h')
  dryingTowerData.grain = dryingProcess.grainType || processData.grainType || recentBatch.grainType || '水稻'
  dryingTowerData.moistureDrop = formatDeviceValue(dryingProcess.targetMoisture ?? processData.targetMoisture ?? recentBatch.targetMoisture ?? stripUnit(dryingTowerData.moistureDrop) ?? 14.5, '%')

  dryingTowerData.sensors.splice(0, dryingTowerData.sensors.length, ...[
    readMetric(dryingSensor.innerTemperature, '塔内温度', '°C', baseInfo.innerTemperature ?? operationStatus.innerTemperature ?? 36.8),
    readMetric(dryingSensor.hotAirTemperature, '热风温度', '°C', baseInfo.hotAirTemperature ?? operationStatus.hotAirTemperature ?? realtimeSensor.hotAirTemperature ?? 85.2),
    readMetric(dryingSensor.outletMoisture, '出粮水分', '%', baseInfo.outletMoisture ?? operationStatus.outletMoisture ?? realtimeSensor.outletMoisture ?? 14.4),
  ])

  dryingTowerData.process.splice(0, dryingTowerData.process.length, ...[
    { label: '运行状态', value: '未运行' || dryingProcess.runStatus || operationStatus.runStatus || baseInfo.runStatus || '未运行', unit: '', status: dryingProcess.status || '正常' },
    { label: '处理粮种', value: '水稻' || dryingProcess.grainType || processData.grainType || recentBatch.grainType || '水稻', unit: '', status: '未运行' || dryingProcess.runStatus || operationStatus.runStatus || '未运行' },
    { label: '处理能力', value: 400 ??  dryingProcess.processingCapacity ?? processData.processingCapacity ?? 400, unit: 't/批次', status: dryingProcess.status || '正常' },
    { label: '目标水分', value: 20 ?? dryingProcess.targetMoisture ?? processData.targetMoisture ?? recentBatch.targetMoisture ?? 20, unit: '%', status: dryingProcess.status || '正常' },
    { label: '预计烘干时长', value: 20?? dryingProcess.dryingDuration ?? recentBatch.dryingDuration ?? 20, unit: 'h', status: dryingProcess.status || '正常' }
  ])

  dryingTowerData.equipment.splice(0, dryingTowerData.equipment.length, ...[
    { name: '提升机', text: dryingEquipment.elevator?.status || deviceStatus.elevator || '运行', status: 'online' },
    { name: '垂直烘干风机', text: dryingEquipment.verticalDryingFan?.status || deviceStatus.verticalDryingFan || '运行', status: 'online' },
    { name: '循环风机', text: dryingEquipment.circulatingFan?.status || deviceStatus.circulatingFan || '运行', status: 'online' },
    { name: '循环风机转速', text: formatDeviceValue(dryingEquipment.circulatingFan?.speed ?? deviceStatus.circulatingFanSpeed ?? '--', '转/分钟'), status: 'online' },
    { name: '燃烧器', text: dryingEquipment.burner?.status || deviceStatus.burner || '运行', status: 'online' },
    { name: '排风阀', text: dryingEquipment.exhaustValve?.status || deviceStatus.exhaustValve || '关闭', status: 'online' }
  ].filter(item => item.text !== '--转/分钟'))

  dryingTowerData.energy.splice(0, dryingTowerData.energy.length, ...[
    readMetric('--', '瞬时功率', 'kW', energyConsumption.instantPower ?? '--'),
    // readMetric(energyAlarm.instantPower, '瞬时功率', 'kW', energyConsumption.instantPower ?? '--'),
    readMetric('--', '今日耗电', 'kWh', energyConsumption.todayPowerConsumption ?? '--', '正常'),
    // readMetric(energyAlarm.todayPowerConsumption, '今日耗电', 'kWh', energyConsumption.todayPowerConsumption ?? 1286, energyAlarm.todayPowerConsumption?.tag || '节能'),
    // readMetric(energyAlarm.gasFlowRate, '燃气流量', '°C', energyConsumption.gasFlowRate ?? 65),
    readMetric(65, '管道温度', '°C',  65),
    readMetric(energyAlarm.outletGrainCount, '出粮量', 't', energyConsumption.outletGrainCount ?? 38.6)
  ])

  // 视频
  const list= currentMode.value == 'Workshop' ? [
    {
      "id": "camera_dry_001",
      "name": "烘干车间西（球机）",
      "streamUrl": "https://hualin.xyune.com:8443/api/gb/httpflv/live/34020000001310000010.flv?streamtype=1&token=11223344"
    },

    {
      "id": "camera_dry_003",
      "name": "烘干车间东（球机）",
      "streamUrl": "https://hualin.xyune.com:8443/api/gb/httpflv/live/34020000001310000003.flv?streamtype=1&token=11223344"
    }
  ] : [
    {
      "id": "2057757188239130624",
      "name": "烘干车间（球机）",
      "streamUrl": "https://hualin.xyune.com:8443/api/gb/httpflv/live/34020000001310000008.flv?streamtype=1&token=11223344"
    },

  ]
  // dryingTowerData.videos.splice(0, dryingTowerData.videos.length, ...normalizeVideoMonitor(payload.videoMonitor?.cameras || payload.videoMonitor, '烘干塔摄像头'))
  dryingTowerData.videos.splice(0, dryingTowerData.videos.length, ...list)
}

function stripUnit(value) {
  return String(value ?? '').replace(/[^\d.-]/g, '') || '--'
}
// 获取仓库总览数据
function getStorageOverview(facilityId) {
  const params = facilityId ? { facilityId: facilityId } : {}
  getStorageSensors(params).then(res => {
    console.log('getStorageOverview', res)
    if (res.code == 200 && res.data) {
      bindStorageOverview(res.data)
    }
  })
}

function bindStorageOverview(data) {
  const payload = data.overview || data.detail || data
  const facility = payload.facility || {}
  const baseData = payload.baseData || {}
  const storageSensorData = payload.storageSensorData || {}
  const locationData = payload.locationData || {}
  const deviceData = payload.deviceData || {}
  const stockStatusData = payload.stockStatus || {}
  const videoMonitorData = payload.videoMonitorData || {}
  const realtimeSensor = payload.realtimeSensor || {}
  const positionStatus = payload.positionStatus || {}
  const stockStats = payload.stockStats || {}
  const deviceStatus = payload.deviceStatus || {}
  const firstStock = Array.isArray(payload.stockList) ? payload.stockList[0] || {} : {}

  warehouseData.name = facility.name || payload.name || payload.warehouseName || warehouseData.name

  warehouseData.sensors.splice(0, warehouseData.sensors.length, ...[
    readMetric(storageSensorData.innerTemperature, '库内温度', '°C', realtimeSensor.innerTemperature ?? stripUnit(baseData.innerTemperature) ?? 18.6),
    readMetric(storageSensorData.innerHumidity, '库内湿度', '%', realtimeSensor.innerHumidity ?? 58),
    readMetric(storageSensorData.grainTemperature, '粮堆温度', '°C', realtimeSensor.grainTemperature ?? 16.2),
    readMetric(storageSensorData.ammoniaConcentration, '氨气浓度', 'ppm', realtimeSensor.ammoniaConcentration ?? 2.1)
  ])

  warehouseData.positions.splice(0, warehouseData.positions.length, ...[
    readMetric(locationData.currentCapacity, '当前库容', '%', positionStatus.currentCapacity ?? stripUnit(baseData.currentCapacity) ?? 68.4),
    readMetric(locationData.availableCapacity, '可用库容', '%', positionStatus.availableCapacity ?? stripUnit(baseData.availableLocation) ?? 31.6),
    readMetric(locationData.totalStock, '库存总量', 't', stockStats.totalStock ?? stripUnit(baseData.stockWeight) ?? 862),
    readMetric(locationData.stockBatch, '库存批次', '批', stockStats.stockCount ?? 6)
  ])

  warehouseData.equipment.splice(0, warehouseData.equipment.length, ...[
    { name: '通风系统', text: deviceData.ventilation?.status || deviceStatus.ventilation || '运行', status: 'online' },
    { name: '湿度控制', text: deviceData.humidityControl?.status || deviceStatus.humidityControl || '运行', status: (deviceData.humidityControl?.status || deviceStatus.humidityControl) === '停机' ? 'offline' : 'online' },
    { name: '门禁状态', text: deviceData.doorStatus?.status || deviceStatus.doorStatus || '正常', status: 'online' },
    metricToDevice(deviceData.fireWaterPressure, '消防水压', 'MPa', deviceStatus.fireWaterPressure ?? 0.68),
    { name: '安防巡检', text: deviceData.securityInspection?.status || deviceStatus.securityInspection || '正常', status: 'online' }
  ])

  warehouseData.stock.splice(0, warehouseData.stock.length, ...[
    { label: '库存粮种', value: stockStatusData.grainType?.status || firstStock.grainType || '水稻', unit: '', status: '正常' },
    readMetric(stockStatusData.stockWeight, '库存重量', 't', stockStats.totalStock ?? stripUnit(baseData.stockWeight) ?? 862),
    readMetric(stockStatusData.entryBatchCount, '入库批次', '批', stockStats.stockCount ?? 6),
    readMetric(stockStatusData.abnormalAlertCount, '异常告警', '条', stockStats.warningCount ?? 2)
  ])

  warehouseData.videos.splice(0, warehouseData.videos.length, ...normalizeVideoMonitor(videoMonitorData.cameras || payload.videoMonitor, '仓库摄像头'))
}


onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
  stopActiveMenuDataPolling()
  clearAutoInspectionTimer()
})
</script>

<style>
/* 全局样式 - 绿电数字农业平台 清新风格 */
:root {
  --primary-green: #2ecc71;
  --dark-green: #27ae60;
  --light-green: #e8f8f0;
  --accent-orange: #e67e22;
  --accent-red: #e74c3c;
  --bg-light: #f0f4f8;
  --bg-white: #ffffff;
  --text-dark: #2c3e50;
  --text-gray: #7f8c8d;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  --shadow-hover: 0 4px 20px rgba(0, 0, 0, 0.1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, "Microsoft YaHei", "PingFang SC", sans-serif;
  background: #000;
  color: var(--text-dark);
  overflow: hidden;
}

.app-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* 顶部栏 - 半透明悬浮 */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(46, 204, 113, 0.3);
  z-index: 100;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.logo-link {
  font-size: 16px;
  font-weight: 700;
  color: var(--dark-green);
  letter-spacing: 1px;
  text-decoration: none;
}
.logo-link:hover {
  color: var(--primary-green);
}

.top-center {
  display: flex;
  align-items: center;
  gap: 16px;
}
.time-display {
  font-size: 20px;
  font-weight: 700;
  color: var(--dark-green);
  font-family: "Roboto Mono", "Courier New", monospace;
  margin-left: 80px;
}
.date-display {
  font-size: 11px;
  color: var(--text-gray);
}
.week {
  margin-top: 1px;
}

.top-info {
  display: flex;
  gap: 12px;
}
.info-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--light-green);
  border-radius: 14px;
  padding: 5px 10px;
  font-size: 11px;
  color: var(--dark-green);
  cursor: pointer;
}
.inspection-pill {
  border: 1px solid rgba(46, 204, 113, 0.35);
  transition: all 0.25s ease;
}
.inspection-pill:hover {
  background: var(--primary-green);
  color: #fff;
}
.inspection-pill.active {
  background: rgba(231, 76, 60, 0.12);
  border-color: rgba(231, 76, 60, 0.45);
  color: var(--accent-red);
}
.inspection-pill.active:hover {
  background: var(--accent-red);
  color: #fff;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary-green);
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* 主场景 - 全屏地图 */
.main-scene {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
.scene-viewport {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.scene-viewport.three-only {
  background: #020408;
}

.scene-viewport.three-only .cesium-wrapper {
  display: none;
}

.model-data-card {
  position: absolute;
  top: 130px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 70;
  min-width: 340px;
  max-width: 520px;
  padding: 14px 18px;
  color: #eaffff;
  background: rgba(4, 14, 20, 0.78);
  border: 1px solid rgba(64, 240, 180, 0.35);
  box-shadow: 0 0 26px rgba(46, 204, 113, 0.18);
  backdrop-filter: blur(12px);
  border-radius: 8px;
  pointer-events: none;
}

.model-data-title {
  font-size: 18px;
  font-weight: 700;
  color: #69ffc5;
  text-align: center;
}

.model-data-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(234, 255, 255, 0.72);
  text-align: center;
}

.model-data-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  /* margin-top: 12px; */
}

.model-data-item {
  min-width: 0;
  padding: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  text-align: center;
}

.model-data-item span {
  display: block;
  font-size: 11px;
  color: rgba(234, 255, 255, 0.62);
}

.model-data-item strong {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: #ffffff;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 抽屉面板 - 半透明悬浮 */
.drawer-panel {
  position: absolute;
  top: 66px;
  bottom: 70px;
  width: 270px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  z-index: 50;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);

  /* 基础透明度 */
  background-color: rgba(255, 255, 255, 0.1);

  /* 添加毛玻璃效果 */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); /* Safari兼容 */

  /* 边框光晕效果 */
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.1),
    inset 0 0 20px rgba(255, 255, 255, 0.2);

  /* 渐变背景增强晶莹感 */
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
}

.overview-env-swiper,
.overview-panel-swiper {
  width: 100%;
  flex-shrink: 0;
  padding-bottom: 18px;
}

.overview-env-swiper .swiper-slide,
.overview-panel-swiper .swiper-slide {
  height: auto;
}

.overview-env-swiper .swiper-pagination,
.overview-panel-swiper .swiper-pagination {
  bottom: 0;
}

.overview-env-swiper .swiper-pagination-bullet,
.overview-panel-swiper .swiper-pagination-bullet {
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.55);
  opacity: 1;
}

.overview-env-swiper .swiper-pagination-bullet-active,
.overview-panel-swiper .swiper-pagination-bullet-active {
  width: 16px;
  border-radius: 999px;
  background: var(--primary-green);
}

.left-drawer {
  left: 0;
  border-right: 1px solid rgba(46, 204, 113, 0.3);
  border-radius: 0 12px 12px 0;
}

.right-drawer {
  right: 0;
  border-left: 1px solid rgba(46, 204, 113, 0.3);
  border-radius: 12px 0 0 12px;
}

.drawer-panel.collapsed {
  width: 0;
  padding: 0;
  opacity: 0;
  overflow: hidden;
}

/* 抽屉开关按钮 */
.drawer-toggle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 60;
  width: 22px;
  height: 45px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid var(--primary-green);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--primary-green);
  transition: all 0.3s;
}

.drawer-toggle:hover {
  background: var(--primary-green);
  color: white;
}

.left-toggle {
  left: 270px;
  border-left: none;
  border-radius: 0 6px 6px 0;
}

.right-toggle {
  right: 270px;
  border-right: none;
  border-radius: 6px 0 0 6px;
}

/* 抽屉收起时按钮位置跟随 */
.left-drawer.collapsed ~ .left-toggle {
  left: 0;
}

.right-drawer.collapsed ~ .right-toggle {
  right: 0;
}

/* 控制按钮区域 - 半透明悬浮 */
.control-bar {
  position: absolute;
  top: 66px;
  right: 10px;
  z-index: 100;
  display: flex;
  gap: 6px;
  align-items: center;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid var(--primary-green);
  border-radius: 18px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 11px;
  color: var(--dark-green);
  font-weight: 500;
  transition: all 0.3s;
}

.control-btn:hover {
  background: var(--primary-green);
  color: white;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid var(--primary-green);
  border-radius: 18px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.3s;
}
.toggle-label input[type="checkbox"] {
  width: 12px;
  height: 12px;
  accent-color: var(--primary-green);
  cursor: pointer;
}
.toggle-text {
  font-size: 10px;
  color: var(--dark-green);
  white-space: nowrap;
  font-weight: 500;
}

/* 底部菜单 - 半透明悬浮 */
.bottom-menu {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(46, 204, 113, 0.3);
  border-radius: 25px;
  z-index: 100;
}
.menu-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: var(--bg-white);
  border: 1px solid #e8e8e8;
  border-radius: 20px;
  color: var(--text-gray);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}
.menu-btn:hover {
  border-color: var(--primary-green);
  color: var(--primary-green);
  background: var(--light-green);
}
.menu-btn.active {
  border-color: var(--primary-green);
  color: white;
  background: var(--primary-green);
  box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
}
.menu-icon {
  font-size: 14px;
}

.menu-group {
  position: relative;
  display: inline-block;
}

.submenu {
  position: absolute;
  top: 0;
  left: 50%;
  margin-left: -70px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid var(--primary-green);
  border-radius: 12px;
  box-shadow: var(--shadow-hover);
  width: 140px;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  overflow: hidden;
}

/* 关键：使用 :hover 触发显示 */
.menu-group:hover .submenu {
  opacity: 1;
  visibility: visible;
  transform: translateY(-100%);
}

/* 二级菜单内容布局 */
.submenu-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--text-dark);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.submenu-btn:hover {
  background: var(--light-green);
  color: var(--primary-green);
}

/* 紧急预警入口 */
.info-pill.alert-entry {
  background: #fdecea;
  color: #c0392b;
  border: 1px solid #e74c3c;
  font-weight: 600;
  animation: alert-entry-pulse 1.6s ease-in-out infinite;
}
.info-pill.alert-entry:hover {
  background: #e74c3c;
  color: #fff;
}
/* 视频监控中心入口 */
.info-pill.camera-entry {
  background: #e8f4fd;
  color: #2980b9;
  border: 1px solid #3498db;
  font-weight: 600;
}
.info-pill.camera-entry:hover {
  background: #3498db;
  color: #fff;
  box-shadow: 0 2px 10px rgba(52, 152, 219, 0.3);
}
.status-dot.red {
  background: #e74c3c;
}
.status-dot.blue {
  background: #3498db;
  box-shadow: 0 0 6px rgba(52, 152, 219, 0.6);
}
.status-dot.pulse {
  animation: status-dot-blink 1s ease-in-out infinite;
  box-shadow: 0 0 6px rgba(231, 76, 60, 0.6);
}
@keyframes status-dot-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.8); }
}
@keyframes alert-entry-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.45); }
  50%      { box-shadow: 0 0 0 8px rgba(231, 76, 60, 0); }
}

/* 报警浮窗 */
.alert-panel {
  position: absolute;
  right: 14px;
  bottom: 80px;
  width: 320px;
  max-height: 360px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(231, 76, 60, 0.35);
  border-radius: 12px;
  overflow: hidden;
  z-index: 110;
  box-shadow: 0 8px 30px rgba(20, 40, 60, 0.12);
  transition: max-height 0.3s ease;
}
.alert-panel.collapsed {
  max-height: 44px;
}
.alert-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(135deg, #fdecea, #fff0ed);
  color: #c0392b;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.alert-panel-header .toggle {
  font-size: 10px;
  color: #c0392b;
  opacity: 0.8;
}
.alert-panel-body {
  max-height: 420px;
  overflow-y: auto;
  padding: 6px 8px;
}
.alert-panel-body::-webkit-scrollbar { width: 6px; }
.alert-panel-body::-webkit-scrollbar-thumb {
  background: rgba(231, 76, 60, 0.35);
  border-radius: 999px;
}
.alert-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 10px;
  border-radius: 8px;
  margin: 4px 0;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid #bdc3c7;
  background: #fff;
}
.alert-item:hover {
  transform: translateX(-2px);
  background: #f8f9fa;
  box-shadow: -4px 4px 12px rgba(20, 40, 60, 0.08);
}
.alert-item[data-level="严重"] {
  border-left-color: #e74c3c;
  background: #fff5f5;
}
.alert-item[data-level="警告"] {
  border-left-color: #e67e22;
  background: #fff8f0;
}
.alert-item[data-level="提示"] {
  border-left-color: #f1c40f;
  background: #fffef0;
}
.alert-item-left {
  flex: 1;
  min-width: 0;
}
.alert-item-type {
  font-size: 12px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 3px;
}
.alert-item-msg {
  font-size: 11px;
  color: #7f8c8d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.alert-item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  margin-left: 8px;
  flex-shrink: 0;
}
.alert-level {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  color: #fff;
  background: #95a5a6;
  font-weight: 600;
}
.alert-item[data-level="严重"] .alert-level { background: #e74c3c; }
.alert-item[data-level="警告"] .alert-level { background: #e67e22; }
.alert-item[data-level="提示"] .alert-level { background: #f1c40f; color: #5a4a00; }
.alert-time {
  font-size: 10px;
  color: #95a5a6;
  font-family: "Courier New", monospace;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
  transform-origin: top;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scaleY(0.6);
}

.src-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff7e6;
  color: #d48806;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
</style>
