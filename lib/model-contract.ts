import { z } from "zod";
const short = z.string().max(2000);
export const contextOutput = z.object({
  objective: short,
  target: short,
  questions: z.array(z.string().max(1000)).max(30),
  themes: z.array(z.string().max(100)).max(50),
  notes: z
    .array(
      z.object({
        field: short,
        source: z.enum(["brief", "outline", "suggestion", "missing"]),
        quote: short,
        issue: short,
      }),
    )
    .max(100),
});
export const observationsOutput = z.object({
  observations: z
    .array(
      z.object({
        summary: short.min(1),
        theme: z.string().min(1).max(1000),
        origin: z.enum(["outline", "emergent"]),
        stage: z.string().max(100),
        behavior: short,
        pain: short,
        question: z.string().max(1000),
        quote: z.string().min(1).max(5000),
        speaker: z.enum(["participant", "unknown", "interviewer"]),
      }),
    )
    .max(60),
});
export const aggregateOutput = z.object({
  findings: z
    .array(
      z.object({
        summary: short.min(1),
        theme: z.string().min(1).max(1000),
        origin: z.enum(["outline", "emergent"]),
        stage: z.string().max(100),
        behavior: short,
        pain: short,
        question: z.string().max(1000),
        observations: z
          .array(
            z.object({
              id: z.string(),
              role: z.enum(["support", "counter", "context"]),
            }),
          )
          .min(1)
          .max(100),
      }),
    )
    .max(100),
});
export const insightsOutput = z.object({
  insights: z
    .array(
      z.object({
        question: z.string().min(1),
        findingIds: z.array(z.string()).min(1).max(100),
        interpretation: z.string().min(1).max(5000),
        judgment: short,
        opportunity: short,
        hypothesis: short,
        validation: short,
        limitations: short,
      }),
    )
    .max(50),
});
export const schemas = {
  context: contextOutput,
  observations: observationsOutput,
  aggregate: aggregateOutput,
  insights: insightsOutput,
};
export type Step = keyof typeof schemas;
export const prompts: Record<Step, string> = {
  context:
    '根据说明 brief 与访谈大纲 outline 整理研究框架，返回 JSON：{"objective":"目标或空","target":"对象或空","questions":["研究问题"],"themes":["大纲主题"],"notes":[{"field":"字段名","source":"brief|outline|suggestion|missing","quote":"连续原文或空","issue":"来源说明/冲突/缺失/AI建议"}]}。每个字段都给来源说明。缺失不得补业务事实，建议必须明确标注。来源冲突并列记录。',
  observations:
    '从一段访谈中提取多个话题/阶段的观察，优先用给定问题方向作为主题标题，但保留大纲外话题。返回 JSON：{"observations":[{"summary":"现象摘要","theme":"主题","origin":"outline|emergent","stage":"有证据的阶段或空","behavior":"行为或空","pain":"痛点或空","question":"给定研究问题原文","quote":"本片段中逐字连续的受访者原话","speaker":"participant|unknown|interviewer"}]}。不把采访者问题作为事实。不确定说话人用unknown。不要添加省略号、标点或改写引文。否定陈述可提取为反例，摘要保留否定。没有依据可返回空数组。',
  aggregate:
    '围绕研究问题，将给定观察按大纲问题方向综合成需求与痛点分析，避免把同方向的每句话拆成碎片发现，保留反例和单人信号。不自行计人数。返回 JSON：{"findings":[{"summary":"发现","theme":"主题","origin":"outline|emergent","stage":"阶段或空","behavior":"行为","pain":"痛点","question":"给定研究问题原文","observations":[{"id":"给定观察id","role":"support|counter|context"}]}]}。仅引用给定id，不强制合并语义不同的观察。',
  insights:
    '仅根据已确认发现与证据，每个研究问题最多生成一个完整报告章节。interpretation 要综合多条发现形成连贯解释，不逐条复述碎片卡片。返回 JSON：{"insights":[{"question":"给定研究问题原文","findingIds":["给定发现id"],"interpretation":"解释，明确推测成分","judgment":"产品判断或空","opportunity":"设计机会或空","hypothesis":"待验证假设或空","validation":"验证方法和判定信号或空","limitations":"证据不足/样本限制/反例"}]}。不编造收益、用户数量或因果关系。证据不足允许空数组，不强填方案。',
};
