"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface Scene {
  id: string;
  pageIndex: number;
  imagePath: string;
  rawText: string;
  sceneDescription: string | null;
  cameraType: string | null;
  dialogues: any[] | null;
  mood: string | null;
  status: "pending" | "analyzed" | "frames_generated" | "video_generated";
  framesStatus: "pending" | "completed" | "failed";
  videoStatus?: "pending" | "completed" | "failed";
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  videoUrl?: string;
}

interface SceneCardProps {
  scene: Scene;
  projectId: string;
  onRefresh: () => void;
}

// Step status helpers
function getStepStatus(
  step: 1 | 2 | 3,
  scene: Scene
): "idle" | "running" | "done" | "failed" {
  if (step === 1) {
    if (scene.status === "pending") return "idle";
    if (scene.status === "analyzed" || scene.status === "frames_generated" || scene.status === "video_generated") return "done";
    return "idle";
  }
  if (step === 2) {
    if (scene.status === "pending" || scene.status === "analyzed") return "idle";
    if (scene.framesStatus === "failed") return "failed";
    if (scene.framesStatus === "completed" || scene.status === "video_generated") return "done";
    return "idle";
  }
  if (step === 3) {
    if (
      scene.status === "pending" ||
      scene.status === "analyzed" ||
      scene.status === "frames_generated"
    )
      return "idle";
    if (scene.videoStatus === "failed") return "failed";
    if (scene.videoStatus === "completed" || scene.status === "video_generated") return "done";
    return "idle";
  }
  return "idle";
}

function StepIcon({ status }: { status: "idle" | "running" | "done" | "failed" }) {
  if (status === "done") return <span className="text-green-600 font-bold">✓</span>;
  if (status === "failed") return <span className="text-red-600 font-bold">✗</span>;
  if (status === "running") return <span className="text-blue-600">⏳</span>;
  return <span className="text-gray-400">○</span>;
}

export function SceneCard({ scene, projectId, onRefresh }: SceneCardProps) {
  const [loadingStep, setLoadingStep] = useState<1 | 2 | 3 | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const step1Status = getStepStatus(1, scene);
  const step2Status = getStepStatus(2, scene);
  const step3Status = getStepStatus(3, scene);

  const step1Enabled = true; // always available
  const step2Enabled = step1Status === "done";
  const step3Enabled = step2Status === "done";

  async function callStepApi(step: 1 | 2 | 3, action: string) {
    setLoadingStep(step);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${scene.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      setMessage({ type: "success", text: data.message || "操作成功" });
      onRefresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "操作失败",
      });
    } finally {
      setLoadingStep(null);
    }
  }

  function handleAnalyze() {
    callStepApi(1, "analyze");
  }

  function handleGenerateFrames() {
    callStepApi(2, "generate-frames");
  }

  function handleGenerateVideo() {
    callStepApi(3, "generate-video");
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Page {scene.pageIndex}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "收起" : "展开"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Thumbnail */}
        {scene.imagePath && (
          <div className="w-full aspect-video bg-gray-100 rounded overflow-hidden">
            <img
              src={scene.imagePath}
              alt={`Page ${scene.pageIndex}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Status badge */}
        <div>
          <p className="text-xs text-gray-500 mb-1">整体状态</p>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              scene.status === "video_generated"
                ? "bg-green-100 text-green-800"
                : scene.status === "frames_generated"
                ? "bg-blue-100 text-blue-800"
                : scene.status === "analyzed"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {scene.status === "pending"
              ? "待处理"
              : scene.status === "analyzed"
              ? "已分析"
              : scene.status === "frames_generated"
              ? "帧已生成"
              : "视频已生成"}
          </span>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`text-xs p-2 rounded ${
              message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {expanded && (
          <div className="space-y-3 border-t pt-3">
            {/* Step 1: 分镜描述 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Step 1: 分镜描述</p>
                <StepIcon status={step1Status} />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={loadingStep !== null || !step1Enabled}
                >
                  {loadingStep === 1 ? "分析中..." : "分析"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    callStepApi(1, "skip");
                  }}
                  disabled={loadingStep !== null || !step1Enabled || step1Status !== "idle"}
                >
                  跳过
                </Button>
              </div>
              {scene.sceneDescription && (
                <p className="text-xs text-gray-600 line-clamp-2">
                  {scene.sceneDescription}
                </p>
              )}
            </div>

            {/* Step 2: 首尾帧 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Step 2: 首尾帧</p>
                <StepIcon status={step2Status} />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleGenerateFrames}
                  disabled={loadingStep !== null || !step2Enabled}
                >
                  {loadingStep === 2 ? "生成中..." : "生成帧"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    callStepApi(2, "skip");
                  }}
                  disabled={
                    loadingStep !== null ||
                    !step2Enabled ||
                    step2Status !== "idle"
                  }
                >
                  跳过
                </Button>
              </div>
              {(scene.firstFrameUrl || scene.lastFrameUrl) && (
                <div className="flex gap-2">
                  {scene.firstFrameUrl && (
                    <a
                      href={scene.firstFrameUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      首帧预览
                    </a>
                  )}
                  {scene.lastFrameUrl && (
                    <a
                      href={scene.lastFrameUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      尾帧预览
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: 视频片段 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Step 3: 视频片段</p>
                <StepIcon status={step3Status} />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleGenerateVideo}
                  disabled={loadingStep !== null || !step3Enabled}
                >
                  {loadingStep === 3 ? "生成中..." : "生成视频"}
                </Button>
              </div>
              {scene.videoUrl && (
                <a
                  href={scene.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline block"
                >
                  视频预览
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
