import type { Project, Interview } from "./research";
export type Segment = NonNullable<Interview["organized"]>[number];
export const UNASSIGNED = "其他话题 / 待归类";
export function directions(p: Project): string[] {
  const qs = p.outline
    .split("\n")
    .map((s) =>
      s
        .replace(
          /^\s*(?:#{1,6}\s*|(?:\d+[.、)）]|[一二三四五六七八九十]+[、.]|[-*])\s*)/,
          "",
        )
        .trim(),
    )
    .filter((s) => s && (/[？?]$/.test(s) || /^主题[:：]/.test(s)));
  return [
    ...new Set(qs.length ? qs : p.themes.length ? p.themes : p.questions),
  ].slice(0, 50);
}
// Only remove standalone hesitation tokens; preserve negation, uncertainty and complete answers.
export function cleanSpeech(s: string): string {
  return s
    .replace(/(^|[：:，,。！？!?]\s*)(?:嗯+|呃+|额+)[，,、\s]+/g, "$1")
    .trim();
}
const normalized = (s: string) =>
  s
    .replace(/[\s\p{P}\p{S}]/gu, "")
    .replace(/^(访谈者|采访者|主持人|研究员|Q)/, "");
export function organize(p: Project, d: Interview): Segment[] {
  if (
    d.organized?.every(
      (s) => s.start >= 0 && s.end <= d.text.length && s.end > s.start,
    )
  )
    return d.organized;
  const headings = directions(p);
  let start = 0,
    current = UNASSIGNED;
  return d.text.split("\n").flatMap((line) => {
    const at = start;
    start += line.length + 1;
    if (!line.trim()) return [];
    const speaker = /^\s*(访谈者|采访者|主持人|研究员|Q)\s*[:：]/i.test(line)
      ? "interviewer"
      : /^\s*(受访者|被访者|用户|A|P\d+)\s*[:：]/i.test(line)
        ? "participant"
        : "unknown";
    const n = normalized(line);
    const match = headings.find(
      (q) =>
        normalized(q) === n ||
        (normalized(q).length >= 5 && n.includes(normalized(q))),
    );
    if (match) current = match;
    else if (speaker === "interviewer") current = UNASSIGNED;
    return [
      {
        start: at,
        end: at + line.length,
        direction: current,
        clean: cleanSpeech(line),
        speaker,
      },
    ];
  });
}
