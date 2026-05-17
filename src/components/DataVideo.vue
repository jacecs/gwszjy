<template>
  <div class="panel">
    <div class="panel-title">{{ title }}</div>
    <div class="data-card">
      <div class="data-video">
        切换摄像头
        <select v-model="streamUrl">
          <option :value="item.url" v-bind:key="index" v-for="(item,index) in streams">{{item.name}}</option>
        </select>
      </div>
      <Video :streams="selStream"></Video>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import Video from './COMS/Video.vue'
const props = defineProps({
  title: String,
  data: Array
})

const defaultStreams = [{
  name: '摄像头1',
  url: 'http://localhost/live/stream1.flv'
},
{
  name: '摄像头2',
  url: 'http://localhost/live/stream2.flv'
},
{
  name: '摄像头3',
  url: 'http://localhost/live/stream3.flv'
},
{
  name: '摄像头4',
  url: 'http://localhost/live/stream4.flv'
}]

const streamUrl = ref('')

const streams = computed(() => {
  return props.data && props.data.length ? props.data : defaultStreams
})

const selStream = computed(() => {
  return streams.value.find(item => item.url === streamUrl.value)
})

watch(streams, (newStreams) => {
  streamUrl.value = newStreams[0]?.url || ''
}, {
  immediate: true
})

onMounted(() => {
  streamUrl.value = streams.value[0]?.url || ''
})

</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-title {
  font-size: 13px;
  font-weight: 700;
  color: #27ae60;
  padding-bottom: 8px;
  border-bottom: 2px solid #2ecc71;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.5px;
}

.data-card {
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 14px;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.data-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.data-label {
  font-size: 12px;
  color: #7f8c8d;
  letter-spacing: 0.5px;
}

.data-status {
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.status-good {
  background: #e8f8f0;
  color: #27ae60;
}

.status-warning {
  background: #fef5e7;
  color: #e67e22;
}

.status-bad {
  background: #fdedec;
  color: #e74c3c;
}

.data-value {
  font-size: 26px;
  font-weight: 700;
  color: #2c3e50;
}

.data-unit {
  font-size: 12px;
  color: #95a5a6;
  margin-left: 4px;
  font-weight: 400;
}

.data-chart {
  height: 100px;
  /* margin-top: 10px;
  display: flex;
  align-items: flex-end;
  gap: 3px; */
}

.chart-bar {
  flex: 1;
  background: linear-gradient(180deg, #2ecc71 0%, #a9dfbf 100%);
  border-radius: 3px 3px 0 0;
  transition: all 0.3s;
}

.chart-bar:hover {
  background: linear-gradient(180deg, #27ae60 0%, #82e0aa 100%);
}
.data-video {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #333;
}
</style>
