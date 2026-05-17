<template>
  <div>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import { useAppStore } from '@/store/modules/app';
const appStore = useAppStore();

import CesiumMap from './components/CesiumMap.vue'
import ThreeScene from './components/ThreeScene.vue'
import DataPanel from './components/DataPanel.vue'
import DataPest from './components/DataPest.vue'
import DataVideo from './components/DataVideo.vue'
import DevicePanel from './components/DevicePanel.vue'
import SceneHeader from './components/SceneHeader.vue'
import BubblePopup from './components/BubblePopup.vue'
import Main from './components/Cesium/Main.vue'
import Models from './components/Cesium/Models.vue'
import Farm from './components/Cesium/Farm.vue'
import Warehouse from './components/Cesium/Warehouse.vue'
import ThreeWarehouse from './components/Threejs/Warehouse.vue'
import ThreeFarm from './components/Threejs/Farm.vue'
import ThreeWorkshop from './components/Threejs/Workshop.vue'
const instance = getCurrentInstance();
import GLOBAL from '@/utils/GLOBAL.js'
const viewer = GLOBAL.viewer;
// const viewer = instance.appContext.config.globalProperties.$viewer;
const cesiumMap = ref(null)
const threeScene = ref(null)

const currentMode = ref('overview')
const showThreeJS = ref(false)

const showPopup = ref(false)
const popupData = ref({})
const popupStyle = ref({})
const leftDrawerOpen = ref(true)
const rightDrawerOpen = ref(true)
const allDrawersOpen = ref(true)

const activeParentMenu = ref(null)
const currentModel = ref({})

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
      }
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

const currentLocation = ref('泰兴市新街镇叶垛家利')
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

function switchMode(mode, obj) {
  if (obj.children && obj.children.length) {
    return
  }

  currentMode.value = mode
  showPopup.value = false

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
