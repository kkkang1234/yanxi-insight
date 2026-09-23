import { directions } from "./interview-organization";
import { schemas, type Step } from "./model-contract";
import {
  uid,
  evidenceAt,
  findingIssues,
  validEvidence,
  type Project,
  type Finding,
  type Evidence,
} from "./research";
export type ModelState = { configured: boolean; label: string };
async function call(
  step: Step,
  input: unknown,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step, input }),
    signal,
  });
  const data = (await response.json()) as { error?: string; result?: unknown };
  if (!response.ok)
    throw new Error(data.error || "本次分析未完成，请稍后重试。");
  return schemas[step].parse(data.result);
}
export async function runModel(
  p: Project,
  step: "context" | "insights",
  signal: AbortSignal,
): Promise<Project> {
  if (step === "context") {
    const result = schemas.context.parse(
      await call("context", { brief: p.brief, outline: p.outline }, signal),
    );
    const notes = result.notes.map((n) => ({
      ...n,
      source: {
        brief: "背景说明",
        outline: "访谈大纲",
        suggestion: "AI 建议",
        missing: "缺失信息",
      }[n.source],
      issue:
        n.quote &&
        ["brief", "outline"].includes(n.source) &&
        !(n.source === "brief" ? p.brief : p.outline).includes(n.quote)
          ? "来源未通过匹配，请人工核对"
          : n.issue,
    }));
    return {
      ...p,
      ...result,
      notes,
      confirmed: false,
      findings: p.findings.map((f) => ({ ...f, status: "stale" })),
      insights: p.insights.map((i) => ({ ...i, status: "stale" })),
    };
  }
  const findings = p.findings.filter(
    (f) => f.status === "confirmed" && !findingIssues(p, f).length,
  );
  if (!findings.length) throw new Error("请先确认至少一条有效发现");
  const used = new Set(
    findings.flatMap((f) => f.links.map((l) => l.evidenceId)),
  );
  const result = schemas.insights.parse(
    await call(
      "insights",
      {
        objective: p.objective,
        target: p.target,
        questions: p.questions,
        findings,
        evidence: p.evidence.filter(
          (e) => used.has(e.id) && validEvidence(p, e),
        ),
      },
      signal,
    ),
  );
  if (
    result.insights.some(
      (i) =>
        !p.questions.includes(i.question) ||
        i.findingIds.some((id) => !findings.some((f) => f.id === id)),
    )
  )
    throw new Error("模型返回不存在的研究问题或发现关联，结果未写入。");
  return {
    ...p,
    insights: [
      ...p.insights,
      ...result.insights.map((i) => ({
        ...i,
        id: uid(),
        status: "draft" as const,
        source: "ai" as const,
      })),
    ],
  };
}
export function chunks(
  text: string,
  max = 5000,
): { text: string; start: number }[] {
  const parts = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + max, text.length);
    if (end < text.length) {
      const line = text.lastIndexOf("\n", end);
      if (line > start + max / 2) end = line + 1;
      else if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    }
    parts.push({ text: text.slice(start, end), start });
    start = end;
  }
  return parts;
}
export async function analyzeInterviews(
  p: Project,
  signal: AbortSignal,
  onProgress: (label: string, value: number) => void,
): Promise<Project> {
  const docs = p.interviews.filter(
    (d) => d.participant.trim() && d.status !== "analyzed",
  );
  if (!docs.length)
    throw new Error(
      "没有待分析且已标注受访者的材料。已完成的材料不会重复生成。",
    );
  let next = structuredClone(p);
  const observations: Finding[] = [];
  let rejected = 0;
  for (const [index, d] of docs.entries()) {
    const local: Finding[] = [],
      evidence: Evidence[] = [];
    let failed = "";
    for (const [ci, part] of chunks(d.text).entries()) {
      if (signal.aborted) {
        failed = "分析已取消";
        break;
      }
      onProgress(
        `正在分析 ${d.name} · 片段 ${ci + 1}`,
        10 + Math.round((index / docs.length) * 65),
      );
      try {
        const out = schemas.observations.parse(
          await call(
            "observations",
            {
              objective: p.objective,
              target: p.target,
              questions: p.questions,
              themes: directions(p),
              outline: p.outline,
              interview: part.text,
            },
            signal,
          ),
        );
        for (const o of out.observations) {
          const at = part.text.indexOf(o.quote);
          if (
            at < 0 ||
            part.text.indexOf(o.quote, at + 1) >= 0 ||
            o.speaker !== "participant" ||
            !p.questions.includes(o.question)
          ) {
            rejected++;
            continue;
          }
          const e = evidenceAt(
            { ...next, evidence: [...next.evidence, ...evidence] },
            d.id,
            part.start + at,
            part.start + at + o.quote.length,
            "ai",
          );
          if (
            !evidence.some((x) => x.id === e.id) &&
            !next.evidence.some((x) => x.id === e.id)
          )
            evidence.push(e);
          local.push({
            id: uid(),
            summary: o.summary,
            theme: o.theme,
            origin: p.themes.includes(o.theme) ? "outline" : "emergent",
            stage: o.stage,
            behavior: o.behavior,
            pain: o.pain,
            question: o.question,
            links: [{ evidenceId: e.id, role: "support" }],
            status: "draft",
            source: "ai",
          });
        }
      } catch (e) {
        if (signal.aborted) {
          failed = "分析已取消";
          break;
        }
        failed = e instanceof Error ? e.message : "模型请求失败";
        break;
      }
    }
    if (failed) {
      next.interviews = next.interviews.map((x) =>
        x.id === d.id ? { ...x, status: "failed", error: failed } : x,
      );
      if (signal.aborted) break;
      continue;
    }
    next.evidence.push(...evidence);
    observations.push(...local);
    next.interviews = next.interviews.map((x) =>
      x.id === d.id ? { ...x, status: "analyzed", error: "" } : x,
    );
  }
  if (!observations.length) {
    next.runs.push({
      id: uid(),
      step: "observations",
      at: new Date().toISOString(),
      status: next.interviews.some((d) => d.status === "failed")
        ? "failed"
        : "success",
      detail: `未产生可用观察；拒绝 ${rejected} 条未通过来源或身份校验的候选。`,
    });
    return next;
  }
  if (signal.aborted) {
    next.findings.push(...observations);
    next.runs.push({
      id: uid(),
      step: "analysis",
      at: new Date().toISOString(),
      status: "failed",
      detail: "用户取消，已完成材料的观察已保留。",
    });
    return next;
  }
  onProgress("正在聚合主题、阶段与反例", 85);
  try {
    const out = schemas.aggregate.parse(
      await call(
        "aggregate",
        {
          questions: p.questions,
          observations: observations.map((f) => ({
            ...f,
            evidence: f.links.map((l) =>
              next.evidence.find((e) => e.id === l.evidenceId),
            ),
          })),
        },
        signal,
      ),
    );
    const aggregated = out.findings.map((f) => {
      if (
        !p.questions.includes(f.question) ||
        f.observations.some((o) => !observations.some((x) => x.id === o.id))
      )
        throw new Error("聚合返回无效关联");
      const links = f.observations.flatMap((o) =>
        observations
          .find((x) => x.id === o.id)!
          .links.map((l) => ({ ...l, role: o.role })),
      );
      const { observations: _, ...rest } = f;
      return {
        ...rest,
        id: uid(),
        links: [...new Map(links.map((l) => [l.evidenceId, l])).values()],
        status: "draft" as const,
        source: "ai" as const,
      };
    });
    const included = new Set(
      out.findings.flatMap((f) => f.observations.map((o) => o.id)),
    );
    next.findings.push(
      ...aggregated,
      ...observations.filter((o) => !included.has(o.id)),
    );
  } catch (e) {
    next.findings.push(...observations);
    next.runs.push({
      id: uid(),
      step: "aggregate",
      at: new Date().toISOString(),
      status: "failed",
      detail: "自动聚合失败，已保留逐条观察，可人工整理。",
    });
  }
  next.runs.push({
    id: uid(),
    step: "quote-validation",
    at: new Date().toISOString(),
    status: "success",
    detail: `已拒绝 ${rejected} 条无效、歧义或说话人不明的候选引文。`,
  });
  next.runs = next.runs.slice(-99);
  return next;
}
