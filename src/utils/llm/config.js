/**
 * LLM 多模型接入 · 前端配置（极简版）
 *
 * 思路：
 *   - 前端仍直接请求各 LLM 平台（DeepSeek / 火山方舟 等），走 OpenAI 兼容协议
 *   - 但「可用模型列表 + 每个模型的 apiKey / baseUrl / modelId」不写在 .env 里
 *     而是从自家后端接口动态拉取
 *
 * 自家后端给前端暴露一个接口，返回模型清单即可：
 *     GET  {VITE_LLM_MODELS_ENDPOINT}
 *     响应：[{ key, label, provider, apiKey, baseUrl, modelId, available }]
 *
 * 这样切换 / 新增 / 更换 Key，只需改后端，不需要发布前端。
 */

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

// 获取模型列表的接口地址（相对路径走 /api 代理；若后端已经准备好了这个路径就不动）
export const LLM_MODELS_ENDPOINT = String(
  env.VITE_LLM_MODELS_ENDPOINT || '/api/llm/models'
).replace(/\/$/, '');

// 是否强制走前端内置 Mock（便于前端独立演示）
export const LLM_MOCK_ENABLED = String(env.VITE_LLM_MOCK || '').toLowerCase() === 'true';
