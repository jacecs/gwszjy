<template>
  <div class="alert-detail">
    <header class="page-header">
      <button class="back-btn" @click="goBack">
        <span>◀</span>
        <span>返回主页面</span>
      </button>
      <div class="title-wrap">
        <div class="title">设备预警详情与智能分析</div>
        <div class="subtitle">
          {{ device.name }} · {{ device.id }} · 最近更新 {{ updatedAtText }}
          <span class="sub-tag">数据源：{{ dataSourceLabel }}</span>
        </div>
      </div>
      <div class="actions">
        <button class="btn ghost" @click="refreshRealtime">
          <span>🔄</span>
          <span>刷新实时数据</span>
        </button>
        <button class="btn primary" :disabled="aiAnalyzing" @click="runAiAnalysis">
          <span v-if="aiAnalyzing" class="loading-dot"></span>
          <span>{{ aiAnalyzing ? 'AI 分析中…' : (aiResult ? '重新分析' : '智能分析') }}</span>
        </button>
      </div>
    </header>

    <main class="page-body">
      <!-- 左：设备基本信息 -->
      <section class="card device-card">
        <div class="card-header">
          <span class="card-title">设备基本信息</span>
          <span class="card-tag normal">在线</span>
        </div>
        <div class="kv-grid">
          <div class="kv"><div class="k">设备名称</div><div class="v">{{ device.name }}</div></div>
          <div class="kv"><div class="k">型号</div><div class="v">{{ device.model }}</div></div>
          <div class="kv"><div class="k">设备编号</div><div class="v">{{ device.id }}</div></div>
          <div class="kv"><div class="k">位置</div><div class="v">{{ device.location }}</div></div>
          <div class="kv"><div class="k">经纬度</div><div class="v">{{ device.lon }}, {{ device.lat }}</div></div>
          <div class="kv"><div class="k">投运时间</div><div class="v">{{ device.installedAt }}</div></div>
          <div class="kv"><div class="k">制造厂商</div><div class="v">{{ device.manufacturer }}</div></div>
          <div class="kv"><div class="k">维护人员</div><div class="v">{{ device.maintainer }}</div></div>
        </div>
      </section>

      <!-- 右：预警/报警详情 -->
      <section class="card alert-card" :style="{ '--accent': severityColor.main, '--accent-bg': severityColor.bg }">
        <div class="card-header">
          <span class="card-title">预警 / 报警详情</span>
          <span class="card-tag danger">{{ alert.level }}</span>
        </div>
        <div class="alert-main">
          <div class="alert-type">{{ alert.type }}</div>
          <div class="alert-msg">{{ alert.message }}</div>
          <div class="alert-readout">
            <div class="readout-item">
              <div class="readout-label">当前读数</div>
              <div class="readout-value danger">{{ alert.currentValue }} {{ alert.threshold.unit }}</div>
            </div>
            <div class="readout-item">
              <div class="readout-label">阈值范围</div>
              <div class="readout-value">{{ alert.threshold.min }} ~ {{ alert.threshold.max }} {{ alert.threshold.unit }}</div>
            </div>
            <div class="readout-item">
              <div class="readout-label">触发时间</div>
              <div class="readout-value">{{ alert.triggeredAt }}</div>
            </div>
            <div class="readout-item">
              <div class="readout-label">持续时长</div>
              <div class="readout-value">{{ alert.durationMin }} 分钟</div>
            </div>
          </div>
          <div class="alert-foot">
            <span class="pill">状态：{{ alert.status }}</span>
            <span class="pill">处理人：{{ alert.handler || '—' }}</span>
            <span class="pill">代码：{{ alert.code }}</span>
          </div>
        </div>
      </section>

      <!-- 底部跨列：AI 智能分析 -->
      <section class="card ai-card span-2">
        <div class="card-header">
          <span class="card-title">AI 智能分析 <span class="sub-subtle">（{{ aiSourceLabel }}）</span></span>
          <div class="export-actions">
            <button class="btn small" :disabled="!aiResult" @click="downloadAiText">导出 TXT</button>
            <button class="btn small" :disabled="!aiResult" @click="downloadAiPdf">导出 PDF</button>
          </div>
        </div>

        <div class="ai-scroll">
          <div v-if="aiAnalyzing" class="ai-skeleton">
            <div class="sk-line w1"></div>
            <div class="sk-line w2"></div>
            <div class="sk-line w3"></div>
            <div class="sk-line w4"></div>
            <div class="sk-line w5"></div>
          </div>

          <div v-else-if="aiError" class="ai-error">
            ⚠ {{ aiError }}
            <button class="btn small" @click="runAiAnalysis">重新分析</button>
          </div>

          <div v-else-if="aiResult" class="ai-result">
            <div class="ai-meta">
              <span class="ai-pill">风险等级：<b>{{ aiResult.riskLevel }}</b></span>
              <span class="ai-pill subtle">预计恢复：<b>{{ aiResult.estimatedRecoveryMinutes }} 分钟</b></span>
            </div>
            <div class="ai-section">
              <div class="ai-h">原因分析</div>
              <div class="ai-body">{{ aiResult.reason }}</div>
            </div>
            <div class="ai-section">
              <div class="ai-h">处理方案</div>
              <ol class="ai-list">
                <li v-for="(s, i) in aiResult.solutions" :key="i">{{ s }}</li>
              </ol>
            </div>
            <div class="ai-section">
              <div class="ai-h">建议措施</div>
              <ol class="ai-list">
                <li v-for="(s, i) in aiResult.suggestions" :key="i">{{ s }}</li>
              </ol>
            </div>
          </div>

          <div v-else class="ai-empty">
            尚未发起分析。点击右上角「智能分析」，系统将把设备信息、告警数据与实时读数提交给 DeepSeek 大模型，并给出结构化的原因、方案与建议。
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAlertDetailStore } from '@/store/modules/alertDetail';

const route = useRoute();
const router = useRouter();
const store = useAlertDetailStore();

const device = computed(() => store.device);
const alert = computed(() => store.alert);
const severityColor = computed(() => store.severityColor);
const aiAnalyzing = computed(() => store.aiAnalyzing);
const aiResult = computed(() => store.aiResult);
const aiError = computed(() => store.aiError);

const updatedAt = ref(new Date());
const updatedAtText = computed(() => updatedAt.value.toLocaleTimeString('zh-CN', { hour12: false }));

const dataSourceLabel = computed(() => '前端模拟数据（等待 IoT 接口接入）');
const aiSourceLabel = computed(() => (store.useRealDeepSeek ? 'DeepSeek 真实 API' : '本地演示 Mock'));

let rtTimer = null;

function refreshRealtime() {
  store.updateRealtime();
  updatedAt.value = new Date();
}

function runAiAnalysis() {
  store.runAiAnalysis();
}

function downloadAiText() {
  store.downloadAiText();
}

function downloadAiPdf() {
  store.downloadAiPdf();
}

function goBack() {
  router.push('/');
}

function consumeRouteParams() {
  try {
    const raw = route.query.data;
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (parsed.device) store.setDevice(parsed.device);
      if (parsed.alert) store.setAlert(parsed.alert);
    }
  } catch (e) {
    // 解析失败时使用默认演示数据
  }
}

onMounted(async () => {
  consumeRouteParams();
  // 每 30 秒后台刷新一次实时读数
  rtTimer = setInterval(refreshRealtime, 30000);
});

onBeforeUnmount(() => {
  if (rtTimer) clearInterval(rtTimer);
});
</script>

<style scoped>
.alert-detail {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 28px;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(46, 204, 113, 0.12), transparent 60%),
    radial-gradient(900px 500px at 110% 10%, rgba(52, 152, 219, 0.1), transparent 60%),
    linear-gradient(180deg, #f5f9fb 0%, #eef3f6 100%);
  color: #2c3e50;
  font-family: -apple-system, "Microsoft YaHei", "PingFang SC", sans-serif;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(46, 204, 113, 0.25);
  border-radius: 14px;
  box-shadow: 0 6px 24px rgba(20, 40, 60, 0.06);
}

.back-btn, .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid #dfe4ea;
  background: #fff;
  color: #2c3e50;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.back-btn { border-color: #2ecc71; color: #27ae60; }
.back-btn:hover { background: #2ecc71; color: #fff; transform: translateX(-2px); }

.btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(20, 40, 60, 0.1); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn.primary {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: #fff;
  border-color: transparent;
}
.btn.ghost { border-color: #2ecc71; color: #27ae60; }
.btn.small { padding: 5px 10px; font-size: 12px; border-radius: 8px; }

.loading-dot {
  width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.6);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.title-wrap { flex: 1; text-align: center; }
.title { font-size: 17px; font-weight: 700; letter-spacing: 0.5px; }
.subtitle { margin-top: 3px; font-size: 12px; color: #7f8c8d; }

.sub-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff7e6;
  color: #d48806;
  font-size: 11px;
  font-weight: 600;
}
.sub-subtle { font-size: 11px; color: #7f8c8d; font-weight: 500; }

.actions { display: flex; gap: 10px; }

/* 主体区：两列 + 底部跨列 AI 区 */
.page-body {
  flex: 1;
  min-height: 0;
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(0, auto);
  gap: 16px;
  overflow-y: auto;
  padding-right: 4px;
  align-content: start;
}
.page-body::-webkit-scrollbar { width: 8px; }
.page-body::-webkit-scrollbar-thumb { background: rgba(46,204,113,0.3); border-radius: 999px; }
.page-body::-webkit-scrollbar-track { background: transparent; }

.card {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 4px 20px rgba(20, 40, 60, 0.06);
}
.card.span-2 { grid-column: span 2; }

@media (max-width: 960px) {
  .page-body { grid-template-columns: 1fr; }
  .card.span-2 { grid-column: span 1; }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px dashed rgba(0,0,0,0.08);
  margin-bottom: 10px;
}
.card-title { font-size: 14px; font-weight: 700; color: #2c3e50; }
.card-tag { font-size: 11px; padding: 3px 10px; border-radius: 999px; }
.card-tag.normal { background: #e8f8f0; color: #27ae60; }
.card-tag.danger { background: var(--accent-bg, #fdecea); color: var(--accent, #e74c3c); }

/* 设备信息 */
.kv-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
}
.kv {
  display: flex;
  justify-content: space-between;
  padding: 7px 10px;
  background: #f7faf8;
  border-radius: 8px;
}
.kv .k { color: #7f8c8d; font-size: 12px; }
.kv .v { color: #2c3e50; font-size: 13px; font-weight: 500; }

/* 告警 */
.alert-card { border-left: 4px solid var(--accent); }
.alert-main { display: flex; flex-direction: column; gap: 10px; }
.alert-type { font-size: 16px; font-weight: 700; color: var(--accent); }
.alert-msg { font-size: 13px; color: #34495e; line-height: 1.6; }
.alert-readout {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
@media (max-width: 720px) { .alert-readout { grid-template-columns: repeat(2, 1fr); } }
.readout-item {
  padding: 8px 10px;
  background: #f7faf8;
  border-radius: 8px;
}
.readout-label { font-size: 11px; color: #7f8c8d; margin-bottom: 4px; }
.readout-value { font-size: 14px; font-weight: 700; color: #2c3e50; }
.readout-value.danger { color: var(--accent); }
.alert-foot { display: flex; gap: 8px; flex-wrap: wrap; }
.pill {
  font-size: 11px;
  color: #34495e;
  background: #eef2f6;
  padding: 3px 10px;
  border-radius: 999px;
}

/* AI 卡片 */
.ai-card { display: flex; flex-direction: column; min-height: 260px; }
.export-actions { display: flex; gap: 8px; }

.ai-skeleton { display: flex; flex-direction: column; gap: 8px; padding: 4px 0; }
.sk-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #eef2f6 0%, #dbe3ea 50%, #eef2f6 100%);
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
}
.sk-line.w1 { width: 80%; }
.sk-line.w2 { width: 70%; }
.sk-line.w3 { width: 90%; }
.sk-line.w4 { width: 55%; }
.sk-line.w5 { width: 75%; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.ai-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  max-height: calc(100vh - 280px);
}
.ai-scroll::-webkit-scrollbar { width: 6px; }
.ai-scroll::-webkit-scrollbar-thumb { background: rgba(46,204,113,0.35); border-radius: 999px; }
.ai-scroll::-webkit-scrollbar-track { background: transparent; }

.ai-error {
  padding: 12px 14px;
  background: #fdecea;
  color: #c0392b;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ai-empty {
  color: #7f8c8d;
  font-size: 13px;
  line-height: 1.8;
  padding: 18px 16px;
  background: #f7faf8;
  border-radius: 10px;
}

.ai-result { display: flex; flex-direction: column; gap: 10px; }
.ai-meta { display: flex; gap: 10px; flex-wrap: wrap; }
.ai-pill {
  padding: 3px 12px;
  border-radius: 999px;
  background: #e8f8f0;
  color: #27ae60;
  font-size: 12px;
}
.ai-pill.subtle { background: #eef2f6; color: #34495e; }
.ai-section {
  padding: 10px 12px;
  background: #f7faf8;
  border-radius: 10px;
  border-left: 3px solid #2ecc71;
}
.ai-h { font-size: 13px; font-weight: 700; color: #2c3e50; margin-bottom: 4px; }
.ai-body { font-size: 13px; color: #34495e; line-height: 1.8; }
.ai-list { margin: 0; padding-left: 20px; font-size: 13px; color: #34495e; line-height: 1.8; }
.ai-list li { margin-bottom: 3px; }
</style>
