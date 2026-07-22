<template>
  <div class="monitor-grid" :class="'grid-' + grid">
    <div class="video-item" :class="{ 'status-normal': isOnline, 'status-offline': !isOnline }">
      <div class="video-area">
        <video v-show="!streamTip" ref="videoRef" class="video-real" autoplay muted playsinline controls></video>
        <div v-if="streamTip" class="stream-tip">
          <div class="noise-overlay"></div>
          <div class="scanline"></div>
          <div class="video-center-icon">{{ streamIcon }}</div>
          <div class="stream-tip-text">{{ streamTip }}</div>
        </div>

        <div class="cam-header">
          <span class="cam-ch">{{ channelText }}</span>
          <span class="cam-name">{{ streamName }}</span>
        </div>
        <div class="cam-top-right" v-if="isOnline">
          <span class="rec-dot">●</span>
          <span class="rec-text">REC</span>
        </div>
        <div class="cam-status">
          <span class="status-dot" :class="isOnline ? 'dot-normal' : 'dot-offline'"></span>
          <span class="status-text">{{ isOnline ? '在线' : '离线' }}</span>
        </div>
        <div class="cam-footer-right">
          <span class="location-text">{{ templateText }}</span>
        </div>
      </div>
      <div class="window-footer">
        <span class="footer-loc">📍 {{ stationText }}</span>
        <span class="footer-fps">{{ isOnline ? 'HTTP-FLV · 直播' : '信号中断' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import mpegts from 'mpegts.js'

const props = defineProps({
  streams: {
    type: Object,
    default: () => { }
    // { name: '摄像头1', url: 'http://xxx/live.flv' }
  },
  grid: {
    type: Number,
    default: 1 // 1 / 4 / 9
  }
})

const videoRef = ref(null)
const streamTip = ref('')
let player = null

const isRtspStream = (url = '') => /^rtsp:\/\//i.test(url)
const isFlvStream = (url = '') => /\.flv($|\?)/i.test(url)
const getStreamUrl = (stream = {}) => {
  return stream.https_flv_url || stream.http_flv_url || stream.httpsFlvUrl || stream.httpFlvUrl || stream.url || stream.streamUrl || stream.videoUrl || stream.flvUrl || ''
}
const streamUrl = computed(() => getStreamUrl(props.streams))
const isOnline = computed(() => Boolean(streamUrl.value) && !streamTip.value)
const streamName = computed(() => props.streams?.name || props.streams?.cameraName || props.streams?.deviceName || '视频监控')
const channelText = computed(() => props.streams?.channel || props.streams?.gbId || props.streams?.deviceId || 'CH-01')
const stationText = computed(() => props.streams?.stationName || props.streams?.station_name || '未知站点')
const templateText = computed(() => {
  const template = props.streams?.templateName || props.streams?.template_name || '摄像机'
  const deviceType = props.streams?.deviceTypeName || props.streams?.device_type_name || '网络摄像机'
  return `${template} · ${deviceType}`
})
const streamIcon = computed(() => {
  const template = templateText.value
  if (template.includes('球')) return '🔵'
  if (template.includes('枪')) return '📹'
  if (template.includes('半球')) return '🎥'
  return '📷'
})

function createFlvPlayer(video, url) {
  if (!video || !url) return null
  if (!mpegts.isSupported()) {
    streamTip.value = '当前浏览器不支持 MSE/MPEGTS 播放'
    return null
  }
  const nextPlayer = mpegts.createPlayer(
    { type: 'flv', url, isLive: true, hasAudio: false },
    {
      lazyLoad: true,
      fixAudioTimestampGap: false,
      enableWorker: true,
      enableStashBuffer: false,
      stashInitialSize: 128
    }
  )
  nextPlayer.attachMediaElement(video)
  nextPlayer.load()
  nextPlayer.play().catch(() => {})
  nextPlayer.on(mpegts.Events.ERROR, () => {
    console.log('[Video] 视频流错误，尝试重连...', url)
    try {
      nextPlayer.unload()
      nextPlayer.load()
      nextPlayer.play().catch(() => {})
    } catch (e) {}
  })
  return nextPlayer
}

function destroyPlayer() {
  if (player) {
    try {
      player.pause()
      player.unload()
      player.detachMediaElement()
      player.destroy()
    } catch (e) {}
    player = null
  }
  if (videoRef.value) {
    videoRef.value.pause?.()
    videoRef.value.removeAttribute('src')
    videoRef.value.load()
  }
}

async function loadStream() {
  streamTip.value = ''
  destroyPlayer()
  await nextTick()

  const video = videoRef.value
  const url = getStreamUrl(props.streams)
  if (!url) {
    streamTip.value = '暂无视频地址'
    return
  }
  if (isRtspStream(url)) {
    streamTip.value = '浏览器不能直接播放 RTSP，请先转换为 HTTP-FLV、HLS 或 WebRTC 地址'
    return
  }
  if (!video) return

  if (isFlvStream(url)) {
    player = createFlvPlayer(video, url)
    return
  }

  video.src = url
  video.load()
  video.play?.().catch(() => {})
}

watch(streamUrl, loadStream,
  {
    immediate: true
  }
)

function handleVisibilityChange() {
  if (document.hidden) {
    destroyPlayer()
    return
  }
  loadStream()
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  destroyPlayer()
})
</script>

<style scoped>
.monitor-grid {
  display: grid;
  gap: 10px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}

.grid-1 {
  grid-template-columns: 1fr;
}

.grid-4 {
  grid-template-columns: 1fr 1fr;
}

.grid-9 {
  grid-template-columns: 1fr 1fr 1fr;
}

.video-item {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  background: #000;
  border: 2px solid #1a2a3a;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
}

.video-item:hover {
  border-color: #4fd1c5;
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(79, 209, 197, 0.25);
}

.video-item.status-normal {
  border-color: #1a6a3a;
}

.video-item.status-offline {
  border-color: #333333;
  opacity: 0.85;
}

.video-area {
  flex: none;
  position: relative;
  width: 100%;
  max-width: 100%;
  min-height: 0;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.video-real {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  object-fit: contain;
  background: #000000;
}

.stream-tip {
  position: absolute;
  inset: 0;
  color: #ffffff;
  background: radial-gradient(circle at 30% 30%, #1a3a2c 0%, #0c1e16 60%, #06120c 100%);
  font-size: 13px;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 18px;
}

.video-center-icon {
  font-size: 42px;
  opacity: 0.28;
  animation: icon-glow 3s ease-in-out infinite;
}

.stream-tip-text {
  position: relative;
  z-index: 1;
  color: #dce8f2;
}

.scanline {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 0%, transparent 49%, rgba(255, 255, 255, 0.03) 50%, transparent 51%, transparent 100%);
  background-size: 100% 4px;
  pointer-events: none;
  animation: scan-move 8s linear infinite;
}

.noise-overlay {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    radial-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 3px 3px, 5px 5px;
  background-position: 0 0, 1px 2px;
  pointer-events: none;
  opacity: 0.7;
}

.cam-header,
.cam-top-right,
.cam-status,
.cam-footer-right {
  position: absolute;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  backdrop-filter: blur(4px);
  z-index: 2;
}

.cam-header {
  top: 8px;
  left: 8px;
  gap: 8px;
  max-width: calc(100% - 90px);
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.cam-ch {
  color: #4fd1c5;
  font-family: "Courier New", monospace;
  letter-spacing: 1px;
  flex-shrink: 0;
}

.cam-name {
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cam-top-right {
  top: 8px;
  right: 8px;
  gap: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-family: "Courier New", monospace;
}

.rec-dot,
.rec-text {
  color: #e74c3c;
}

.rec-dot {
  animation: pulse-dot 1s ease-in-out infinite;
}

.rec-text {
  font-weight: 700;
  letter-spacing: 1px;
}

.cam-status {
  bottom: 8px;
  left: 8px;
  gap: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
}

.status-dot {
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
  background: #555555;
}

.status-text {
  color: #ffffff;
}

.cam-footer-right {
  right: 8px;
  bottom: 8px;
  max-width: 48%;
  padding: 4px 10px;
  font-size: 11px;
}

.location-text {
  color: #95a5a6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.window-footer {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: #0a141e;
  border-top: 1px solid #1a2a3a;
  font-size: 11px;
  flex-shrink: 0;
}

.footer-loc {
  color: #7f98b5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-fps {
  color: #4fd1c5;
  flex-shrink: 0;
}

@keyframes icon-glow {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.08); }
}

@keyframes scan-move {
  from { background-position: 0 0; }
  to { background-position: 0 100%; }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
}
</style>
