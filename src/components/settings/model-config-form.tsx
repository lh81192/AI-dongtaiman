"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModelProvider, ProviderType, Protocol } from "@/lib/model-providers";

export interface ModelConfigFormData {
  provider_id: string;
  provider_type: ProviderType;
  protocol: Protocol;
  name: string;
  api_url: string;
  api_key: string;
  enabled: boolean;
  is_default: boolean;
  model_ids: string[];
}

interface ModelConfigFormProps {
  provider: ModelProvider | null;
  initialData?: Partial<ModelConfigFormData>;
  onSubmit: (data: ModelConfigFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ModelConfigForm({
  provider,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  className,
}: ModelConfigFormProps) {
  // Form state
  const [name, setName] = useState(initialData?.name || "");
  const [apiUrl, setApiUrl] = useState(initialData?.api_url || "");
  const [apiKey, setApiKey] = useState(initialData?.api_key || "");
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);
  const [isDefault, setIsDefault] = useState(initialData?.is_default ?? false);
  const [modelIds, setModelIds] = useState<string[]>(initialData?.model_ids || []);
  const [modelIdInput, setModelIdInput] = useState("");

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when provider changes
  useEffect(() => {
    if (provider) {
      setApiUrl(provider.defaultApiUrl || "");
      setName(provider.nameZh);
    }
  }, [provider]);

  // Initialize with existing data
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setApiUrl(initialData.api_url || "");
      setApiKey(initialData.api_key || "");
      setEnabled(initialData.enabled ?? true);
      setIsDefault(initialData.is_default ?? false);
      setModelIds(initialData.model_ids || []);
    }
  }, [initialData]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "请输入配置名称";
    }

    if (!apiUrl.trim()) {
      newErrors.api_url = "请输入 API 地址";
    } else if (!isValidUrl(apiUrl)) {
      newErrors.api_url = "请输入有效的 URL 地址";
    }

    if (!apiKey.trim()) {
      newErrors.api_key = "请输入 API Key";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // URL validation helper
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !provider) return;

    const formData: ModelConfigFormData = {
      provider_id: provider.id,
      provider_type: provider.type,
      protocol: provider.protocol,
      name: name.trim(),
      api_url: apiUrl.trim(),
      api_key: apiKey.trim(),
      enabled,
      is_default: isDefault,
      model_ids: modelIds,
    };

    await onSubmit(formData);
  };

  // Add model ID
  const handleAddModelId = () => {
    const trimmedId = modelIdInput.trim();
    if (trimmedId && !modelIds.includes(trimmedId)) {
      setModelIds([...modelIds, trimmedId]);
      setModelIdInput("");
    }
  };

  // Remove model ID
  const handleRemoveModelId = (id: string) => {
    setModelIds(modelIds.filter(m => m !== id));
  };

  // Handle Enter key in model ID input
  const handleModelIdKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddModelId();
    }
  };

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader>
        <CardTitle>
          {initialData?.name ? "编辑配置" : "新建配置"}
        </CardTitle>
        <CardDescription>
          {provider
            ? `配置 ${provider.nameZh} (${provider.name})`
            : "请先选择供应商"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Config Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              配置名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 我的智谱配置"
              disabled={!provider || isLoading}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* API URL */}
          <div className="space-y-2">
            <Label htmlFor="apiUrl">
              API 地址 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="apiUrl"
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              disabled={!provider || isLoading}
            />
            {errors.api_url && (
              <p className="text-xs text-red-500">{errors.api_url}</p>
            )}
            {provider?.defaultApiUrl && (
              <p className="text-xs text-gray-500">
                默认地址: {provider.defaultApiUrl}
              </p>
            )}
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key <span className="text-red-500">*</span>
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入您的 API Key"
              disabled={!provider || isLoading}
            />
            {errors.api_key && (
              <p className="text-xs text-red-500">{errors.api_key}</p>
            )}
            <p className="text-xs text-gray-500">
              您的 API Key 将被安全加密存储
            </p>
          </div>

          {/* Model IDs (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="modelId">指定模型 (可选)</Label>
            <div className="flex gap-2">
              <Input
                id="modelId"
                value={modelIdInput}
                onChange={(e) => setModelIdInput(e.target.value)}
                onKeyDown={handleModelIdKeyDown}
                placeholder="输入模型 ID"
                disabled={!provider || isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddModelId}
                disabled={!provider || isLoading || !modelIdInput.trim()}
              >
                添加
              </Button>
            </div>
            {modelIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {modelIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm"
                  >
                    {id}
                    <button
                      type="button"
                      onClick={() => handleRemoveModelId(id)}
                      className="text-blue-500 hover:text-blue-700"
                      disabled={isLoading}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">
              如果留空，将使用供应商的所有可用模型
            </p>
          </div>

          {/* Toggle Options */}
          <div className="space-y-3 pt-2">
            {/* Enabled Toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                  disabled={isLoading}
                />
                <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500 disabled:opacity-50"></div>
              </div>
              <span className="text-sm text-gray-700">启用此配置</span>
            </label>

            {/* Default Toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="sr-only peer"
                  disabled={isLoading}
                />
                <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 disabled:opacity-50"></div>
              </div>
              <span className="text-sm text-gray-700">
                设为默认配置
                <span className="text-xs text-gray-500 ml-1">
                  (同一类型下只能有一个默认)
                </span>
              </span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                取消
              </Button>
            )}
            <Button
              type="submit"
              disabled={!provider || isLoading}
              className="flex-1"
            >
              {isLoading ? "保存中..." : "保存配置"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ModelConfigForm;
