/**
 * LLM 多模型接入 · 前端统一入口（极简版）
 *
 * 思路：
 *   1. listModels()：从后端拿到「可用模型列表 + 每个模型的 apiKey/baseUrl/modelId」
 *      返回结构：[{ key, label, provider, apiKey, baseUrl, modelId, available }]
 *   2. analyzeDeviceAlert(modelKey, payload)：根据 modelKey 从缓存里拿配置，
 *      直接 POST 到对应平台的 /chat/completions（OpenAI 兼容协议），
 *      解析模型返回的 JSON → { reason, solutions, suggestions, riskLevel, estimatedRecoveryMinutes }
 *
 * Provider 当前内置：
 *   - 'deepseek'          → DeepSeek Chat
 *   - 'doubao'/'volc-ark'/'ark'  → 火山方舟 · 豆包
 */

import axios from 'axios';
import { LLM_MODELS_ENDPOINT, LLM_MOCK_ENABLED } from './config';
import { matchPlaybooks, renderPlaybooksForPrompt } from './alertPlaybooks';

// 模块级缓存：从 listModels 拿到的模型配置
let _modelCache = null;

/** 拉取模型列表（带简单缓存） */
export async function listModels({ refresh = false } = {}) {
  if (LLM_MOCK_ENABLED) {
    return [
      { key: 'deepseek-chat',  label: 'DeepSeek（深度求索）',   provider: 'deepseek', available: true },
      { key: 'doubao-pro-32k', label: '火山方舟 · 豆包 Pro 32K', provider: 'doubao',   available: true }
    ];
  }
  if (_modelCache && !refresh) return _modelCache;
  try {
    const res = await axios.get(LLM_MODELS_ENDPOINT, { timeout: 8000 });
    const list = Array.isArray(res?.data?.data)
      ? res.data.data
      : (Array.isArray(res?.data) ? res.data : []);
    _modelCache = list;
    return list;
  } catch (e) {
    _modelCache = [];
    return [];
  }
}

export function invalidateModelCache() {
  _modelCache = null;
}

function getModelByKey(key) {
  const list = _modelCache || [];
  return list.find((m) => m.key === key) || null;
}

// ============================================================
// Prompt 构建
// ============================================================

export function buildPromptPayload(device, alertData, metrics = {}) {
  const normal = metrics.normal || {};
  const abnormal = metrics.abnormal || {};
  const summarize = (obj = {}) => {
    if (Array.isArray(obj)) {
      const values = obj.map((p) => p.value).filter((v) => typeof v === 'number');
      if (!values.length) return '无数据';
      const max = Math.max(...values).toFixed(2);
      const min = Math.min(...values).toFixed(2);
      const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
      return `最近${values.length}个采样点，最大值 ${max}，最小值 ${min}，平均值 ${avg}`;
    }
    return obj && typeof obj === 'object' ? JSON.stringify(obj) : String(obj ?? '无数据');
  };

  return {
    device: {
      id: device.id,
      name: device.name,
      model: device.model,
      type: device.type,
      location: device.location,
      installedAt: device.installedAt,
      maintainer: device.maintainer
    },
    'alert': {
      code: alertData.code,
      type: alertData.type,
      level: alertData.level,
      message: alertData.message,
      triggeredAt: alertData.triggeredAt,
      durationMin: alertData.durationMin,
      threshold: alertData.threshold,
      currentValue: alertData.currentValue
    },
    metrics: {
      normal: {
        temperature: summarize(normal.temperature),
        humidity: summarize(normal.humidity),
        power: summarize(normal.power)
      },
      abnormal: {
        temperature: summarize(abnormal.temperature),
        humidity: summarize(abnormal.humidity),
        power: summarize(abnormal.power)
      }
    }
  };
}

/**
 * 构建系统提示词
 * @param {Object} payload  { device, alert, metrics }  可选；传入后会自动注入匹配到的企业预案
 */
function buildSystemPrompt(payload) {
  const base = [
    '你是一名工业设备运维专家。用户会给你一份设备告警信息，请严格按下面 JSON 格式返回分析，',
    '只输出一个 JSON 对象，不要输出任何额外文字，不要用 markdown 代码块包裹：',
    '{',
    '  "reason": "原因分析，100 字以内",',
    '  "solutions": ["处理步骤 1", "处理步骤 2", "处理步骤 3"],',
    '  "suggestions": ["建议措施 1", "建议措施 2"],',
    '  "riskLevel": "低|中|高",',
    '  "estimatedRecoveryMinutes": 数字',
    '}',
    '注意：',
    '  - reason 结合设备类型、告警级别、当前读数给出判断；',
    '  - solutions 给出至少 3 条可执行的处理步骤；',
    '  - suggestions 给出至少 2 条长期优化/预防建议；',
    '  - estimatedRecoveryMinutes 为数字，单位分钟。'
  ].join('\n');

  // 注入匹配到的企业预案（如果传入了 payload）
  if (payload && (payload.device || payload.alert)) {
    const matched = matchPlaybooks(payload.device, payload.alert, payload.metrics, { top: 2 });
    if (matched.length) {
      return base + '\n\n' + renderPlaybooksForPrompt(matched);
    }
  }
  return base;
}

/**
 * 对外：根据 payload 查询匹配到哪些预案（供页面展示"当前匹配到的预案列表
 */
export function matchPlaybooksFor(payload) {
  if (!payload) return [];
  return matchPlaybooks(payload.device, payload.alert, payload.metrics, { top: 3 });
}

function buildUserPrompt(payload) {
  const lines = [];
  lines.push('【设备信息】');
  lines.push(JSON.stringify(payload.device, null, 2));
  lines.push('【告警信息】');
  lines.push(JSON.stringify(payload.alert, null, 2));
  lines.push('【正常读数区间（参考）】');
  lines.push(JSON.stringify(payload.metrics.normal, null, 2));
  lines.push('【异常读数】');
  lines.push(JSON.stringify(payload.metrics.abnormal, null, 2));
  return lines.join('\n');
}

// ============================================================
// Provider 实现：按 provider 名直接发请求到第三方平台
// ============================================================

function defaultBaseUrlByProvider(provider) {
  switch (provider) {
    case 'deepseek':
      return 'https://api.deepseek.com';
    case 'doubao':
    case 'volc-ark':
    case 'ark':
      return 'https://ark.cn-beijing.volces.com/api/v3';
    default:
      return 'https://api.deepseek.com';
  }
}

function defaultModelIdByProvider(provider) {
  switch (provider) {
    case 'deepseek':
      return 'deepseek-chat';
    case 'doubao':
    case 'volc-ark':
    case 'ark':
      return 'doubao-pro-32k';
    default:
      return 'deepseek-chat';
  }
}

/**
 * 调用第三方平台的 /chat/completions
 * @param {Object} cfg           从 listModels 拿到的模型配置
 * @param {Array}  messages      [{ role, content }]
 * @param {Object} opts          { temperature, timeout }
 * @returns {Promise<string>}    模型返回的文本
 */
async function chatWithProvider(cfg, messages, opts = {}) {
  const provider = String(cfg.provider || '').toLowerCase();
  const apiKey = cfg.apiKey;
  const baseUrl = String(cfg.baseUrl || '').replace(/\/$/, '') || defaultBaseUrlByProvider(provider);
  const modelId = cfg.modelId || defaultModelIdByProvider(provider);

  if (!apiKey) {
    throw new Error('模型「' + (cfg.label || cfg.key) + '」未配置 API Key');
  }

  const url = baseUrl + '/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + apiKey
  };

  const body = {
    model: modelId,
    messages: messages,
    temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.2
  };

  try {
    const res = await axios.post(url, body, {
      headers: headers,
      timeout: opts.timeout || 60000
    });
    const content = res?.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('模型响应为空');
    return content;
  } catch (e) {
    const msg =
      (e && e.response && e.response.data && (e.response.data.error && e.response.data.error.message))
      || (e && e.response && e.response.data && e.response.data.message)
      || (e && e.message)
      || 'LLM 请求失败';
    throw new Error(msg);
  }
}

// ============================================================
// 把模型返回的文本解析成结构化对象
// ============================================================

function parseAiJson(content) {
  if (!content) {
    return { reason: '', solutions: [], suggestions: [], riskLevel: '中', estimatedRecoveryMinutes: 0 };
  }
  let text = String(content).trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === 'object') {
      return {
        reason: String(obj.reason || ''),
        solutions: Array.isArray(obj.solutions) ? obj.solutions.map(String) : [],
        suggestions: Array.isArray(obj.suggestions) ? obj.suggestions.map(String) : [],
        riskLevel: String(obj.riskLevel || '中'),
        estimatedRecoveryMinutes: Number(obj.estimatedRecoveryMinutes) || 0
      };
    }
  } catch (err) {
    // 解析失败时：退化为文本展示
  }
  return {
    reason: text,
    solutions: [],
    suggestions: [],
    riskLevel: '中',
    estimatedRecoveryMinutes: 0
  };
}

function buildMockAnalyzeResult() {
  return {
    reason: '当前设备在最近 24 小时内多次触发告警阈值，读数明显偏离历史正常区间，疑似运行参数漂移或传感器故障。',
    solutions: [
      '立即检查传感器校准状态，必要时替换备用件；',
      '降载或停机冷却，观察温度/功率读数是否恢复至正常区间；',
      '调紧告警阈值或增加相关性告警规则，减少漏报；',
      '联系运维人员现场排查，按故障处置流程记录。'
    ],
    suggestions: [
      '建议每日定时校验关键传感器读数（温度/湿度/功率）；',
      '在告警集中时段触发自动工单，避免人工遗漏；',
      '定期导出 AI 分析报告，用于故障复盘与阈值优化。'
    ],
    riskLevel: '中',
    estimatedRecoveryMinutes: 30
  };
}

// ============================================================
// 对外：告警分析主函数
// ============================================================

export async function analyzeDeviceAlert(modelKey, payload, opts = {}) {
  if (LLM_MOCK_ENABLED) {
    await new Promise((r) => setTimeout(r, 900));
    return buildMockAnalyzeResult();
  }

  const cfg = getModelByKey(modelKey);
  if (!cfg) throw new Error('未找到模型配置，请先调用 listModels()');
  if (cfg.available === false) throw new Error('模型「' + (cfg.label || cfg.key) + '」当前不可用');

  const messages = [
    { role: 'system', content: buildSystemPrompt(payload) },
    { role: 'user', content: buildUserPrompt(payload) }
  ];
  const raw = await chatWithProvider(cfg, messages, opts);
  return parseAiJson(raw);
}

export async function callLLM(modelKey, messages, opts = {}) {
  if (LLM_MOCK_ENABLED) {
    return { role: 'assistant', content: '（前端 Mock）后端尚未配置可用的 LLM 模型，请联系运维开通。' };
  }
  const cfg = getModelByKey(modelKey);
  if (!cfg) throw new Error('未找到模型配置，请先调用 listModels()');
  const content = await chatWithProvider(cfg, messages, opts);
  return { role: 'assistant', content: content };
}
