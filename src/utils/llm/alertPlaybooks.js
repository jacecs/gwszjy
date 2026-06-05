/**
 * 告警固定预案库（Playbook Library）
 * ------------------------------------------------------------------
 * 作用：针对不同的「告警类型 / 设备类型 / 告警级别」，提供一套**预设的、经人工确认的处理建议**，
 *       在调用 LLM 时注入到 system prompt，以保证 AI 输出与企业既定处置流程一致。
 *
 * 扩展原则：**新增一条预案 = 在下方 PLAYBOOKS 数组里 push 一个对象**，不需要改其它代码。
 *
 * ------------------------------------------------------------------
 * 每条 Playbook 的完整结构（注释中列出的字段都可选，按需填即可）：
 *
 * {
 *   // ---------- 匹配规则 ----------
 *   // 满足以下任意条件即视为匹配（不填则不参与该维度匹配；全不填则匹配所有告警，仅用作兜底通用预案）
 *   match: {
 *     alertTypes:    ['水位', 'water'],        // 匹配 alert.type 或 alert.message 里包含这些关键词（不区分大小写）
 *     deviceTypes:   ['农田', '农场', '仓库'],  // 匹配 device.type / device.name 里包含这些关键词
 *     alertLevels:   ['高', '中'],             // 匹配 alert.level（可选，不写则不限制级别）
 *     alertCodes:    ['W001', 'W-001'],        // 匹配告警 code（可选，用于精确命中某条告警规则）
 *     keywords:      ['浸水', '积水']          // 额外关键词（可选，在整个告警信息文本中命中即匹配）
 *   },
 *
 *   // ---------- 预案内容 ----------
 *   // 这些内容最终会以「参考预案」的形式写入 system prompt，让模型按这个思路输出
 *   playbook: {
 *     name:        '水位过高（必填）',
 *     priority:    100,                        // 匹配多条时，数字越大优先级越高（必填）
 *     solutions:   [                            // 处理步骤（1~N 条，建议 3~5 条）
 *       '打开对应告警设备所属的农场/试验田/仓库等区域特定方向的水阀进行排水',
 *       '检查进水管道是否堵塞，必要时疏通',
 *       '通知现场值班人员 15 分钟内到达现场确认'
 *     ],
 *     suggestions: [                            // 长期建议（可选）
 *       '在水位读数超阈值 80% 时自动推送预警',
 *       '定期清理排水管道，防止雨季堵塞'
 *     ],
 *     notes:       '此类告警以"排洪减压"为首要目标，优先保障人员和设备安全', // 给 AI 的补充引导（可选）
 *     riskLevel:   '高',                        // 建议的风险级别（可选，low/中/高）
 *     estimatedRecoveryMinutes: 30              // 建议的预计恢复时间（可选）
 *   }
 * }
 *
 * ------------------------------------------------------------------
 * 使用：
 *   import { matchPlaybooks, PLAYBOOKS } from './alertPlaybooks';
 *   const matched = matchPlaybooks(device, alert, metrics);  // 按优先级排序的匹配结果
 *   // 把 matched 注入 prompt
 */

// ============================================================
// 1. 预案库（新增预案时，直接在下面数组里加一条即可）
// ============================================================

export const PLAYBOOKS = [

  // ========== 示例 1：水位过高 ==========
  {
    match: {
      alertTypes: ['水位', 'water', '液位'],
      deviceTypes: ['农田', '农场', '试验田', '仓库', '灌溉', '排水', '水渠', '蓄水池'],
      keywords: ['积水', '浸水', '溢水', '漏水']
    },
    playbook: {
      name: '水位过高',
      priority: 100,
      solutions: [
        '立即打开对应告警设备所属的农场/试验田/仓库等区域**特定方向的水阀**进行排水',
        '检查进水管道是否堵塞，必要时疏通；若水泵运行异常则切换备用泵',
        '降低上游进水流量，优先确保排水通道畅通',
        '通知现场值班人员 15 分钟内到达现场确认水位下降情况'
      ],
      suggestions: [
        '在水位读数达到阈值 80% 时自动推送预警，提前处置',
        '雨季前定期清理排水管道、排水沟，防止淤积堵塞',
        '关键区域加装备用排水泵与水位双传感器，避免单点故障漏报'
      ],
      notes: '此类告警以"排洪减压"为首要目标，优先保障人员和设备安全；处置时先排水、再检修。',
      riskLevel: '高',
      estimatedRecoveryMinutes: 30
    }
  },

  // ========== 示例 2：温度过高 ==========
  {
    match: {
      alertTypes: ['温度', 'temperature', '高温', '过热'],
      deviceTypes: ['机房', '配电', '变压器', '电机', '变频器', '配电箱', '控制柜']
    },
    playbook: {
      name: '设备温度过高',
      priority: 90,
      solutions: [
        '检查冷却系统（风扇 / 空调 / 水冷循环）运行状态，异常时立即切换备用冷却',
        '降低负载或临时停机降温，观察温度读数是否恢复正常区间',
        '排查是否存在环境温度升高、风道堵塞、积灰严重等外部原因',
        '若温度持续超过告警阈值 10 分钟，按故障流程上报并启动备件切换'
      ],
      suggestions: [
        '关键设备加装温度/电流联动规则，温度升高时自动降载',
        '定期巡检散热系统，建立季度清洁维护计划',
        '机房空调冗余配置，避免单台空调故障导致整体过热'
      ],
      notes: '温度类告警先冷却、后排查；注意区分「环境温度」与「设备自身发热」。',
      riskLevel: '中',
      estimatedRecoveryMinutes: 20
    }
  },

  // ========== 示例 3：功率/电流异常 ==========
  {
    match: {
      alertTypes: ['功率', '电流', '电压', '电力', 'power', 'current'],
      keywords: ['过载', '过流', '欠压', '跳闸', '短路']
    },
    playbook: {
      name: '电力参数异常',
      priority: 95,
      solutions: [
        '查看对应回路电流/电压曲线，判断是瞬时尖峰还是持续性异常',
        '若为持续性过载，立即降低负载或切出非关键设备；必要时拉闸断电',
        '检查设备绝缘、线缆接触、接触器触点是否存在老化或松动',
        '恢复供电前先确认无短路风险，按"先小负载、后全负载"逐步恢复'
      ],
      suggestions: [
        '关键回路安装电流/电压实时监测与异常告警规则',
        '建立电气设备定期巡检与红外测温档案',
        '对频繁触发过流告警的设备评估容量是否匹配实际负载'
      ],
      notes: '电力类告警存在安全风险，先断电/降载后再排查，禁止在未断电情况下接触高压部分。',
      riskLevel: '高',
      estimatedRecoveryMinutes: 40
    }
  },

  // ========== 示例 4：通用兜底（不写 match = 任何情况都兜底，但 priority 最低） ==========
  {
    match: {},
    playbook: {
      name: '通用设备故障处置',
      priority: 10,
      solutions: [
        '按设备说明书执行紧急停机或降载操作',
        '检查相关传感器读数是否在正常区间，排除传感器误报',
        '联系现场运维人员到场确认，并按既定故障上报流程登记'
      ],
      suggestions: [
        '建立每类设备的标准处置 SOP，并在 AI 分析中持续沉淀',
        '对高频告警设备优先安排预防性维护'
      ],
      notes: '当未匹配到更精确的预案时，使用此通用模板；建议持续补充特定类型的专用预案。',
      riskLevel: '中',
      estimatedRecoveryMinutes: 60
    }
  }

];

// ============================================================
// 2. 匹配与查询工具
// ============================================================

/**
 * 判断某个字符串集合中是否包含关键词（不区分大小写、去空格）
 */
function _hit(sourceText, keywords) {
  if (!sourceText || !Array.isArray(keywords) || !keywords.length) return false;
  const text = String(sourceText).toLowerCase();
  return keywords.some((kw) => kw && text.indexOf(String(kw).toLowerCase()) >= 0);
}

/**
 * 判断一条 playbook 是否匹配当前告警/设备
 * 规则：match 下各维度之间取 AND；同维度内数组取 OR；match 整体为空则视为兜底（不强制匹配）。
 */
function _isMatch(playbook, device, alertData, metrics) {
  const m = playbook.match || {};
  // 把 device/alertData 信息拼成一段文本用于关键词匹配
  const fullText = [
    device && (device.type + ' ' + device.name + ' ' + (device.location || '')),
    alertData && (alertData.type + ' ' + alertData.message + ' ' + (alertData.code || '') + ' ' + (alertData.level || ''))
  ].filter(Boolean).join(' ');

  const dims = [];

  if (m.alertTypes && m.alertTypes.length) {
    dims.push(_hit((alertData && (alertData.type + ' ' + alertData.message)) || '', m.alertTypes));
  }
  if (m.deviceTypes && m.deviceTypes.length) {
    dims.push(_hit((device && (device.type + ' ' + device.name + ' ' + (device.location || ''))) || '', m.deviceTypes));
  }
  if (m.alertLevels && m.alertLevels.length) {
    dims.push(m.alertLevels.indexOf(alertData && alertData.level) >= 0);
  }
  if (m.alertCodes && m.alertCodes.length) {
    dims.push(m.alertCodes.indexOf(alertData && alertData.code) >= 0);
  }
  if (m.keywords && m.keywords.length) {
    dims.push(_hit(fullText, m.keywords));
  }

  // 没有任何维度限制 = 兜底预案，永远返回 true（但通常给低 priority）
  if (!dims.length) return true;

  return dims.every(Boolean);
}

/**
 * 根据 device + alert + metrics 返回匹配的预案列表（按 priority 从高到低排序）
 * @param {Object} device
 * @param {Object} alert
 * @param {Object} metrics
 * @param {Object} opts  { top: number }  只取前 N 条，默认取全部命中
 * @returns {Array<Object>} 返回 [{ name, priority, solutions, suggestions, notes, riskLevel, estimatedRecoveryMinutes }]
 */
export function matchPlaybooks(device, alertData, metrics, opts = {}) {
  if (!Array.isArray(PLAYBOOKS) || !PLAYBOOKS.length) return [];

  const hits = PLAYBOOKS
    .filter((p) => _isMatch(p, device, alertData, metrics))
    .map((p) => p.playbook)
    .filter(Boolean);

  hits.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  if (typeof opts.top === 'number' && opts.top > 0) {
    return hits.slice(0, opts.top);
  }
  return hits;
}

/**
 * 把匹配到的 playbooks 渲染成一段适合放进 system prompt 的纯文本
 * 供 llm/index.js 调用
 */
export function renderPlaybooksForPrompt(matched) {
  if (!matched || !matched.length) return '';
  const lines = [];
  lines.push('【企业参考预案】针对此类告警，请优先参考以下预设处置流程（若已有更优现场判断可在其上调整）：');
  matched.forEach((pb, idx) => {
    lines.push(`- 预案 ${idx + 1}：${pb.name}（优先级 ${pb.priority}）`);
    if (pb.solutions && pb.solutions.length) {
      lines.push('  处置步骤：');
      pb.solutions.forEach((s, i) => lines.push(`    ${i + 1}. ${s}`));
    }
    if (pb.suggestions && pb.suggestions.length) {
      lines.push('  长期建议：');
      pb.suggestions.forEach((s, i) => lines.push(`    ${i + 1}. ${s}`));
    }
    if (pb.notes) lines.push(`  注意：${pb.notes}`);
    if (pb.riskLevel) lines.push(`  建议风险级别：${pb.riskLevel}`);
    if (pb.estimatedRecoveryMinutes) lines.push(`  建议预计恢复分钟数：${pb.estimatedRecoveryMinutes}`);
  });
  return lines.join('\n');
}

/**
 * 便捷方法：一步拿到「注入到 system prompt 的文本来的完整流程」
 */
export function getPlaybookPromptSection(device, alert, metrics, opts = {}) {
  const matched = matchPlaybooks(device, alert, metrics, opts);
  return renderPlaybooksForPrompt(matched);
}
