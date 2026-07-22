<template>
  <div class="camera-monitor">
    <!-- 顶部标题栏 -->
    <header class="cm-header">
      <div class="cm-title">
        <button class="cm-back-btn" @click="goHome" title="返回首页">
          ← 返回首页
        </button>
        <span class="cm-title-icon">📹</span>
        <span class="cm-title-text">泰兴市根思乡 · 视频监控中心</span>
        <span class="cm-live-dot" title="实时在线">●</span>
        <span class="cm-live-text">LIVE</span>
      </div>
      <div class="cm-info">
        <span class="cm-time">{{ nowText }}</span>
        <span class="cm-sep">|</span>
        <span class="cm-camera-count">在线 {{ onlineCount }} / {{ totalCount }} 路</span>
        <span class="cm-sep">|</span>
        <span class="cm-station-count">站点 {{ stationGroups.length }}</span>
      </div>
    </header>

    <!-- 工具栏 -->
    <div class="cm-toolbar">
      <div class="cm-grid-switcher">
        <span class="cm-switcher-label">画面布局：</span>
        <button
          v-for="opt in gridOptions"
          :key="opt.label"
          class="cm-grid-btn"
          :class="{ active: gridSize === opt.size }"
          @click="gridSize = opt.size"
        >
          <span class="cm-grid-icon" :style="gridIconStyle(opt.size)">
            <span
              v-for="n in opt.size * opt.size"
              :key="n"
              class="cm-grid-cell-dot"
            ></span>
          </span>
          <span class="cm-grid-label">{{ opt.label }}</span>
        </button>
      </div>
      <div class="cm-actions">
        <button class="cm-action-btn refresh" @click="fetchDevices" :disabled="loading">
          <span :class="{ 'spin': loading }">🔄</span>
          {{ loading ? '加载中...' : '刷新设备' }}
        </button>
        <button class="cm-action-btn" @click="toggleAllStations">
          {{ allExpanded ? '📕 全部折叠' : '📖 全部展开' }}
        </button>
        <button class="cm-action-btn" @click="toggleFullscreen" title="全屏显示">
          ⛶ 全屏
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !deviceList.length" class="cm-loading">
      <div class="cm-spinner"></div>
      <div class="cm-loading-text">正在从云端拉取设备列表...</div>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="errorMsg" class="cm-error-box">
      <div class="cm-error-icon">⚠️</div>
      <div class="cm-error-content">
        <div class="cm-error-title">接口加载失败</div>
        <div class="cm-error-msg">{{ errorMsg }}</div>
        <button class="cm-action-btn" @click="fetchDevices" style="margin-top: 10px;">重试</button>
      </div>
    </div>

    <!-- 站点分组主视图 -->
    <main v-else class="cm-groups">
      <div
        v-for="group in stationGroups"
        :key="group.station_name"
        class="cm-station-group"
        :class="{ 'is-expanded': expandedStations[group.station_name] }"
      >
        <!-- 站点头部 -->
        <div class="cm-station-header" @click="toggleGroup(group.station_name)">
          <div class="cm-station-left">
            <span class="cm-station-toggle">{{ expandedStations[group.station_name] ? '▼' : '▶' }}</span>
            <span class="cm-station-icon">🏭</span>
            <span class="cm-station-name">{{ group.station_name }}</span>
            <span class="cm-station-count-badge">{{ group.devices.length }} 路</span>
          </div>
          <div class="cm-station-right">
            <span class="cm-station-online">
              <span class="dot-normal"></span>
              在线 {{ group.devices.filter(d => d.https_flv_url).length }}
            </span>
          </div>
        </div>

        <!-- 摄像头宫格 -->
        <div
          v-show="expandedStations[group.station_name]"
          class="cm-grid"
          :style="{
            gridTemplateColumns: `repeat(${Math.min(gridSize, group.devices.length)}, 1fr)`,
            gridTemplateRows: `repeat(${Math.ceil(group.devices.length / gridSize)}, 1fr)`
          }"
        >
          <div
            v-for="device in group.devices"
            :key="device.id"
            class="cm-window"
            :class="{
              'status-normal': device.https_flv_url,
              'status-offline': !device.https_flv_url
            }"
            @click="openFullscreen(device)"
            @dblclick="openFullscreen(device)"
          >
            <!-- 画面区域 -->
            <div class="cm-video-area">
              <!-- 真实视频流 -->
              <video
                v-if="device.https_flv_url"
                :ref="el => setVideoRef(el, device.id)"
                class="cm-video-real"
                autoplay
                muted
                playsinline
              ></video>
              <!-- 占位画面 -->
              <div v-else class="cm-video-placeholder">
                <div class="cm-noise-overlay"></div>
                <div class="cm-scanline"></div>
                <div class="cm-video-center-icon">{{ getTemplateIcon(device.template_name) }}</div>
              </div>

              <!-- 左上角：站点 + 设备名 -->
              <div class="cm-cam-header">
                <span class="cm-cam-ch">CH-{{ getDeviceIndex(device.id) }}</span>
                <span class="cm-cam-name">{{ device.name }}</span>
              </div>

              <!-- 右上角：REC -->
              <div class="cm-cam-top-right">
                <span class="cm-rec-dot">●</span>
                <span class="cm-rec-text">REC</span>
              </div>

              <!-- 左下角：状态指示 -->
              <div class="cm-cam-status">
                <span class="cm-status-dot" :class="device.https_flv_url ? 'dot-normal' : 'dot-offline'"></span>
                <span class="cm-status-text">{{ device.https_flv_url ? '在线' : '离线' }}</span>
              </div>

              <!-- 右下角：模板类型 -->
              <div class="cm-cam-footer-right">
                <span class="cm-location-text">{{ device.template_name }} · {{ device.device_type_name }}</span>
              </div>
            </div>

            <!-- 窗口底部信息条 -->
            <div class="cm-window-footer">
              <span class="cm-footer-loc">📍 {{ device.station_name }}</span>
              <span class="cm-footer-fps">
                <span v-if="!device.https_flv_url" class="cm-offline-tip">信号中断</span>
                <span v-else>HTTP-FLV · 直播</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 底部状态栏 -->
    <footer class="cm-footer">
      <div class="cm-footer-left">
        <span class="cm-footer-dot green"></span>
        系统运行正常 · 数据每 1 秒刷新
      </div>
      <div class="cm-footer-right">
        <span>站点数量：{{ stationGroups.length }}</span>
        <span class="cm-sep">|</span>
        <span>摄像头总数：{{ totalCount }}</span>
        <span class="cm-sep">|</span>
        <span>画面布局：{{ gridSize }}×{{ gridSize }}</span>
      </div>
    </footer>

    <!-- ============ 全屏预览模式 ============ -->
    <div v-if="fullscreenDevice" class="cm-fullscreen" @click.self="closeFullscreen">
      <div class="cm-fs-container" @click.stop>
        <div class="cm-fs-header">
          <div class="cm-fs-title">
            <span class="cm-fs-icon">📺</span>
            <span class="cm-fs-ch">CH-{{ getDeviceIndex(fullscreenDevice.id) }}</span>
            <span class="cm-fs-name">{{ fullscreenDevice.name }}</span>
            <span class="cm-fs-status" :class="fullscreenDevice.https_flv_url ? 'fs-normal' : 'fs-offline'">
              <span class="cm-fs-dot"></span>
              {{ fullscreenDevice.https_flv_url ? '在线' : '离线' }}
            </span>
          </div>
          <div class="cm-fs-controls">
            <span class="cm-fs-time">{{ nowText }}</span>
            <button class="cm-fs-btn fs-prev" @click="switchFullscreen(-1)" title="上一路">◀ 上一路</button>
            <button class="cm-fs-btn fs-next" @click="switchFullscreen(1)" title="下一路">下一路 ▶</button>
            <button class="cm-fs-btn fs-close" @click="closeFullscreen" title="返回宫格视图">✕ 返回宫格</button>
          </div>
        </div>

        <div class="cm-fs-video">
          <video
            v-if="fullscreenDevice.https_flv_url"
            ref="fsVideoRef"
            class="cm-video-real fs"
            autoplay
            muted
            playsinline
          ></video>
          <template v-else>
            <div class="cm-noise-overlay"></div>
            <div class="cm-scanline"></div>
            <div class="cm-fs-center-icon">{{ getTemplateIcon(fullscreenDevice.template_name) }}</div>
          </template>

          <div class="cm-fs-overlay-location">
            <div class="cm-fs-loc-title">📍 站点：{{ fullscreenDevice.station_name }}</div>
            <div class="cm-fs-loc-desc">设备模板：{{ fullscreenDevice.template_name }}</div>
            <div class="cm-fs-loc-desc">设备类型：{{ fullscreenDevice.device_type_name }}</div>
          </div>

          <div class="cm-fs-rec">
            <span class="cm-rec-dot">●</span>
            <span>REC · HTTP-FLV · 直播</span>
          </div>
        </div>

        <div class="cm-fs-footer">
          <div class="cm-fs-info">
            <div>设备编号：{{ fullscreenDevice.id }}</div>
            <div>安装位置：{{ fullscreenDevice.station_name }}</div>
            <div>设备名称：{{ fullscreenDevice.name }}</div>
          </div>
          <div class="cm-fs-info right">
            <div>模板：{{ fullscreenDevice.template_name }}</div>
            <div>类型：{{ fullscreenDevice.device_type_name }}</div>
            <div>GB编号：{{ fullscreenDevice.gb_id || '-' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import mpegts from 'mpegts.js'
import axios from 'axios'

const router = useRouter()

// ===== 接口配置 =====
const API_URL = '/hualin-video/api/iot/manage/api/listAllDevices'
const API_TOKEN = 'BCACAFFC658149958B6401A3F0179281'

// ===== 数据状态 =====
const deviceList = ref([])          // 原始设备列表
const loading = ref(false)
const errorMsg = ref('')
const expandedStations = reactive({})  // 各站点的展开状态

// ===== 视频流相关 =====
const videoRefs = ref({})
const mpegtsPlayers = ref({})
const fsVideoRef = ref(null)
let fsPlayer = null

function setVideoRef(el, id) {
  if (!el) {
    const oldVideo = videoRefs.value[id]
    if (oldVideo && videoObserver) videoObserver.unobserve(oldVideo)
    if (mpegtsPlayers.value[id]) {
      destroyPlayer(mpegtsPlayers.value[id])
      delete mpegtsPlayers.value[id]
    }
    delete videoRefs.value[id]
    return
  }
  if (el) {
    videoRefs.value[id] = el
    el.dataset.deviceId = id
    initVideoObserver()
    videoObserver.observe(el)
  }
}

// 选择合适的图标
function getTemplateIcon(templateName) {
  if (!templateName) return '📷'
  if (templateName.includes('球')) return '🔵'
  if (templateName.includes('枪')) return '📹'
  if (templateName.includes('半球')) return '🎥'
  return '📷'
}

// 获取设备在全部列表中的序号（1 开始）
function getDeviceIndex(id) {
  const idx = deviceList.value.findIndex(d => d.id === id)
  return String(idx + 1).padStart(2, '0')
}

// 创建单个 mpegts 播放器
function createFlvPlayer(video, url) {
  if (!video || !url) return null
  if (!mpegts.isSupported()) {
    console.warn('[CameraMonitor] 当前浏览器不支持 MSE/MPEGTS 播放')
    return null
  }
  const player = mpegts.createPlayer(
    { type: 'flv', url, isLive: true, hasAudio: false },
    {
      lazyLoad: true,
      fixAudioTimestampGap: false,
      enableWorker: true,
      enableStashBuffer: false,
      stashInitialSize: 128
    }
  )
  player.attachMediaElement(video)
  player.load()
  player.play().catch(() => {})
  player.on(mpegts.Events.ERROR, () => {
    console.log('[CameraMonitor] 视频流错误，尝试重连...', url)
    try {
      player.unload()
      player.load()
      player.play().catch(() => {})
    } catch (e) {}
  })
  return player
}

function destroyPlayer(player) {
  if (!player) return
  try {
    player.pause()
    player.unload()
    player.detachMediaElement()
    player.destroy()
  } catch (e) {}
}

// ===== 视口懒加载：只对可见的 video 创建播放器，离开视口自动销毁释放资源 =====
let videoObserver = null

function initVideoObserver() {
  if (videoObserver) return
  videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target
      const deviceId = video.dataset.deviceId
      if (!deviceId) return
      if (entry.isIntersecting) {
        // 进入视口：按需创建播放器
        if (!mpegtsPlayers.value[deviceId]) {
          const device = deviceList.value.find(d => d.id === deviceId)
          if (device?.https_flv_url) {
            const p = createFlvPlayer(video, device.https_flv_url)
            if (p) mpegtsPlayers.value[deviceId] = p
          }
        }
      } else {
        // 离开视口（含站点折叠 v-show 隐藏）：销毁播放器释放连接
        if (mpegtsPlayers.value[deviceId]) {
          destroyPlayer(mpegtsPlayers.value[deviceId])
          delete mpegtsPlayers.value[deviceId]
        }
      }
    })
  }, {
    rootMargin: '100px',  // 提前 100px 预加载，减少滚动时的空白
    threshold: 0
  })
}

// 启动宫格内所有视频流（播放器创建交由 IntersectionObserver 按可见性管理）
function startGridVideos() {
  // 销毁不在当前设备列表中的播放器
  const keepIds = new Set(deviceList.value.map(d => d.id))
  Object.keys(mpegtsPlayers.value).forEach(id => {
    if (!keepIds.has(id)) {
      destroyPlayer(mpegtsPlayers.value[id])
      delete mpegtsPlayers.value[id]
    }
  })
  // 新挂载的 video 元素会通过 setVideoRef 自动注册到 observer，
  // observer 检测到可见后自动创建播放器
}

function destroyAllGridVideos() {
  Object.values(mpegtsPlayers.value).forEach(destroyPlayer)
  mpegtsPlayers.value = {}
}

function observeMountedVideos() {
  initVideoObserver()
  Object.values(videoRefs.value).forEach(video => {
    if (video) videoObserver.observe(video)
  })
}

// 启动全屏视频
function startFsVideo(device) {
  if (fsPlayer) {
    destroyPlayer(fsPlayer)
    fsPlayer = null
  }
  if (!device?.https_flv_url) return
  nextTick(() => {
    if (fsVideoRef.value) {
      fsPlayer = createFlvPlayer(fsVideoRef.value, device.https_flv_url)
    }
  })
}

// ===== 接口请求 =====
async function fetchDevices() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await axios.post(API_URL, {
      token: API_TOKEN,
      device_type: 1
    }, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    })

    const data = res.data
    if (data && data.code === 0 && Array.isArray(data.data)) {
      deviceList.value = data.data
      // 初始化展开状态：默认全部展开
      const stations = new Set(data.data.map(d => d.station_name))
      stations.forEach(s => {
        if (!(s in expandedStations)) expandedStations[s] = true
      })
      startGridVideos()
    } else {
      errorMsg.value = data?.msg || '接口返回数据异常'
    }
  } catch (err) {
    console.error('[CameraMonitor] 拉取设备列表失败：', err)
    errorMsg.value = err?.message || '网络请求失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

// ===== 按站点分组 =====
const stationGroups = computed(() => {
  const map = new Map()
  deviceList.value.forEach(device => {
    const key = device.station_name || '未分组'
    if (!map.has(key)) {
      map.set(key, { station_name: key, devices: [] })
    }
    map.get(key).devices.push(device)
  })
  // 按设备数倒序，保证大站点在前
  return Array.from(map.values()).sort((a, b) => b.devices.length - a.devices.length)
})

const totalCount = computed(() => deviceList.value.length)
const onlineCount = computed(() => deviceList.value.filter(d => d.https_flv_url).length)

const allExpanded = computed(() => {
  return stationGroups.value.every(g => expandedStations[g.station_name])
})

function toggleGroup(stationName) {
  expandedStations[stationName] = !expandedStations[stationName]
}

function toggleAllStations() {
  const target = !allExpanded.value
  stationGroups.value.forEach(g => {
    expandedStations[g.station_name] = target
  })
}

// ===== 宫格布局配置 =====
const gridSize = ref(3)
const gridOptions = [
  { size: 1, label: '单列' },
  { size: 2, label: '2×2' },
  { size: 3, label: '3×3' },
  { size: 4, label: '4×4' }
]

function gridIconStyle(size) {
  return {
    gridTemplateColumns: `repeat(${size}, 1fr)`,
    gridTemplateRows: `repeat(${size}, 1fr)`
  }
}

// ===== 实时时间 =====
const nowText = ref(formatTime(new Date()))
let timer = null

function formatTime(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onMounted(() => {
  timer = setInterval(() => {
    nowText.value = formatTime(new Date())
  }, 1000)

  window.addEventListener('keydown', onKeyDown)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  fetchDevices()
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (videoObserver) {
    videoObserver.disconnect()
    videoObserver = null
  }
  destroyAllGridVideos()
  if (fsPlayer) destroyPlayer(fsPlayer)
  window.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

function handleVisibilityChange() {
  if (document.hidden) {
    destroyAllGridVideos()
    if (fsPlayer) {
      destroyPlayer(fsPlayer)
      fsPlayer = null
    }
    return
  }
  if (fullscreenDevice.value) {
    startFsVideo(fullscreenDevice.value)
    return
  }
  nextTick(observeMountedVideos)
}

function onKeyDown(e) {
  if (e.key === 'Escape' && fullscreenDevice.value) {
    closeFullscreen()
  }
}

// watch(gridSize, () => {
//   if (!fullscreenDevice.value) {
//     destroyAllGridVideos()
//     nextTick(() => startGridVideos())
//   }
// })

// ===== 全屏预览 =====
const fullscreenDevice = ref(null)

function openFullscreen(device) {
  destroyAllGridVideos()
  fullscreenDevice.value = device
  startFsVideo(device)
}

function closeFullscreen() {
  if (fsPlayer) {
    destroyPlayer(fsPlayer)
    fsPlayer = null
  }
  fullscreenDevice.value = null
  startGridVideos()
}

function switchFullscreen(delta) {
  const list = deviceList.value
  const idx = list.findIndex(d => d.id === fullscreenDevice.value.id)
  const nextIdx = (idx + delta + list.length) % list.length
  const nextDevice = list[nextIdx]
  if (fsPlayer) {
    destroyPlayer(fsPlayer)
    fsPlayer = null
  }
  fullscreenDevice.value = nextDevice
  startFsVideo(nextDevice)
}

function toggleFullscreen() {
  if (fullscreenDevice.value) {
    closeFullscreen()
  } else if (deviceList.value.length > 0) {
    openFullscreen(deviceList.value[0])
  }
}

function goHome() {
  router.push({ path: '/' })
}
</script>

<style scoped>
/* ============ 根容器 ============ */
.camera-monitor {
  position: fixed;
  inset: 0;
  background: #060b0f;
  color: #d8e3ee;
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ============ 顶部标题栏 ============ */
.cm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: linear-gradient(180deg, #0e1a26 0%, #060b0f 100%);
  border-bottom: 1px solid #1b2a3a;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}

.cm-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1px;
}

.cm-title-icon {
  font-size: 24px;
}

.cm-back-btn {
  margin-right: 14px;
  padding: 6px 14px;
  background: transparent;
  border: 1px solid #2a4a6a;
  color: #7f98b5;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  transition: all 0.15s ease;
}
.cm-back-btn:hover {
  background: #2563eb;
  border-color: #3b82f6;
  color: #fff;
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.3);
}

.cm-live-dot {
  color: #e74c3c;
  animation: pulse-dot 1.2s ease-in-out infinite;
  margin-left: 12px;
  font-size: 14px;
}

.cm-live-text {
  color: #e74c3c;
  font-size: 12px;
  letter-spacing: 2px;
  font-weight: 700;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.cm-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #7f98b5;
}

.cm-time {
  color: #4fd1c5;
  font-family: "Courier New", monospace;
  font-weight: 600;
  font-size: 14px;
}

.cm-sep {
  color: #2a3a4a;
}

.cm-camera-count {
  color: #f1c40f;
  font-weight: 600;
}

.cm-station-count {
  color: #8e7cc3;
  font-weight: 600;
}

/* ============ 工具栏 ============ */
.cm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: #0a141e;
  border-bottom: 1px solid #1a2a3a;
  flex-shrink: 0;
}

.cm-grid-switcher {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cm-switcher-label {
  color: #7f98b5;
  font-size: 13px;
}

.cm-grid-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #132130;
  border: 1px solid #1f3347;
  color: #7f98b5;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.15s ease;
}

.cm-grid-btn:hover {
  background: #1a2d40;
  color: #ffffff;
  border-color: #2a4a6a;
}

.cm-grid-btn.active {
  background: #2563eb;
  border-color: #3b82f6;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.35);
}

.cm-grid-icon {
  display: grid;
  gap: 2px;
  width: 18px;
  height: 18px;
}

.cm-grid-cell-dot {
  background: currentColor;
  opacity: 0.8;
  border-radius: 1px;
}

.cm-grid-label {
  font-weight: 600;
}

.cm-actions {
  display: flex;
  gap: 10px;
}

.cm-action-btn {
  padding: 8px 14px;
  background: #132130;
  border: 1px solid #1f3347;
  color: #d8e3ee;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.15s ease;
}

.cm-action-btn:hover:not(:disabled) {
  background: #1a2d40;
  color: #4fd1c5;
  border-color: #2a4a6a;
}

.cm-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cm-action-btn .spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ============ 加载 / 错误 ============ */
.cm-loading, .cm-error-box {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
}

.cm-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #1a2a3a;
  border-top-color: #4fd1c5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.cm-loading-text {
  color: #7f98b5;
  font-size: 14px;
}

.cm-error-box {
  flex-direction: row;
  gap: 24px;
}

.cm-error-icon {
  font-size: 56px;
}

.cm-error-content {
  text-align: left;
}

.cm-error-title {
  color: #e74c3c;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.cm-error-msg {
  color: #bdc3c7;
  font-size: 14px;
}

/* ============ 分组主视图 ============ */
.cm-groups {
  flex: 1;
  /* display: flex; */
  flex-direction: column;
  gap: 16px;
  padding: 16px 24px;
  overflow-y: auto; /* 保留外层滚动，应对站点非常多的情况 */
}

.cm-groups::-webkit-scrollbar {
  width: 8px;
}
.cm-groups::-webkit-scrollbar-track {
  background: #0a141e;
}
.cm-groups::-webkit-scrollbar-thumb {
  background: #1f3347;
  border-radius: 4px;
}
.cm-groups::-webkit-scrollbar-thumb:hover {
  background: #2a4a6a;
}

/* ============ 单个站点分组 ============ */
.cm-station-group {
  background: linear-gradient(180deg, #0a141e 0%, #060b0f 100%);
  border: 1px solid #1a2a3a;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.cm-station-group.is-expanded {
  flex: 1;
  min-height: 0; /* 这是 Flex 嵌套滚动生效的终极核心密码 */
}

/* ============ 站点头部 ============ */
.cm-station-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.15) 0%, rgba(37, 99, 235, 0.02) 100%);
  border-bottom: 1px solid #1a2a3a;
  cursor: pointer;
  transition: background 0.15s ease;
  user-select: none;
}

.cm-station-header:hover {
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.25) 0%, rgba(37, 99, 235, 0.05) 100%);
}

.cm-station-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cm-station-toggle {
  color: #4fd1c5;
  font-size: 12px;
  width: 14px;
  text-align: center;
  transition: transform 0.2s ease;
}

.cm-station-icon {
  font-size: 22px;
}

.cm-station-name {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1px;
}

.cm-station-count-badge {
  padding: 2px 10px;
  background: rgba(79, 209, 197, 0.15);
  color: #4fd1c5;
  border: 1px solid rgba(79, 209, 197, 0.3);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  font-family: "Courier New", monospace;
}

.cm-station-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cm-station-online {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #2ecc71;
  font-size: 13px;
  font-weight: 600;
}

/* ============ 宫格 ============ */
.cm-grid {
  display: grid;
  gap: 10px;
  padding: 16px;
  background: #030609;
  
  flex: 1;
  overflow-y: auto; /* 允许组内自己滚动 */
  min-height: 0;    /* 配合外层，防止被内部视频撑爆 */
}

/* ============ 单个窗口 ============ */
.cm-window {
  background: #000;
  border: 2px solid #1a2a3a;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  aspect-ratio: 16 / 9;
  min-height: 160px;
}

.cm-window:hover {
  border-color: #4fd1c5;
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(79, 209, 197, 0.25);
  z-index: 2;
}

.cm-window.status-normal {
  border-color: #1a6a3a;
}
.cm-window.status-offline {
  border-color: #333;
  opacity: 0.75;
}

.cm-window.status-normal:hover { border-color: #2ecc71; }
.cm-window.status-offline:hover { border-color: #7f8c8d; }

/* ===== 画面区域 ===== */
.cm-video-area {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.cm-video-real {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}
.cm-video-real.fs {
  object-fit: contain;
}

.cm-video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 30% 30%, #1a3a2c 0%, #0c1e16 60%, #06120c 100%);
}

.cm-video-center-icon {
  font-size: 56px;
  opacity: 0.25;
  animation: icon-glow 3s ease-in-out infinite;
}

@keyframes icon-glow {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.08); }
}

/* 扫描线效果 */
.cm-scanline {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 0%, transparent 49%, rgba(255,255,255,0.03) 50%, transparent 51%, transparent 100%);
  background-size: 100% 4px;
  pointer-events: none;
  animation: scan-move 8s linear infinite;
}

@keyframes scan-move {
  from { background-position: 0 0; }
  to { background-position: 0 100%; }
}

/* 噪点效果 */
.cm-noise-overlay {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 3px 3px, 5px 5px;
  background-position: 0 0, 1px 2px;
  pointer-events: none;
  opacity: 0.7;
}

/* 画面头部信息 */
.cm-cam-header {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 10px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
  font-size: 12px;
  font-weight: 600;
}

.cm-cam-ch {
  color: #4fd1c5;
  font-family: "Courier New", monospace;
  letter-spacing: 1px;
}

.cm-cam-name {
  color: #ffffff;
}

.cm-cam-top-right {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 10px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
  font-size: 11px;
  font-family: "Courier New", monospace;
  color: #ffffff;
}

.cm-rec-dot {
  color: #e74c3c;
  animation: pulse-dot 1s ease-in-out infinite;
}

.cm-rec-text {
  color: #e74c3c;
  font-weight: 700;
  letter-spacing: 1px;
}

/* 状态指示 */
.cm-cam-status {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 10px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
  font-size: 11px;
  font-weight: 600;
}

.cm-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot-normal {
  background: #2ecc71;
  box-shadow: 0 0 6px #2ecc71;
}
.dot-offline {
  background: #555;
}

.cm-status-text {
  color: #ffffff;
}

/* 位置信息 */
.cm-cam-footer-right {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 10px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
  font-size: 11px;
  color: #bdc3c7;
}

.cm-location-text {
  color: #95a5a6;
}

/* 窗口底部信息条 */
.cm-window-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #0a141e;
  border-top: 1px solid #1a2a3a;
  font-size: 11px;
  flex-shrink: 0;
}

.cm-footer-loc {
  color: #7f98b5;
  font-weight: 500;
}

.cm-footer-fps {
  color: #4fd1c5;
  font-family: "Courier New", monospace;
  font-weight: 600;
}

.cm-offline-tip {
  color: #7f8c8d;
}

/* ============ 底部状态栏 ============ */
.cm-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: #0a141e;
  border-top: 1px solid #1a2a3a;
  font-size: 12px;
  color: #7f98b5;
  flex-shrink: 0;
}

.cm-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cm-footer-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.cm-footer-dot.green {
  background: #2ecc71;
  box-shadow: 0 0 6px #2ecc71;
  animation: pulse-dot 2s ease-in-out infinite;
}

.cm-footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ============ 全屏预览模式 ============ */
.cm-fullscreen {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(8px);
}

.cm-fs-container {
  width: 100%;
  height: 100%;
  max-width: 1800px;
  display: flex;
  flex-direction: column;
  border: 2px solid #4fd1c5;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 40px rgba(79, 209, 197, 0.25);
  background: #000;
}

.cm-fs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: #0e1a26;
  border-bottom: 1px solid #1a3a4a;
  flex-shrink: 0;
}

.cm-fs-title {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.cm-fs-icon {
  font-size: 22px;
}

.cm-fs-ch {
  color: #4fd1c5;
  font-family: "Courier New", monospace;
  letter-spacing: 2px;
  font-size: 16px;
}

.cm-fs-name {
  font-size: 18px;
}

.cm-fs-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  margin-left: 8px;
}

.cm-fs-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.fs-normal { background: rgba(46, 204, 113, 0.15); color: #2ecc71; border: 1px solid #2ecc71; }
.fs-normal .cm-fs-dot { background: #2ecc71; box-shadow: 0 0 6px #2ecc71; }
.fs-offline { background: rgba(127, 140, 141, 0.15); color: #7f8c8d; border: 1px solid #7f8c8d; }
.fs-offline .cm-fs-dot { background: #7f8c8d; }

.cm-fs-controls {
  display: flex;
  align-items: center;
  gap: 14px;
}

.cm-fs-time {
  color: #4fd1c5;
  font-family: "Courier New", monospace;
  font-size: 14px;
  font-weight: 600;
}

.cm-fs-btn {
  padding: 8px 16px;
  background: #132130;
  border: 1px solid #2a4a6a;
  color: #d8e3ee;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.15s ease;
}

.cm-fs-btn:hover {
  background: #1a2d40;
  color: #4fd1c5;
  border-color: #4fd1c5;
}

.cm-fs-btn.fs-close {
  background: rgba(231, 76, 60, 0.15);
  border-color: #c0392b;
  color: #e74c3c;
}

.cm-fs-btn.fs-close:hover {
  background: rgba(231, 76, 60, 0.25);
  color: #ffffff;
}

.cm-fs-video {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
  background: radial-gradient(circle at 30% 30%, #1a3a2c 0%, #0c1e16 60%, #06120c 100%);
}

.cm-fs-center-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 180px;
  opacity: 0.2;
  animation: icon-glow 3s ease-in-out infinite;
}

.cm-fs-overlay-location {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.65);
  padding: 12px 20px;
  border-radius: 6px;
  backdrop-filter: blur(8px);
  border-left: 3px solid #4fd1c5;
}

.cm-fs-loc-title {
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
}

.cm-fs-loc-desc {
  color: #95a5a6;
  font-size: 12px;
  line-height: 1.6;
}

.cm-fs-rec {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.65);
  padding: 8px 16px;
  border-radius: 4px;
  color: #ffffff;
  font-size: 13px;
  font-family: "Courier New", monospace;
  backdrop-filter: blur(8px);
}

.cm-fs-rec .cm-rec-dot {
  font-size: 14px;
}

.cm-fs-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 14px 20px;
  background: #0a141e;
  border-top: 1px solid #1a2a3a;
  flex-shrink: 0;
}

.cm-fs-info {
  font-size: 12px;
  color: #7f98b5;
  line-height: 1.8;
  word-break: break-all;
}

.cm-fs-info.right {
  text-align: right;
  color: #bdc3c7;
}

/* ============ 响应式设计 ============ */
@media (max-width: 1200px) {
  .cm-header, .cm-toolbar, .cm-footer { padding: 10px 16px; }
  .cm-title { font-size: 17px; }
  .cm-grid { padding: 12px; gap: 8px; }
}

@media (max-width: 992px) {
  .cm-header { flex-wrap: wrap; gap: 10px; }
  .cm-toolbar { flex-wrap: wrap; gap: 10px; }
  .cm-title { font-size: 15px; }
  .cm-groups { padding: 12px 16px; gap: 12px; }
  .cm-station-header { padding: 12px 16px; }
  .cm-station-name { font-size: 14px; }
  .cm-grid { padding: 10px; gap: 6px; }
  .cm-window { min-height: 120px; }
  .cm-video-center-icon { font-size: 40px; }
  .cm-footer { padding: 8px 16px; flex-direction: column; gap: 6px; align-items: flex-start; }
}

@media (max-width: 767px) {
  .cm-cam-header, .cm-cam-top-right, .cm-cam-status, .cm-cam-footer-right {
    font-size: 10px;
    padding: 3px 6px;
  }
  .cm-window-footer { font-size: 10px; padding: 4px 8px; }
  .cm-video-center-icon { font-size: 28px; }
  .cm-fs-header { padding: 10px 12px; flex-wrap: wrap; gap: 8px; }
  .cm-fs-title { font-size: 14px; gap: 8px; }
  .cm-fs-ch { font-size: 12px; }
  .cm-fs-controls { gap: 8px; }
  .cm-fs-btn { padding: 6px 10px; font-size: 11px; }
  .cm-fs-overlay-location { padding: 8px 12px; bottom: 12px; left: 12px; }
  .cm-fs-loc-title { font-size: 13px; }
  .cm-fs-rec { font-size: 11px; padding: 6px 10px; top: 12px; right: 12px; }
  .cm-fs-footer { grid-template-columns: 1fr; gap: 8px; padding: 10px 12px; }
  .cm-fs-info.right { text-align: left; }
}
</style>
