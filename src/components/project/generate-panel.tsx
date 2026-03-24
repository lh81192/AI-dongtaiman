"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ModelConfig {
  id: string;
  name: string;
  provider_id: string;
  provider_type: string;
  model_ids: string[];
  enabled: boolean;
}

interface GeneratePanelProps {
  projectId: string;
  projectStatus: string;
  config: {
    voice_model: string | null;
    voice_params: Record<string, unknown> | null;
    bgm_model: string | null;
    sfx_model: string | null;
  } | null;
}

export function GeneratePanel({ projectId, projectStatus, config }: GeneratePanelProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Model config state
  const [textModels, setTextModels] = useState<ModelConfig[]>([]);
  const [imageModels, setImageModels] = useState<ModelConfig[]>([]);
  const [videoModels, setVideoModels] = useState<ModelConfig[]>([]);
  const [audioModels, setAudioModels] = useState<ModelConfig[]>([]);

  // Config state
  const [voiceModel, setVoiceModel] = useState(config?.voice_model || "gpt-sovits");
  const [bgmModel, setBgmModel] = useState(config?.bgm_model || "minimax");
  const [sfxModel, setSfxModel] = useState(config?.sfx_model || "elevenlabs");

  // Fetch model configs
  useEffect(() => {
    const fetchModelConfigs = async () => {
      try {
        const res = await fetch('/api/models');
        const data = await res.json();
        if (res.ok) {
          const configs = data.configs.filter((c: ModelConfig) => c.enabled);
          setTextModels(configs.filter((c: ModelConfig) => c.provider_type === 'text'));
          setImageModels(configs.filter((c: ModelConfig) => c.provider_type === 'image'));
          setVideoModels(configs.filter((c: ModelConfig) => c.provider_type === 'video'));
          setAudioModels(configs.filter((c: ModelConfig) => c.provider_type === 'audio'));
        }
      } catch (error) {
        console.error('Error fetching model configs:', error);
      }
    };
    fetchModelConfigs();
  }, []);

  // Task polling
  const [currentTask, setCurrentTask] = useState<{
    id: string;
    status: string;
    progress: number;
    error_message: string | null;
  } | null>(null);

  // Check for existing task on mount
  useEffect(() => {
    const checkTask = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        const data = await res.json();
        if (data.project?.latest_task) {
          setCurrentTask(data.project.latest_task);
        }
      } catch (error) {
        console.error("Error checking task:", error);
      }
    };

    checkTask();
  }, [projectId]);

  // Poll for task updates when processing
  useEffect(() => {
    if (currentTask?.status !== "processing") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        const data = await res.json();
        if (data.project?.latest_task) {
          setCurrentTask(data.project.latest_task);
          if (data.project.latest_task.status === "completed") {
            router.refresh();
          }
        }
      } catch (error) {
        console.error("Error polling task:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentTask?.status, projectId, router]);

  // Save config
  const handleSaveConfig = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voice_model: voiceModel,
          bgm_model: bgmModel,
          sfx_model: sfxModel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "保存配置失败");
      }

      setMessage({ type: "success", text: "配置保存成功" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "保存配置失败",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Start generation
  const handleGenerate = async () => {
    setIsGenerating(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "启动生成失败");
      }

      setMessage({ type: "success", text: "生成任务已启动" });
      if (data.task) {
        setCurrentTask(data.task);
      }
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "启动生成失败",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isProcessing = projectStatus === "processing" || currentTask?.status === "processing";
  const isCompleted = projectStatus === "completed";

  return (
    <Card>
      <CardHeader>
        <CardTitle>生成设置</CardTitle>
        <CardDescription>配置 AI 生成参数</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Voice Model */}
        <div className="space-y-2">
          <Label htmlFor="voiceModel">语音模型</Label>
          <select
            id="voiceModel"
            value={voiceModel}
            onChange={(e) => setVoiceModel(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isProcessing}
          >
            {audioModels.length > 0 ? (
              audioModels.map((model) => (
                <optgroup key={model.id} label={model.name}>
                  {model.model_ids && model.model_ids.length > 0 ? (
                    model.model_ids.map((id) => (
                      <option key={`${model.id}-${id}`} value={`${model.provider_id}:${id}`}>
                        {id}
                      </option>
                    ))
                  ) : (
                    <option key={model.provider_id} value={model.provider_id}>
                      {model.name} (默认)
                    </option>
                  )}
                </optgroup>
              ))
            ) : (
              <>
                <option value="" disabled>请先在设置中配置音频模型</option>
                {[
                  { value: "gpt-sovits", label: "GPT-SoVITS" },
                  { value: "elevenlabs", label: "ElevenLabs" },
                  { value: "azure-tts", label: "Azure TTS" },
                ].map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* BGM Model */}
        <div className="space-y-2">
          <Label htmlFor="bgmModel">背景音乐模型</Label>
          <select
            id="bgmModel"
            value={bgmModel}
            onChange={(e) => setBgmModel(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isProcessing}
          >
            {audioModels.length > 0 ? (
              audioModels.map((model) => (
                <optgroup key={model.id} label={model.name}>
                  {model.model_ids && model.model_ids.length > 0 ? (
                    model.model_ids.map((id) => (
                      <option key={`${model.id}-${id}`} value={`${model.provider_id}:${id}`}>
                        {id}
                      </option>
                    ))
                  ) : (
                    <option key={model.provider_id} value={model.provider_id}>
                      {model.name} (默认)
                    </option>
                  )}
                </optgroup>
              ))
            ) : (
              <option value="" disabled>请先在设置中配置音频模型</option>
            )}
          </select>
        </div>

        {/* SFX Model */}
        <div className="space-y-2">
          <Label htmlFor="sfxModel">音效模型</Label>
          <select
            id="sfxModel"
            value={sfxModel}
            onChange={(e) => setSfxModel(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isProcessing}
          >
            {audioModels.length > 0 ? (
              audioModels.map((model) => (
                <optgroup key={model.id} label={model.name}>
                  {model.model_ids && model.model_ids.length > 0 ? (
                    model.model_ids.map((id) => (
                      <option key={`${model.id}-${id}`} value={`${model.provider_id}:${id}`}>
                        {id}
                      </option>
                    ))
                  ) : (
                    <option key={model.provider_id} value={model.provider_id}>
                      {model.name} (默认)
                    </option>
                  )}
                </optgroup>
              ))
            ) : (
              <option value="" disabled>请先在设置中配置音频模型</option>
            )}
          </select>
        </div>

        {/* Save Config Button */}
        <Button
          onClick={handleSaveConfig}
          variant="outline"
          className="w-full"
          disabled={isSaving || isProcessing}
        >
          {isSaving ? "保存中..." : "保存配置"}
        </Button>

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Generate Button */}
        {isCompleted ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 text-center">
              视频已完成生成
            </p>
            <Button
              onClick={handleGenerate}
              variant="secondary"
              className="w-full"
              disabled={isGenerating || isProcessing}
            >
              {isGenerating ? "启动中..." : "重新生成"}
            </Button>
          </div>
        ) : isProcessing ? (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">正在生成中...</p>
              {currentTask && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${currentTask.progress}%` }}
                  />
                </div>
              )}
              <p className="text-xs text-gray-500">
                {currentTask?.progress || 0}%
              </p>
            </div>
            {currentTask?.error_message && (
              <p className="text-sm text-red-600 text-center">
                {currentTask.error_message}
              </p>
            )}
          </div>
        ) : (
          <Button
            onClick={handleGenerate}
            className="w-full"
            disabled={isGenerating}
          >
            {isGenerating ? "启动中..." : "开始生成"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
