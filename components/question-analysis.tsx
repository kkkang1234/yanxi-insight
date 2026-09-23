"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { directions, organize, UNASSIGNED } from "@/lib/interview-organization";
import {
  uid,
  evidenceAt,
  stats,
  type Project,
  type Finding,
} from "@/lib/research";
export function QuestionAnalysis({
  p,
  onChange,
  onEvidence,
  onReview,
  onMaterials,
}: {
  p: Project;
  onChange: (p: Project) => void;
  onEvidence: (id: string) => void;
  onReview: (f: Finding) => void;
  onMaterials: () => void;
}) {
  const [editing, setEditing] = useState(""),
    [summary, setSummary] = useState(""),
    [pain, setPain] = useState(""),
    [need, setNeed] = useState(""),
    [question, setQuestion] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [verified, setVerified] = useState(false);
  const headings = [
    ...new Set([
      ...directions(p),
      ...p.findings.map((f) => f.theme),
      UNASSIGNED,
    ]),
  ];
  const records = p.interviews.flatMap((d) =>
    organize(p, d)
      .filter((s) => s.speaker !== "interviewer")
      .map((s) => ({ d, s, key: `${d.id}:${s.start}` })),
  );
  function save() {
    try {
      if (!summary.trim() || !question || !selected.length || !verified)
        throw new Error(
          "请填写分析结论、关联研究问题，并核对至少一段受访者原话。",
        );
      let next = { ...p, evidence: [...p.evidence] };
      const links = selected.map((key) => {
        const r = records.find((r) => r.key === key)!;
        const e = evidenceAt(next, r.d.id, r.s.start, r.s.end);
        if (!next.evidence.some((x) => x.id === e.id)) next.evidence.push(e);
        return { evidenceId: e.id, role: "support" as const };
      });
      onChange({
        ...next,
        findings: [
          ...next.findings,
          {
            id: uid(),
            summary,
            theme: editing,
            origin: editing === UNASSIGNED ? "emergent" : "manual",
            stage: "",
            behavior: need,
            pain,
            question,
            links,
            status: "draft",
            source: "manual",
          },
        ],
      });
      setEditing("");
      toast.success("分析已保存，可查看证据后确认。");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <div className="direction-analysis">
      <div className="banner">
        围绕每个问题方向，综合受访者的需求与痛点。结论可回查原话，反例保留在证据中。
      </div>
      {!p.interviews.length && (
        <Button onClick={onMaterials}>先导入访谈记录</Button>
      )}
      {headings.map((h, index) => {
        const fs = p.findings.filter((f) => f.theme === h),
          rs = records.filter((r) => r.s.direction === h);
        if (h === UNASSIGNED && !rs.length && !fs.length) return null;
        return (
          <section className="panel direction-panel" key={h}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">问题方向 {index + 1}</span>
                <h2>{h}</h2>
                <p className="muted">
                  {
                    new Set(
                      rs
                        .filter((r) => r.d.participant)
                        .map((r) => r.d.participant),
                    ).size
                  }{" "}
                  位受访者有对应记录 · {fs.length} 项分析
                </p>
              </div>
              <Button
                variant="outline"
                disabled={!records.length || !p.questions.length}
                onClick={() => {
                  setEditing(h);
                  setSummary("");
                  setNeed("");
                  setPain("");
                  setQuestion(p.questions[0] || "");
                  setSelected([]);
                  setVerified(false);
                }}
              >
                整理需求与痛点
              </Button>
            </div>
            {!fs.length ? (
              <p className="empty-analysis">
                尚未形成分析结论。可先查看对应访谈记录，再整理需求与痛点。
              </p>
            ) : (
              <div className="analysis-table">
                {fs.map((f) => {
                  const s = stats(p, f);
                  return (
                    <article className="analysis-row" key={f.id}>
                      <div>
                        <h3>{f.summary}</h3>
                        <span className="pill">
                          {f.status === "confirmed"
                            ? "已确认"
                            : f.status === "stale"
                              ? "需重新核对"
                              : "待核对"}
                        </span>
                      </div>
                      <div>
                        <span className="muted">需求与行为</span>
                        <p>{f.behavior || "待补充，勿由痛点直接推定需求"}</p>
                      </div>
                      <div>
                        <span className="muted">痛点</span>
                        <p>{f.pain || "暂无明确痛点"}</p>
                      </div>
                      <div className="actions">
                        <Button
                          variant="ghost"
                          onClick={() => onEvidence(f.id)}
                        >
                          查看证据 · {s.support} 人支持
                          {s.counter ? ` / ${s.counter} 人反例` : ""}
                        </Button>
                        <Button variant="outline" onClick={() => onReview(f)}>
                          编辑分析
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <details className="direction-records">
              <summary>查看对应访谈记录（{rs.length} 段）</summary>
              {rs.map((r) => (
                <blockquote key={r.key}>
                  <b>
                    {r.d.participant || "身份待确认"} · {r.d.name}
                  </b>
                  <p>{r.s.clean}</p>
                </blockquote>
              ))}
              {!rs.length && (
                <p className="muted">
                  暂无已归类内容，可在访谈记录中调整问题方向。
                </p>
              )}
            </details>
          </section>
        );
      })}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing("");
        }}
      >
        <DialogContent className="large-dialog">
          <DialogHeader>
            <DialogTitle>{editing} · 需求与痛点</DialogTitle>
            <DialogDescription>
              综合相关原话写出分析，不需要逐句添加碎片卡片。
            </DialogDescription>
          </DialogHeader>
          <div className="analysis-editor">
            <label>
              分析结论
              <input
                value={summary}
                maxLength={2000}
                onChange={(e) => setSummary(e.target.value)}
              />
            </label>
            <label>
              用户需求与行为
              <textarea
                value={need}
                maxLength={2000}
                onChange={(e) => setNeed(e.target.value)}
              />
            </label>
            <label>
              主要痛点
              <textarea
                value={pain}
                maxLength={2000}
                onChange={(e) => setPain(e.target.value)}
              />
            </label>
            <label>
              关联研究问题
              <Select value={question} onValueChange={setQuestion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {p.questions.map((q) => (
                    <SelectItem value={q} key={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <h3>选择依据原话</h3>
            <div className="quote-picker">
              {records
                .filter(
                  (r) => r.s.direction === editing || selected.includes(r.key),
                )
                .map((r) => (
                  <label key={r.key}>
                    <Checkbox
                      checked={selected.includes(r.key)}
                      disabled={!r.d.participant}
                      onCheckedChange={(v) => {
                        setSelected(
                          v
                            ? [...selected, r.key]
                            : selected.filter((k) => k !== r.key),
                        );
                        setVerified(false);
                      }}
                    />
                    <span>
                      <b>{r.d.participant || "请先填写受访者编号"}</b>
                      <p>{r.d.text.slice(r.s.start, r.s.end)}</p>
                    </span>
                  </label>
                ))}
            </div>
            <label className="actions">
              <Checkbox
                checked={verified}
                onCheckedChange={(v) => setVerified(v === true)}
              />
              已核对：选中的内容是受访者表述，且支持本项结论
            </label>
            <Button
              onClick={save}
              disabled={!selected.length || !verified || !summary.trim()}
            >
              保存分析
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
