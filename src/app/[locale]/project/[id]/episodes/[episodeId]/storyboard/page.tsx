"use client";

import { useProjectStore } from "@/stores/project-store";
import { useModelStore } from "@/stores/model-store";
import { ShotCard } from "@/components/editor/shot-card";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { useState, useRef, useMemo } from "react";
import { useModelGuard } from "@/hooks/use-model-guard";
import {
  Film,
  Sparkles,
  ImageIcon,
  VideoIcon,
  Loader2,
  Download,
  RefreshCw,
  Play,
  Plus,
  LayoutGrid,
  List,
  ChevronDown,
} from "lucide-react";
import { InlineModelPicker } from "@/components/editor/model-selector";
import { VideoRatioPicker } from "@/components/editor/video-ratio-picker";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { GenerationModeTab } from "@/components/editor/generation-mode-tab";
import { ShotDrawer } from "@/components/editor/shot-drawer";
import { CharactersInlinePanel } from "@/components/editor/characters-inline-panel";
import { ShotKanban } from "@/components/editor/shot-kanban";
import Link from "next/link";

export default function EpisodeStoryboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { project, fetchProject, currentEpisodeId } = useProjectStore();
  const getModelConfig = useModelStore((s) => s.getModelConfig);
  const [generating, setGenerating] = useState(false);
  const [generatingFrames, setGeneratingFrames] = useState(false);
  const [generatingVideos, setGeneratingVideos] = useState(false);
  const [generatingSceneFrames, setGeneratingSceneFrames] = useState(false);
  const [generatingVideoPrompts, setGeneratingVideoPrompts] = useState(false);
  const [sceneFramesOverwrite, setSceneFramesOverwrite] = useState(false);
  const [generatingFramesOverwrite, setGeneratingFramesOverwrite] = useState(false);
  const [generatingVideosOverwrite, setGeneratingVideosOverwrite] = useState(false);
  const [videoRatio, setVideoRatio] = useState("16:9");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [openDrawerShotId, setOpenDrawerShotId] = useState<string | null>(null);
  const [viewModeOverride, setViewModeOverride] = useState<"list" | "kanban" | null>(null);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const versionDropdownRef = useRef<HTMLDivElement>(null);

  const versions = project?.versions ?? [];
  const viewMode = useMemo<"list" | "kanban">(() => {
    if (viewModeOverride) return viewModeOverride;
    if (typeof window === "undefined" || !project?.id) return "list";
    const stored = window.localStorage.getItem(`storyboardView:${project.id}`);
    return stored === "kanban" ? "kanban" : "list";
  }, [viewModeOverride, project?.id]);

  const activeVersionId = selectedVersionId ?? versions[0]?.id ?? null;

  function switchView(mode: "list" | "kanban") {
    setViewModeOverride(mode);
    if (project) localStorage.setItem(`storyboardView:${project.id}`, mode);
  }

  function handleSelectVersion(versionId: string) {
    setSelectedVersionId(versionId);
    fetchProject(project!.id, currentEpisodeId ?? undefined, versionId);
  }

  function handleOpenLatestVersion() {
    setSelectedVersionId(null);
    fetchProject(project!.id, currentEpisodeId ?? undefined);
  }

  function versionIsActive(versionId: string) {
    return activeVersionId === versionId;
  }

  function versionLabel(versionId: string) {
    return versions.find((version) => version.id === versionId)?.label;
  }

  function previewHref() {
    const base = currentEpisodeId
      ? `/${locale}/project/${project!.id}/episodes/${currentEpisodeId}/preview`
      : `/${locale}/project/${project!.id}/preview`;

    return activeVersionId ? `${base}?versionId=${activeVersionId}` : base;
  }

  const textGuard = useModelGuard("text");
  const imageGuard = useModelGuard("image");
  const videoGuard = useModelGuard("video");


  if (!project) return null;

  const totalShots = project.shots.length;
  const shotsWithFrames = project.shots.filter(
    (s) => s.firstFrame && s.lastFrame
  ).length;
  const generationMode = (project.generationMode || "keyframe") as "keyframe" | "reference";
  const shotsWithVideo = project.shots.filter((s) =>
    generationMode === "reference" ? s.referenceVideoUrl : s.videoUrl
  ).length;
  const shotsWithVideoPrompts = project.shots.filter((s) => s.videoPrompt).length;
  const shotsWithSceneFrames = project.shots.filter((s) => s.sceneRefFrame).length;
  const shotsWithFrameAny = project.shots.filter(
    (s) => s.sceneRefFrame || s.firstFrame || s.lastFrame
  ).length;
  const charactersWithRefs = project.characters.filter((c) => c.referenceImage);
  const hasReferenceImages = charactersWithRefs.length > 0;

  const anyGenerating = generating || generatingFrames || generatingVideos || generatingSceneFrames || generatingVideoPrompts;

  const drawerShots = project.shots.map((shot) => ({
    id: shot.id,
    sequence: shot.sequence,
    prompt: shot.prompt,
    startFrameDesc: shot.startFrameDesc,
    endFrameDesc: shot.endFrameDesc,
    videoScript: shot.videoScript,
    motionScript: shot.motionScript,
    cameraDirection: shot.cameraDirection,
    duration: shot.duration,
    firstFrame: shot.firstFrame,
    lastFrame: shot.lastFrame,
    sceneRefFrame: shot.sceneRefFrame,
    videoPrompt: shot.videoPrompt,
    videoUrl: generationMode === "reference" ? shot.referenceVideoUrl : shot.videoUrl,
    dialogues: shot.dialogues || [],
  }));

  async function handleGenerateShots() {
    if (!project) return;
    if (!textGuard()) return;
    setGenerating(true);

    try {
      const response = await apiFetch(`/api/projects/${project.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shot_split",
          modelConfig: getModelConfig(),
          episodeId: currentEpisodeId ?? undefined,
        }),
      });

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
    } catch (err) {
      console.error("Shot split error:", err);
      toast.error(err instanceof Error ? err.message : t("common.generationFailed"));
    }

    setGenerating(false);
    setSelectedVersionId(null);
    await fetchProject(project.id, currentEpisodeId ?? undefined);
  }

  async function handleBatchGenerateFrames(overwrite = false) {
    if (!project) return;
    if (!imageGuard()) return;
    setGeneratingFramesOverwrite(overwrite);
    setGeneratingFrames(true);

    try {
      const response = await apiFetch(`/api/projects/${project.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_frame_generate",
          payload: { ratio: videoRatio, overwrite, versionId: selectedVersionId },
          modelConfig: getModelConfig(),
          episodeId: currentEpisodeId ?? undefined,
        }),
      });
      const data = await response.json() as { results: Array<{ status: string }> };
      if (data.results?.some((r) => r.status === "error")) {
        toast.warning(t("common.batchPartialFailed"));
      }
    } catch (err) {
      console.error("Batch frame generate error:", err);
      toast.error(err instanceof Error ? err.message : t("common.generationFailed"));
    }

    setGeneratingFramesOverwrite(false);
    setGeneratingFrames(false);
    fetchProject(project.id, currentEpisodeId ?? undefined);
  }

  async function handleBatchGenerateVideos(overwrite = false) {
    if (!project) return;
    if (!videoGuard()) return;
    setGeneratingVideosOverwrite(overwrite);
    setGeneratingVideos(true);

    try {
      const response = await apiFetch(`/api/projects/${project.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_video_generate",
          payload: { ratio: videoRatio, overwrite, versionId: selectedVersionId },
          modelConfig: getModelConfig(),
          episodeId: currentEpisodeId ?? undefined,
        }),
      });
      const data = await response.json() as {
        results: Array<{ status: string; error?: string; sequence?: number }>;
      };
      const firstError = data.results?.find((r) => r.status === "error");
      if (firstError?.error) {
        toast.error(firstError.error);
      } else if (firstError) {
        toast.warning(t("common.batchPartialFailed"));
      }
    } catch (err) {
      console.error("Batch video generate error:", err);
      toast.error(err instanceof Error ? err.message : t("common.generationFailed"));
    }

    setGeneratingVideosOverwrite(false);
    setGeneratingVideos(false);
    fetchProject(project.id, currentEpisodeId ?? undefined);
  }

  async function handleBatchGenerateSceneFrames(overwrite = false) {
    if (!project) return;
    if (!imageGuard()) return;
    setSceneFramesOverwrite(overwrite);
    setGeneratingSceneFrames(true);

    try {
      const response = await apiFetch(`/api/projects/${project.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_scene_frame",
          payload: { overwrite, versionId: selectedVersionId },
          modelConfig: getModelConfig(),
          episodeId: currentEpisodeId ?? undefined,
        }),
      });
      const data = await response.json() as { results: Array<{ status: string }> };
      if (data.results?.some((r) => r.status === "error")) {
        toast.warning(t("common.batchPartialFailed"));
      }
    } catch (err) {
      console.error("Batch scene frame error:", err);
      toast.error(err instanceof Error ? err.message : t("common.generationFailed"));
    }

    setSceneFramesOverwrite(false);
    setGeneratingSceneFrames(false);
    fetchProject(project.id, currentEpisodeId ?? undefined);
  }

  async function handleBatchGenerateVideoPrompts() {
    if (!project) return;
    setGeneratingVideoPrompts(true);

    try {
      const response = await apiFetch(`/api/projects/${project.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_video_prompt",
          payload: { versionId: selectedVersionId },
          modelConfig: getModelConfig(),
          episodeId: currentEpisodeId ?? undefined,
        }),
      });
      const data = await response.json() as { results: Array<{ status: string }> };
      if (data.results?.some((r) => r.status === "error")) {
        toast.warning(t("common.batchPartialFailed"));
      }
    } catch (err) {
      console.error("Batch video prompt error:", err);
      toast.error(err instanceof Error ? err.message : t("common.generationFailed"));
    }

    setGeneratingVideoPrompts(false);
    fetchProject(project.id, currentEpisodeId ?? undefined);
  }

  async function handleBatchGenerateReferenceVideos(overwrite = false) {
    if (!project) return;
    if (!videoGuard()) return;
    setGeneratingVideosOverwrite(overwrite);
    setGeneratingVideos(true);

    try {
      const response = await apiFetch(`/api/projects/${project.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_reference_video",
          payload: { ratio: videoRatio, overwrite, versionId: selectedVersionId },
          modelConfig: getModelConfig(),
          episodeId: currentEpisodeId ?? undefined,
        }),
      });
      const data = await response.json() as {
        results: Array<{ status: string; error?: string; sequence?: number }>;
      };
      const firstError = data.results?.find((r) => r.status === "error");
      if (firstError?.error) {
        toast.error(firstError.error);
      } else if (firstError) {
        toast.warning(t("common.batchPartialFailed"));
      }
    } catch (err) {
      console.error("Batch reference video error:", err);
      toast.error(err instanceof Error ? err.message : t("common.generationFailed"));
    }

    setGeneratingVideosOverwrite(false);
    setGeneratingVideos(false);
    fetchProject(project.id, currentEpisodeId ?? undefined);
  }

  async function handleAutoRun() {
    if (!project) return;
    if (!confirm(t("project.autoRunConfirm"))) return;

    const shots = project.shots;
    const needsText = shots.some((s) => !s.prompt && !s.motionScript);
    const needsFrame = shots.some((s) =>
      generationMode === "reference" ? !s.sceneRefFrame : !s.firstFrame || !s.lastFrame
    );
    const needsPrompt = shots.some((s) => !s.videoPrompt);
    const needsVideo = shots.some((s) =>
      generationMode === "reference" ? !s.referenceVideoUrl : !s.videoUrl
    );

    if (needsText) await handleGenerateShots();
    if (needsFrame) {
      if (generationMode === "reference") await handleBatchGenerateSceneFrames(false);
      else await handleBatchGenerateFrames(false);
    }
    if (needsPrompt) await handleBatchGenerateVideoPrompts();
    if (needsVideo) {
      if (generationMode === "reference") await handleBatchGenerateReferenceVideos(false);
      else await handleBatchGenerateVideos(false);
    }
  }

  return (
    <div className="animate-page-in space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[--primary]/10 shadow-lg shadow-[--primary]/10">
            <Film className="h-4 w-4 text-[--primary]" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-[--foreground]">
              {t("project.storyboard")}
            </h2>
            <p className="text-xs text-[--text-muted]">
              {totalShots} shots
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalShots > 0 && (
            <div className="inline-flex gap-1 rounded-xl border border-[--border-subtle] bg-[--card]/80 backdrop-blur-xl p-1 shadow-sm">
              <button
                onClick={() => switchView("list")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-150 ${
                  viewMode === "list"
                    ? "bg-[--primary] text-[--primary-foreground] shadow-lg shadow-[--primary]/20"
                    : "text-[--text-muted] hover:bg-[--surface] hover:text-[--text-secondary]"
                }`}
              >
                <List className={`h-3.5 w-3.5 ${viewMode === "list" ? "text-[--primary-foreground]" : ""}`} />
                {t("project.viewList")}
              </button>
              <button
                onClick={() => switchView("kanban")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-150 ${
                  viewMode === "kanban"
                    ? "bg-[--primary] text-[--primary-foreground] shadow-lg shadow-[--primary]/20"
                    : "text-[--text-muted] hover:bg-[--surface] hover:text-[--text-secondary]"
                }`}
              >
                <LayoutGrid className={`h-3.5 w-3.5 ${viewMode === "kanban" ? "text-[--primary-foreground]" : ""}`} />
                {t("project.viewKanban")}
              </button>
            </div>
          )}
          {totalShots > 0 && (
            <Link
              href={previewHref()}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
            >
              <Film className="h-3.5 w-3.5" />
              {t("project.preview")}
            </Link>
          )}
          {totalShots > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const a = document.createElement("a");
                a.href = `/api/projects/${project!.id}/download${currentEpisodeId ? `?episodeId=${currentEpisodeId}` : ""}`;
                a.download = "";
                a.click();
              }}
            >
              <Download className="h-3.5 w-3.5" />
              {t("project.downloadAll")}
            </Button>
          )}
        </div>
      </div>

      {/* ── Control Panel ── */}
      <div className="rounded-2xl border border-[--border-subtle] bg-[--card]/80 backdrop-blur-xl p-5 space-y-5 shadow-xl shadow-black/5">
        {/* Generation mode + version tabs row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <GenerationModeTab />

          {/* Version tabs */}
          {versions.length > 0 && (
            <div className="flex items-center gap-1">
              {/* Show 2 newest versions */}
              {versions.slice(0, 2).map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleSelectVersion(v.id)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                    versionIsActive(v.id)
                      ? "bg-[--primary]/10 text-[--primary] shadow-sm"
                      : "text-[--text-muted] hover:bg-[--surface] hover:text-[--text-secondary]"
                  }`}
                >
                  {v.label}
                </button>
              ))}
              {/* Older versions dropdown */}
              {versions.length > 2 && (
                <div className="relative" ref={versionDropdownRef}>
                  <button
                    onClick={() => setVersionDropdownOpen((o) => !o)}
                    className={`flex items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                      versions.slice(2).some((v) => versionIsActive(v.id))
                        ? "bg-[--primary]/10 text-[--primary] shadow-sm"
                        : "text-[--text-muted] hover:bg-[--surface] hover:text-[--text-secondary]"
                    }`}
                  >
                    {versions.slice(2).some((v) => versionIsActive(v.id))
                      ? versionLabel(activeVersionId!)
                      : `+${versions.length - 2}`}
                    <ChevronDown className={`h-3 w-3 transition-transform ${versionDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {versionDropdownOpen && (
                    <div
                      className="absolute right-0 top-full z-20 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-[--border-subtle] bg-[--card] shadow-xl shadow-black/10"
                      onMouseLeave={() => setVersionDropdownOpen(false)}
                    >
                      {versions.slice(2).map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            handleSelectVersion(v.id);
                            setVersionDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-[--surface] ${
                            versionIsActive(v.id) ? "text-[--primary]" : "text-[--text-secondary]"
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {versions.length > 0 && (
                <button
                  onClick={handleOpenLatestVersion}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                    activeVersionId === null
                      ? "bg-[--primary]/10 text-[--primary] shadow-sm"
                      : "text-[--text-muted] hover:bg-[--surface] hover:text-[--text-secondary]"
                  }`}
                >
                  Latest
                </button>
              )}

              <button
                onClick={handleGenerateShots}
                disabled={anyGenerating}
                className="ml-1 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] text-[--text-muted] transition-colors hover:bg-[--surface] hover:text-[--text-secondary] disabled:opacity-40"
                title={t("project.generateShots")}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Characters inline panel (Feature B) */}
        <CharactersInlinePanel
          characters={project.characters}
          projectId={project.id}
          generationMode={generationMode}
          onUpdate={() => fetchProject(project.id, currentEpisodeId ?? undefined)}
        />

        {/* Batch operations */}
        {viewMode === "list" && (
        <div className="space-y-4">
          {/* Pipeline steps - visual grouping */}
          <div className="relative">
            {/* Step progress indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[--border-subtle] to-transparent" />
            </div>
            <div className="relative flex items-center justify-center">
              <span className="bg-[--card] px-3 text-[10px] font-semibold uppercase tracking-widest text-[--text-muted]">
                {t("project.pipeline")}
              </span>
            </div>
          </div>

          {/* Step cards with better visual grouping */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Step 1: Generate text / shots */}
            <div className="group rounded-xl border border-[--border-subtle] bg-[--surface]/50 p-3 transition-all duration-200 hover:border-[--primary]/30 hover:bg-[--surface] hover:shadow-lg hover:shadow-[--primary]/5">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[--primary]/10 text-[10px] font-bold text-[--primary]">1</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{t("project.stepText")}</span>
              </div>
              <InlineModelPicker capability="text" />
              <Button
                onClick={handleGenerateShots}
                disabled={anyGenerating}
                variant={totalShots > 0 ? "outline" : "default"}
                size="sm"
                className="mt-2 w-full"
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {generating ? t("common.generating") : t("project.generateShots")}
              </Button>
            </div>

            {/* Step 2: Frames */}
            <div className="group rounded-xl border border-[--border-subtle] bg-[--surface]/50 p-3 transition-all duration-200 hover:border-[--warning]/30 hover:bg-[--surface] hover:shadow-lg hover:shadow-[--warning]/5">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[--warning]/10 text-[10px] font-bold text-[--warning]">2</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{generationMode === "keyframe" ? t("project.stepFrames") : t("project.stepSceneFrame")}</span>
              </div>
              <InlineModelPicker capability="image" />
              {generationMode === "keyframe" ? (
                <div className="mt-2 flex gap-1.5">
                  <Button
                    onClick={() => handleBatchGenerateFrames(false)}
                    disabled={anyGenerating || totalShots === 0}
                    variant={shotsWithFrames === totalShots && totalShots > 0 ? "outline" : "default"}
                    size="sm"
                    className="flex-1"
                  >
                    {generatingFrames && !generatingFramesOverwrite ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleBatchGenerateFrames(true)}
                    disabled={anyGenerating || totalShots === 0}
                    variant="ghost"
                    size="icon"
                    title={t("project.batchGenerateFramesOverwrite")}
                  >
                    {generatingFrames && generatingFramesOverwrite ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="mt-2 flex gap-1.5">
                  <Button
                    onClick={() => handleBatchGenerateSceneFrames(false)}
                    disabled={anyGenerating || totalShots === 0 || !hasReferenceImages}
                    variant={shotsWithSceneFrames === totalShots && totalShots > 0 ? "outline" : "default"}
                    size="sm"
                    className="flex-1"
                  >
                    {generatingSceneFrames && !sceneFramesOverwrite ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleBatchGenerateSceneFrames(true)}
                    disabled={anyGenerating || totalShots === 0 || !hasReferenceImages}
                    variant="ghost"
                    size="icon"
                    title={t("project.batchGenerateSceneFramesOverwrite")}
                  >
                    {generatingSceneFrames && sceneFramesOverwrite ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Step 3: Video prompts */}
            <div className="group rounded-xl border border-[--border-subtle] bg-[--surface]/50 p-3 transition-all duration-200 hover:border-[--accent]/30 hover:bg-[--surface] hover:shadow-lg hover:shadow-[--accent]/5">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[--accent]/10 text-[10px] font-bold text-[--accent]">3</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{t("project.stepPrompts")}</span>
              </div>
              <InlineModelPicker capability="text" />
              <Button
                onClick={handleBatchGenerateVideoPrompts}
                disabled={anyGenerating || shotsWithFrameAny === 0}
                variant={shotsWithVideoPrompts === totalShots && totalShots > 0 ? "outline" : "default"}
                size="sm"
                className="mt-2 w-full"
              >
                {generatingVideoPrompts ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            {/* Step 4: Videos */}
            <div className="group rounded-xl border border-[--border-subtle] bg-[--surface]/50 p-3 transition-all duration-200 hover:border-[--success]/30 hover:bg-[--surface] hover:shadow-lg hover:shadow-[--success]/5">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[--success]/10 text-[10px] font-bold text-[--success]">4</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{t("project.stepVideos")}</span>
              </div>
              <InlineModelPicker capability="video" />
              <div className="mt-2 flex items-center gap-1.5">
                <VideoRatioPicker value={videoRatio} onChange={setVideoRatio} />
                <Button
                  onClick={() =>
                    generationMode === "reference"
                      ? handleBatchGenerateReferenceVideos(false)
                      : handleBatchGenerateVideos(false)
                  }
                  disabled={anyGenerating || totalShots === 0 || (generationMode === "reference" ? !hasReferenceImages : shotsWithFrames === 0)}
                  variant={shotsWithVideo === totalShots && totalShots > 0 ? "outline" : "default"}
                  size="sm"
                  className="flex-1"
                >
                  {generatingVideos && !generatingVideosOverwrite ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <VideoIcon className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  onClick={() =>
                    generationMode === "reference"
                      ? handleBatchGenerateReferenceVideos(true)
                      : handleBatchGenerateVideos(true)
                  }
                  disabled={anyGenerating || totalShots === 0 || (generationMode === "reference" ? !hasReferenceImages : shotsWithFrames === 0)}
                  variant="ghost"
                  size="icon"
                  title={t("project.batchGenerateVideosOverwrite")}
                >
                  {generatingVideos && generatingVideosOverwrite ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Auto-run */}
          {totalShots > 0 && (
            <div className="flex items-center justify-center pt-2">
              <Button
                onClick={handleAutoRun}
                disabled={anyGenerating}
                variant="outline"
                size="sm"
                className="gap-2 px-6"
              >
                {anyGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {t("project.autoRun")}
              </Button>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Shot cards */}
      {totalShots === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[--border-subtle] bg-[--surface]/50 py-24">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10">
            <Film className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold text-[--text-primary]">
            {t("project.storyboard")}
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-[--text-secondary]">
            {t("shot.noShots")}
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        <ShotKanban
          shots={project.shots.map((shot) => ({
            id: shot.id,
            sequence: shot.sequence,
            prompt: shot.prompt,
            firstFrame: shot.firstFrame,
            lastFrame: shot.lastFrame,
            sceneRefFrame: shot.sceneRefFrame,
            videoPrompt: shot.videoPrompt,
            videoUrl: generationMode === "reference" ? shot.referenceVideoUrl : shot.videoUrl,
          }))}
          generationMode={generationMode}
          anyGenerating={anyGenerating}
          onOpenDrawer={(id) => setOpenDrawerShotId(id)}
          onBatchFrames={() => handleBatchGenerateFrames(false)}
          onBatchSceneFrames={() => handleBatchGenerateSceneFrames(false)}
          onBatchVideoPrompts={handleBatchGenerateVideoPrompts}
          onBatchVideos={() => handleBatchGenerateVideos(false)}
          onBatchReferenceVideos={() => handleBatchGenerateReferenceVideos(false)}
          generatingFrames={generatingFrames}
          generatingSceneFrames={generatingSceneFrames}
          generatingVideoPrompts={generatingVideoPrompts}
          generatingVideos={generatingVideos}
        />
      ) : (
        <div className="space-y-3">
          {project.shots.map((shot) => (
            <ShotCard
              key={shot.id}
              id={shot.id}
              projectId={project.id}
              sequence={shot.sequence}
              prompt={shot.prompt}
              startFrameDesc={shot.startFrameDesc}
              endFrameDesc={shot.endFrameDesc}
              videoScript={shot.videoScript}
              motionScript={shot.motionScript}
              cameraDirection={shot.cameraDirection}
              duration={shot.duration}
              firstFrame={shot.firstFrame}
              lastFrame={shot.lastFrame}
              sceneRefFrame={shot.sceneRefFrame}
              videoPrompt={shot.videoPrompt}
              videoUrl={generationMode === "reference" ? shot.referenceVideoUrl : shot.videoUrl}
              status={
                generationMode === "reference"
                  ? shot.status === "generating"
                    ? "generating"
                    : shot.referenceVideoUrl
                      ? "completed"
                      : "pending"
                  : shot.status
              }
              dialogues={shot.dialogues || []}
              onUpdate={() => fetchProject(project.id, currentEpisodeId ?? undefined)}
              generationMode={generationMode}
              videoRatio={videoRatio}
              isCompact={openDrawerShotId !== null}
              onOpenDrawer={(id) => setOpenDrawerShotId(id)}
              batchGeneratingFrames={generationMode === "reference" ? generatingSceneFrames : generatingFrames}
              batchGeneratingVideoPrompts={generatingVideoPrompts}
              batchGeneratingVideos={generatingVideos}
            />
          ))}
        </div>
      )}

      {openDrawerShotId && (
        <ShotDrawer
          shots={drawerShots}
          openShotId={openDrawerShotId}
          onClose={() => setOpenDrawerShotId(null)}
          onShotChange={(id) => setOpenDrawerShotId(id)}
          onUpdate={() => fetchProject(project.id, currentEpisodeId ?? undefined)}
          projectId={project.id}
          generationMode={generationMode}
          videoRatio={videoRatio}
          selectedVersionId={selectedVersionId}
          anyGenerating={anyGenerating}
        />
      )}
    </div>
  );
}
