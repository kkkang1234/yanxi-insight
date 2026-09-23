"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  directions,
  organize,
  UNASSIGNED,
  type Segment,
} from "@/lib/interview-organization";
import type { Project, Interview, Evidence } from "@/lib/research";
export function OrganizedInterview({
  p,
  doc,
  highlight,
  onSave,
  onRead,
}: {
  p: Project;
  doc: Interview;
  highlight?: Evidence;
  onSave: (s: Segment[]) => void;
  onRead: () => void;
}) {
  const segments = organize(p, doc),
    headings = [
      ...new Set([
        ...directions(p),
        ...segments.map((s) => s.direction),
        UNASSIGNED,
      ]),
    ];
  const [editing, setEditing] = useState<number | null>(null),
    [value, setValue] = useState("");
  const change = (index: number, patch: Partial<Segment>) =>
    onSave(segments.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  return (
    <div className="organized-reader">
      <Tabs defaultValue={highlight ? "original" : "organized"}>
        <div className="section-heading">
          <TabsList>
            <TabsTrigger value="organized">按问题整理</TabsTrigger>
            <TabsTrigger value="original">完整原文</TabsTrigger>
          </TabsList>
          <Button
            disabled={
              !doc.participant ||
              doc.status === "reviewed" ||
              doc.status === "analyzed"
            }
            onClick={onRead}
          >
            {doc.status === "reviewed" || doc.status === "analyzed"
              ? "已核对记录"
              : "确认整理完成"}
          </Button>
        </div>
        <TabsContent value="organized">
          <p className="muted">
            仅清理独立的犹豫语气词，保留否定和不确定表达。可修改归类及整理文字，原始记录始终保留。
          </p>
          {headings.map((heading, hi) => (
            <section className="transcript-section" key={heading}>
              <h3>
                <span className="question-index">{hi + 1}</span>
                {heading}
              </h3>
              {!segments.some((s) => s.direction === heading) && (
                <p className="muted">暂未找到对应内容。</p>
              )}
              {segments.map((s, index) =>
                s.direction !== heading ? null : (
                  <article
                    key={s.start}
                    className={`transcript-paragraph ${s.speaker === "interviewer" ? "interviewer" : ""}`}
                  >
                    <div className="section-heading">
                      <span className="muted">
                        {s.speaker === "participant"
                          ? "受访者回答"
                          : s.speaker === "interviewer"
                            ? "访谈提问"
                            : "说话人待核对"}
                      </span>
                      <div className="actions">
                        <Select
                          value={s.direction}
                          onValueChange={(v) => change(index, { direction: v })}
                        >
                          <SelectTrigger aria-label={`第${index + 1}段归类`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {headings.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(index);
                            setValue(s.clean);
                          }}
                        >
                          编辑文字
                        </Button>
                      </div>
                    </div>
                    {editing === index ? (
                      <div>
                        <textarea
                          aria-label="整理后的文字"
                          value={value}
                          maxLength={20000}
                          onChange={(e) => setValue(e.target.value)}
                        />
                        <div className="actions">
                          <Button
                            size="sm"
                            disabled={!value.trim()}
                            onClick={() => {
                              change(index, { clean: value });
                              setEditing(null);
                            }}
                          >
                            保存
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(null)}
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p>{s.clean}</p>
                    )}
                    <details>
                      <summary>对照原文</summary>
                      <blockquote>{doc.text.slice(s.start, s.end)}</blockquote>
                      <Select
                        value={s.speaker}
                        onValueChange={(v) =>
                          change(index, { speaker: v as Segment["speaker"] })
                        }
                      >
                        <SelectTrigger aria-label={`第${index + 1}段说话人`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="participant">受访者</SelectItem>
                          <SelectItem value="interviewer">访谈者</SelectItem>
                          <SelectItem value="unknown">待核对</SelectItem>
                        </SelectContent>
                      </Select>
                    </details>
                  </article>
                ),
              )}
            </section>
          ))}
        </TabsContent>
        <TabsContent value="original">
          <div className="fulltext">
            {highlight ? (
              <>
                {doc.text.slice(0, highlight.start)}
                <mark ref={(el) => el?.scrollIntoView({ block: "center" })}>
                  {doc.text.slice(highlight.start, highlight.end)}
                </mark>
                {doc.text.slice(highlight.end)}
              </>
            ) : (
              doc.text
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
