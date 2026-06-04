import axios from 'axios';

const DEEPSEEK_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEEPSEEK_API_KEY) || 'DEEPSEEK_API_KEY_PLACEHOLDER';
const DEEPSEEK_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEEPSEEK_BASE_URL) || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEEPSEEK_MODEL) || 'deepseek-chat';

const USE_MOCK_FALLBACK = DEEPSEEK_API_KEY === 'DEEPSEEK_API_KEY_PLACEHOLDER' || !DEEPSEEK_API_KEY;
export { USE_MOCK_FALLBACK };

/**
 * 将设备信息 + 告警信息 + 数据上下文格式化为 prompt payload
 */
export function buildPromptPayload(device, alert, metrics = {}) {
  const normal = metrics.normal || {};
  const abnormal = metrics.abnormal || {};
  const summarize = (arr = []) => {
    if (!arr.length) return '无数据';
    const values = arr.map(p => p.value).filter(v => typeof v === 'number');
    if (!values.length) return '无数据';
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return `最近${values.length}个采样点，最大值 ${max.toFixed(2)}，最小值 ${min.toFixed(2)}，平均值 ${avg.toFixed(2)}`;
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
    alert: {
      code: alert.code,
      type: alert.type,
      level: alert.level,
      message: alert.message,
      triggeredAt: alert.triggeredAt,
      durationMin: alert.durationMin,
      threshold: alert.threshold,
      currentValue: alert.currentValue
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

function buildPromptText(payload) {
  return `你是一名资深工业物联网运维专家。请基于以下设备与告警数据，给出结构化的分析结论。

【设备基本信息】
设备编号：${payload.device.id}
设备名称：${payload.device.name}
型号：${payload.device.model}
类型：${payload.device.type}
安装位置：${payload.device.location}
投运时间：${payload.device.installedAt}
维护人员：${payload.device.maintainer}

【告警信息】
告警代码：${payload.alert.code}
告警类型：${payload.alert.type}
告警级别：${payload.alert.level}
告警描述：${payload.alert.message}
触发时间：${payload.alert.triggeredAt}
持续时长：${payload.alert.durationMin} 分钟
阈值范围：${payload.alert.threshold.min} ~ ${payload.alert.threshold.max} ${payload.alert.threshold.unit}
当前读数：${payload.alert.currentValue} ${payload.alert.threshold.unit}

【正常时段数据摘要（近 24 小时）】
温度：${payload.metrics.normal.temperature}
湿度：${payload.metrics.normal.humidity}
功率：${payload.metrics.normal.power}

【异常时段数据摘要（近 24 小时）】
温度：${payload.metrics.abnormal.temperature}
湿度：${payload.metrics.abnormal.humidity}
功率：${payload.metrics.abnormal.power}

请严格按以下 JSON 结构返回，不要额外说明，不要 Markdown 代码块：
{
  "reason": "原因分析（2-4 句，结合数据偏离度进行推断）",
  "solutions": ["处理方案1", "处理方案2", "处理方案3"],
  "suggestions": ["建议措施1", "建议措施2", "建议措施3"],
  "riskLevel": "低/中/高/紧急",
  "estimatedRecoveryMinutes": 30
}`;
}

function parseAiJson(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  let candidate = text;
  // 兼容 ```json ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) candidate = fence[1];
  // 截取第一个 { 到 最后一个 }
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) candidate = candidate.substring(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch (e) {
    throw new Error('AI 返回结果解析失败，请重试');
  }
}

function mockAnalyze(payload) {
  const level = payload.alert.level || '警告';
  const type = payload.alert.type || '设备异常';
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        reason: `当前「${type}」处于「${level}」级别，读数 ${payload.alert.currentValue} 超过阈值上限 ${payload.alert.threshold.max}。近 24 小时异常数据波动较正常数据显著增大，功率均值上浮约 15%，疑似散热/加热控制逻辑异常或传感器漂移。`,
        solutions: [
          `立即降载：将目标温度调至 ${Math.round(payload.alert.threshold.max * 0.9)}°C 以下，观察 10 分钟；`,
          '检查循环风机、燃烧器/加热器状态，确认无卡滞或异常发热；',
          '校验温度传感器是否存在漂移，必要时更换备用传感器；',
          '如 30 分钟内未恢复，建议停机并联系维护人员现场排查。'
        ],
        suggestions: [
          '优化阈值区间：结合近 7 日正常区间统计，将预警阈值与告警阈值拉开 8% 容差；',
          '增加功率-温度相关性告警规则，出现单侧持续偏离立即触发二级预警；',
          '每周执行一次传感器自校验记录，避免长期漂移未被发现。'
        ],
        riskLevel: level.includes('严重') ? '高' : '中',
        estimatedRecoveryMinutes: 30
      });
    }, 900);
  });
}

/**
 * 调用 DeepSeek Chat API 分析设备告警
 * @param {object} payload 通过 buildPromptPayload 产出的数据
 */
export async function analyzeDeviceAlert(payload) {
  if (USE_MOCK_FALLBACK) {
    return mockAnalyze(payload);
  }

  const prompt = buildPromptText(payload);
  try {
    const res = await axios.post(
      `${DEEPSEEK_BASE_URL.replace(/\/$/, '')}/chat/completions`,
      {
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: '你是一名工业物联网运维专家，擅长设备故障分析与处理建议输出。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: 30000
      }
    );
    const content = res?.data?.choices?.[0]?.message?.content;
    const parsed = parseAiJson(content);
    if (!parsed) throw new Error('AI 分析结果为空');
    return parsed;
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err?.message || '调用失败';
    throw new Error(`DeepSeek API 错误：${msg}`);
  }
}
