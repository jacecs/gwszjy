import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  analyzeDeviceAlert,
  buildPromptPayload,
  listModels,
  matchPlaybooksFor
} from '@/utils/llm';

// ============================================================
// Mock 数据（真实接入后可从业务后端拉）
// ============================================================

const mockDevice = {
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
};

const mockAlert = {
  code: 'E-HIGH-TEMP-001',
  type: '温度异常',
  level: '严重',
  message: '塔内温度持续高于阈值上限（>72°C），持续时长超过 15 分钟',
  triggeredAt: '2026-06-04 09:12:30',
  durationMin: 18,
  threshold: { min: 45, max: 72, unit: '°C' },
  currentValue: 78.4,
  status: '未处理',
  handler: null
};

const mockHistory = Array.from({ length: 12 }).map((_, i) => ({
  id: `HIST-${1000 + i}`,
  type: i % 3 === 0 ? '温度异常' : i % 3 === 1 ? '湿度异常' : '设备离线',
  level: i % 4 === 0 ? '严重' : i % 4 === 1 ? '警告' : '提示',
  message: `历史告警 #${i + 1}：传感器读数超过阈值，持续时间 ${(i + 1) * 2} 分钟`,
  triggeredAt: `2026-05-${String(20 + (i % 10)).padStart(2, '0')} ${String(8 + (i % 8)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00`,
  durationMin: (i + 1) * 2,
  handler: i % 2 === 0 ? '王工' : '李工',
  status: i % 2 === 0 ? '已解决' : '已忽略'
}));

function genTimeSeries(base, noise, anomalyIndex, anomalyDelta) {
  const now = Date.now();
  const points = [];
  for (let i = 23; i >= 0; i--) {
    const t = new Date(now - i * 3600 * 1000);
    const label = `${String(t.getHours()).padStart(2, '0')}:00`;
    let value = base + (Math.sin(i / 2) * noise) + (Math.random() - 0.5) * (noise * 0.4);
    if (i === anomalyIndex) value += anomalyDelta;
    points.push({ time: label, value: Number(value.toFixed(2)) });
  }
  return points;
}

// ============================================================
// Store
// ============================================================

export const useAlertDetailStore = defineStore('alertDetail', () => {
  // —— 基础数据 ——
  const device = ref({ ...mockDevice });
  const alertInfo = ref({ ...mockAlert });
  const historyList = ref([...mockHistory]);
  const historyPage = ref(1);
  const historySize = ref(5);

  const normalMetrics = ref({
    temperature: genTimeSeries(60, 5, -1, 0),
    humidity: genTimeSeries(55, 6, -1, 0),
    power: genTimeSeries(38, 4, -1, 0)
  });
  const abnormalMetrics = ref({
    temperature: genTimeSeries(60, 5, 4, 18),
    humidity: genTimeSeries(55, 6, 4, -20),
    power: genTimeSeries(38, 4, 4, 10)
  });

  // —— AI 分析状态 ——
  const aiAnalyzing = ref(false);
  const aiResult = ref(null);
  const aiError = ref('');
  /** 当前告警匹配到的企业预案（供页面展示 + prompt 注入） */
  const matchedPlaybooks = ref([]);

  // —— 多模型切换 ——
  /** 当前选中的模型 key（默认 deepseek-chat，等模型列表拉回来后会自动更新为第一个可用模型） */
  const activeModel = ref('deepseek-chat');
  /** 从后端拉到的模型列表：[{ key, label, available }] */
  const availableModels = ref([]);
  /** 模型列表是否在加载（用于页面 loading） */
  const loadingModels = ref(false);

  // —— 历史分页计算 ——
  const historyTotal = computed(() => historyList.value.length);
  const historyPages = computed(() => Math.ceil(historyTotal.value / historySize.value || 1));
  const pagedHistory = computed(() => {
    const start = (historyPage.value - 1) * historySize.value;
    return historyList.value.slice(start, start + historySize.value);
  });

  // —— 告警级别配色 ——
  const severityColor = computed(() => {
    const level = alertInfo.value.level || '';
    if (level.includes('严重')) return { main: '#e74c3c', bg: 'rgba(231,76,60,0.08)', label: '严重' };
    if (level.includes('警告')) return { main: '#e67e22', bg: 'rgba(230,126,34,0.08)', label: '警告' };
    return { main: '#2ecc71', bg: 'rgba(46,204,113,0.08)', label: '提示' };
  });

  // ============================================================
  // 动作：数据更新
  // ============================================================

  function setDevice(payload) {
    if (!payload) return;
    device.value = { ...mockDevice, ...payload };
  }

  function setAlert(payload) {
    if (!payload) return;
    alertInfo.value = { ...mockAlert, ...payload };
    aiResult.value = null;
    aiError.value = '';
    // 告警变更时重新匹配预案
    const payloadForMatch = {
      device: device.value,
      'alert': alertInfo.value,
      metrics: {
        normal: normalMetrics.value,
        abnormal: abnormalMetrics.value
      }
    };
    matchedPlaybooks.value = matchPlaybooksFor(payloadForMatch);
  }

  function setHistory(list) {
    if (Array.isArray(list)) historyList.value = list;
  }

  function gotoHistoryPage(page) {
    const safe = Math.min(Math.max(1, page), historyPages.value || 1);
    historyPage.value = safe;
  }

  function updateRealtime() {
    const now = new Date();
    const label = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    ['temperature', 'humidity', 'power'].forEach((key) => {
      const arr = abnormalMetrics.value[key];
      if (arr.length) {
        const last = arr[arr.length - 1];
        arr.push({ time: label, value: Number((last.value + (Math.random() - 0.5) * 2).toFixed(2)) });
        if (arr.length > 24) arr.shift();
      }
    });
  }

  // ============================================================
  // 动作：模型列表 & 切换
  // ============================================================

  async function refreshModelList() {
    loadingModels.value = true;
    try {
      const list = await listModels();
      availableModels.value = Array.isArray(list) ? list : [];
      // 若当前 activeModel 在列表里不可用，自动切换到第一个可用模型
      const current = availableModels.value.find((m) => m.key === activeModel.value);
      if (!current || current.available === false) {
        const firstReady = availableModels.value.find((m) => m.available !== false);
        if (firstReady) activeModel.value = firstReady.key;
      }
    } catch (e) {
      availableModels.value = [];
    } finally {
      loadingModels.value = false;
    }
  }

  function setActiveModel(modelKey) {
    if (!modelKey) return;
    activeModel.value = modelKey;
    aiResult.value = null;
    aiError.value = '';
  }

  // 页面挂载后立刻算一次匹配的预案（因为 device/alert 初始化就是完整 mock 数据）
  const payloadForInit = {
    device: device.value,
    'alert': alertInfo.value,
    metrics: {
      normal: normalMetrics.value,
      abnormal: abnormalMetrics.value
    }
  };
  matchedPlaybooks.value = matchPlaybooksFor(payloadForInit);

  // ============================================================
  // 动作：AI 分析
  // ============================================================

  async function runAiAnalysis() {
    aiAnalyzing.value = true;
    aiError.value = '';
    aiResult.value = null;
    try {
      const payload = buildPromptPayload(device.value, alertInfo.value, {
        normal: normalMetrics.value,
        abnormal: abnormalMetrics.value
      });
      const res = await analyzeDeviceAlert(activeModel.value, payload);
      aiResult.value = res;
    } catch (e) {
      aiError.value = (e && e.message) || 'AI 分析请求失败，请稍后重试';
    } finally {
      aiAnalyzing.value = false;
    }
  }

  // ============================================================
  // 动作：导出
  // ============================================================

  function exportAiAsText() {
    if (!aiResult.value) return '';
    const lines = [];
    lines.push(`【设备预警智能分析报告】`);
    lines.push(`设备：${device.value.name}（${device.value.id}）`);
    lines.push(`位置：${device.value.location}`);
    lines.push(`告警：${alertInfo.value.type} / 级别：${alertInfo.value.level}`);
    lines.push(`触发时间：${alertInfo.value.triggeredAt}，持续时长：${alertInfo.value.durationMin} 分钟`);
    lines.push('');
    lines.push('=== 原因分析 ===');
    lines.push(aiResult.value.reason || '');
    lines.push('');
    lines.push('=== 处理方案 ===');
    (aiResult.value.solutions || []).forEach((s, i) => {
      lines.push(`${i + 1}. ${s}`);
    });
    lines.push('');
    lines.push('=== 建议措施 ===');
    (aiResult.value.suggestions || []).forEach((s, i) => {
      lines.push(`${i + 1}. ${s}`);
    });
    lines.push('');
    lines.push(`生成时间：${new Date().toLocaleString('zh-CN')}`);
    return lines.join('\n');
  }

  function downloadAiText() {
    const text = exportAiAsText();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `预警分析-${device.value.id}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function buildPrintableHtml() {
    const r = aiResult.value || { reason: '', solutions: [], suggestions: [] };
    return `<!doctype html><html><head><meta charset="utf-8"><title>设备预警智能分析报告</title>
      <style>
        body{font-family:"Microsoft YaHei",PingFang SC,sans-serif;color:#2c3e50;padding:30px;line-height:1.7;}
        h1{color:#27ae60;border-bottom:2px solid #2ecc71;padding-bottom:8px;}
        h2{color:#2c3e50;margin-top:20px;border-left:4px solid #2ecc71;padding-left:10px;}
        .kv{background:#f8f9fa;padding:12px 16px;border-radius:8px;margin-bottom:12px;}
        .kv p{margin:4px 0;}
        ol{margin-left:20px;}
        .tag{display:inline-block;padding:2px 8px;border-radius:12px;background:#e74c3c;color:#fff;font-size:12px;margin-left:6px;}
      </style></head><body>
      <h1>设备预警智能分析报告</h1>
      <div class="kv">
        <p><b>设备名称：</b>${device.value.name}</p>
        <p><b>设备编号：</b>${device.value.id}</p>
        <p><b>型号：</b>${device.value.model}</p>
        <p><b>安装位置：</b>${device.value.location}</p>
        <p><b>告警类型：</b>${alertInfo.value.type}<span class="tag">${alertInfo.value.level}</span></p>
        <p><b>触发时间：</b>${alertInfo.value.triggeredAt}，持续时长：${alertInfo.value.durationMin} 分钟</p>
        <p><b>告警描述：</b>${alertInfo.value.message}</p>
      </div>
      <h2>一、原因分析</h2>
      <p>${(r.reason || '').replace(/\n/g, '<br/>')}</p>
      <h2>二、处理方案</h2>
      <ol>${(r.solutions || []).map(s => `<li>${s}</li>`).join('')}</ol>
      <h2>三、建议措施</h2>
      <ol>${(r.suggestions || []).map(s => `<li>${s}</li>`).join('')}</ol>
      <p style="margin-top:30px;color:#7f8c8d;font-size:12px;">生成时间：${new Date().toLocaleString('zh-CN')}</p>
      </body></html>`;
  }

  function downloadAiPdf() {
    const html = buildPrintableHtml();
    const win = window.open('', '_blank', 'width=900,height=800');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.focus();
      try { win.print(); } catch (e) { /* 让用户手动 Ctrl+P */ }
    }, 400);
  }

  // ============================================================
  // 对外导出
  // ============================================================

  return {
    // 状态
    device,
    alertInfo,
    historyList,
    historyPage,
    historySize,
    historyTotal,
    historyPages,
    pagedHistory,
    normalMetrics,
    abnormalMetrics,
    aiAnalyzing,
    aiResult,
    aiError,
    matchedPlaybooks,
    severityColor,
    activeModel,
    availableModels,
    loadingModels,

    // 动作
    setDevice,
    setAlert,
    setHistory,
    gotoHistoryPage,
    updateRealtime,
    runAiAnalysis,
    setActiveModel,
    refreshModelList,
    exportAiAsText,
    downloadAiText,
    downloadAiPdf
  };
});
