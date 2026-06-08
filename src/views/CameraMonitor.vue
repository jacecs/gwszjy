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
        <span class="cm-camera-count">在线 {{ onlineCount }} / {{ cameras.length }} 路</span>
      </div>
    </header>

    <!-- 宫格布局控制栏 -->
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
        <button class="cm-action-btn" @click="refreshAll" title="刷新全部">
          🔄 刷新
        </button>
        <button class="cm-action-btn" @click="toggleFullscreen" title="全屏显示">
          ⛶ 全屏
        </button>
      </div>
    </div>

    <!-- 宫格主视图 -->
    <main class="cm-grid" :style="gridContainerStyle">
      <div
        v-for="cam in visibleCameras"
        :key="cam.id"
        class="cm-window"
        :class="{ 'status-normal': cam.status === 'normal', 'status-warn': cam.status === 'warn', 'status-error': cam.status === 'error', 'status-offline': cam.status === 'offline' }"
        @click="openFullscreen(cam)"
        @dblclick="openFullscreen(cam)"
      >
        <!-- 画面区域 -->
        <div class="cm-video-area">
          <!-- 真实视频流（有 streamUrl 时） -->
          <video
            v-if="cam.streamUrl"
            :ref="el => setVideoRef(el, cam.id)"
            class="cm-video-real"
            autoplay
            muted
            playsinline
          ></video>
          <!-- 占位画面（模拟视频画面） -->
          <div v-else class="cm-video-placeholder" :style="{ background: cam.bgGradient }">
            <div class="cm-noise-overlay"></div>
            <div class="cm-scanline"></div>
            <div class="cm-video-center-icon">{{ cam.icon }}</div>
          </div>

          <!-- 左上角：位置标识 -->
          <div class="cm-cam-header">
            <span class="cm-cam-id">CH-{{ String(cam.id).padStart(2, '0') }}</span>
            <span class="cm-cam-name">{{ cam.name }}</span>
          </div>

          <!-- 右上角：REC + 实时时间 -->
          <div class="cm-cam-top-right">
            <span class="cm-rec-dot">●</span>
            <span class="cm-rec-text">REC</span>
            <span class="cm-cam-time">{{ cam.timeString }}</span>
          </div>

          <!-- 左下角：状态指示 -->
          <div class="cm-cam-status" :title="statusText(cam.status)">
            <span class="cm-status-dot" :class="['dot-' + cam.status]"></span>
            <span class="cm-status-text">{{ statusText(cam.status) }}</span>
          </div>

          <!-- 右下角：分辨率/位置 -->
          <div class="cm-cam-footer-right">
            <span class="cm-location-text">{{ cam.location }}</span>
          </div>

          <!-- 右下角：展开图标提示 -->
          <div class="cm-cam-expand-hint">双击全屏 →</div>
        </div>

        <!-- 窗口底部信息条 -->
        <div class="cm-window-footer">
          <span class="cm-footer-loc">📍 {{ cam.location }}</span>
          <span class="cm-footer-fps">
            <span v-if="cam.status === 'offline'" class="cm-offline-tip">信号中断</span>
            <span v-else>{{ cam.fps }} FPS · {{ cam.resolution }}</span>
          </span>
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
        <span>画面分割：{{ gridSize }}×{{ gridSize }}</span>
        <span class="cm-sep">|</span>
        <span>显示：{{ visibleCameras.length }} / {{ cameras.length }}</span>
        <span class="cm-sep">|</span>
        <span>分辨率自适应</span>
      </div>
    </footer>

    <!-- ============ 全屏预览模式 ============ -->
    <div v-if="fullscreenCamera" class="cm-fullscreen" @click.self="closeFullscreen">
      <div class="cm-fs-container" @click.stop>
        <div class="cm-fs-header">
          <div class="cm-fs-title">
            <span class="cm-fs-icon">📺</span>
            <span class="cm-fs-ch">CH-{{ String(fullscreenCamera.id).padStart(2, '0') }}</span>
            <span class="cm-fs-name">{{ fullscreenCamera.name }}</span>
            <span class="cm-fs-status" :class="['fs-' + fullscreenCamera.status]">
              <span class="cm-fs-dot"></span>
              {{ statusText(fullscreenCamera.status) }}
            </span>
          </div>
          <div class="cm-fs-controls">
            <span class="cm-fs-time">{{ nowText }}</span>
            <button class="cm-fs-btn fs-prev" @click="switchFullscreen(-1)" title="上一路">◀ 上一路</button>
            <button class="cm-fs-btn fs-next" @click="switchFullscreen(1)" title="下一路">下一路 ▶</button>
            <button class="cm-fs-btn fs-close" @click="closeFullscreen" title="返回宫格视图">✕ 返回宫格</button>
          </div>
        </div>

        <div class="cm-fs-video" :style="{ background: fullscreenCamera.streamUrl ? '#000' : fullscreenCamera.bgGradient }">
          <!-- 全屏时的真实视频流 -->
          <video
            v-if="fullscreenCamera.streamUrl"
            ref="fsVideoRef"
            class="cm-video-real fs"
            autoplay
            muted
            playsinline
          ></video>
          <!-- 无真实流时的占位图标 -->
          <template v-else>
            <div class="cm-noise-overlay"></div>
            <div class="cm-scanline"></div>
            <div class="cm-fs-center-icon">{{ fullscreenCamera.icon }}</div>
          </template>
          <div class="cm-fs-overlay-location">
            <div class="cm-fs-loc-title">📍 位置：{{ fullscreenCamera.location }}</div>
            <div class="cm-fs-loc-desc">{{ fullscreenCamera.description }}</div>
          </div>
          <div class="cm-fs-rec">
            <span class="cm-rec-dot">●</span>
            <span>REC · {{ fullscreenCamera.fps }} FPS · {{ fullscreenCamera.resolution }}</span>
          </div>
        </div>

        <div class="cm-fs-footer">
          <div class="cm-fs-info">
            <div>摄像头编号：CH-{{ String(fullscreenCamera.id).padStart(2, '0') }}</div>
            <div>安装位置：{{ fullscreenCamera.location }}</div>
            <div>类型：{{ fullscreenCamera.type }}</div>
          </div>
          <div class="cm-fs-info right">
            <div>当前状态：{{ statusText(fullscreenCamera.status) }}</div>
            <div>最后心跳：{{ fullscreenCamera.timeString }}</div>
            <div>分辨率：{{ fullscreenCamera.resolution }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import mpegts from 'mpegts.js'

const router = useRouter()

// ===== 视频流相关 =====
const videoRefs = ref({})      // 宫格内的 video DOM 引用（按 camera.id 存）
const mpegtsPlayers = ref({})  // 宫格内的 mpegts 播放器实例
const fsVideoRef = ref(null)   // 全屏视频的 DOM 引用
let fsPlayer = null             // 全屏模式下的播放器

function setVideoRef(el, id) {
  if (el) videoRefs.value[id] = el
}

// 创建单个 mpegts 播放器（支持 H.264/H.265/FLV 等多种格式）
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
      enableWorker: false,
      enableStashBuffer: false,
      stashInitialSize: 128
    }
  )
  player.attachMediaElement(video)
  player.load()
  player.play().catch(() => { /* 浏览器自动播放策略忽略 */ })
  // 自动重连
  player.on(mpegts.Events.ERROR, () => {
    console.log('[CameraMonitor] 视频流错误，尝试重连...', url)
    try {
      player.unload()
      player.load()
      player.play().catch(() => {})
    } catch (e) { /* 忽略 */ }
  })
  return player
}

// 销毁单个播放器
function destroyPlayer(player) {
  if (!player) return
  try {
    player.pause()
    player.unload()
    player.detachMediaElement()
    player.destroy()
  } catch (e) { /* 忽略 */ }
}

// 启动宫格内所有视频流
function startGridVideos() {
  const visibleList = visibleCameras.value
  const toKeep = new Set(visibleList.map(c => c.id))

  // 销毁不再可见的播放器
  Object.keys(mpegtsPlayers.value).forEach(id => {
    if (!toKeep.has(Number(id))) {
      destroyPlayer(mpegtsPlayers.value[id])
      delete mpegtsPlayers.value[id]
    }
  })

  nextTick(() => {
    visibleList.forEach(cam => {
      if (cam.streamUrl && !mpegtsPlayers.value[cam.id]) {
        const video = videoRefs.value[cam.id]
        if (video) {
          const p = createFlvPlayer(video, cam.streamUrl)
          if (p) mpegtsPlayers.value[cam.id] = p
        }
      }
    })
  })
}

// 销毁所有宫格视频
function destroyAllGridVideos() {
  Object.values(mpegtsPlayers.value).forEach(destroyPlayer)
  mpegtsPlayers.value = {}
}

// 启动全屏视频
function startFsVideo(cam) {
  if (fsPlayer) {
    destroyPlayer(fsPlayer)
    fsPlayer = null
  }
  if (!cam?.streamUrl) return
  nextTick(() => {
    if (fsVideoRef.value) {
      fsPlayer = createFlvPlayer(fsVideoRef.value, cam.streamUrl)
    }
  })
}

// ===== 监控摄像头数据 =====
const baseCameras = [
  { id: 1, name: '烘干塔主机房', location: '泰兴市根思乡烘干车间-1', type: '枪式红外摄像机', icon: '🏭', description: '主加工区，监控温度及设备运行状态',
    bgGradient: 'radial-gradient(circle at 30% 30%, #1a3a2c 0%, #0c1e16 60%, #06120c 100%)', status: 'normal',
    streamUrl: 'https://hualin.xyune.com:8443/api/gb/httpflv/live/34020000001310001002.flv?streamtype=1&token=11223344' },
  { id: 2, name: '农田灌溉渠·北区', location: '根思乡北片农灌区-2', type: '球型摄像机', icon: '🌾', description: '灌溉用水渠水位监测',
    bgGradient: 'radial-gradient(circle at 70% 40%, #2a4a2a 0%, #1a2e1a 60%, #0a1808 100%)', status: 'normal' },
  { id: 3, name: '仓库入口', location: '物流仓库正门-3', type: '半球型摄像机', icon: '📦', description: '仓库出入人员/车辆监控',
    bgGradient: 'radial-gradient(circle at 50% 30%, #2e3a4a 0%, #1a2030 60%, #0a1018 100%)', status: 'normal' },
  { id: 4, name: '变电室', location: '配电间-4', type: '防爆摄像机', icon: '⚡', description: '高压配电区域实时监控',
    bgGradient: 'radial-gradient(circle at 60% 50%, #3a2e1a 0%, #2a1e0e 60%, #180e06 100%)', status: 'warn' },
  { id: 5, name: '农机停放场', location: '农机合作社大院-5', type: '球形云台摄像机', icon: '🚜', description: '农机设备停放安全监控',
    bgGradient: 'radial-gradient(circle at 40% 40%, #2a3a3a 0%, #1a2828 60%, #0a1818 100%)', status: 'normal' },
  { id: 6, name: '粮食加工线', location: '加工车间生产线-6', type: '枪式红外摄像机', icon: '🏗️', description: '加工生产线运行状态',
    bgGradient: 'radial-gradient(circle at 30% 70%, #3a2a3a 0%, #2a1a2a 60%, #180a18 100%)', status: 'normal' },
  { id: 7, name: '实验田·土壤监测', location: '试验田西区-7', type: '室外球机', icon: '🌱', description: '土壤湿度/温度可视化监测',
    bgGradient: 'radial-gradient(circle at 50% 50%, #2a4a3a 0%, #1a2e2a 60%, #081814 100%)', status: 'normal' },
  { id: 8, name: '办公区走廊', location: '办公楼一楼走廊-8', type: '半球型摄像机', icon: '🏢', description: '办公区域安防监控',
    bgGradient: 'radial-gradient(circle at 50% 60%, #3a3a2e 0%, #2a2a1e 60%, #181808 100%)', status: 'normal' },
  { id: 9, name: '仓储物流门', location: '仓储区后门-9', type: '枪式摄像机', icon: '🚪', description: '货物出入通道监控',
    bgGradient: 'radial-gradient(circle at 40% 60%, #3a2e2e 0%, #2a1e1e 60%, #180a0a 100%)', status: 'error' },
  { id: 10, name: '田间气象站', location: '田间气象监测站-10', type: '室外球机', icon: '☁️', description: '气象数据采集与可视化',
    bgGradient: 'radial-gradient(circle at 60% 30%, #2a3a4a 0%, #1a2a3a 60%, #0a1820 100%)', status: 'normal' },
  { id: 11, name: '灌溉泵房', location: '灌溉泵房-11', type: '枪式红外摄像机', icon: '💧', description: '水泵运行与水位监控',
    bgGradient: 'radial-gradient(circle at 50% 40%, #1a3a4a 0%, #0e2830 60%, #061820 100%)', status: 'normal' },
  { id: 12, name: '停车场入口', location: '基地停车场-12', type: '球型摄像机', icon: '🚗', description: '车辆出入与安防',
    bgGradient: 'radial-gradient(circle at 50% 30%, #3a3a4a 0%, #2a2a3a 60%, #181820 100%)', status: 'normal' },
  { id: 13, name: '粮仓温度监控', location: '粮仓东区-13', type: '热成像摄像机', icon: '🌾', description: '粮食存储温度可视化',
    bgGradient: 'radial-gradient(circle at 50% 50%, #4a3a1a 0%, #3a2a0e 60%, #201808 100%)', status: 'normal' },
  { id: 14, name: '农机维修间', location: '农机维修点-14', type: '半球型摄像机', icon: '🔧', description: '维修作业安全监控',
    bgGradient: 'radial-gradient(circle at 50% 50%, #2e3a2e 0%, #1a281a 60%, #0a1808 100%)', status: 'offline' },
  { id: 15, name: '合作社大门', location: '根思乡合作社正门-15', type: '球型摄像机', icon: '🚪', description: '主出入口车辆/人员监控',
    bgGradient: 'radial-gradient(circle at 40% 60%, #3a2e2a 0%, #2a1e1a 60%, #180a08 100%)', status: 'normal' },
  { id: 16, name: '灌溉渠·南区', location: '南片农灌区-16', type: '室外球机', icon: '💦', description: '南区灌溉运行状态',
    bgGradient: 'radial-gradient(circle at 70% 50%, #1a4a3a 0%, #0e2e28 60%, #061818 100%)', status: 'normal' }
]

// 摄像机数据 + 动态字段
const cameras = ref(baseCameras.map(c => ({
  ...c,
  resolution: pickResolution(),
  fps: Math.floor(20 + Math.random() * 10),
  timeString: formatTime(new Date())
})))

function pickResolution() {
  const list = ['1920×1080', '2560×1440', '1280×720', '3840×2160']
  return list[Math.floor(Math.random() * list.length)]
}

function formatTime(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ===== 宫格布局配置 =====
const gridSize = ref(3) // 默认 3x3
const gridOptions = [
  { size: 1, label: '全屏' },
  { size: 2, label: '2×2' },
  { size: 3, label: '3×3' },
  { size: 4, label: '4×4' }
]

// 显示的摄像机数量 = gridSize * gridSize
const visibleCameras = computed(() => {
  const total = gridSize.value * gridSize.value
  return cameras.value.slice(0, total)
})

const onlineCount = computed(() => {
  return cameras.value.filter(c => c.status !== 'offline').length
})

const gridContainerStyle = computed(() => ({
  gridTemplateColumns: `repeat(${gridSize.value}, 1fr)`,
  gridTemplateRows: `repeat(${gridSize.value}, 1fr)`
}))

function gridIconStyle(size) {
  return {
    gridTemplateColumns: `repeat(${size}, 1fr)`,
    gridTemplateRows: `repeat(${size}, 1fr)`
  }
}

// ===== 状态显示 =====
function statusText(status) {
  switch (status) {
    case 'normal': return '正常'
    case 'warn': return '告警'
    case 'error': return '异常'
    case 'offline': return '离线'
    default: return '未知'
  }
}

// ===== 实时时间 =====
const nowText = ref(formatTime(new Date()))
let timer = null
onMounted(() => {
  // 启动时钟
  timer = setInterval(() => {
    const now = new Date()
    const ts = formatTime(now)
    nowText.value = ts
    cameras.value.forEach(c => {
      if (c.status !== 'offline') {
        c.timeString = ts
        if (Math.random() > 0.9) {
          c.fps = Math.max(15, Math.min(30, c.fps + (Math.random() > 0.5 ? 1 : -1)))
        }
      }
    })
  }, 1000)

  // 键盘 ESC 退出全屏
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fullscreenCamera.value) {
      closeFullscreen()
    }
  })

  // 启动宫格视频
  startGridVideos()
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  destroyAllGridVideos()
  if (fsPlayer) destroyPlayer(fsPlayer)
})

// 监听宫格布局变化，重建视频播放器
watch(gridSize, () => {
  destroyAllGridVideos()
  nextTick(() => startGridVideos())
})

// ===== 全屏预览 =====
const fullscreenCamera = ref(null)
function openFullscreen(cam) {
  // 暂停宫格视频（避免重复拉流）
  destroyAllGridVideos()
  fullscreenCamera.value = cam
  // 启动全屏视频
  startFsVideo(cam)
}
function closeFullscreen() {
  // 关闭全屏视频
  if (fsPlayer) {
    destroyPlayer(fsPlayer)
    fsPlayer = null
  }
  fullscreenCamera.value = null
  // 恢复宫格视频
  startGridVideos()
}
function switchFullscreen(delta) {
  const list = cameras.value
  const idx = list.findIndex(c => c.id === fullscreenCamera.value.id)
  const nextIdx = (idx + delta + list.length) % list.length
  const nextCam = list[nextIdx]
  // 销毁旧的全屏播放器
  if (fsPlayer) {
    destroyPlayer(fsPlayer)
    fsPlayer = null
  }
  fullscreenCamera.value = nextCam
  startFsVideo(nextCam)
}

// ===== 交互 =====
function refreshAll() {
  cameras.value.forEach(c => {
    if (c.status === 'offline') {
      // 有 20% 概率从离线恢复
      if (Math.random() > 0.8) {
        c.status = 'normal'
      }
    }
  })
}

function goHome() {
  router.push({ path: '/' });
}

function toggleFullscreen() {
  if (fullscreenCamera.value) {
    closeFullscreen()
  } else if (cameras.value.length > 0) {
    openFullscreen(cameras.value[0])
  }
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

.cm-action-btn:hover {
  background: #1a2d40;
  color: #4fd1c5;
  border-color: #2a4a6a;
}

/* ============ 宫格主视图 ============ */
.cm-grid {
  flex: 1;
  display: grid;
  gap: 8px;
  padding: 12px;
  background: #030609;
  min-height: 0;
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
  transition: border-color 0.2s ease, transform 0.1s ease;
  min-height: 0;
}

.cm-window:hover {
  border-color: #4fd1c5;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(79, 209, 197, 0.15);
  z-index: 2;
}

/* 不同状态的窗口边框颜色 */
.cm-window.status-normal { border-color: #1a6a3a; }
.cm-window.status-warn { border-color: #c9a227; box-shadow: 0 0 10px rgba(201, 162, 39, 0.25); }
.cm-window.status-error { border-color: #c0392b; box-shadow: 0 0 12px rgba(192, 57, 43, 0.3); }
.cm-window.status-offline { border-color: #333; opacity: 0.7; }

.cm-window.status-warn:hover { border-color: #f1c40f; }
.cm-window.status-error:hover { border-color: #e74c3c; }
.cm-window.status-offline:hover { border-color: #7f8c8d; }

/* ===== 画面区域 ===== */
.cm-video-area {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

/* ===== 真实视频流画面 ===== */
.cm-video-real {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;  /* 保持画面比例，不变形 */
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
}

.cm-video-center-icon {
  font-size: 60px;
  opacity: 0.25;
  animation: icon-glow 3s ease-in-out infinite;
}

@keyframes icon-glow {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(1.05); }
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
  background: rgba(0, 0, 0, 0.55);
  padding: 4px 10px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
  font-size: 12px;
  font-weight: 600;
}

.cm-cam-id {
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
  background: rgba(0, 0, 0, 0.55);
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

.cm-cam-time {
  color: #bdc3c7;
}

/* 状态指示 */
.cm-cam-status {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.55);
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
.dot-warn {
  background: #f1c40f;
  box-shadow: 0 0 6px #f1c40f;
  animation: pulse-dot 1.5s ease-in-out infinite;
}
.dot-error {
  background: #e74c3c;
  box-shadow: 0 0 6px #e74c3c;
  animation: pulse-dot 0.8s ease-in-out infinite;
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
  background: rgba(0, 0, 0, 0.55);
  padding: 4px 10px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
  font-size: 11px;
  color: #bdc3c7;
}

.cm-location-text {
  color: #95a5a6;
}

/* 展开提示 */
.cm-cam-expand-hint {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255,255,255,0);
  font-size: 11px;
  transition: color 0.2s ease;
  writing-mode: vertical-rl;
}

.cm-window:hover .cm-cam-expand-hint {
  color: rgba(79, 209, 197, 0.7);
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
.fs-warn { background: rgba(241, 196, 15, 0.15); color: #f1c40f; border: 1px solid #f1c40f; }
.fs-warn .cm-fs-dot { background: #f1c40f; box-shadow: 0 0 6px #f1c40f; animation: pulse-dot 1.2s ease-in-out infinite; }
.fs-error { background: rgba(231, 76, 60, 0.15); color: #e74c3c; border: 1px solid #e74c3c; }
.fs-error .cm-fs-dot { background: #e74c3c; box-shadow: 0 0 6px #e74c3c; animation: pulse-dot 0.8s ease-in-out infinite; }
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
}

.cm-fs-info.right {
  text-align: right;
  color: #bdc3c7;
}

/* ============ 响应式设计 ============ */

/* 大屏（>1600px） */
@media (min-width: 1601px) {
  .cm-video-center-icon { font-size: 80px; }
}

/* 中等屏（992-1600px） */
@media (max-width: 1600px) and (min-width: 993px) {
  .cm-video-center-icon { font-size: 50px; }
}

/* 平板（768-992px） */
@media (max-width: 992px) {
  .cm-header { padding: 10px 16px; }
  .cm-title { font-size: 17px; }
  .cm-title-icon { font-size: 20px; }
  .cm-back-btn { padding: 5px 10px; font-size: 12px; margin-right: 10px; }
  .cm-toolbar { padding: 8px 16px; }
  .cm-grid { gap: 6px; padding: 8px; }
  .cm-footer { padding: 8px 16px; flex-direction: column; gap: 6px; align-items: flex-start; }
  .cm-cam-header, .cm-cam-top-right { font-size: 10px; padding: 3px 6px; }
  .cm-cam-status, .cm-cam-footer-right { font-size: 10px; padding: 3px 6px; }
  .cm-cam-expand-hint { display: none; }
  .cm-video-center-icon { font-size: 40px; }
}

/* 手机（<768px） */
@media (max-width: 767px) {
  .cm-header { padding: 8px 12px; flex-wrap: wrap; gap: 8px; }
  .cm-title { font-size: 14px; }
  .cm-title-icon { font-size: 18px; }
  .cm-back-btn { padding: 4px 8px; font-size: 11px; margin-right: 8px; }
  .cm-live-dot { margin-left: 6px; }
  .cm-info { font-size: 11px; gap: 8px; width: 100%; justify-content: space-between; }
  .cm-toolbar { padding: 8px 12px; flex-wrap: wrap; gap: 8px; }
  .cm-switcher-label { display: none; }
  .cm-grid-btn { padding: 6px 10px; font-size: 11px; }
  .cm-action-btn { padding: 6px 10px; font-size: 11px; }
  .cm-grid { gap: 4px; padding: 6px; }
  .cm-window { border-width: 1px; }
  .cm-cam-header, .cm-cam-top-right { padding: 2px 5px; font-size: 9px; }
  .cm-cam-status, .cm-cam-footer-right { padding: 2px 5px; font-size: 9px; }
  .cm-window-footer { padding: 4px 8px; font-size: 10px; }
  .cm-footer { font-size: 11px; padding: 6px 12px; }
  .cm-video-center-icon { font-size: 28px; }

  /* 手机全屏模式调整 */
  .cm-fs-header { padding: 10px 12px; flex-wrap: wrap; gap: 8px; }
  .cm-fs-title { font-size: 14px; gap: 8px; }
  .cm-fs-ch { font-size: 13px; }
  .cm-fs-name { font-size: 14px; }
  .cm-fs-controls { gap: 8px; }
  .cm-fs-time { font-size: 12px; }
  .cm-fs-btn { padding: 6px 10px; font-size: 11px; }
  .cm-fs-center-icon { font-size: 100px; }
  .cm-fs-overlay-location { padding: 8px 12px; bottom: 12px; left: 12px; }
  .cm-fs-loc-title { font-size: 13px; }
  .cm-fs-loc-desc { font-size: 11px; }
  .cm-fs-rec { font-size: 11px; padding: 6px 10px; top: 12px; right: 12px; }
  .cm-fs-footer { grid-template-columns: 1fr; gap: 8px; padding: 10px 12px; }
  .cm-fs-info.right { text-align: left; }
}

/* 超小屏（<480px） */
@media (max-width: 479px) {
  .cm-title { font-size: 12px; }
  .cm-live-text { font-size: 10px; }
}
</style>
