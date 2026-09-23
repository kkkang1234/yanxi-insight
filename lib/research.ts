import { z } from "zod";

export const uid = () => crypto.randomUUID();
export const canonical = (s: string) =>
  s.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
const text = z.string().max(20000);
const status = z.enum(["draft", "confirmed", "stale"]);
const linkSchema = z.object({
  evidenceId: z.string(),
  role: z.enum(["support", "counter", "context"]),
});
export const interviewSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  participant: z.string().max(80),
  text,
  version: z.number().int().positive(),
  status: z.enum(["ready", "reviewed", "analyzed", "failed"]),
  error: z.string().default(""),
  organized: z
    .array(
      z.object({
        start: z.number().int().nonnegative(),
        end: z.number().int().positive(),
        direction: z.string().max(1000),
        clean: z.string().max(20000),
        speaker: z.enum(["participant", "interviewer", "unknown"]),
      }),
    )
    .max(1000)
    .optional(),
});
export const evidenceSchema = z.object({
  id: z.string(),
  interviewId: z.string(),
  version: z.number().int().positive(),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  quote: text.min(1),
  speaker: z.enum(["participant", "unknown"]),
  source: z.enum(["manual", "ai", "sample"]),
});
export const findingSchema = z.object({
  id: z.string(),
  summary: z.string().min(1).max(2000),
  theme: z.string().min(1).max(1000),
  origin: z.enum(["outline", "emergent", "manual"]),
  stage: z.string().max(100),
  behavior: z.string().max(2000),
  pain: z.string().max(2000),
  question: z.string().max(1000),
  links: z.array(linkSchema).max(200),
  status,
  source: z.enum(["manual", "ai", "sample"]),
});
export const insightSchema = z.object({
  id: z.string(),
  question: z.string().min(1),
  findingIds: z.array(z.string()).min(1).max(100),
  interpretation: z.string().min(1).max(5000),
  judgment: z.string().max(3000),
  opportunity: z.string().max(3000),
  hypothesis: z.string().max(3000),
  validation: z.string().max(3000),
  limitations: z.string().max(3000),
  status,
  source: z.enum(["manual", "ai", "sample"]),
});
export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  name: z.string().max(200),
  brief: text,
  outline: text.max(10000),
  objective: text,
  target: text,
  questions: z.array(z.string().max(1000)).max(30),
  themes: z.array(z.string().max(100)).max(50),
  confirmed: z.boolean(),
  revision: z.number().int().nonnegative(),
  sample: z.boolean(),
  notes: z
    .array(
      z.object({
        field: z.string(),
        source: z.string(),
        quote: z.string(),
        issue: z.string(),
      }),
    )
    .max(100),
  interviews: z.array(interviewSchema).max(5),
  evidence: z.array(evidenceSchema).max(1000),
  findings: z.array(findingSchema).max(300),
  insights: z.array(insightSchema).max(100),
  runs: z
    .array(
      z.object({
        id: z.string(),
        step: z.string(),
        at: z.string(),
        status: z.enum(["success", "failed"]),
        detail: z.string(),
      }),
    )
    .max(100),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof projectSchema>;
export type Interview = z.infer<typeof interviewSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type Insight = z.infer<typeof insightSchema>;
export type EvidenceLink = z.infer<typeof linkSchema>;
export function createProject(): Project {
  return {
    schemaVersion: 1,
    id: uid(),
    name: "未命名研究",
    brief: "",
    outline: "",
    objective: "",
    target: "",
    questions: [],
    themes: [],
    confirmed: false,
    revision: 0,
    sample: false,
    notes: [],
    interviews: [],
    evidence: [],
    findings: [],
    insights: [],
    runs: [],
    updatedAt: new Date().toISOString(),
  };
}
export function touch(p: Project): Project {
  return {
    ...p,
    revision: p.revision + 1,
    updatedAt: new Date().toISOString(),
  };
}
export function invalidate(p: Project): Project {
  return {
    ...p,
    findings: p.findings.map((f) => ({ ...f, status: "stale" })),
    insights: p.insights.map((i) => ({ ...i, status: "stale" })),
  };
}
export function invalidateInsights(p: Project, findingId: string): Project {
  return {
    ...p,
    insights: p.insights.map((i) =>
      i.findingIds.includes(findingId) ? { ...i, status: "stale" } : i,
    ),
  };
}
export function validEvidence(p: Project, e: Evidence): boolean {
  const d = p.interviews.find((d) => d.id === e.interviewId);
  return (
    !!d &&
    !!d.participant.trim() &&
    d.version === e.version &&
    Number.isInteger(e.start) &&
    Number.isInteger(e.end) &&
    e.start >= 0 &&
    e.end <= d.text.length &&
    e.end > e.start &&
    d.text.slice(e.start, e.end) === e.quote &&
    e.speaker === "participant"
  );
}
export function evidenceAt(
  p: Project,
  interviewId: string,
  start: number,
  end: number,
  source: Evidence["source"] = "manual",
  speaker: Evidence["speaker"] = "participant",
): Evidence {
  const d = p.interviews.find((d) => d.id === interviewId);
  if (!d || !d.participant.trim()) throw new Error("请先确认受访者编号。");
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end > d.text.length ||
    start >= end ||
    !d.text.slice(start, end).trim()
  )
    throw new Error("请在全文中选取一段有效原话。");
  const existing = p.evidence.find(
    (e) =>
      e.interviewId === d.id &&
      e.version === d.version &&
      e.start === start &&
      e.end === end,
  );
  return (
    existing ?? {
      id: uid(),
      interviewId: d.id,
      version: d.version,
      start,
      end,
      quote: d.text.slice(start, end),
      speaker,
      source,
    }
  );
}
export function locateQuote(
  d: Interview,
  quote: string,
  offset = 0,
): { start: number; end: number } {
  if (!quote) throw new Error("引用为空。");
  const start = d.text.indexOf(quote, offset);
  if (start < 0) throw new Error("引文与原文不完全一致。");
  if (d.text.indexOf(quote, start + 1) >= 0)
    throw new Error("原文有多处相同引文，请在全文手动选取位置。");
  return { start, end: start + quote.length };
}
export function findingIssues(p: Project, f: Finding): string[] {
  const errors: string[] = [];
  if (!p.confirmed) errors.push("研究背景尚未确认");
  if (!p.questions.includes(f.question)) errors.push("需关联有效研究问题");
  if (
    !f.links.some(
      (l) =>
        l.role === "support" &&
        p.evidence.some((e) => e.id === l.evidenceId && validEvidence(p, e)),
    )
  )
    errors.push("缺少有效支持证据");
  if (
    f.links.some(
      (l) =>
        !p.evidence.some((e) => e.id === l.evidenceId && validEvidence(p, e)),
    )
  )
    errors.push("存在失效或说话人待确认的证据");
  return errors;
}
export function insightIssues(p: Project, i: Insight): string[] {
  const issues: string[] = [];
  if (!p.confirmed) issues.push("研究背景尚未确认");
  if (!p.questions.includes(i.question)) issues.push("研究问题已改变");
  if (
    !i.findingIds.length ||
    i.findingIds.some((id) => {
      const f = p.findings.find((f) => f.id === id);
      return !f || f.status !== "confirmed" || !!findingIssues(p, f).length;
    })
  )
    issues.push("关联发现需先确认且所有证据有效");
  return issues;
}
export function stats(p: Project, f: Finding) {
  const byRole = (role: EvidenceLink["role"]) =>
    f.links
      .filter((l) => l.role === role)
      .map((l) => p.evidence.find((e) => e.id === l.evidenceId))
      .filter((e): e is Evidence => !!e && validEvidence(p, e));
  const people = (e: Evidence[]) =>
    new Set(
      e.map((e) =>
        p.interviews.find((d) => d.id === e.interviewId)!.participant.trim(),
      ),
    ).size;
  const eligible = p.interviews.filter(
    (d) => ["reviewed", "analyzed"].includes(d.status) && d.participant.trim(),
  );
  return {
    support: people(byRole("support")),
    counter: people(byRole("counter")),
    quotes: new Set(
      f.links
        .filter((l) =>
          p.evidence.some((e) => e.id === l.evidenceId && validEvidence(p, e)),
        )
        .map((l) => l.evidenceId),
    ).size,
    total: new Set(eligible.map((d) => d.participant.trim())).size,
    pending: p.interviews.filter(
      (d) => !["reviewed", "analyzed"].includes(d.status),
    ).length,
  };
}
export function addInterview(
  p: Project,
  name: string,
  raw: string,
  participant = "",
): Project {
  const value = canonical(raw);
  if (!value.trim()) throw new Error("文本为空。");
  if (value.includes("\uFFFD"))
    throw new Error("文本可能乱码，请使用 UTF-8 文件或粘贴文字。");
  if (value.length > 20000)
    throw new Error("每份访谈最多 20,000 字符，请先拆分。");
  if (p.interviews.some((d) => d.text === value))
    throw new Error("相同文本已经导入，已跳过重复材料。");
  if (
    p.interviews.length >= 5 ||
    p.interviews.reduce((n, d) => n + d.text.length, 0) + value.length > 60000
  )
    throw new Error("当前支持最多 5 份访谈、总计 60,000 字符。");
  return {
    ...p,
    interviews: [
      ...p.interviews,
      {
        id: uid(),
        name,
        participant: participant.trim(),
        text: value,
        version: 1,
        status: "ready",
        error: "",
      },
    ],
  };
}
export function restoreProject(input: unknown): Project {
  const p = projectSchema.parse(input);
  if (p.interviews.reduce((n, d) => n + d.text.length, 0) > 60000)
    throw new Error("材料总长度超过限制。");
  for (const collection of [p.interviews, p.evidence, p.findings, p.insights]) {
    if (new Set(collection.map((x) => x.id)).size !== collection.length)
      throw new Error("备份中存在重复标识。");
    if (collection.some((x) => !/^[a-zA-Z0-9_-]+$/.test(x.id)))
      throw new Error("备份中的标识格式不安全。");
  }
  if (
    new Set(p.interviews.map((d) => canonical(d.text))).size !==
    p.interviews.length
  )
    throw new Error("备份包含重复材料。");
  for (const e of p.evidence)
    if (!p.interviews.some((d) => d.id === e.interviewId))
      throw new Error("证据指向不存在的访谈。");
  for (const f of p.findings)
    if (f.links.some((l) => !p.evidence.some((e) => e.id === l.evidenceId)))
      throw new Error("发现指向不存在的证据。");
  for (const i of p.insights)
    if (i.findingIds.some((id) => !p.findings.some((f) => f.id === id)))
      throw new Error("洞察指向不存在的发现。");
  return {
    ...p,
    findings: p.findings.map((f) =>
      findingIssues(p, f).length ? { ...f, status: "stale" } : f,
    ),
    insights: p.insights.map((i) =>
      insightIssues(p, i).length ? { ...i, status: "stale" } : i,
    ),
  };
}
const escapeMd = (s: string) => s.replace(/[\\`*_{}\[\]<>()#!|]/g, "\\$&");
export function report(p: Project, draft = false): string {
  if (!draft && !p.confirmed) throw new Error("请先确认研究背景。");
  const fs = p.findings.filter((f) => draft || f.status === "confirmed");
  const ins = p.insights.filter((i) => draft || i.status === "confirmed");
  if (
    !draft &&
    (!fs.length ||
      fs.some((f) => findingIssues(p, f).length) ||
      ins.some((i) => insightIssues(p, i).length))
  )
    throw new Error("正式报告需要已确认的有效发现，且所有引用和依赖通过校验。");
  const eids = new Set(fs.flatMap((f) => f.links.map((l) => l.evidenceId)));
  const lines = [
    `# ${escapeMd(p.name)} · 访谈洞察报告`,
    "",
    `报告状态：${draft ? "草稿（含未审核内容）" : "正式（已人工确认）"}${p.sample ? "｜合成示例，不代表真实研究" : ""}`,
    `导出时间：${new Date().toISOString()}`,
    "",
    `## 研究背景`,
    escapeMd(p.brief || "未提供"),
    `研究目标：${escapeMd(p.objective)}`,
    `访谈对象：${escapeMd(p.target)}`,
    "",
    `## 样本范围`,
    `材料 ${p.interviews.length} 份；已完成分析或人工阅读 ${p.interviews.filter((d) => ["reviewed", "analyzed"].includes(d.status)).length} 份；唯一受访者 ${new Set(p.interviews.filter((d) => d.participant).map((d) => d.participant)).size} 人。`,
    "提及人数不代表总体发生率；未提及不等于不存在。",
    ...p.interviews.map(
      (d) =>
        `- ${escapeMd(d.name)}｜${escapeMd(d.participant || "身份未确认")}｜版本 ${d.version}｜${{ ready: "未完成阅读", reviewed: "人工阅读完成", analyzed: "AI 分析完成", failed: "分析失败" }[d.status]}`,
    ),
    "",
    `## 背景限制与来源提示`,
    ...p.notes.map(
      (n) =>
        `- ${escapeMd(n.field)}：${escapeMd(n.issue)}（${escapeMd(n.source)}：${escapeMd(n.quote)}）`,
    ),
    "",
    `## 核心结论摘要`,
    ...[...new Set(ins.map((i) => i.interpretation))].map(escapeMd),
    `## 按研究问题的分析`,
  ];
  for (const q of p.questions) {
    lines.push("", `### ${escapeMd(q)}`);
    const qfs = fs.filter((f) => f.question === q),
      qis = ins.filter((i) => i.question === q);
    if (!qfs.length) lines.push("目前材料不足以回答；暂无已纳入的发现。");
    lines.push("#### 用户需求与痛点");
    for (const f of qfs) {
      const count = stats(p, f);
      lines.push(
        escapeMd(f.summary) +
          "。 " +
          escapeMd([f.behavior, f.pain].filter(Boolean).join("；")),
        "依据：支持 " +
          count.support +
          " 人，反例 " +
          count.counter +
          " 人。 " +
          f.links
            .map(
              (l) =>
                "[" +
                { support: "支持", counter: "反例", context: "背景" }[l.role] +
                " E-" +
                l.evidenceId.slice(0, 8) +
                "](#e-" +
                l.evidenceId +
                ")",
            )
            .join("；"),
      );
    }
    for (const [key, title] of [
      ["interpretation", "综合分析"],
      ["judgment", "产品判断"],
      ["opportunity", "设计建议"],
      ["hypothesis", "待验证假设"],
      ["validation", "验证方法"],
      ["limitations", "研究限制"],
    ] as const) {
      const paragraphs = [...new Set(qis.map((i) => i[key]).filter(Boolean))];
      if (paragraphs.length)
        lines.push("#### " + title, ...paragraphs.map(escapeMd));
    }
  }
  const unlinked = fs.filter((f) => !p.questions.includes(f.question));
  if (unlinked.length)
    lines.push(
      "",
      "## 未关联当前研究问题的草稿发现",
      ...unlinked.map((f) => `- ${escapeMd(f.summary)}（待重新关联研究问题）`),
    );
  lines.push("", "## 证据附录");
  for (const e of p.evidence.filter((e) => eids.has(e.id))) {
    const d = p.interviews.find((d) => d.id === e.interviewId);
    lines.push(
      "",
      `<a id="e-${e.id}"></a>`,
      `### E-${e.id.slice(0, 8)}`,
      `${escapeMd(d?.participant || "未知")}｜${escapeMd(d?.name || "材料缺失")}｜v${e.version}｜UTF-16 字符位置 [${e.start}, ${e.end})｜${validEvidence(p, e) ? "原文匹配通过" : "引用无效或身份待确认"}`,
      "",
      ...e.quote.split("\n").map((s) => `> ${escapeMd(s)}`),
    );
  }
  return lines.join("\n\n");
}

export function sampleProject(): Project {
  let p = createProject();
  p = {
    ...p,
    name: "新用户任务完成体验研究",
    sample: true,
    brief:
      "【合成示例】产品团队希望理解用户填写及提交表单时遇到的阻碍，用于演示研究工作流程。",
    objective: "识别填写和提交阶段的体验阻碍，为迭代讨论提供依据。",
    target: "首次完成表单任务的用户（合成示例）",
    questions: ["用户完成表单时遇到了哪些阻碍？", "用户完成后还有哪些需求？"],
    outline:
      "主题：填写体验\n1. 填写时有哪些困难？\n2. 提交后是否知道操作结果？",
    themes: ["填写体验"],
    confirmed: true,
  };
  const samples = [
    {
      p: "P01",
      t: "访谈者：填写和提交过程怎么样？\n受访者：填写时我不知道这一项该填什么。\n受访者：点提交以后，我不知道有没有成功。",
    },
    {
      p: "P01",
      t: "访谈者：后续有没有变化？\n受访者：上次说的提交反馈，我后来还是没看懂。",
    },
    {
      p: "P02",
      t: "访谈者：你是怎么完成任务的？\n受访者：点提交以后没有提示，我又点了一次。\n受访者：除此之外，我想知道完成后去哪里查看记录。",
    },
    {
      p: "P03",
      t: "访谈者：提交时的反馈清楚吗？\n受访者：提交后的提示很清楚，我没有重复点。",
    },
  ];
  for (const [i, s] of samples.entries())
    p = addInterview(p, `访谈 ${String.fromCharCode(65 + i)}.txt`, s.t, s.p);
  p.interviews = p.interviews.map((d) => ({ ...d, status: "reviewed" }));
  const make = (di: number, quote: string) => {
    const d = p.interviews[di],
      at = locateQuote(d, quote),
      e = evidenceAt(p, d.id, at.start, at.end, "sample");
    p.evidence.push(e);
    return e.id;
  };
  const a = make(0, "点提交以后，我不知道有没有成功。"),
    b = make(1, "上次说的提交反馈，我后来还是没看懂。"),
    c = make(2, "点提交以后没有提示，我又点了一次。"),
    r = make(3, "提交后的提示很清楚，我没有重复点。"),
    f = make(0, "填写时我不知道这一项该填什么。"),
    x = make(2, "除此之外，我想知道完成后去哪里查看记录。");
  p.findings = [
    {
      id: uid(),
      summary: "部分受访者无法确认提交结果，并出现重复提交行为",
      theme: "填写体验",
      origin: "outline",
      stage: "提交",
      behavior: "P02 再次点击提交；P01 反复检查反馈",
      pain: "无法确认操作是否成功",
      question: p.questions[0],
      links: [a, b, c]
        .map((evidenceId) => ({ evidenceId, role: "support" as const }))
        .concat([{ evidenceId: r, role: "counter" as "support" }]),
      status: "draft",
      source: "sample",
    },
    {
      id: uid(),
      summary: "填写项含义不清，使用户难以判断应填内容",
      theme: "填写体验",
      origin: "outline",
      stage: "填写",
      behavior: "停下来判断字段含义",
      pain: "不理解填写要求",
      question: p.questions[0],
      links: [{ evidenceId: f, role: "support" }],
      status: "draft",
      source: "sample",
    },
    {
      id: uid(),
      summary: "完成后查看记录是大纲外的新需求线索",
      theme: "历史记录查找",
      origin: "emergent",
      stage: "完成后",
      behavior: "希望查看已完成记录",
      pain: "尚无足够证据认定存在痛点",
      question: p.questions[1],
      links: [{ evidenceId: x, role: "support" }],
      status: "draft",
      source: "sample",
    },
  ];
  return p;
}
