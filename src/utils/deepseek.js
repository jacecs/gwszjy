/**
 * 向后兼容：保留旧路径 `@/utils/deepseek`，内部转发到新的 `@/utils/llm`。
 * ⚠️ 新代码请直接使用 `@/utils/llm`。
 */
import {
  analyzeDeviceAlert,
  buildPromptPayload,
  listModels,
  callLLM,
  invalidateModelCache
} from './llm/index.js';

export {
  buildPromptPayload,
  listModels,
  callLLM,
  invalidateModelCache
};

/** 旧版签名：analyzeDeviceAlert(payload, opts) → 新版需要 modelKey，这里给个默认 fallback。 */
export async function analyze(payload, opts = {}) {
  const modelKey = (opts && opts.modelKey) || 'deepseek-chat';
  return analyzeDeviceAlert(modelKey, payload, opts);
}
