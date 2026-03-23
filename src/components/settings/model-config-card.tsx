"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProviderType, Protocol } from "@/lib/model-providers";
import { protocolNames, typeNames } from "@/lib/model-providers";

export interface ModelConfig {
  id: string;
  user_id: string;
  provider_id: string;
  provider_type: ProviderType;
  protocol: Protocol;
  name: string;
  api_url: string | null;
  api_key: string | null;
  enabled: number;
  is_default: number;
  model_ids: string[];
  created_at: string;
  updated_at: string;
}

interface ModelConfigCardProps {
  config: ModelConfig;
  providerName?: string;
  providerNameZh?: string;
  onEdit?: (config: ModelConfig) => void;
  onDelete?: (config: ModelConfig) => void;
  onToggleEnabled?: (config: ModelConfig, enabled: boolean) => void;
  onSetDefault?: (config: ModelConfig) => void;
  isLoading?: boolean;
  className?: string;
}

// Provider icons (matching provider-selector.tsx)
const providerIcons: Record<string, JSX.Element> = {
  zhipu: <span className="text-blue-500 font-bold">Z</span>,
  tongyi: <span className="text-orange-500 font-bold">通</span>,
  ernie: <span className="text-red-500 font-bold">百</span>,
  minimax: <span className="text-purple-500 font-bold">M</span>,
  deepseek: <span className="text-cyan-500 font-bold">D</span>,
  moonshot: <span className="text-gray-500 font-bold">月</span>,
  openai: <span className="text-green-500 font-bold">O</span>,
  siliconflow: <span className="text-pink-500 font-bold">S</span>,
  togetherai: <span className="text-indigo-500 font-bold">T</span>,
  groq: <span className="text-orange-600 font-bold">G</span>,
  ollama: <span className="text-emerald-500 font-bold">O</span>,
  gemini: <span className="text-blue-400 font-bold">G</span>,
  "zhipu-cogview": <span className="text-blue-500 font-bold">C</span>,
  "tongyi-wanxiang": <span className="text-orange-500 font-bold">万</span>,
  "baidu-image": <span className="text-red-500 font-bold">图</span>,
  dalle: <span className="text-green-500 font-bold">D</span>,
  stability: <span className="text-purple-500 font-bold">S</span>,
  imagen: <span className="text-blue-400 font-bold">I</span>,
  seedance: <span className="text-pink-500 font-bold">S</span>,
  cogvideo: <span className="text-blue-500 font-bold">C</span>,
  "minimax-video": <span className="text-purple-500 font-bold">M</span>,
  veo: <span className="text-blue-400 font-bold">V</span>,
};

// Type badges with colors
const typeBadgeColors: Record<ProviderType, string> = {
  text: "bg-blue-100 text-blue-700",
  image: "bg-purple-100 text-purple-700",
  video: "bg-orange-100 text-orange-700",
};

export function ModelConfigCard({
  config,
  providerName,
  providerNameZh,
  onEdit,
  onDelete,
  onToggleEnabled,
  onSetDefault,
  isLoading = false,
  className,
}: ModelConfigCardProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  const isEnabled = config.enabled === 1;
  const isDefault = config.is_default === 1;

  // Mask API key for display
  const maskedApiKey = config.api_key
    ? config.api_key.length > 8
      ? `${config.api_key.slice(0, 4)}...${config.api_key.slice(-4)}`
      : "••••••••"
    : "未设置";

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card
      className={cn(
        "transition-all",
        !isEnabled && "opacity-60 bg-gray-50",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Provider Icon */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-xl shadow-sm">
              {providerIcons[config.provider_id] || (
                <span className="text-gray-500">
                  {providerNameZh?.[0] || config.provider_id[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {config.name}
                {isDefault && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-normal">
                    默认
                  </span>
                )}
                {isEnabled ? (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-normal">
                    已启用
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full font-normal">
                    已禁用
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {providerNameZh || config.provider_id} · {providerName || config.protocol}
              </CardDescription>
            </div>
          </div>

          {/* Type Badge */}
          <span
            className={cn(
              "text-xs px-2 py-1 rounded-full font-medium",
              typeBadgeColors[config.provider_type]
            )}
          >
            {typeNames[config.provider_type]}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Config Details */}
        <div className="space-y-2 text-sm">
          {/* API URL */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-16">API:</span>
            <span className="text-gray-800 truncate flex-1 font-mono text-xs">
              {config.api_url || "未设置"}
            </span>
          </div>

          {/* API Key (masked) */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-16">Key:</span>
            <span className="text-gray-800 font-mono text-xs flex items-center gap-1">
              {showApiKey ? config.api_key || "未设置" : maskedApiKey}
              {config.api_key && (
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-blue-500 hover:text-blue-700 ml-1 text-xs"
                >
                  {showApiKey ? "隐藏" : "显示"}
                </button>
              )}
            </span>
          </div>

          {/* Protocol */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-16">协议:</span>
            <span className="text-gray-800">
              {protocolNames[config.protocol]}
            </span>
          </div>

          {/* Model IDs */}
          {config.model_ids && config.model_ids.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500 w-16">模型:</span>
              <div className="flex flex-wrap gap-1 flex-1">
                {config.model_ids.slice(0, 3).map((id) => (
                  <span
                    key={id}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                  >
                    {id}
                  </span>
                ))}
                {config.model_ids.length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    +{config.model_ids.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="text-xs text-gray-400 pt-2 border-t">
          创建于 {formatDate(config.created_at)}
          {config.updated_at !== config.created_at && (
            <> · 更新于 {formatDate(config.updated_at)}</>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {/* Toggle Enabled */}
          {onToggleEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleEnabled(config, !isEnabled)}
              disabled={isLoading}
              className="flex-1 text-xs"
            >
              {isEnabled ? "禁用" : "启用"}
            </Button>
          )}

          {/* Set Default */}
          {onSetDefault && !isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetDefault(config)}
              disabled={isLoading}
              className="flex-1 text-xs"
            >
              设为默认
            </Button>
          )}

          {/* Edit */}
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(config)}
              disabled={isLoading}
              className="flex-1 text-xs"
            >
              编辑
            </Button>
          )}

          {/* Delete */}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(config)}
              disabled={isLoading}
              className="flex-1 text-xs"
            >
              删除
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ModelConfigCard;
