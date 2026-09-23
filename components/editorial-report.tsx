"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  uid,
  insightIssues,
  findingIssues,
  stats,
  type Project,
  type Insight,
} from "@/lib/research";
const join = (xs: string[]) =>
  [...new Set(xs.filter((x) => x.trim()))].join("\n\n");
const fields = [
  ["interpretation", "综合分析"],
  ["judgment", "产品判断"],
  ["opportunity", "设计建议"],
  ["hypothesis", "待验证假设"],
  ["validation", "验证方法"],
  ["limitations", "研究限制"],
] as const;
export function EditorialReport({
  p,
  onChange,
  onEvidence,
  onDownload,
}: {
  p: Project;
  onChange: (p: Project) => void;
  onEvidence: (id: string) => void;
  onDownload: () => void;
}) {
  const [edit, setEdit] = useState<Insight | null>(null);
  function chapter(q: string): Insight {
    const ins = p.insights.filter((i) => i.question === q);
    return {
      id: ins[0]?.id || uid(),
      question: q,
      findingIds: [
        ...new Set([
          ...p.findings
            .filter((f) => f.question === q && f.status === "confirmed" && !findingIssues(p,f).length)
            .map((f) => f.id),
        ]),
      ],
      interpretation: join(ins.map((i) => i.interpretation)),
      judgment: join(ins.map((i) => i.judgment)),
      opportunity: join(ins.map((i) => i.opportunity)),
      hypothesis: join(ins.map((i) => i.hypothesis)),
      validation: join(ins.map((i) => i.validation)),
      limitations: join(ins.map((i) => i.limitations)),
      status: "draft",
      source: "manual",
    };
  }
  function save() {
    if (!edit?.interpretation.trim()) {
      toast.error("请填写综合分析。");
      return;
    }
    if (!edit.findingIds.length) {
      toast.error("请先核对并确认本章的分析依据。");
      return;
    }
    onChange({
      ...p,
      insights: [
        ...p.insights.filter((i) => i.question !== edit.question),
        edit,
      ],
    });
    setEdit(null);
    toast.success("报告章节已保存，确认前请核对依据。");
  }
  return (
    <div className="report-workspace">
      <div className="section-heading report-toolbar">
        <span className="muted">连续报告 · 可按章节编辑和确认</span>
        <Button
          onClick={onDownload}
          disabled={!p.insights.some((i) => i.status === "confirmed")}
        >
          下载洞察报告
        </Button>
      </div>
      <article className="editorial-report">
        <header>
          <span className="eyebrow">用户访谈分析报告</span>
          <h1>{p.name}</h1>
          <p>{p.objective || "研究目标待补充"}</p>
          <div className="report-meta">
            {p.interviews.length} 份访谈 ·{" "}
            {
              new Set(
                p.interviews
                  .filter((d) => d.participant)
                  .map((d) => d.participant),
              ).size
            }{" "}
            位受访者
          </div>
        </header>
        <section>
          <h2>研究背景与范围</h2>
          <p>{p.brief || "尚未提供研究背景。"}</p>
          <p>
            <b>研究对象：</b>
            {p.target || "待补充"}
          </p>
        </section>
        <section>
          <h2>核心结论摘要</h2>
          {p.insights.length ? (
            <p className="preserve-lines">
              {join(p.insights.map((i) => i.interpretation))}
            </p>
          ) : (
            <p className="muted">
              完成问题方向分析后，在下方章节形成综合结论；未形成的内容不会自动补写。
            </p>
          )}
        </section>
        {p.questions.map((q, idx) => {
          const fs = p.findings.filter((f) => f.question === q),
            ins = p.insights.filter((i) => i.question === q),
            confirmed =
              ins.length > 0 &&
              ins.every(
                (i) => i.status === "confirmed" && !insightIssues(p, i).length,
              );
          return (
            <section className="report-chapter" key={q}>
              <div className="section-heading">
                <h2>
                  {idx + 1}. {q}
                </h2>
                <span className="pill">
                  {confirmed
                    ? "已确认"
                    : ins.some((i) => i.status === "stale")
                      ? "需复核"
                      : "草稿"}
                </span>
              </div>
              <h3>用户需求与痛点</h3>
              {fs.length ? (
                <div className="report-findings">
                  {fs.map((f) => (
                    <p key={f.id}>
                      <b>{f.summary}。</b>
                      {f.behavior && ` ${f.behavior}。`}
                      {f.pain && ` ${f.pain}。`}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="muted">材料不足，尚未形成分析。</p>
              )}
              {fields.map(([key, label]) => {
                const content = join(ins.map((i) => i[key]));
                return content ? (
                  <div key={key}>
                    <h3>{label}</h3>
                    <p className="preserve-lines">{content}</p>
                  </div>
                ) : key === "interpretation" ? (
                  <p key={key} className="muted">
                    待综合本方向的需求、痛点及差异，形成完整分析。
                  </p>
                ) : null;
              })}
              <details>
                <summary>分析依据与受访者证据（{fs.length} 项）</summary>
                {fs.map((f) => (
                  <Button
                    key={f.id}
                    variant="ghost"
                    className="report-evidence-link"
                    onClick={() => onEvidence(f.id)}
                  >
                    {f.summary} · {stats(p, f).support} 人支持 ·{" "}
                    {f.status === "confirmed" ? "已核对" : "待核对"}
                  </Button>
                ))}
              </details>
              <div className="actions">
                <Button
                  variant="outline"
                  disabled={!fs.some((f) => f.status === "confirmed")}
                  onClick={() => setEdit(chapter(q))}
                >
                  编辑本章报告
                </Button>
                <Button
                  variant="ghost"
                  disabled={!ins.length}
                  onClick={() => {
                    const issues = ins.flatMap((i) => insightIssues(p, i));
                    if (issues.length) {
                      toast.error([...new Set(issues)].join("；"));
                      return;
                    }
                    onChange({
                      ...p,
                      insights: p.insights.map((i) =>
                        i.question === q
                          ? { ...i, status: confirmed ? "draft" : "confirmed" }
                          : i,
                      ),
                    });
                  }}
                >
                  {confirmed ? "撤销本章确认" : "确认本章"}
                </Button>
              </div>
            </section>
          );
        })}
        <section>
          <h2>研究限制</h2>
          <p>
            本报告反映当前访谈样本。提及人数不代表总体发生率，未提及不代表不存在；设计建议与假设仍需后续验证。下载内容仅包括已确认且引用有效的结论。
          </p>
        </section>
      </article>
      <Dialog
        open={!!edit}
        onOpenChange={(v) => {
          if (!v) setEdit(null);
        }}
      >
        <DialogContent className="large-dialog">
          <DialogHeader>
            <DialogTitle>编辑报告章节</DialogTitle>
            <DialogDescription>
              {edit?.question}。将相关发现整合成连贯分析，不必逐条撰写碎片洞察。
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="analysis-editor">
              {fields.map(([key, label]) => (
                <label key={key}>
                  {label}
                  <textarea
                    rows={key === "interpretation" ? 6 : 3}
                    maxLength={key === "interpretation" ? 5000 : 3000}
                    value={edit[key]}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        [key]: e.target.value,
                        status: "draft",
                      })
                    }
                  />
                </label>
              ))}
              <Button onClick={save}>保存章节</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
