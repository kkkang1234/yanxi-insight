"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FolderOpen,
  Files,
  Layers3,
  FileCheck2,
  Sparkles,
  Plus,
  ArrowRight,
  Quote,
  Upload,
  Download,
  Check,
  FileText,
  Users,
  ShieldCheck,
  ChevronRight,
  Search,
  Pencil,
  Trash2,
  CircleAlert,
  Loader2,
  BookOpen,
  FlaskConical,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  uid,
  canonical,
  createProject,
  touch,
  invalidate,
  invalidateInsights,
  addInterview,
  evidenceAt,
  validEvidence,
  stats,
  findingIssues,
  insightIssues,
  restoreProject,
  report,
  type Project,
  type Interview,
  type Evidence,
  type Finding,
  type Insight,
  type EvidenceLink,
} from "@/lib/research";
import { OrganizedInterview } from "@/components/organized-interview";
import { QuestionAnalysis } from "@/components/question-analysis";
import { EditorialReport } from "@/components/editorial-report";
import { readDocument } from "@/lib/import-document";
import { portfolioSample } from "@/lib/portfolio-sample";
import { runModel, analyzeInterviews } from "@/lib/model-client";

const nav = [
  {
    icon: FolderOpen,
    label: "研究项目",
    title: "从研究问题出发",
    desc: "整理背景与大纲，让分析始终围绕研究目标。",
  },
  {
    icon: Files,
    label: "访谈材料",
    title: "访谈记录",
    desc: "一份文件对应一位受访者，按大纲问题整理访谈内容。",
  },
  {
    icon: Layers3,
    label: "分析与证据",
    title: "按问题方向分析",
    desc: "结合多位受访者的回答，归纳用户需求与痛点。",
  },
  {
    icon: FileCheck2,
    label: "洞察报告",
    title: "确认分析报告",
    desc: "将分析整合为完整报告，按章节核对、编辑并导出。",
  },
];
const stateLabel = { draft: "待审核", confirmed: "已确认", stale: "待复核" };
const sourceLabel = { manual: "人工整理", ai: "AI 草稿", sample: "合成示例" };
const roleLabel = { support: "支持", counter: "反例", context: "背景" };

function Choice({
  value,
  onChange,
  options,
  label,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value || "__none"}
      onValueChange={(v) => onChange(v === "__none" ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger aria-label={label} className="choice">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem value={o.value || "__none"} key={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label>
      {label}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
function NoContent({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="empty-panel">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpen />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children}
    </Empty>
  );
}
function downloadReport(project: Project) {
  report(project);
  const frame = document.createElement("iframe");
  frame.name = `report-${uid()}`;
  frame.hidden = true;
  frame.title = "洞察报告下载";
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/report";
  form.target = frame.name;
  form.hidden = true;
  const field = document.createElement("input");
  field.type = "hidden";
  field.name = "project";
  field.value = JSON.stringify(project);
  form.appendChild(field);
  document.body.appendChild(frame);
  document.body.appendChild(form);
  form.submit();
  form.remove();
  setTimeout(() => frame.remove(), 60000);
}
function HistoryCreate({
  busy,
  onClick,
}: {
  busy: boolean;
  onClick: () => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <Button
      className="new-project-button"
      disabled={busy}
      onClick={() => {
        setOpenMobile(false);
        onClick();
      }}
    >
      <Plus size={18} />
      新建项目
    </Button>
  );
}
function HistoryItem({
  project,
  active,
  busy,
  onClick,
}: {
  project: Project;
  active: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuButton
      disabled={busy}
      onClick={() => {
        setOpenMobile(false);
        onClick();
      }}
      isActive={active}
      className="history-project"
      title={project.name}
    >
      <FolderOpen size={18} />
      <span className="history-project-text">
        <b>{project.name || "未命名研究"}</b>
        <small>
          {project.interviews.length} 份访谈 ·{" "}
          {project.insights.filter((i) => i.status === "confirmed").length}{" "}
          条洞察
        </small>
      </span>
    </SidebarMenuButton>
  );
}
const lines = (s: string) => [
  ...new Set(
    s
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  ),
];
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "操作失败，请重试。";

export default function Workbench({showcase=false}:{showcase?:boolean}) {
 const STORAGE=showcase?"yanxi.portfolio.v1":"yanxi.research.v1";
  const [projects, setProjects] = useState<Project[]>([]),
    [active, setActive] = useState(""),
    [ready, setReady] = useState(false),
    [saveState, setSaveState] = useState("正在读取"),
    [view, setView] = useState(0);
  const [busy, setBusy] = useState(""),
    [progress, setProgress] = useState(0);
  const [theme, setTheme] = useState(""),
    [stage, setStage] = useState(""),
    [question, setQuestion] = useState(""),
    [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null),
    [reading, setReading] = useState<{
      docId: string;
      evidenceId?: string;
    } | null>(null);
  const [materialModal, setMaterialModal] = useState(false),
    [editDoc, setEditDoc] = useState<Interview | null>(null),
    [findingEdit, setFindingEdit] = useState<Finding | null>(null),
    [insightEdit, setInsightEdit] = useState<Insight | null>(null),
    [createOpen, setCreateOpen] = useState(false),
    [createName, setCreateName] = useState("");
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);
  const allRef = useRef<Project[]>([]),
    storageBlocked = useRef(false),
    activeRef = useRef(""),
    cancelRef = useRef<AbortController | null>(null),
    filesInput = useRef<HTMLInputElement>(null),
    outlineInput = useRef<HTMLInputElement>(null);
  const p = projects.find((p) => p.id === active);
  function saveAll(next: Project[], id = activeRef.current) {
    allRef.current = next;
    activeRef.current = id;
    setProjects(next);
    setActive(id);
    try {
      if (storageBlocked.current) throw new Error("历史数据尚未恢复");
      localStorage.setItem(
        STORAGE,
        JSON.stringify({ active: id, projects: next }),
      );
      setSaveState("已保存");
    } catch {
      setSaveState("保存失败");
      toast.error(
        "暂时无法保存，当前内容仍保留在页面中。请勿关闭页面，可先下载已有洞察报告。",
      );
    }
  }
  function update(change: (p: Project) => Project) {
    const id = activeRef.current;
    saveAll(allRef.current.map((p) => (p.id === id ? touch(change(p)) : p)));
  }
  function current() {
    const p = allRef.current.find((p) => p.id === activeRef.current);
    if (!p) throw new Error("项目不存在");
    return p;
  }
  function switchProject(id: string) {
    activeRef.current = id;
    setActive(id);
    const destination = allRef.current.find((p) => p.id === id);
    setView(
      destination?.insights.length
        ? 3
        : destination?.findings.length
          ? 2
          : destination?.confirmed
            ? 1
            : 0,
    );
    setSelected(null);
    setReading(null);
    setTheme("");
    setStage("");
    setQuestion("");
    setQuery("");
    saveAll(allRef.current, id);
  }
  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE);
      if (data) {
        const raw = JSON.parse(data);
        if (!Array.isArray(raw.projects)) throw new Error();
        const parsed = raw.projects.map(restoreProject);
        allRef.current = parsed;
        setProjects(parsed);
        const id = parsed.some((p: Project) => p.id === raw.active)
          ? raw.active
          : parsed[0]?.id;
        activeRef.current = id;
        setActive(id);
        setSaveState("已保存");
      } else {
        const first = showcase ? portfolioSample() : createProject();
        saveAll([first], first.id);
      }
    } catch {
      storageBlocked.current = true;
      setSaveState("历史项目读取失败");
      toast.error("暂时无法读取历史项目，请刷新重试。原始数据未被覆盖。");
    }
    if(showcase)setView(3);
    setReady(true);
    return () => cancelRef.current?.abort();
  }, []);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => void;
        };
      }
    ).modelContext;
    if (!context) return;
    const abort = new AbortController();
    try {
      context.registerTool(
        {
          name: "read_research_summary",
          description:
            "读取当前研究项目的进度与有效证据数量，不包含原始访谈全文。",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute(input: unknown) {
            if (
              !input ||
              typeof input !== "object" ||
              Object.keys(input).length
            )
              throw new Error("不接受参数");
            const p = current();
            return {
              name: p.name,
              materials: p.interviews.length,
              findings: p.findings.length,
              confirmedFindings: p.findings.filter(
                (f) => f.status === "confirmed",
              ).length,
              validEvidence: p.evidence.filter((e) => validEvidence(p, e))
                .length,
            };
          },
        },
        { signal: abort.signal },
      );
    } catch {}
    return () => {
      try {
        abort.abort();
      } catch {}
    };
  }, []);
  function newProject() {
    if (!createName.trim()) {
      toast.error("请为研究项目填写名称。");
      return;
    }
    const next = { ...createProject(), name: createName.trim() };
    saveAll([...allRef.current, next], next.id);
    setView(0);
    setTheme("");
    setStage("");
    setQuestion("");
    setQuery("");
    setCreateOpen(false);
    setCreateName("");
    setSelected(null);
    setReading(null);
    toast.success("已创建研究项目");
  }
  function contextChange(key: keyof Project, value: unknown) {
    update((p) =>
      invalidate({
        ...p,
        [key]: value,
        confirmed: false,
        interviews: p.interviews.map((d) => ({
          ...d,
          status: "ready",
          error: "",
        })),
      } as Project),
    );
  }
  async function importFiles(files: FileList | null) {
    if (!files || !p) return;
    const projectId = current().id;
    for (const file of Array.from(files)) {
      try {
        const content = await readDocument(file);
        const destination = allRef.current.find(
          (project) => project.id === projectId,
        );
        if (!destination) throw new Error("原项目已不存在，请重新导入");
        let number = 1;
        while (
          destination.interviews.some(
            (d) => d.participant === "P" + String(number).padStart(2, "0"),
          )
        )
          number++;
        const next = touch(
          addInterview(
            destination,
            file.name,
            content,
            "P" + String(number).padStart(2, "0"),
          ),
        );
        saveAll(
          allRef.current.map((project) =>
            project.id === projectId ? next : project,
          ),
        );
        toast.success(`${file.name} 已导入，请确认受访者`);
      } catch (e) {
        toast.error(`${file.name}：${errorText(e)}`);
      }
    }
  }
  function markReviewed(id: string) {
    update((p) => ({
      ...p,
      interviews: p.interviews.map((d) =>
        d.id === id ? { ...d, status: "reviewed", error: "" } : d,
      ),
    }));
    toast.success("已标记整理已核对");
  }
  async function aiTask(step: "context" | "insights" | "analysis") {
    if(showcase){toast.info("展示版暂未开放自动分析，可体验资料整理、证据核对和报告编辑。");return;}
    const initial = current();
    if (step !== "context" && !initial.confirmed) {
      toast.error("请先确认研究背景");
      return;
    }
    const abort = new AbortController();
    cancelRef.current = abort;
    setBusy(
      step === "context"
        ? "整理研究信息"
        : step === "analysis"
          ? "分析访谈与聚合发现"
          : "生成报告草稿",
    );
    setProgress(5);
    try {
      let next: Project;
      if (step === "analysis")
        next = await analyzeInterviews(
          initial,
          abort.signal,
          (label, percentage) => {
            setBusy(label);
            setProgress(percentage);
          },
        );
      else next = await runModel(initial, step, abort.signal);
      if (
        current().id !== initial.id ||
        current().revision !== initial.revision
      )
        throw new Error("项目内容已更新，本次旧结果未写入。请重新分析。");
      const previousRuns = new Set(initial.runs.map((r) => r.id));
      const incomplete =
        next.interviews.some((d) => d.status === "failed") ||
        next.runs.some((r) => !previousRuns.has(r.id) && r.status === "failed");
      update(() => ({
        ...next,
        runs: [
          ...next.runs,
          {
            id: uid(),
            step,
            at: new Date().toISOString(),
            status: incomplete ? "failed" : "success",
            detail: incomplete
              ? "分析未全部完成，已保留可用结果。"
              : "调用完成；输出仍需人工审核",
          },
        ].slice(-100) as Project["runs"],
      }));
      if (incomplete)
        toast.error(
          abort.signal.aborted
            ? "已取消，已完成的结果已保留。"
            : "部分或全部材料未完成分析，已保留现有结果，请查看材料状态后重试。",
        );
      else toast.success("处理完成，请核对草稿与证据。");
      if (step === "analysis") setView(2);
    } catch (e) {
      if (current().id === initial.id)
        update((p) => ({
          ...p,
          runs: [
            ...p.runs,
            {
              id: uid(),
              step,
              at: new Date().toISOString(),
              status: "failed",
              detail: errorText(e),
            },
          ].slice(-100) as Project["runs"],
        }));
      toast.error(
        abort.signal.aborted ? "已取消，已保存内容保留。" : errorText(e),
      );
    } finally {
      setBusy("");
      setProgress(0);
      cancelRef.current = null;
    }
  }
  const f = p?.findings.find((f) => f.id === selected),
    readDoc = p?.interviews.find((d) => d.id === reading?.docId),
    readEvidence = p?.evidence.find((e) => e.id === reading?.evidenceId);
  const visible =
    p?.findings.filter(
      (f) =>
        (!theme || f.theme === theme) &&
        (!stage || (f.stage || "阶段待确认") === stage) &&
        (!question || f.question === question) &&
        (!query || `${f.summary} ${f.behavior} ${f.pain}`.includes(query)),
    ) ?? [];
  function checkFinding(f: Finding) {
    if (!p) return;
    const issues = findingIssues(p, f);
    if (issues.length) {
      toast.error(issues.join("；"));
      return;
    }
    update((p) =>
      invalidateInsights(
        {
          ...p,
          findings: p.findings.map((x) =>
            x.id === f.id
              ? {
                  ...x,
                  status: f.status === "confirmed" ? "draft" : "confirmed",
                }
              : x,
          ),
        },
        f.id,
      ),
    );
  }
  function addAnnotation(
    doc: Interview,
    start: number,
    end: number,
    data: {
      summary: string;
      theme: string;
      stage: string;
      question: string;
      existing: string;
      role: EvidenceLink["role"];
      behavior: string;
      pain: string;
      origin: Finding["origin"];
    },
  ) {
    try {
      const p = current(),
        e = evidenceAt(p, doc.id, start, end);
      let next = {
        ...p,
        evidence: p.evidence.some((x) => x.id === e.id)
          ? p.evidence
          : [...p.evidence, e],
      };
      if (data.existing) {
        next = invalidateInsights(
          {
            ...next,
            findings: next.findings.map((f) =>
              f.id === data.existing
                ? {
                    ...f,
                    status: "draft",
                    links: [
                      ...f.links.filter((l) => l.evidenceId !== e.id),
                      { evidenceId: e.id, role: data.role },
                    ],
                  }
                : f,
            ),
          },
          data.existing,
        );
      } else {
        if (!data.summary.trim() || !data.theme.trim() || !data.question)
          throw new Error("请填写发现、主题并关联研究问题。");
        next = {
          ...next,
          findings: [
            ...next.findings,
            {
              id: uid(),
              summary: data.summary.trim(),
              theme: data.theme.trim(),
              origin: data.origin,
              stage: data.stage,
              behavior: data.behavior,
              pain: data.pain,
              question: data.question,
              links: [{ evidenceId: e.id, role: data.role }],
              status: "draft",
              source: "manual",
            },
          ],
        };
      }
      update(() => next);
      toast.success("证据已加入，原文精确匹配通过。");
    } catch (e) {
      toast.error(errorText(e));
      throw e;
    }
  }
  if (!ready)
    return (
      <div className="loading">
        <Loader2 className="animate-spin" />
        正在读取研究工作台…
      </div>
    );
  return (
    <SidebarProvider>
      <Toaster position="top-center" theme="light" richColors />
      <Sidebar>
        <SidebarHeader>
          <div className="brand">
            <span className="brand-mark">
              <Quote size={22} />
            </span>
            <b>
              言析 <small>Insight</small>
            </b>
          </div>
          <div className="new-project-wrap">
            <HistoryCreate busy={!!busy} onClick={() => setCreateOpen(true)} />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="nav-label history-heading">
            历史项目 <span>{projects.length}</span>
          </div>
          <SidebarMenu>
            {[...projects]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((project) => (
                <SidebarMenuItem key={project.id}>
                  <HistoryItem
                    project={project}
                    active={active === project.id}
                    busy={!!busy}
                    onClick={() => switchProject(project.id)}
                  />
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="local-badge">
            <ShieldCheck size={17} />
            <span>研究工作空间</span>
          </div>
          <span className="muted">围绕问题研究，以原文为依据</span>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="topbar">
          <SidebarTrigger aria-label="展开或收起历史项目" />
          <span className="breadcrumb">
            工作空间 <ChevronRight size={14} /> {p?.name || "研究项目"}
          </span>
          <span
            className={`save-label ${saveState.includes("失败") ? "error-text" : ""}`}
          >
            {saveState}
          </span>
          {p && (
            <Button
              variant="ghost"
              size="sm"
              disabled={!!busy}
              aria-label="删除当前项目"
              onClick={() =>
                setConfirm({
                  title: "删除当前项目？",
                  description:
                    "该项目的访谈材料、发现和洞察将一并删除，无法撤销。",
                  action: () => {
                    const next = allRef.current.filter((x) => x.id !== p.id);
                    if (!next.length) next.push(createProject());
                    saveAll(next, next[0].id);
                    setSelected(null);
                    setReading(null);
                    setView(0);
                  },
                })
              }
            >
              <Trash2 size={15} />
              <span className="hide-small">删除项目</span>
            </Button>
          )}
        </header>
        <main className="workspace">
          {!p ? (
            <NoContent
              title="创建你的研究项目"
              description="从业务背景和研究问题开始，将访谈整理为可追溯的洞察。"
            >
              <Button onClick={() => setCreateOpen(true)}>新建项目</Button>
            </NoContent>
          ) : (
            <>
              <div className="eyebrow">
                {p.sample ? "SAMPLE RESEARCH · 合成示例" : "RESEARCH WORKSPACE"}
              </div>
              <div className="page-heading">
                <div>
                  <h1>{nav[view].title}</h1>
                  <p>{nav[view].desc}</p>
                </div>
                <div className="actions">
                  {view === 1 && p.interviews.length > 0 && (
                    <Button
                      onClick={() => setMaterialModal(true)}
                      disabled={!!busy}
                    >
                      <Plus />
                      导入访谈
                    </Button>
                  )}
                  {view === 2 && (
                    <Button
                      disabled={
                        !!busy ||
                        !p.interviews.some(
                          (d) =>
                            d.participant.trim() && d.status !== "analyzed",
                        )
                      }
                      onClick={() => aiTask("analysis")}
                    >
                      <Sparkles />
                      开始分析
                    </Button>
                  )}
                  {view === 3 && (
                    <Button
                      disabled={
                        !!busy ||
                        !p.findings.some((f) => f.status === "confirmed")
                      }
                      onClick={() => aiTask("insights")}
                    >
                      <Sparkles />
                      生成报告草稿
                    </Button>
                  )}
                </div>
              </div>
              <div className="steps">
                {["研究准备", "导入访谈", "分析与核对", "确认与导出"].map(
                  (label, i) => (
                    <button
                      key={label}
                      disabled={!!busy}
                      className={view === i ? "current" : ""}
                      aria-current={view === i ? "step" : undefined}
                      onClick={() => setView(i)}
                    >
                      0{i + 1} <span>{label}</span>
                    </button>
                  ),
                )}
              </div>
              {p.sample && (
                <div className="banner sample-banner">
                  <FlaskConical size={18} />
                  <span>
                    当前为合成示例，材料和预置分析均非真实研究，也不是本次 AI
                    生成结果。
                  </span>
                </div>
              )}
              {busy && (
                <div className="busy">
                  <div>
                    <Loader2 className="animate-spin" size={17} />
                    {busy}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelRef.current?.abort()}
                    >
                      取消
                    </Button>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
              {showcase&&<div className="banner"><div><strong>作品体验 · 合成研究案例</strong><p>案例与结论均为人工编写的合成示例，不代表真实研究或自动分析结果。可体验资料整理、证据核对及报告编辑；自动分析暂未开放。操作仅保存在当前浏览器。</p><a href="/prd.md" download="言析Insight_MVP_PRD.md">下载产品需求文档（PRD）</a></div></div>}
              <fieldset disabled={!!busy} className="main-fields">
                {view === 0 && (
                  <div className="project-grid">
                    <section className="panel">
                      <div className="section-heading">
                        <h2>研究背景</h2>
                        <span className="pill">
                          {p.notes.length ? "含 AI 建议" : "人工填写"}
                        </span>
                      </div>
                      <Field label="项目名称">
                        <input
                          maxLength={200}
                          value={p.name}
                          onChange={(e) =>
                            update((p) => ({ ...p, name: e.target.value }))
                          }
                        />
                      </Field>
                      <Field
                        label="业务背景与研究说明"
                        hint="可以输入已有说明；未提供的信息会保留为空，等待你补充。"
                      >
                        <textarea
                          rows={6}
                          maxLength={20000}
                          value={p.brief}
                          onChange={(e) =>
                            contextChange("brief", e.target.value)
                          }
                          placeholder="描述当前业务情况、为什么开展研究，以及希望了解哪些用户。"
                        />
                      </Field>
                      <div className="section-heading">
                        <h3>
                          访谈大纲 <span className="muted">可选</span>
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => outlineInput.current?.click()}
                        >
                          <Upload size={14} />
                          上传大纲
                        </Button>
                      </div>
                      <textarea
                        aria-label="访谈大纲"
                        rows={5}
                        maxLength={10000}
                        value={p.outline}
                        onChange={(e) =>
                          contextChange("outline", e.target.value)
                        }
                        placeholder="粘贴大纲或上传 Word（.docx）、MD、TXT；没有大纲时可以开放归纳主题。"
                      />
                      <Button
                        className="primary-action"
                        onClick={() => aiTask("context")}
                        disabled={!p.brief.trim() && !p.outline.trim()}
                      >
                        <Sparkles />
                        整理研究信息
                      </Button>
                      <p className="muted">
                        自动整理为可编辑的研究框架，确认后开始分析。
                      </p>
                    </section>
                    <section className="panel">
                      <div className="section-heading">
                        <h2>研究框架</h2>
                        <span className={`pill ${p.confirmed ? "green" : ""}`}>
                          {p.confirmed ? "已确认" : "待确认"}
                        </span>
                      </div>
                      <Field label="研究目标 *">
                        <textarea
                          rows={3}
                          maxLength={20000}
                          value={p.objective}
                          onChange={(e) =>
                            contextChange("objective", e.target.value)
                          }
                          placeholder="这次研究希望支持哪项产品或设计决策？"
                        />
                      </Field>
                      <Field label="访谈对象 *">
                        <input
                          maxLength={1000}
                          value={p.target}
                          onChange={(e) =>
                            contextChange("target", e.target.value)
                          }
                          placeholder="例如：过去一个月首次使用产品的用户"
                        />
                      </Field>
                      <Field
                        label="核心研究问题 *"
                        hint="每行一个问题，后续发现和洞察会关联到这些问题。"
                      >
                        <textarea
                          rows={4}
                          value={p.questions.join("\n")}
                          onChange={(e) =>
                            contextChange(
                              "questions",
                              e.target.value.split("\n").slice(0, 30),
                            )
                          }
                          placeholder="用户在哪个阶段遇到阻碍？\n哪些因素影响用户完成任务？"
                        />
                      </Field>
                      <Field
                        label="大纲主题"
                        hint="每行一个主题；大纲外话题也会单独保留。"
                      >
                        <textarea
                          rows={2}
                          value={p.themes.join("\n")}
                          onChange={(e) =>
                            contextChange(
                              "themes",
                              e.target.value.split("\n").slice(0, 50),
                            )
                          }
                          placeholder="例如：填写体验"
                        />
                      </Field>
                      {p.notes.map((n, i) => (
                        <div className="note" key={i}>
                          <CircleAlert size={17} />
                          <div>
                            <b>
                              {n.field} · {n.issue}
                            </b>
                            <p>
                              {n.source}：{n.quote || "没有对应原文"}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div className="note">
                        <Quote size={19} />
                        <p>
                          确认前请核对目标、对象和研究问题。缺失背景及未解决冲突会作为分析限制保留。
                        </p>
                      </div>
                      <Button
                        className="primary-action"
                        onClick={() => {
                          if (
                            !p.objective.trim() ||
                            !p.target.trim() ||
                            !p.questions.some((q) => q.trim())
                          ) {
                            toast.error(
                              "请填写研究目标、访谈对象和至少一个研究问题。",
                            );
                            return;
                          }
                          update((p) => ({
                            ...p,
                            confirmed: true,
                            questions: lines(p.questions.join("\n")),
                            themes: lines(p.themes.join("\n")),
                          }));
                          setView(1);
                          toast.success("研究框架已确认");
                        }}
                      >
                        确认并导入访谈
                        <ArrowRight />
                      </Button>
                    </section>
                  </div>
                )}
                {view === 1 && (
                  <>
                    <div className="metrics">
                      <Metric
                        label="访谈材料"
                        value={p.interviews.length}
                        unit="份"
                      />
                      <Metric
                        label="已标注受访者"
                        value={
                          new Set(
                            p.interviews
                              .filter((d) => d.participant.trim())
                              .map((d) => d.participant.trim()),
                          ).size
                        }
                        unit="人"
                      />
                      <Metric
                        label="已核对 / 分析"
                        value={
                          p.interviews.filter((d) =>
                            ["reviewed", "analyzed"].includes(d.status),
                          ).length
                        }
                        unit="份"
                      />
                    </div>
                    <div className="banner">
                      <ShieldCheck size={18} />
                      <span>
                        同一人多次访谈请填写相同编号；同名不同人请使用不同编号。原文导入后只读，替换会使关联分析待复核。
                      </span>
                    </div>
                    {!p.interviews.length ? (
                      <NoContent
                        title="添加第一份访谈"
                        description="支持单份或批量上传 Word（.docx）、MD、TXT，也可直接粘贴文字。每份材料对应一位受访者。"
                      >
                        <Button onClick={() => setMaterialModal(true)}>
                          <Upload />
                          导入访谈材料
                        </Button>
                      </NoContent>
                    ) : (
                      <div className="material-list">
                        {p.interviews.map((d, i) => (
                          <article className="panel material-card" key={d.id}>
                            <div className="file-icon">
                              <FileText />
                            </div>
                            <div className="material-body">
                              <div className="section-heading">
                                <h3>
                                  <button
                                    className="material-open"
                                    onClick={() => setReading({ docId: d.id })}
                                  >
                                    {d.name}
                                  </button>
                                </h3>
                                <span
                                  className={`pill ${d.status === "failed" ? "red" : ["reviewed", "analyzed"].includes(d.status) ? "green" : ""}`}
                                >
                                  {
                                    {
                                      ready: "待整理",
                                      reviewed: "整理已核对",
                                      analyzed: "AI 分析完成",
                                      failed: "分析失败",
                                    }[d.status]
                                  }
                                </span>
                              </div>
                              <p className="snippet">{d.text.slice(0, 115)}</p>
                              <div className="material-meta">
                                <span>
                                  {d.text.length.toLocaleString()} 字符 · v
                                  {d.version}
                                </span>
                                <label className="inline-label">
                                  受访者编号
                                  <input
                                    aria-label={`访谈${i + 1}受访者编号`}
                                    placeholder="如 P01"
                                    maxLength={80}
                                    value={d.participant}
                                    onChange={(e) =>
                                      update((p) =>
                                        invalidate({
                                          ...p,
                                          interviews: p.interviews.map((x) =>
                                            x.id === d.id
                                              ? {
                                                  ...x,
                                                  participant:
                                                    e.target.value.trim(),
                                                  status: "ready",
                                                }
                                              : x,
                                          ),
                                        }),
                                      )
                                    }
                                  />
                                </label>
                              </div>
                              {d.error && (
                                <p className="error-text">{d.error}</p>
                              )}
                              <div className="actions">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setReading({ docId: d.id })}
                                >
                                  <BookOpen />
                                  查看整理记录
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditDoc({ ...d })}
                                >
                                  <Pencil />
                                  编辑 / 替换
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`删除 ${d.name}`}
                                  onClick={() =>
                                    setConfirm({
                                      title: "删除这份访谈？",
                                      description:
                                        "相关证据将移除，引用它的发现和洞察需要重新核对。",
                                      action: () =>
                                        update((p) => {
                                          const ids = new Set(
                                            p.evidence
                                              .filter(
                                                (e) => e.interviewId === d.id,
                                              )
                                              .map((e) => e.id),
                                          );
                                          return invalidate({
                                            ...p,
                                            interviews: p.interviews.filter(
                                              (x) => x.id !== d.id,
                                            ),
                                            evidence: p.evidence.filter(
                                              (e) => !ids.has(e.id),
                                            ),
                                            findings: p.findings.map((f) => ({
                                              ...f,
                                              links: f.links.filter(
                                                (l) => !ids.has(l.evidenceId),
                                              ),
                                            })),
                                          });
                                        }),
                                    })
                                  }
                                >
                                  <Trash2 size={15} />
                                </Button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                    {p.interviews.length > 0 && (
                      <div className="bottom-actions">
                        <Button variant="outline" onClick={() => setView(0)}>
                          返回研究准备
                        </Button>
                        <Button
                          disabled={!p.interviews.length}
                          onClick={() => setView(2)}
                        >
                          按问题方向分析
                          <ArrowRight />
                        </Button>
                      </div>
                    )}
                  </>
                )}
                {view === 2 && (
                  <QuestionAnalysis
                    p={p}
                    onChange={(next) => update(() => next)}
                    onEvidence={setSelected}
                    onReview={(f) => setFindingEdit(structuredClone(f))}
                    onMaterials={() => setView(1)}
                  />
                )}
                {view === 3 && (
                  <EditorialReport
                    p={p}
                    onChange={(next) => update(() => next)}
                    onEvidence={setSelected}
                    onDownload={() => {
                      try {
                        downloadReport(p);
                        toast.success("报告已准备，浏览器将开始下载。");
                      } catch (e) {
                        toast.error(errorText(e));
                      }
                    }}
                  />
                )}
              </fieldset>
            </>
          )}
        </main>
      </SidebarInset>
      <input
        type="file"
        hidden
        ref={filesInput}
        multiple
        accept=".docx,.txt,.md"
        onChange={(e) => {
          void importFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        type="file"
        hidden
        ref={outlineInput}
        accept=".docx,.txt,.md"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            const t = canonical(await readDocument(file));
            if (!t.trim() || t.length > 10000)
              throw new Error("大纲不能为空且最多 10,000 字符");
            contextChange("outline", t);
          } catch (e) {
            toast.error(errorText(e));
          }
        }}
      />
      {p && (
        <>
          <Dialog open={materialModal} onOpenChange={setMaterialModal}>
            <DialogContent className="large-dialog">
              <DialogHeader>
                <DialogTitle>导入访谈材料</DialogTitle>
                <DialogDescription>
                  一份材料对应一位受访者。请先去除不必要的个人信息。
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="upload">
                <TabsList>
                  <TabsTrigger value="upload">上传文件</TabsTrigger>
                  <TabsTrigger value="paste">粘贴文字</TabsTrigger>
                </TabsList>
                <TabsContent value="upload">
                  <button
                    className="upload-box"
                    onClick={() => {
                      filesInput.current?.click();
                      setMaterialModal(false);
                    }}
                  >
                    <Upload size={30} />
                    <b>选择单份或多份访谈</b>
                    <span>
                      Word (.docx) / MD / TXT · 最多 5 份 · 每份 20,000 字符
                    </span>
                  </button>
                </TabsContent>
                <TabsContent value="paste">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      try {
                        const next = addInterview(
                          current(),
                          String(fd.get("name")),
                          String(fd.get("text")),
                          String(fd.get("participant")),
                        );
                        update(() => next);
                        setMaterialModal(false);
                        toast.success("访谈已导入");
                      } catch (e) {
                        toast.error(errorText(e));
                      }
                    }}
                  >
                    <Field label="材料名称">
                      <input
                        name="name"
                        required
                        maxLength={200}
                        placeholder="例如：P01 首次使用访谈"
                      />
                    </Field>
                    <Field label="受访者编号">
                      <input
                        name="participant"
                        required
                        maxLength={80}
                        placeholder="如 P01；同一人使用同一编号"
                      />
                    </Field>
                    <Field label="原始访谈文本">
                      <textarea
                        name="text"
                        rows={8}
                        required
                        maxLength={20000}
                      />
                    </Field>
                    <Button type="submit" className="primary-action">
                      保存访谈
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          <Sheet
            open={!!f}
            onOpenChange={(v) => {
              if (!v) setSelected(null);
            }}
          >
            <SheetContent className="evidence-sheet">
              <SheetHeader>
                <div className="eyebrow">EVIDENCE REVIEW</div>
                <SheetTitle>原文证据</SheetTitle>
                <SheetDescription>
                  逐人核对这条发现的依据与反例。
                </SheetDescription>
              </SheetHeader>
              {f && (
                <div className="sheet-scroll">
                  <h2>{f.summary}</h2>
                  <p className="muted">{f.question}</p>
                  <div className="evidence-summary">
                    <b>{stats(p, f).support} 人支持</b>
                    <span>{stats(p, f).quotes} 段有效原文</span>
                    <span>{stats(p, f).counter} 人持反例</span>
                  </div>
                  <p className="muted">
                    已核对 / 分析 {stats(p, f).total} 位受访者，另有{" "}
                    {stats(p, f).pending}{" "}
                    份材料未完成。原文匹配通过不等于支持关系已确认。
                  </p>
                  {[
                    ...new Set(
                      f.links.map((l) => {
                        const e = p.evidence.find((e) => e.id === l.evidenceId);
                        return (
                          p.interviews.find((d) => d.id === e?.interviewId)
                            ?.participant || "身份待确认"
                        );
                      }),
                    ),
                  ].map((person) => (
                    <div className="person-evidence" key={person}>
                      <div className="person-heading">
                        <span className="avatar">{person.slice(0, 3)}</span>
                        <b>{person}</b>
                      </div>
                      {f.links.map((l) => {
                        const e = p.evidence.find((e) => e.id === l.evidenceId),
                          d = p.interviews.find((d) => d.id === e?.interviewId);
                        if (!e || (d?.participant || "身份待确认") !== person)
                          return null;
                        return (
                          <div
                            className={`quote-card ${l.role === "counter" ? "counter" : ""}`}
                            key={l.evidenceId}
                          >
                            <div className="section-heading">
                              <span className="pill">{roleLabel[l.role]}</span>
                              <span
                                className={`muted ${validEvidence(p, e) ? "" : "error-text"}`}
                              >
                                {validEvidence(p, e)
                                  ? "原文匹配通过"
                                  : "引用失效 / 待确认"}
                              </span>
                            </div>
                            <blockquote>“{e.quote}”</blockquote>
                            <div className="quote-meta">
                              {d?.name} · v{e.version} · 第{" "}
                              {(d?.text.slice(0, e.start).match(/\n/g)
                                ?.length ?? 0) + 1}{" "}
                              行
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!validEvidence(p, e)}
                              onClick={() =>
                                setReading({
                                  docId: e.interviewId,
                                  evidenceId: e.id,
                                })
                              }
                            >
                              <Search />
                              定位全文
                              <ArrowRight />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {findingIssues(p, f).length > 0 && (
                    <div className="banner warning">
                      {findingIssues(p, f).join("；")}
                    </div>
                  )}
                  <div className="actions sticky-actions">
                    <Button
                      variant="outline"
                      onClick={() => setFindingEdit(structuredClone(f))}
                    >
                      <Pencil />
                      编辑与核对
                    </Button>
                    <Button onClick={() => checkFinding(f)}>
                      <Check />
                      {f.status === "confirmed" ? "撤销确认" : "确认发现"}
                    </Button>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
          <Dialog
            open={!!readDoc}
            onOpenChange={(v) => {
              if (!v) setReading(null);
            }}
          >
            <DialogContent className="reader-dialog">
              <DialogHeader>
                <DialogTitle>{readDoc?.name}</DialogTitle>
                <DialogDescription>
                  {readDoc?.participant || "受访者未确认"} · v{readDoc?.version}{" "}
                  · 按大纲问题整理访谈，随时对照完整原文。
                </DialogDescription>
              </DialogHeader>
              {readDoc && (
                <OrganizedInterview
                  key={`${readDoc.id}-${reading?.evidenceId || ""}`}
                  p={p}
                  doc={readDoc}
                  highlight={readEvidence}
                  onSave={(organized) =>
                    update((p) =>
                      invalidate({
                        ...p,
                        interviews: p.interviews.map((d) =>
                          d.id === readDoc.id
                            ? { ...d, organized, status: "ready" }
                            : d,
                        ),
                      }),
                    )
                  }
                  onRead={() => markReviewed(readDoc.id)}
                />
              )}
            </DialogContent>
          </Dialog>
          <Dialog
            open={!!editDoc}
            onOpenChange={(v) => {
              if (!v) setEditDoc(null);
            }}
          >
            <DialogContent className="large-dialog">
              <DialogHeader>
                <DialogTitle>编辑访谈材料</DialogTitle>
                <DialogDescription>
                  更改原文会创建新版本，旧证据保留但不再有效，关联分析需要重新核对。
                </DialogDescription>
              </DialogHeader>
              {editDoc && (
                <>
                  <Field label="材料名称">
                    <input
                      value={editDoc.name}
                      onChange={(e) =>
                        setEditDoc({ ...editDoc, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="受访者编号">
                    <input
                      value={editDoc.participant}
                      onChange={(e) =>
                        setEditDoc({ ...editDoc, participant: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="原文">
                    <textarea
                      rows={10}
                      maxLength={20000}
                      value={editDoc.text}
                      onChange={(e) =>
                        setEditDoc({ ...editDoc, text: e.target.value })
                      }
                    />
                  </Field>
                  <Button
                    onClick={() => {
                      const d = editDoc,
                        old = p.interviews.find((x) => x.id === d.id)!;
                      if (
                        !d.name.trim() ||
                        !d.participant.trim() ||
                        !d.text.trim()
                      ) {
                        toast.error("请填写名称、受访者编号与原文");
                        return;
                      }
                      if (
                        p.interviews.some(
                          (x) => x.id !== d.id && x.text === canonical(d.text),
                        )
                      ) {
                        toast.error("相同文本已存在");
                        return;
                      }
                      if (
                        p.interviews
                          .filter((x) => x.id !== d.id)
                          .reduce((n, d) => n + d.text.length, 0) +
                          d.text.length >
                        60000
                      ) {
                        toast.error("材料总长度不能超过 60,000 字符");
                        return;
                      }
                      setConfirm({
                        title: "保存材料变更？",
                        description:
                          "相关分析将变为待复核；更换原文后需重新选取证据。",
                        action: () => {
                          update((p) =>
                            invalidate({
                              ...p,
                              interviews: p.interviews.map((x) =>
                                x.id === d.id
                                  ? {
                                      ...d,
                                      text: canonical(d.text),
                                      organized:
                                        canonical(d.text) === old.text
                                          ? d.organized
                                          : undefined,
                                      participant: d.participant.trim(),
                                      version:
                                        old.version +
                                        (canonical(d.text) !== old.text
                                          ? 1
                                          : 0),
                                      status: "ready",
                                    }
                                  : x,
                              ),
                            }),
                          );
                          setEditDoc(null);
                        },
                      });
                    }}
                  >
                    保存变更
                  </Button>
                </>
              )}
            </DialogContent>
          </Dialog>
          <Dialog
            open={!!findingEdit}
            onOpenChange={(v) => {
              if (!v) setFindingEdit(null);
            }}
          >
            <DialogContent className="large-dialog">
              <DialogHeader>
                <DialogTitle>编辑发现与证据关系</DialogTitle>
                <DialogDescription>
                  改写摘要不会改变原文。保存后需重新确认；下游洞察会变为待复核。
                </DialogDescription>
              </DialogHeader>
              {findingEdit && (
                <FindingForm
                  p={p}
                  value={findingEdit}
                  onChange={setFindingEdit}
                  onSave={() => {
                    const next = findingEdit;
                    if (!next.summary.trim() || !next.theme.trim()) {
                      toast.error("请填写发现摘要和主题");
                      return;
                    }
                    update((p) =>
                      invalidateInsights(
                        {
                          ...p,
                          findings: p.findings.map((f) =>
                            f.id === next.id
                              ? { ...next, status: "draft", source: "manual" }
                              : f,
                          ),
                        },
                        next.id,
                      ),
                    );
                    setFindingEdit(null);
                  }}
                  onDelete={() =>
                    setConfirm({
                      title: "删除这条发现？",
                      description:
                        "依赖这条发现的洞察也将删除，原始材料与证据保留。",
                      action: () => {
                        update((p) => ({
                          ...p,
                          findings: p.findings.filter(
                            (f) => f.id !== findingEdit.id,
                          ),
                          insights: p.insights.filter(
                            (i) => !i.findingIds.includes(findingEdit.id),
                          ),
                        }));
                        setFindingEdit(null);
                        setSelected(null);
                      },
                    })
                  }
                />
              )}
            </DialogContent>
          </Dialog>
          <Dialog
            open={!!insightEdit}
            onOpenChange={(v) => {
              if (!v) setInsightEdit(null);
            }}
          >
            <DialogContent className="large-dialog">
              <DialogHeader>
                <DialogTitle>洞察与产品方向</DialogTitle>
                <DialogDescription>
                  解释与方案属于研究判断，必须关联已确认的发现，不能作为受访者原话。
                </DialogDescription>
              </DialogHeader>
              {insightEdit && (
                <InsightForm
                  p={p}
                  value={insightEdit}
                  onChange={setInsightEdit}
                  onSave={() => {
                    if (
                      !insightEdit.interpretation.trim() ||
                      !insightEdit.findingIds.length
                    ) {
                      toast.error("请填写洞察，并选择至少一条关联发现");
                      return;
                    }
                    update((p) => ({
                      ...p,
                      insights: [
                        ...p.insights.filter((i) => i.id !== insightEdit.id),
                        { ...insightEdit, status: "draft", source: "manual" },
                      ],
                    }));
                    setInsightEdit(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建研究项目</DialogTitle>
            <DialogDescription>
              为这次研究命名，之后可以在历史项目中继续。
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              newProject();
            }}
          >
            <Field label="项目名称">
              <input
                autoFocus
                required
                maxLength={200}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="例如：新用户首次使用体验研究"
              />
            </Field>
            <div className="actions">
              <Button type="submit">创建项目</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                取消
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!confirm}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirm?.action();
                setConfirm(null);
              }}
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <div>
        <b>{String(value).padStart(2, "0")}</b>
        <small>{unit}</small>
      </div>
    </div>
  );
}
function FindingForm({
  p,
  value: f,
  onChange,
  onSave,
  onDelete,
}: {
  p: Project;
  value: Finding;
  onChange: (f: Finding) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const set = (k: keyof Finding, v: unknown) => onChange({ ...f, [k]: v });
  return (
    <div>
      <Field label="发现摘要">
        <textarea
          rows={3}
          value={f.summary}
          onChange={(e) => set("summary", e.target.value)}
        />
      </Field>
      <div className="two-columns">
        <Field label="主题">
          <input
            value={f.theme}
            onChange={(e) => set("theme", e.target.value)}
          />
        </Field>
        <Field label="任务阶段">
          <input
            value={f.stage}
            onChange={(e) => set("stage", e.target.value)}
          />
        </Field>
      </div>
      <Field label="主题来源">
        <Choice
          label="主题来源"
          value={f.origin}
          onChange={(v) => set("origin", v)}
          options={[
            { value: "outline", label: "大纲主题" },
            { value: "emergent", label: "大纲外话题" },
            { value: "manual", label: "人工添加" },
          ]}
        />
      </Field>
      <Field label="需求与行为">
        <input
          value={f.behavior}
          onChange={(e) => set("behavior", e.target.value)}
        />
      </Field>
      <Field label="痛点">
        <input value={f.pain} onChange={(e) => set("pain", e.target.value)} />
      </Field>
      <Field label="研究问题">
        <Choice
          label="研究问题"
          value={p.questions.includes(f.question) ? f.question : ""}
          onChange={(v) => set("question", v)}
          options={[
            { value: "", label: "选择研究问题" },
            ...p.questions.map((q) => ({ value: q, label: q })),
          ]}
        />
      </Field>
      <h3>核对证据关系</h3>
      {f.links.map((l) => {
        const e = p.evidence.find((e) => e.id === l.evidenceId);
        return (
          <div className="edit-evidence" key={l.evidenceId}>
            <blockquote>{e?.quote || "引用不存在"}</blockquote>
            <div className="actions">
              <Choice
                label="证据关系"
                value={l.role}
                onChange={(role) =>
                  set(
                    "links",
                    f.links.map((x) =>
                      x.evidenceId === l.evidenceId ? { ...x, role } : x,
                    ),
                  )
                }
                options={Object.entries(roleLabel).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Button
                variant="ghost"
                onClick={() =>
                  set(
                    "links",
                    f.links.filter((x) => x.evidenceId !== l.evidenceId),
                  )
                }
              >
                排除此证据
              </Button>
            </div>
          </div>
        );
      })}
      <div className="actions">
        <Button onClick={onSave}>保存为待审核</Button>
        <Button variant="ghost" onClick={onDelete}>
          <Trash2 />
          删除发现
        </Button>
      </div>
    </div>
  );
}
function InsightForm({
  p,
  value: i,
  onChange,
  onSave,
}: {
  p: Project;
  value: Insight;
  onChange: (i: Insight) => void;
  onSave: () => void;
}) {
  const fields = [
    ["interpretation", "洞察解释 *"],
    ["judgment", "产品判断"],
    ["opportunity", "设计机会"],
    ["hypothesis", "待验证假设"],
    ["validation", "验证方法与判定信号"],
    ["limitations", "解释限制"],
  ] as const;
  return (
    <div>
      <p>{i.question}</p>
      <h3>关联已确认发现</h3>
      {p.findings
        .filter((f) => f.status === "confirmed" && f.question === i.question)
        .map((f) => (
          <div className="check-row" key={f.id}>
            <Checkbox
              id={`finding-${f.id}`}
              checked={i.findingIds.includes(f.id)}
              onCheckedChange={(v) =>
                onChange({
                  ...i,
                  findingIds: v
                    ? [...new Set([...i.findingIds, f.id])]
                    : i.findingIds.filter((id) => id !== f.id),
                })
              }
            />
            <label htmlFor={`finding-${f.id}`}>{f.summary}</label>
          </div>
        ))}
      {fields.map(([key, label]) => (
        <Field label={label} key={key}>
          <textarea
            rows={2}
            value={i[key]}
            onChange={(e) => onChange({ ...i, [key]: e.target.value })}
          />
        </Field>
      ))}
      <Button className="primary-action" onClick={onSave}>
        保存洞察草稿
      </Button>
    </div>
  );
}
