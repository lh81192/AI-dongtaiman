"use client";

import { useEffect, useState, useCallback, useRef, use, useMemo } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Users,
  Layers,
  Sparkles,
  Loader2,
  Check,
  X,
  ArrowLeft,
  AlertCircle,
  BookImage,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-fetch";
import { useModelStore } from "@/stores/model-store";
import { useModelGuard } from "@/hooks/use-model-guard";
import { useProjectStore } from "@/stores/project-store";
import { uploadUrl } from "@/lib/utils/upload-url";
import { toast } from "sonner";

const SCRIPT_ACCEPTED = ".txt,.docx,.pdf";
const SCRIPT_MAX_SIZE = 20 * 1024 * 1024;
const EPUB_ACCEPTED = ".epub";
const EPUB_MAX_SIZE = 200 * 1024 * 1024;

interface ExtractedCharacter {
  name: string;
  frequency: number;
  description: string;
  visualHint?: string;
  scope: "main" | "guest";
}

interface SplitEpisode {
  title: string;
  description: string;
  keywords: string;
  idea: string;
  characters?: string[];
}

interface LogEntry {
  id: string;
  step: number;
  status: "running" | "done" | "error";
  message: string;
  metadata?: unknown;
  createdAt: string | number;
}

interface ParseLogMetadata {
  charCount?: number;
  text?: string;
}

interface CharacterLogMetadata {
  characters?: ExtractedCharacter[];
}

interface SplitLogMetadata {
  episodes?: SplitEpisode[];
}

interface EpubImportData {
  id: string;
  fileName: string;
  status: "pending" | "extracting" | "ready" | "failed";
  title: string | null;
  author: string | null;
  coverPath: string | null;
  totalPages: number;
}

interface EpubPageData {
  id: string;
  pageNumber: number;
  imagePath: string;
  thumbPath: string | null;
  width: number | null;
  height: number | null;
  sourceHref: string | null;
  sourceMediaType: string | null;
  isSelected: boolean;
  sortOrder: number;
}

interface ManualCharacter {
  id: string;
  name: string;
  description: string;
  visualHint: string;
  scope: "main" | "guest";
}

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { num: 1 as Step, icon: FileText, label: "importStep.parse" },
  { num: 2 as Step, icon: Users, label: "importStep.characters" },
  { num: 3 as Step, icon: Layers, label: "importStep.split" },
  { num: 4 as Step, icon: Sparkles, label: "importStep.generate" },
] as const;

const STEP_NUMBERS: Step[] = [1, 2, 3, 4];

function createBlankManualCharacter(): ManualCharacter {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    visualHint: "",
    scope: "main",
  };
}

export default function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("import");
  const tc = useTranslations("common");
  const tCharacter = useTranslations("character");
  const textGuard = useModelGuard("text");
  const getModelConfig = useModelStore((s) => s.getModelConfig);
  const { project, loading, fetchProject } = useProjectStore();

  useEffect(() => {
    fetchProject(projectId);
  }, [projectId, fetchProject]);

  // Script pipeline state
  const [currentStep, setCurrentStep] = useState<Step | 0>(0);
  const [stepStatus, setStepStatus] = useState<Record<Step, "idle" | "running" | "done" | "error">>({
    1: "idle", 2: "idle", 3: "idle", 4: "idle",
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fullText, setFullText] = useState("");
  const [characters, setCharacters] = useState<ExtractedCharacter[]>([]);
  const [episodes, setEpisodes] = useState<SplitEpisode[]>([]);
  const [historyMode, setHistoryMode] = useState(false);
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);

  // EPUB state
  const [epubFile, setEpubFile] = useState<File | null>(null);
  const [epubDragOver, setEpubDragOver] = useState(false);
  const epubInputRef = useRef<HTMLInputElement>(null);
  const [epubUploading, setEpubUploading] = useState(false);
  const [epubSaving, setEpubSaving] = useState(false);
  const [epubImporting, setEpubImporting] = useState(false);
  const [epubDirty, setEpubDirty] = useState(false);
  const [epubImport, setEpubImport] = useState<EpubImportData | null>(null);
  const [epubPages, setEpubPages] = useState<EpubPageData[]>([]);
  const [manualCharacters, setManualCharacters] = useState<ManualCharacter[]>([]);

  useEffect(() => {
    if (project?.inputSource !== "epub") return;
    setEpubImport((project.epubImport as EpubImportData | null | undefined) ?? null);
    setEpubPages((project.epubPages as EpubPageData[] | undefined) ?? []);
    setEpubDirty(false);
  }, [project?.inputSource, project?.epubImport, project?.epubPages]);

  useEffect(() => {
    if (project?.inputSource !== "epub") return;
    if (manualCharacters.length > 0) return;
    const existing = (project.characters ?? [])
      .filter((character) => !character.episodeId)
      .map((character) => ({
        id: character.id,
        name: character.name,
        description: character.description ?? "",
        visualHint: character.visualHint ?? "",
        scope: character.scope === "guest" ? "guest" : "main",
      })) satisfies ManualCharacter[];
    if (existing.length > 0) {
      setManualCharacters(existing);
    }
  }, [project?.inputSource, project?.characters, manualCharacters.length]);

  useEffect(() => {
    async function loadLogs() {
      if (project?.inputSource === "epub") return;
      try {
        const res = await apiFetch(`/api/projects/${projectId}/import/logs`);
        const data = await res.json() as LogEntry[];
        if (data.length === 0) return;

        setLogs(data);
        setHistoryMode(true);

        const latestByStep = new Map<Step, LogEntry>();
        for (const step of STEP_NUMBERS) {
          const stepLogs = data.filter((log) => log.step === step);
          const latest = stepLogs[stepLogs.length - 1];
          if (latest) {
            latestByStep.set(step, latest);
          }
        }

        setStepStatus({
          1: latestByStep.get(1)?.status ?? "idle",
          2: latestByStep.get(2)?.status ?? "idle",
          3: latestByStep.get(3)?.status ?? "idle",
          4: latestByStep.get(4)?.status ?? "idle",
        });

        const step1Done = data.findLast((log) => log.step === 1 && log.status === "done");
        const step2Done = data.findLast((log) => log.step === 2 && log.status === "done");
        const step3Done = data.findLast((log) => log.step === 3 && log.status === "done");

        const step1Meta = step1Done?.metadata as ParseLogMetadata | undefined;
        const step2Meta = step2Done?.metadata as CharacterLogMetadata | undefined;
        const step3Meta = step3Done?.metadata as SplitLogMetadata | undefined;

        setFullText(step1Meta?.text ?? "");
        setCharacters(step2Meta?.characters ?? []);
        setEpisodes(step3Meta?.episodes ?? []);

        const latestTerminalLog = [...data].reverse().find(
          (log) => STEP_NUMBERS.includes(log.step as Step) && log.status !== "running"
        );
        const latestError = [...data].reverse().find(
          (log) => STEP_NUMBERS.includes(log.step as Step) && log.status === "error"
        );
        const activeStep = (latestError?.step as Step | undefined)
          ?? (latestTerminalLog?.step as Step | undefined)
          ?? (data[data.length - 1]?.step as Step | undefined)
          ?? null;

        setSelectedStep(activeStep);
        setCurrentStep(activeStep ?? 0);
      } catch {
        // fresh script import
      }
    }
    loadLogs();
  }, [projectId, project?.inputSource]);
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = useCallback((step: Step, status: LogEntry["status"], message: string) => {
    setLogs((prev) => [
      ...prev,
      { id: Date.now().toString(), step, status, message, createdAt: Date.now() },
    ]);
  }, []);

  const orderedEpubPages = useMemo(
    () => [...epubPages].sort((a, b) => a.sortOrder - b.sortOrder || a.pageNumber - b.pageNumber),
    [epubPages]
  );
  const selectedEpubCount = orderedEpubPages.filter((page) => page.isSelected).length;

  const handleScriptFile = useCallback((f: File) => {
    if (f.size > SCRIPT_MAX_SIZE) {
      toast.error(t("fileTooLarge"));
      return;
    }
    setFile(f);
  }, [t]);

  const handleEpubFile = useCallback((f: File) => {
    if (f.size > EPUB_MAX_SIZE) {
      toast.error(t("epubFileTooLarge"));
      return;
    }
    setEpubFile(f);
  }, [t]);

  async function startPipeline() {
    if (!file) return;
    if (!textGuard()) return;

    setHistoryMode(false);
    setLogs([]);
    await apiFetch(`/api/projects/${projectId}/import/logs`, { method: "DELETE" });

    setCurrentStep(1);
    setStepStatus((prev) => ({ ...prev, 1: "running" }));
    addLog(1, "running", `解析文件: ${file.name}`);

    let text: string;
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch(`/api/projects/${projectId}/import/parse`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      text = data.text;
      setFullText(text);
      addLog(1, "done", `解析完成，共 ${data.charCount} 字`);
      setStepStatus((prev) => ({ ...prev, 1: "done" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Parse failed";
      addLog(1, "error", `文件解析失败: ${msg}`);
      setStepStatus((prev) => ({ ...prev, 1: "error" }));
      return;
    }

    setCurrentStep(2);
    setStepStatus((prev) => ({ ...prev, 2: "running" }));
    addLog(2, "running", "开始角色提取...");

    try {
      const res = await apiFetch(`/api/projects/${projectId}/import/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, modelConfig: getModelConfig() }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setCharacters(data.characters);
      const mainCount = data.characters.filter((c: ExtractedCharacter) => c.scope === "main").length;
      const guestCount = data.characters.length - mainCount;
      addLog(2, "done", `提取完成: ${mainCount} 个主角, ${guestCount} 个配角`);
      setStepStatus((prev) => ({ ...prev, 2: "done" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extract failed";
      addLog(2, "error", `角色提取失败: ${msg}`);
      setStepStatus((prev) => ({ ...prev, 2: "error" }));
    }
  }

  async function retryCharacterExtract() {
    if (!fullText) return;
    if (!textGuard()) return;

    setCurrentStep(2);
    setSelectedStep(2);
    setStepStatus((prev) => ({ ...prev, 2: "running" }));
    addLog(2, "running", "重试角色提取...");

    try {
      const res = await apiFetch(`/api/projects/${projectId}/import/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText, modelConfig: getModelConfig() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setCharacters(data.characters);
      const mainCount = data.characters.filter((c: ExtractedCharacter) => c.scope === "main").length;
      const guestCount = data.characters.length - mainCount;
      addLog(2, "done", `提取完成: ${mainCount} 个主角, ${guestCount} 个配角`);
      setStepStatus((prev) => ({ ...prev, 2: "done" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extract failed";
      addLog(2, "error", `角色提取失败: ${msg}`);
      setStepStatus((prev) => ({ ...prev, 2: "error" }));
    }
  }

  async function runSplit() {
    if (!textGuard()) return;

    setCurrentStep(3);
    setSelectedStep(3);
    setStepStatus((prev) => ({ ...prev, 3: "running" }));
    addLog(3, "running", "开始自动分集...");

    try {
      const res = await apiFetch(`/api/projects/${projectId}/import/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fullText,
          allCharacters: characters.map((c) => ({ name: c.name, scope: c.scope })),
          modelConfig: getModelConfig(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setEpisodes(data.episodes);
      addLog(3, "done", `分集完成，共 ${data.episodes.length} 集`);
      setStepStatus((prev) => ({ ...prev, 3: "done" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Split failed";
      addLog(3, "error", `分集失败: ${msg}`);
      setStepStatus((prev) => ({ ...prev, 3: "error" }));
    }
  }

  async function runGenerate() {
    setCurrentStep(4);
    setSelectedStep(4);
    setStepStatus((prev) => ({ ...prev, 4: "running" }));
    addLog(4, "running", `创建 ${episodes.length} 集和角色...`);

    try {
      const res = await apiFetch(`/api/projects/${projectId}/import/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodes, characters }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      addLog(4, "done", `导入完成！创建了 ${data.characterCount} 个角色和 ${data.episodes.length} 集`);
      setStepStatus((prev) => ({ ...prev, 4: "done" }));
      toast.success(t("complete"));
      setTimeout(() => {
        router.push(`/${locale}/project/${projectId}/episodes`);
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generate failed";
      addLog(4, "error", `创建失败: ${msg}`);
      setStepStatus((prev) => ({ ...prev, 4: "error" }));
    }
  }

  const failedStep = STEP_NUMBERS.find((s) => stepStatus[s] === "error") ?? null;
  const retryTargetStep = selectedStep && stepStatus[selectedStep] === "error" ? selectedStep : failedStep;

  const canRetryFailedStep = useMemo(() => {
    switch (retryTargetStep) {
      case 1:
        return Boolean(file);
      case 2:
        return Boolean(fullText);
      case 3:
        return Boolean(fullText) && characters.length > 0;
      case 4:
        return characters.length > 0 && episodes.length > 0;
      default:
        return false;
    }
  }, [characters.length, episodes.length, file, fullText, retryTargetStep]);

  const recoveryHint = useMemo(() => {
    switch (retryTargetStep) {
      case 1:
        return t("retryHintParse");
      case 2:
        return fullText ? t("retryHintModelChanged") : t("retryHintMissingText");
      case 3:
        return fullText && characters.length > 0 ? t("retryHintModelChanged") : t("retryHintMissingCharacters");
      case 4:
        return characters.length > 0 && episodes.length > 0 ? t("retryHintModelChanged") : t("retryHintMissingEpisodes");
      default:
        return null;
    }
  }, [characters.length, episodes.length, fullText, retryTargetStep, t]);

  function retryStep() {
    if (!retryTargetStep || !canRetryFailedStep) return;
    switch (retryTargetStep) {
      case 1:
        startPipeline();
        break;
      case 2:
        retryCharacterExtract();
        break;
      case 3:
        runSplit();
        break;
      case 4:
        runGenerate();
        break;
    }
  }

  function toggleScope(idx: number) {
    setCharacters((prev) =>
      prev.map((c, i) =>
        i === idx ? { ...c, scope: c.scope === "main" ? "guest" : "main" } : c
      )
    );
  }

  function updateEpisode(idx: number, field: keyof SplitEpisode, value: string) {
    setEpisodes((prev) =>
      prev.map((ep, i) => (i === idx ? { ...ep, [field]: value } : ep))
    );
  }

  function removeEpisode(idx: number) {
    setEpisodes((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateEpubPage(pageId: string, updater: (page: EpubPageData) => EpubPageData) {
    setEpubPages((prev) => prev.map((page) => (page.id === pageId ? updater(page) : page)));
    setEpubDirty(true);
  }

  function toggleEpubPageSelected(pageId: string) {
    updateEpubPage(pageId, (page) => ({ ...page, isSelected: !page.isSelected }));
  }

  function moveEpubPage(pageId: string, direction: "up" | "down") {
    setEpubPages((prev) => {
      const ordered = [...prev].sort((a, b) => a.sortOrder - b.sortOrder || a.pageNumber - b.pageNumber);
      const index = ordered.findIndex((page) => page.id === pageId);
      if (index < 0) return prev;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= ordered.length) return prev;
      [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
      setEpubDirty(true);
      return ordered.map((page, idx) => ({ ...page, sortOrder: idx + 1 }));
    });
  }

  async function saveEpubPages() {
    if (!epubDirty || orderedEpubPages.length === 0) return true;
    setEpubSaving(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/epub/pages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: orderedEpubPages.map((page) => ({
            id: page.id,
            isSelected: page.isSelected,
            sortOrder: page.sortOrder,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await fetchProject(projectId);
      toast.success(t("epubPagesSaved"));
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("generationFailed"));
      return false;
    } finally {
      setEpubSaving(false);
    }
  }

  async function uploadEpub() {
    if (!epubFile) return;
    setEpubUploading(true);
    try {
      const form = new FormData();
      form.append("file", epubFile);
      const res = await apiFetch(`/api/projects/${projectId}/epub/upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setEpubFile(null);
      await fetchProject(projectId);
      toast.success(t("epubUploadComplete"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("generationFailed"));
    } finally {
      setEpubUploading(false);
    }
  }

  function updateManualCharacter(id: string, field: keyof Omit<ManualCharacter, "id">, value: string) {
    setManualCharacters((prev) =>
      prev.map((character) =>
        character.id === id ? { ...character, [field]: value } : character
      )
    );
  }

  function toggleManualCharacterScope(id: string) {
    setManualCharacters((prev) =>
      prev.map((character) =>
        character.id === id
          ? { ...character, scope: character.scope === "main" ? "guest" : "main" }
          : character
      )
    );
  }

  function removeManualCharacter(id: string) {
    setManualCharacters((prev) => prev.filter((character) => character.id !== id));
  }

  async function importEpubStoryboard() {
    if (selectedEpubCount === 0) {
      toast.error(t("epubNoSelectedPages"));
      return;
    }

    const saved = await saveEpubPages();
    if (!saved) return;

    setEpubImporting(true);
    try {
      const payloadCharacters = manualCharacters
        .map((character) => ({
          name: character.name.trim(),
          description: character.description.trim(),
          visualHint: character.visualHint.trim(),
          scope: character.scope,
        }))
        .filter((character) => character.name.length > 0);

      const res = await apiFetch(`/api/projects/${projectId}/epub/import-storyboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characters: payloadCharacters }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await fetchProject(projectId);
      toast.success(t("epubImportComplete"));
      router.push(`/${locale}/project/${projectId}/storyboard`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("generationFailed"));
    } finally {
      setEpubImporting(false);
    }
  }

  const stepIcon = (status: string) => {
    switch (status) {
      case "running": return <Loader2 className="h-4 w-4 animate-spin" />;
      case "done": return <Check className="h-4 w-4" />;
      case "error": return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const stepColor = (status: string, selected: boolean) => {
    const base = (() => {
      switch (status) {
        case "running": return "border-primary/30 bg-primary/5 text-primary";
        case "done": return "border-transparent bg-[--surface] text-[--text-primary]";
        case "error": return "border-red-300 bg-red-50 text-red-500";
        default: return "border-transparent bg-[--surface] text-[--text-muted]";
      }
    })();
    if (selected) return base + " !bg-primary/10 !border-primary/40 !text-primary shadow-sm";
    return base;
  };

  const showCharReview = stepStatus[2] === "done" && stepStatus[3] === "idle" && characters.length > 0;
  const showEpReview = stepStatus[3] === "done" && stepStatus[4] === "idle" && episodes.length > 0;

  if (loading || !project) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-[--text-muted]">{tc("loading")}</p>
        </div>
      </div>
    );
  }

  if (project.inputSource === "epub") {
    const backHref = project.shots.length > 0
      ? `/${locale}/project/${projectId}/storyboard`
      : `/${locale}`;

    return (
      <div className="relative flex-1 overflow-y-auto bg-[--background] p-6">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-[--primary]/5 blur-3xl" />
          <div className="absolute right-1/4 bottom-0 h-48 w-48 rounded-full bg-[--accent]/5 blur-2xl" />
        </div>

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.push(backHref)}
              className="flex items-center gap-2 text-sm text-[--text-muted] hover:text-[--primary] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {tc("back")}
            </button>
            {project.shots.length > 0 && (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => router.push(`/${locale}/project/${projectId}/storyboard`)}
              >
                {t("epubOpenStoryboard")}
              </Button>
            )}
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[--primary]/10 shadow-lg shadow-[--primary]/10">
              <BookImage className="h-5 w-5 text-[--primary]" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[--foreground]">
                {t("epubTitle")}
              </h1>
              <p className="mt-1 text-sm text-[--text-muted]">
                {t("epubPagesHint")}
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-[--border-subtle] bg-[--card]/80 backdrop-blur-xl p-5 shadow-lg shadow-black/5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[--text-primary]">{t("epubUpload")}</h2>
                    <p className="mt-1 text-xs text-[--text-muted]">{t("epubSupportedFormats")}</p>
                  </div>
                  {epubUploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>

                <div
                  className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                    epubDragOver
                      ? "border-primary bg-primary/5"
                      : epubFile
                        ? "border-emerald-300 bg-emerald-50/60"
                        : "border-[--border-subtle] bg-[--surface]"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setEpubDragOver(true); }}
                  onDragLeave={() => setEpubDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setEpubDragOver(false);
                    const dropped = e.dataTransfer.files[0];
                    if (dropped) handleEpubFile(dropped);
                  }}
                  onClick={() => epubInputRef.current?.click()}
                >
                  <input
                    ref={epubInputRef}
                    type="file"
                    accept={EPUB_ACCEPTED}
                    className="hidden"
                    onChange={(e) => {
                      const selected = e.target.files?.[0];
                      if (selected) handleEpubFile(selected);
                      e.target.value = "";
                    }}
                  />

                  {epubFile ? (
                    <div className="flex items-center gap-3">
                      <FileText className="h-10 w-10 text-emerald-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-[--text-primary]">{epubFile.name}</p>
                        <p className="text-xs text-[--text-muted]">{(epubFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEpubFile(null);
                        }}
                        className="ml-2 flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/5"
                      >
                        <X className="h-3.5 w-3.5 text-[--text-muted]" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mb-3 h-10 w-10 text-[--text-muted]" />
                      <p className="text-sm font-medium text-[--text-primary]">{t("epubDropHint")}</p>
                      <p className="mt-1 text-xs text-[--text-muted]">{t("epubSupportedFormats")}</p>
                    </>
                  )}
                </div>

                <Button
                  onClick={uploadEpub}
                  disabled={!epubFile || epubUploading}
                  className="mt-4 w-full rounded-xl"
                >
                  {epubUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {t("epubUpload")}
                </Button>
              </div>

              <div className="rounded-2xl border border-[--border-subtle] bg-[--card]/80 backdrop-blur-xl p-5 shadow-lg shadow-black/5">
                <h2 className="text-sm font-semibold text-[--foreground]">{t("epubBookInfo")}</h2>
                {epubImport ? (
                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <p className="font-medium text-[--text-primary]">{epubImport.title || epubImport.fileName}</p>
                      <p className="text-xs text-[--text-muted]">{epubImport.fileName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-[--surface] px-3 py-2">
                        <p className="text-[--text-muted]">Author</p>
                        <p className="mt-1 font-medium text-[--text-primary]">{epubImport.author || "—"}</p>
                      </div>
                      <div className="rounded-xl bg-[--surface] px-3 py-2">
                        <p className="text-[--text-muted]">Status</p>
                        <p className="mt-1 font-medium capitalize text-[--text-primary]">{epubImport.status}</p>
                      </div>
                      <div className="rounded-xl bg-[--surface] px-3 py-2 col-span-2">
                        <p className="text-[--text-muted]">{t("epubSelectedCount", { selected: selectedEpubCount, total: orderedEpubPages.length })}</p>
                        <p className="mt-1 font-medium text-[--text-primary]">{epubImport.totalPages} pages</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[--text-muted]">{t("epubNoPages")}</p>
                )}
              </div>

              <div className="rounded-2xl border border-[--border-subtle] bg-[--card]/80 backdrop-blur-xl p-5 shadow-lg shadow-black/5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[--foreground]">{t("epubCharactersTitle")}</h2>
                    <p className="mt-1 text-xs text-[--text-muted]">{t("epubCharactersHint")}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setManualCharacters((prev) => [...prev, createBlankManualCharacter()])}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t("epubAddCharacter")}
                  </Button>
                </div>

                <div className="space-y-3">
                  {manualCharacters.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[--border-subtle] bg-[--surface] px-4 py-6 text-center text-sm text-[--text-muted]">
                      {t("epubNoCharacters")}
                    </div>
                  ) : (
                    manualCharacters.map((character) => (
                      <div key={character.id} className="rounded-2xl border border-[--border-subtle] bg-[--surface] p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleManualCharacterScope(character.id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                character.scope === "main"
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-purple-50 text-purple-600"
                              }`}
                            >
                              {character.scope === "main" ? t("main") : t("guest")}
                            </button>
                          </div>
                          <button
                            onClick={() => removeManualCharacter(character.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[--text-muted] hover:bg-white hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <Input
                            value={character.name}
                            onChange={(e) => updateManualCharacter(character.id, "name", e.target.value)}
                            placeholder={tCharacter("name")}
                          />
                          <Input
                            value={character.visualHint}
                            onChange={(e) => updateManualCharacter(character.id, "visualHint", e.target.value)}
                            placeholder={tCharacter("visualHint")}
                          />
                          <Textarea
                            value={character.description}
                            onChange={(e) => updateManualCharacter(character.id, "description", e.target.value)}
                            placeholder={tCharacter("description")}
                            className="min-h-24"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-[--border-subtle] bg-[--card]/80 backdrop-blur-xl p-5 shadow-lg shadow-black/5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[--foreground]">{t("epubPagesTitle")}</h2>
                    <p className="mt-1 text-xs text-[--text-muted]">
                      {t("epubSelectedCount", { selected: selectedEpubCount, total: orderedEpubPages.length })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={saveEpubPages}
                      disabled={!epubDirty || epubSaving || orderedEpubPages.length === 0}
                    >
                      {epubSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {tc("save")}
                    </Button>
                    <Button
                      className="rounded-xl"
                      onClick={importEpubStoryboard}
                      disabled={selectedEpubCount === 0 || epubImporting || epubUploading}
                    >
                      {epubImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      {t("epubImportStoryboard")}
                    </Button>
                  </div>
                </div>

                {orderedEpubPages.length === 0 ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-[--border-subtle] bg-[--surface] p-8 text-center">
                    <ImageIcon className="mb-3 h-8 w-8 text-[--text-muted]" />
                    <p className="text-sm font-medium text-[--text-primary]">{t("epubNoPages")}</p>
                    <p className="mt-1 text-xs text-[--text-muted]">{t("epubDropHint")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
                    {orderedEpubPages.map((page, index) => {
                      const thumb = page.thumbPath ?? page.imagePath;
                      return (
                        <div
                          key={page.id}
                          className={`group overflow-hidden rounded-2xl border bg-[--card] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 ${
                            page.isSelected
                              ? "border-[--primary]/40 shadow-lg shadow-[--primary]/10"
                              : "border-[--border-subtle] hover:border-[--border-hover]"
                          }`}
                        >
                          <div className="relative aspect-[3/4] bg-[--surface]">
                            <Image
                              src={uploadUrl(thumb)}
                              alt={`EPUB page ${page.pageNumber}`}
                              fill
                              unoptimized
                              sizes="180px"
                              className="object-cover"
                            />
                            <button
                              onClick={() => toggleEpubPageSelected(page.id)}
                              className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
                                page.isSelected
                                  ? "bg-primary text-white"
                                  : "bg-white/95 text-[--text-secondary]"
                              }`}
                            >
                              {page.isSelected ? tc("confirm") : tc("cancel")}
                            </button>
                          </div>
                          <div className="space-y-3 p-3">
                            <div>
                              <p className="text-xs text-[--text-muted]">#{index + 1}</p>
                              <p className="text-sm font-semibold text-[--text-primary]">Page {page.pageNumber}</p>
                              {(page.width || page.height) && (
                                <p className="text-[11px] text-[--text-muted]">
                                  {page.width ?? "?"} × {page.height ?? "?"}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <button
                                onClick={() => moveEpubPage(page.id, "up")}
                                disabled={index === 0}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[--border-subtle] text-[--text-muted] hover:bg-[--surface] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => moveEpubPage(page.id, "down")}
                                disabled={index === orderedEpubPages.length - 1}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[--border-subtle] text-[--text-muted] hover:bg-[--surface] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <span className="rounded-lg bg-[--surface] px-2 py-1 text-[11px] font-medium text-[--text-muted]">
                                sort {page.sortOrder}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="flex w-64 shrink-0 flex-col border-r border-[--border-subtle] bg-[--card]/80 backdrop-blur-xl p-5">
        <button
          onClick={() => router.push(`/${locale}/project/${projectId}/episodes`)}
          className="mb-6 flex items-center gap-2 text-sm text-[--text-muted] hover:text-[--primary] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToEpisodes")}
        </button>

        <h2 className="mb-5 font-display text-lg font-bold text-[--foreground]">
          {t("title")}
        </h2>

        {/* Progress steps */}
        <div className="relative flex flex-col gap-1">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-6 h-[calc(100%-24px)] w-[2px] bg-[--border-subtle]" />

          {STEPS.map(({ num, icon: Icon, label }) => {
            const isClickable = historyMode && stepStatus[num] !== "idle";
            const isSelected = selectedStep === num;
            const isDone = stepStatus[num] === "done";
            const isRunning = stepStatus[num] === "running";
            const isError = stepStatus[num] === "error";

            return (
              <button
                key={num}
                disabled={!isClickable}
                onClick={() => isClickable && setSelectedStep(isSelected ? null : num)}
                className={`relative z-10 flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 ${
                  isClickable ? "cursor-pointer hover:bg-[--surface]" : ""
                } ${isSelected ? "bg-[--primary]/10 shadow-sm" : ""}`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                  isDone && isSelected
                    ? "bg-[--primary]/15 text-[--primary] shadow-sm"
                    : isDone
                      ? "bg-[--success]/15 text-[--success]"
                      : isRunning
                        ? "bg-[--primary]/15 text-[--primary] shadow-sm"
                        : isError
                          ? "bg-[--destructive]/15 text-[--destructive]"
                          : "bg-[--surface] text-[--text-muted]"
                }`}>
                  {stepIcon(stepStatus[num]) || <Icon className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <span className={`text-sm font-medium ${
                    isSelected || isDone ? "text-[--foreground]" : "text-[--text-muted]"
                  }`}>{t(label)}</span>
                  {isRunning && (
                    <span className="ml-2 text-[10px] text-[--primary] animate-pulse">Processing...</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative flex flex-1 flex-col overflow-y-auto bg-[--background] p-6">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-[--primary]/5 blur-3xl" />
          <div className="absolute left-1/4 bottom-0 h-64 w-64 rounded-full bg-[--accent]/5 blur-2xl" />
        </div>
        {currentStep === 0 && !historyMode && (
          <div className="mx-auto w-full max-w-xl space-y-6">
            {/* Decorative background */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-[--primary]/5 blur-3xl" />
              <div className="absolute right-1/4 bottom-1/4 h-48 w-48 rounded-full bg-[--accent]/5 blur-2xl" />
            </div>

            <div
              className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-300 ${
                dragOver
                  ? "border-[--primary] bg-[--primary]/5 shadow-lg shadow-[--primary]/10"
                  : file
                    ? "border-[--success]/30 bg-[--success]/5 shadow-lg shadow-[--success]/10"
                    : "border-[--border-subtle] bg-[--card]/60 backdrop-blur-sm hover:border-[--border-hover] hover:bg-[--card]/80"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleScriptFile(f); }}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept={SCRIPT_ACCEPTED}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScriptFile(f); e.target.value = ""; }}
              />
              {file ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[--success]/10">
                    <FileText className="h-6 w-6 text-[--success]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[--foreground]">{file.name}</p>
                    <p className="text-xs text-[--text-muted]">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-[--surface] hover:bg-[--destructive]/10 hover:text-[--destructive] transition-colors"
                  >
                    <X className="h-4 w-4 text-[--text-muted]" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[--primary]/10 shadow-lg shadow-[--primary]/10 transition-transform duration-200 group-hover:scale-110">
                    <Upload className="h-8 w-8 text-[--primary]" />
                  </div>
                  <p className="text-sm font-medium text-[--foreground]">{t("dropHint")}</p>
                  <p className="mt-1 text-xs text-[--text-muted]">{t("supportedFormats")}</p>
                </>
              )}
            </div>

            <Button
              onClick={startPipeline}
              disabled={!file}
              className="w-full rounded-xl"
              size="lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("startImport")}
            </Button>
          </div>
        )}

        {showCharReview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-[--text-primary]">
                {t("reviewCharacters")}
              </h3>
              <Button onClick={runSplit} disabled={stepStatus[3] === "running"} className="rounded-xl">
                {stepStatus[3] === "running" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("confirmAndSplit")}
              </Button>
            </div>
            <p className="text-sm text-[--text-muted]">{t("reviewCharactersHint")}</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {characters.map((char, idx) => (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-2xl border border-[--border-subtle] bg-[--card] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 hover:border-[--border-hover]"
                >
                  <div className={`h-1 w-full ${char.scope === "main" ? "bg-gradient-to-r from-blue-500 to-blue-400" : "bg-gradient-to-r from-purple-500 to-purple-400"}`} />
                  <div className="p-3.5">
                    <div className="mb-2.5 flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold text-white"
                        style={{ background: `linear-gradient(135deg, hsl(${(char.name.charCodeAt(0) * 37) % 360}, 45%, 45%), hsl(${(char.name.charCodeAt(0) * 37) % 360}, 50%, 55%))` }}
                      >
                        {char.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-[--text-primary]">{char.name}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-[--text-muted]">
                          <span>{t("frequency")} {char.frequency}</span>
                          {char.visualHint && (
                            <>
                              <span className="h-[3px] w-[3px] rounded-full bg-[#ddd]" />
                              <span className="truncate">{char.visualHint}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {char.visualHint && (
                      <div className="mb-2 inline-block rounded-md bg-[--surface] px-2 py-0.5 text-[10px] font-medium text-[--text-muted]">
                        {char.visualHint}
                      </div>
                    )}
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-[--text-muted]">{char.description}</p>
                  </div>
                  <button
                    onClick={() => toggleScope(idx)}
                    className={`absolute right-3 top-3 rounded-[8px] px-2 py-0.5 text-[9px] font-bold tracking-wide transition-colors ${
                      char.scope === "main"
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                    }`}
                  >
                    {char.scope === "main" ? t("main") : t("guest")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showEpReview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-[--text-primary]">
                {t("reviewEpisodes")} ({episodes.length})
              </h3>
              <Button onClick={runGenerate} disabled={stepStatus[4] === "running"} className="rounded-xl">
                {stepStatus[4] === "running" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("confirmAndGenerate")}
              </Button>
            </div>
            <p className="text-sm text-[--text-muted]">{t("reviewEpisodesHint")}</p>
            <div className="space-y-3">
              {episodes.map((ep, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[--border-subtle] bg-white p-4"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                      EP.{String(idx + 1).padStart(2, "0")}
                    </span>
                    <Input
                      value={ep.title}
                      onChange={(e) => updateEpisode(idx, "title", e.target.value)}
                      className="h-8 text-sm font-semibold"
                    />
                    <button
                      onClick={() => removeEpisode(idx)}
                      className="shrink-0 text-[--text-muted] hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[--text-muted]">{ep.description}</p>
                  {ep.characters && ep.characters.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ep.characters.map((name) => {
                        const isMain = characters.some((c) => c.name === name && c.scope === "main");
                        return (
                          <span key={name} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isMain ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                            {name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {ep.keywords && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ep.keywords.split(/[,，]/).map((kw) => kw.trim()).filter(Boolean).map((kw) => (
                        <span key={kw} className="rounded bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(currentStep > 0 || historyMode) && !showCharReview && !showEpReview && (() => {
          const filteredLogs = selectedStep
            ? logs.filter((l) => l.step === selectedStep)
            : logs;

          const stepDoneLog = selectedStep
            ? logs.find((l) => l.step === selectedStep && l.status === "done" && l.metadata)
            : null;
          const meta = stepDoneLog?.metadata as Record<string, unknown> | null;
          const metaCharacters = meta?.characters as ExtractedCharacter[] | undefined;
          const metaEpisodes = meta?.episodes as SplitEpisode[] | undefined;

          const step2DoneLog = (selectedStep === 3)
            ? logs.find((l) => l.step === 2 && l.status === "done" && l.metadata)
            : null;
          const step2Meta = step2DoneLog?.metadata as Record<string, unknown> | null;
          const step2Characters = step2Meta?.characters as ExtractedCharacter[] | undefined;

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-[--text-secondary]">
                  {t("processLog")}
                  {selectedStep && (
                    <span className="ml-2 text-xs font-normal text-[--text-muted]">
                      — {t(STEPS[selectedStep - 1].label)}
                    </span>
                  )}
                </h3>
                {selectedStep && (
                  <button
                    onClick={() => setSelectedStep(null)}
                    className="text-xs text-primary hover:underline"
                  >
                    {t("showAll")}
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-[--border-subtle] bg-white p-4">
                <div className="max-h-[30vh] space-y-1.5 overflow-y-auto font-mono text-xs">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          log.status === "done"
                            ? "bg-emerald-500"
                            : log.status === "error"
                              ? "bg-red-500"
                              : "bg-amber-400"
                        }`}
                      />
                      {!selectedStep && (
                        <span className="shrink-0 text-[--text-muted]">[Step {log.step}]</span>
                      )}
                      <span className={log.status === "error" ? "text-red-500" : "text-[--text-primary]"}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {failedStep && (
                <div className="space-y-2">
                  {recoveryHint && (
                    <p className="text-sm text-[--text-muted]">{recoveryHint}</p>
                  )}
                  {canRetryFailedStep && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={retryStep}
                      className="self-start"
                    >
                      <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                      {t("retry")}
                    </Button>
                  )}
                </div>
              )}

              {selectedStep === 2 && metaCharacters && metaCharacters.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-[--text-secondary]">
                    {t("reviewCharacters")} ({metaCharacters.length})
                  </h4>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                    {metaCharacters.map((char, idx) => (
                      <div
                        key={idx}
                        className="group relative overflow-hidden rounded-[14px] border border-[--border-subtle] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 hover:border-[--border-hover]"
                      >
                        <div className={`h-1 w-full ${char.scope === "main" ? "bg-gradient-to-r from-blue-500 to-blue-400" : "bg-gradient-to-r from-purple-500 to-purple-400"}`} />
                        <div className="p-3.5">
                          <div className="mb-2.5 flex items-center gap-2.5">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold text-white"
                              style={{ background: `linear-gradient(135deg, hsl(${(char.name.charCodeAt(0) * 37) % 360}, 45%, 45%), hsl(${(char.name.charCodeAt(0) * 37) % 360}, 50%, 55%))` }}
                            >
                              {char.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-bold text-[--text-primary]">{char.name}</div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[--text-muted]">
                                <span>{t("frequency")} {char.frequency}</span>
                                {char.visualHint && (
                                  <>
                                    <span className="h-[3px] w-[3px] rounded-full bg-[#ddd]" />
                                    <span className="truncate">{char.visualHint}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {char.visualHint && (
                            <div className="mb-2 inline-block rounded-md bg-[--surface] px-2 py-0.5 text-[10px] font-medium text-[--text-muted]">
                              {char.visualHint}
                            </div>
                          )}
                          <p className="line-clamp-2 text-[11px] leading-relaxed text-[--text-muted]">{char.description}</p>
                        </div>
                        <span className={`absolute right-3 top-3 rounded-[8px] px-2 py-0.5 text-[9px] font-bold tracking-wide ${
                          char.scope === "main" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                        }`}>
                          {char.scope === "main" ? t("main") : t("guest")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedStep === 3 && metaEpisodes && metaEpisodes.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-[--text-secondary]">
                    {t("reviewEpisodes")} ({metaEpisodes.length})
                  </h4>
                  <div className="space-y-2">
                    {metaEpisodes.map((ep, idx) => (
                      <div key={idx} className="rounded-xl border border-[--border-subtle] bg-white p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                            EP.{String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="text-sm font-semibold text-[--text-primary]">{ep.title}</span>
                        </div>
                        <p className="text-xs text-[--text-muted]">{ep.description}</p>
                        {ep.characters && ep.characters.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {ep.characters.map((name) => {
                              const isMain = step2Characters?.some((c) => c.name === name && c.scope === "main");
                              return (
                                <span key={name} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isMain ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                                  {name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {historyMode && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHistoryMode(false);
                      setSelectedStep(null);
                      setCurrentStep(0);
                      setStepStatus({ 1: "idle", 2: "idle", 3: "idle", 4: "idle" });
                    }}
                  >
                    {t("newImport")}
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
