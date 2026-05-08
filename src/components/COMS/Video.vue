<template>
  <div class="monitor-grid" :class="'grid-' + grid">
    <div class="video-item">
      <video ref="videoRef" autoplay muted playsinline controls></video>
      <!-- <div class="title">{{ item.name }}</div> -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
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
const players = []

const createPlayer = (video, url) => {
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
watch(() => props.streams, async () => {
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
  if (video) {
    createPlayer(video, url)
  }
},
  {
    deep: true
  }
)


onMounted(() => {
  // const video = videoRef.value
  // const player = createPlayer(video, props.streams.url)
  // players.push(player)
})

onBeforeUnmount(() => {
  players.forEach(p => {
    if (p) {
      p.pause()
      p.unload()
      p.detachMediaElement()
      p.destroy()
    }
  })
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

.title {
  position: absolute;
  bottom: 5px;
  left: 5px;
  color: #fff;
  font-size: 12px;
}
</style>