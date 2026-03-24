"use client";

import { useState, useEffect, useCallback } from "react";
import { SceneCard, Scene } from "./scene-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SceneListProps {
  projectId: string;
  initialScenes: Scene[];
}

const BATCH_ACTIONS = [
  { label: "解析全部", action: "parse" },
  { label: "分析全部", action: "analyze" },
  { label: "生成帧", action: "generate-frames" },
  { label: "生成视频", action: "generate-video" },
] as const;

function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden animate-pulse">
      <div className="p-4 space-y-3">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="aspect-video bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="h-6 w-full bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export function SceneList({ projectId, initialScenes }: SceneListProps) {
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [loading, setLoading] = useState(false);
  const [batchAction, setBatchAction] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Poll scenes when any batch operation is running
  const isOperationInProgress = scenes.some(
    (s) =>
      s.status === "analyzed" ||
      s.framesStatus === "pending" ||
      s.videoStatus === "pending"
  );

  const fetchScenes = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.scenes)) {
          setScenes(data.scenes);
        } else if (Array.isArray(data)) {
          setScenes(data);
        }
      }
    } catch (err) {
      // silent fail on poll
    }
  }, [projectId]);

  useEffect(() => {
    if (!isOperationInProgress) return;
    const interval = setInterval(fetchScenes, 5000);
    return () => clearInterval(interval);
  }, [isOperationInProgress, fetchScenes]);

  // Sync with parent prop changes
  useEffect(() => {
    setScenes(initialScenes);
  }, [initialScenes]);

  async function handleBatchAction(action: string) {
    setBatchAction(action);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sceneIds: "all" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "批量操作失败");
      setMessage({ type: "success", text: data.message || "操作已启动" });
      // Refresh immediately then rely on polling
      await fetchScenes();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "批量操作失败",
      });
    } finally {
      setBatchAction(null);
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">分镜管理</CardTitle>
          <div className="flex gap-2 flex-wrap">
            {BATCH_ACTIONS.map(({ label, action }) => (
              <Button
                key={action}
                size="sm"
                variant="outline"
                onClick={() => handleBatchAction(action)}
                disabled={loading}
              >
                {batchAction === action ? "处理中..." : label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message */}
        {message && (
          <div
            className={`text-sm p-3 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Content */}
        {loading && scenes.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : scenes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">还没有分镜数据</p>
            <p className="text-sm">点击「解析全部」从 EPUB 提取</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                projectId={projectId}
                onRefresh={fetchScenes}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
