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

        <div class="info-pill" @click="toggleAllDrawers">
          <span>{{ allDrawersOpen ? '📊 收起数据' : '📊 展开数据' }}</span>
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
      <aside class="drawer-panel left-drawer" :class="{ collapsed: !leftDrawerOpen }">
        <DataPanel :title="leftPrimaryPanelTitle" :data="leftPrimaryPanelData" />
        <DataPanel :title="leftSecondaryPanelTitle" :data="leftSecondaryPanelData" />
      </aside>

      <!-- 左侧抽屉开关 -->
      <button class="drawer-toggle left-toggle" @click="leftDrawerOpen = !leftDrawerOpen">
        <span>{{ leftDrawerOpen ? '◀' : '▶' }}</span>
      </button>

      <!-- 右侧数据抽屉 -->
      <aside class="drawer-panel right-drawer" :class="{ collapsed: !rightDrawerOpen }">
        <DevicePanel :title="rightPrimaryPanelTitle" :devices="rightPrimaryPanelData" />
        <DataPanel :title="rightSecondaryPanelTitle" :data="rightSecondaryPanelData" />
        <DataPest v-if="!isFarmMode && !isDryingTowerMode && !isWarehouseMode" title="📊 虫情监测" :data="productionData1" />
        <DataVideo :title="videoPanelTitle" :data="videoPanelData" />
      </aside>

      <!-- 右侧抽屉开关 -->
      <button class="drawer-toggle right-toggle" @click="rightDrawerOpen = !rightDrawerOpen">
        <span>{{ rightDrawerOpen ? '▶' : '◀' }}</span>
      </button>

      <!-- 控制按钮区域 -->
      <!-- <div class="control-bar">
        <button class="control-btn" @click="toggleAllDrawers">
          <span>{{ allDrawersOpen ? '📊 收起数据' : '📊 展开数据' }}</span>
        </button>
        <label class="toggle-label">
          <input type="checkbox" v-model="showThreeJS" />
          <span class="toggle-text">🌐 3D</span>
        </label>
      </div> -->

      <div class="scene-viewport" :class="{ 'three-only': showThreeJS }">
        <CesiumMap ref="cesiumMap" @mapClick="handleMapClick" @initSuccess="initCesium" />
        <!-- threejs绘制区域 -->
        <template v-if="showThreeJS ">
          <!-- 总览 -->
          <ThreeScene ref="threeScene" :currentMode="currentMode" @popup="handlePopup" @flyToBuilding="handleFlyToBuilding" @initSuccess="initThreeJS" />
          <template v-if="threejsStatus">

            <template v-if="['Warehouse', 'Warehouse2', 'Warehouse3' ].includes(currentMode)">
              <ThreeWarehouse :data="currentModel"></ThreeWarehouse>
            </template>
            <template v-if="['Farm', 'Farm2', 'Farm3'].includes(currentMode)">
              <ThreeFarm :data="currentModel" />
            </template>
            <template v-if="['Workshop', 'Workshop2', 'Workshop3'].includes(currentMode)">
              <ThreeWorkshop :data="currentModel" @device-drill="handleDeviceDrill" />
            </template>

          </template>
          <div class="model-data-card">
            <!-- <div class="model-data-title">{{ modelDataTitle }}</div> -->
            <!-- <div class="model-data-subtitle">{{ modelDataSubtitle }}</div> -->
            <div class="model-data-grid">
              <div v-for="item in modelDataItems" :key="item.label" class="model-data-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>
        </template>

        <BubblePopup v-if="showPopup" :show="showPopup" :data="popupData" :style="popupStyle" @close="showPopup = false" />
      </div>
    </main>

    <!-- cesium绘制区域 -->
    <template v-if="cesiumStatus">
      <Models :current-mode="currentMode" :active-area-id="activeParticleArea" @callback="cesiumClick"></Models>
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
    <nav class="bottom-menu">
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
import { ref, reactive, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import { useAppStore } from '@/store/modules/app';
const appStore = useAppStore();

import CesiumMap from '@/components/CesiumMap.vue'
import ThreeScene from '@/components/ThreeScene.vue'
import DataPanel from '@/components/DataPanel.vue'
import DataPest from '@/components/DataPest.vue'
import DataVideo from '@/components/DataVideo.vue'
import DevicePanel from '@/components/DevicePanel.vue'
import SceneHeader from '@/components/SceneHeader.vue'
import BubblePopup from '@/components/BubblePopup.vue'
import Main from '@/components/Cesium/Main.vue'
import Models from '@/components/Cesium/Models.vue'
import Farm from '@/components/Cesium/Farm.vue'
import Warehouse from '@/components/Cesium/Warehouse.vue'
import ThreeWarehouse from '@/components/Threejs/Warehouse.vue'
import ThreeFarm from '@/components/Threejs/Farm.vue'
import ThreeWorkshop from '@/components/Threejs/Workshop.vue'
const instance = getCurrentInstance();
import GLOBAL from '@/utils/GLOBAL.js'
const viewer = GLOBAL.viewer;
// const viewer = instance.appContext.config.globalProperties.$viewer;
const cesiumMap = ref(null)
const threeScene = ref(null)

const currentMode = ref('overview')
const activeParticleArea = ref('')
const showThreeJS = ref(false)

const showPopup = ref(false)
const popupData = ref({})
const popupStyle = ref({})
const leftDrawerOpen = ref(true)
const rightDrawerOpen = ref(true)
const allDrawersOpen = ref(true)

const activeParentMenu = ref(null)
const currentModel = ref({})
const activeModelDevice = ref(null)

function toggleAllDrawers() {
  allDrawersOpen.value = !allDrawersOpen.value
  leftDrawerOpen.value = allDrawersOpen.value
  rightDrawerOpen.value = allDrawersOpen.value
}

const currentTime = ref('00:00:00')
const currentDate = ref('2026-04-02')
const currentWeek = ref('星期四')

const menus = [
  {
    id: 'overview',
    name: '总览', icon: '🌍',
    position: {
      lon: "120.07",
      lat: "32.18"
    },
    camera: {
      "lon": 120.06647,
      "lat": 32.18264,
      "height": 9700.3,
      "heading": 0,
      "pitch": -50,
      "roll": 0
    }
  },
  {
    id: 'nongtian1', name: '维明农场', icon: '🌱',
    children: [
      {
        id: 'Farm', name: '试验田', icon: '🌱',
        position: {
          lon: "120.097",
          lat: "32.250"
        },
        gltfs: [
          {
            id: "监控农田",
            url: './static/glb/泵站与农田设备(1).glb',
            x: 0,
            y: 0,
            z: 0,
            scale: 1,
          },
        ],
        threeCamera: {
          x: 0,
          y: 50,
          z: 18,
          tx: -11,
          ty: 1.8,
          tz: -50,
        },
        camera: {
          "lon": 120.09738,
          "lat": 32.24902,
          "height": 422.6,
          "heading": 0,
          "pitch": -50,
          "roll": 0
        }
      },
      {
        id: 'Workshop', name: '烘干车间', icon: '🏭',
        position: {
          lon: "120.089928",
          lat: "32.244513"
        },
        gltfs: [{
          id: "changfang1",
          url: './static/glb/厂房1.glb',
          x: 0,
          y: 0,
          z: 0,
          scale: 1
        }],
        threeCamera: {
          x: 200,
          y: 200,
          z: -300,
          tx: 200,
          ty: 0,
          tz: 0,
        },
        camera: {
          "lon": 120.08971,
          "lat": 32.24951,
          "height": 304,
          "heading": 182,
          "pitch": -46.9,
          "roll": 0
        }
      },
      {
        id: 'Workshop2', name: '仓库', icon: '📦',
        position: {
          lon: "120.089928",
          lat: "32.244513"
        },
        gltfs: [{
          id: "仓库",
          url: './static/glb/厂房1.glb',
          x: 0,
          y: 0,
          z: 0,
          scale: 1
        }],
        threeCamera: {
          x: -120,
          y: 112,
          z: -250,
          tx: -5,
          ty: 0,
          tz: 0,
        },
        camera: {
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
    id: 'nongtian2', name: '农场2', icon: '🌱',
    children: [
      {
        id: 'Farm2',
        name: '试验田',
        icon: '🌱',
        position: {
          lon: "120.097",
          lat: "32.250"
        },
        gltfs: [
          {
            id: "试验田2",
            url: './static/glb/农田2.glb',
            x: 0,
            y: 0,
            z: 0,
            scale: 20
          },


        ],
        threeCamera: {
          x: 5,
          y: 150,
          z: -155,
        },
        camera: {
          "lon": 120.04952,
          "lat": 32.26108,
          "height": 793,
          "heading": 0,
          "pitch": -51,
          "roll": 0
        }
      },
      {
        id: 'Workshop3',
        name: '烘干车间',
        icon: '🏭',
        position: {
          lon: "120.089928",
          lat: "32.244513"
        },
        gltfs: [{
          id: "changfang3",
          url: './static/glb/厂房3-有底图.glb',
          x: 0,
          y: 0,
          z: 0,
          scale: 1
        }],
        threeCamera: {
          x: 10,
          y: 550,
          z: 1020,
        },
        camera: {
          "lon": 120.01789,
          "lat": 32.25442,
          "height": 101.6,
          "heading": 346.1,
          "pitch": -23,
          "roll": 0
        },
      },
      {
        id: 'Warehouse2', name: '仓库', icon: '📦',
        position: {
          lon: "120.089928",
          lat: "32.244513"
        },
        gltfs: [{
          id: "仓库2",
          url: './static/glb/厂房2.glb',
          x: 0,
          y: 0,
          z: 0,
          scale: 1
        }],
        threeCamera: {
          x: 61,
          y: 140,
          z: -52,
          tx: 60,
          ty: 21,
          tz: -340
        },
        camera: {
          "lon": 120.0299,
          "lat": 32.25767,
          "height": 123.8,
          "heading": 182.7,
          "pitch": -28.7,
          "roll": 0
        }
      },

    ]
  },
  // {
  //   id: 'nongtian3',
  //   name: '农场3',
  //   icon: '🌱',
  //   children: [
  //     {
  //       id: 'Farm3',
  //       name: '试验田',
  //       icon: '🌱',
  //       position: {
  //         lon: "120.089928",
  //         lat: "32.244513"
  //       },
  //       gltfs: [
  //         {
  //           id: "试验田3",
  //           url: './static/glb/农田3.glb',
  //           x: 0,
  //           y: 0,
  //           z: 0,
  //           scale: 20
  //         },

  //       ],
  //       threeCamera: {
  //         x: 0,
  //         y: 26,
  //         z: -27,
  //       },
  //       camera: {
  //         "lon": 120.04952,
  //         "lat": 32.26108,
  //         "height": 793,
  //         "heading": 0,
  //         "pitch": -51,
  //         "roll": 0
  //       }
  //     },
  //     {
  //       id: 'Workshop3',
  //       name: '烘干车间',
  //       icon: '🏭',
  //       position: {
  //         lon: "120.089928",
  //         lat: "32.244513"
  //       },
  //       gltfs: [{
  //         id: "changfang3",
  //         url: './static/glb/厂房3-有底图.glb',
  //         x: 0,
  //         y: 0,
  //         z: 0,
  //         scale: 1
  //       }],
  //       threeCamera: {
  //         x: 10,
  //         y: 550,
  //         z: 1020,
  //       },
  //       camera: {
  //         "lon": 120.01789,
  //         "lat": 32.25442,
  //         "height": 101.6,
  //         "heading": 346.1,
  //         "pitch": -23,
  //         "roll": 0
  //       },
  //     }
  //     // {
  //     //   id: 'Warehouse3', 
  //     //   name: '仓库3', 
  //     //   icon: '📦',
  //     //   position: {
  //     //     lon: "120.089928",
  //     //     lat: "32.244513"
  //     //   },
  //     //   gltfs:[{
  //     //     id: "仓库3",
  //     //     url: './static/glb/仓库3.glb',
  //     //     x: 0,
  //     //     y: 0,
  //     //     z: 0,
  //     //     scale:1
  //     //   }],
  //     //   threeCamera: {
  //     //     x: -62,
  //     //     y: 50,
  //     //     z: 63,
  //     //   },
  //     //   camera: {
  //     //     "lon": 120.02888,
  //     //     "lat": 32.2571,
  //     //     "height": 100.1,
  //     //     "heading": 155.1,
  //     //     "pitch": -33.1,
  //     //     "roll": 0.1
  //     //   }
  //     // }
  //   ]
  // },
]

const currentLocation = ref('泰兴市根思乡')
const currentCoords = ref('32.18°N, 120.07°E')

const envData = reactive([
  {
    label: '温度', value: '16.75', unit: '°C', status: '正常', chart: [
      {
        time:  '2026-04-30',
        value: 16.15
      },
      {
        time: '2026-05-01',
        value: 16.55
      },
      {
        time: '2026-05-02',
        value: 16.45
      },
      {
        time: '2026-05-03',
        value: 16.5
      },
      {
        time: '2026-05-04',
        value: 16.35
      },
      {
        time: '2026-05-05',
        value: 16.5
      },
    ]
  },
  { label: '空气湿度', value: '68', unit: '%', status: '正常', chart:
   [
      {
        time:  '2026-04-30',
        value:55
      },
      {
        time: '2026-05-01',
        value:60
      },
      {
        time: '2026-05-02',
        value: 58
      },
      {
        time: '2026-05-03',
        value: 65
      },
      {
        time: '2026-05-04',
        value: 70
      },
      {
        time: '2026-05-05',
        value: 68
      },
    ] },
  { label: '光照强度', value: '83909', unit: 'lux', status: '充足', chart: 
   [
      {
        time:  '2026-04-30',
        value:90
      },
      {
        time: '2026-05-01',
        value:85
      },
      {
        time: '2026-05-02',
        value: 92
      },
      {
        time: '2026-05-03',
        value: 88
      },
      {
        time: '2026-05-04',
        value: 95
      },
      {
        time: '2026-05-05',
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

const fieldPanelData = {
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
    videos: [
      { name: '田块东侧摄像头', url: 'http://localhost/live/farm1-east.flv' },
      { name: '田块西侧摄像头', url: 'http://localhost/live/farm1-west.flv' },
      { name: '泵站摄像头', url: 'http://localhost/live/farm1-pump.flv' }
    ]
  },
  Farm2: {
    name: '农场2试验田',
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
    videos: [
      { name: '田块入口摄像头', url: 'http://localhost/live/farm3-entry.flv' },
      { name: '田块中心摄像头', url: 'http://localhost/live/farm3-center.flv' }
    ]
  }
}

const isFarmMode = computed(() => ['Farm', 'Farm2', 'Farm3'].includes(currentMode.value))
const activeFieldData = computed(() => fieldPanelData[currentMode.value] || fieldPanelData.Farm)
const activeFieldName = computed(() => activeFieldData.value.name)
const dryingTowerData = {
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
    { label: '出粮水分', value: '13.2', unit: '%', status: '正常' },
    { label: '粮层厚度', value: '1.8', unit: 'm', status: '正常' }
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
    { label: '瞬时功率', value: '42.6', unit: 'kW', status: '正常' },
    { label: '今日耗电', value: '318', unit: 'kWh', status: '节能' },
    { label: '燃气流量', value: '21.4', unit: 'm³/h', status: '正常' },
    { label: '告警数量', value: '0', unit: '条', status: '正常' }
  ],
  videos: [
    { name: '烘干塔顶部', url: 'http://localhost/live/dryer-top.flv' },
    { name: '烘干塔出粮口', url: 'http://localhost/live/dryer-outlet.flv' }
  ]
}
const isDryingTowerMode = computed(() => ['Workshop', 'Workshop3'].includes(currentMode.value) || activeModelDevice.value?.type === 'dryingTower')
const warehouseData = {
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
}
const isWarehouseMode = computed(() => ['Workshop2', 'Warehouse', 'Warehouse2', 'Warehouse3'].includes(currentMode.value))
const leftPrimaryPanelTitle = computed(() => isDryingTowerMode.value ? '🌡 烘干塔传感器' : (isWarehouseMode.value ? '📡 仓库传感器' : (isFarmMode.value ? `📡 ${activeFieldName.value}传感器` : '🌡 环境监测')))
const leftPrimaryPanelData = computed(() => isDryingTowerMode.value ? dryingTowerData.sensors : (isWarehouseMode.value ? warehouseData.sensors : (isFarmMode.value ? activeFieldData.value.sensors : envData)))
const leftSecondaryPanelTitle = computed(() => isDryingTowerMode.value ? '🌾 烘干工艺数据' : (isWarehouseMode.value ? '📍 库位与位置' : (isFarmMode.value ? '🌱 土壤数据' : '🌱 土壤监测')))
const leftSecondaryPanelData = computed(() => isDryingTowerMode.value ? dryingTowerData.process : (isWarehouseMode.value ? warehouseData.positions : (isFarmMode.value ? activeFieldData.value.soil : soilData)))
const rightPrimaryPanelTitle = computed(() => isDryingTowerMode.value ? '⚙️ 烘干塔设备' : (isWarehouseMode.value ? '⚙️ 仓库设备' : (isFarmMode.value ? '🌤 地块气象' : '⚙️ 气象监测')))
const rightPrimaryPanelData = computed(() => isDryingTowerMode.value ? dryingTowerData.equipment : (isWarehouseMode.value ? warehouseData.equipment : (isFarmMode.value ? activeFieldData.value.weather : devices)))
const rightSecondaryPanelTitle = computed(() => isDryingTowerMode.value ? '⚡ 能耗与告警' : (isWarehouseMode.value ? '📦 库存状态' : (isFarmMode.value ? '💧 灌溉数据' : '📊 墒情数据')))
const rightSecondaryPanelData = computed(() => isDryingTowerMode.value ? dryingTowerData.energy : (isWarehouseMode.value ? warehouseData.stock : (isFarmMode.value ? activeFieldData.value.irrigation : productionData)))
const videoPanelTitle = computed(() => isDryingTowerMode.value ? '🎥 烘干塔视频' : (isWarehouseMode.value ? '🎥 仓库视频' : (isFarmMode.value ? '🎥 地块视频' : '📊 视频监控')))
const videoPanelData = computed(() => isDryingTowerMode.value ? dryingTowerData.videos : (isWarehouseMode.value ? warehouseData.videos : (isFarmMode.value ? activeFieldData.value.videos : [])))
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
    return
  }

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

  // 定位
  if (obj && obj.camera && GLOBAL.viewer) {
    const camera = obj.camera
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

}

function handleDeviceDrill(device) {
  activeModelDevice.value = device
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

let timeInterval = null

onMounted(() => {
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

function cesiumClick(obj) {
  console.log('cesiumClick', obj)
  // 定位
  if (obj.type == 'model_click') {
    const id = obj.id
    activeParticleArea.value = id
    const menu = getMenuObjById(id)
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

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
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
</style>
