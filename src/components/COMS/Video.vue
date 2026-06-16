<template>
  <div class="monitor-grid" :class="'grid-' + grid">
    <div class="video-item">
      <video v-show="!streamTip" ref="videoRef" autoplay muted playsinline controls></video>
      <div v-if="streamTip" class="stream-tip">{{ streamTip }}</div>
      <!-- <div class="title">{{ item.name }}</div> -->
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, watch, nextTick } from 'vue'
import flvjs from 'flv.js'

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
const players = []

const isRtspStream = (url = '') => /^rtsp:\/\//i.test(url)
const isFlvStream = (url = '') => /\.flv($|\?)/i.test(url)

const createPlayer = (video, url) => {
  console.log('视频信息', video, url)
  if (!video || !url) return null
  if (flvjs.isSupported()) {
    const player = flvjs.createPlayer({
      type: 'flv',
      url
    })
    console.log(player)
    if (player) {

      player.attachMediaElement(video)
      player.load()
      player.play()

      // 自动重连
      player.on(flvjs.Events.ERROR, () => {
        console.log('重连中...', url)
        player.unload()
        player.load()
        player.play()
      })
    }
    players.push(player)
    return player
  }
}
async function loadStream() {
  streamTip.value = ''
  players.forEach(p => {
    if (p) {
      p.pause()
      p.unload()
      p.detachMediaElement()
      p.destroy()
    }
  })
  players.length = 0
  await nextTick() // ⭐ 等 DOM 渲染完成
  const video = videoRef.value
  const url = props.streams?.url
  console.log('video', video)
  if (!url) {
    streamTip.value = '暂无视频地址'
    return
  }
  if (isRtspStream(url)) {
    streamTip.value = '浏览器不能直接播放 RTSP，请先转换为 HTTP-FLV、HLS 或 WebRTC 地址'
    return
  }
  if (video && isFlvStream(url)) {
    createPlayer(video, url)
    return
  }
  if (video) {
    video.src = url
    video.load()
    video.play?.()
  }
}

watch(() => props.streams?.url, loadStream,
  {
    immediate: true
  }
)


onBeforeUnmount(() => {
  players.forEach(p => {
    if (p) {
      p.pause()
      p.unload()
      p.detachMediaElement()
      p.destroy()
    }
  })
  players.length = 0
  if (videoRef.value) {
    videoRef.value.removeAttribute('src')
    videoRef.value.load()
  }
})
</script>

<style scoped>
.monitor-grid {
  display: grid;
  gap: 10px;
  width: 100%;
  height: 100%;
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
  background: #000;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stream-tip {
  min-height: 160px;
  height: 100%;
  padding: 20px;
  color: #ffffff;
  background: #111111;
  font-size: 13px;
  line-height: 1.6;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.title {
  position: absolute;
  bottom: 5px;
  left: 5px;
  color: #fff;
  font-size: 12px;
}
</style>
