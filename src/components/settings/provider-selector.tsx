"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ProviderType, Protocol, ModelProvider } from "@/lib/model-providers";

interface ProviderSelectorProps {
  selectedType: ProviderType;
  selectedProtocol?: Protocol;
  selectedProvider?: string;
  onTypeChange: (type: ProviderType) => void;
  onProtocolChange: (protocol: Protocol) => void;
  onProviderChange: (provider: ModelProvider) => void;
  providers: ModelProvider[];
  protocolNames: Record<Protocol, string>;
  typeNames: Record<ProviderType, string>;
  className?: string;
}

// Provider icons (simplified SVG icons)
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

export function ProviderSelector({
  selectedType,
  selectedProtocol,
  selectedProvider,
  onTypeChange,
  onProtocolChange,
  onProviderChange,
  providers,
  protocolNames,
  typeNames,
  className,
}: ProviderSelectorProps) {
  // Get unique protocols for selected type
  const protocolsInType = [...new Set(providers
    .filter(p => p.type === selectedType)
    .map(p => p.protocol)
  )] as Protocol[];

  // Get providers filtered by selected type and protocol
  const filteredProviders = providers.filter(p => {
    if (p.type !== selectedType) return false;
    if (selectedProtocol && p.protocol !== selectedProtocol) return false;
    return true;
  });

  return (
    <div className={cn("space-y-6", className)}>
      {/* Provider Type Tabs */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">模型类型</label>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(typeNames) as ProviderType[]).map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              size="sm"
              onClick={() => onTypeChange(type)}
              className={cn(
                "min-w-[100px]",
                selectedType === type && "shadow-md"
              )}
            >
              {typeNames[type]}
            </Button>
          ))}
        </div>
      </div>

      {/* Protocol Tabs (only for text type) */}
      {protocolsInType.length > 1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">协议类型</label>
          <div className="flex gap-2 flex-wrap">
            {protocolsInType.map((protocol) => (
              <Button
                key={protocol}
                variant={selectedProtocol === protocol ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onProtocolChange(protocol)}
                className={cn(
                  "min-w-[100px]",
                  selectedProtocol === protocol && "bg-blue-100 text-blue-700 hover:bg-blue-100"
                )}
              >
                {protocolNames[protocol]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Provider Grid */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">选择供应商</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProviders.map((provider) => (
            <button
              key={provider.id}
              onClick={() => onProviderChange(provider)}
              className={cn(
                "flex flex-col items-center p-4 rounded-lg border-2 transition-all",
                "hover:shadow-md hover:border-blue-300",
                selectedProvider === provider.id
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-gray-200 bg-white"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-2 text-lg">
                {providerIcons[provider.id] || <span className="text-gray-500">{provider.name[0]}</span>}
              </div>
              <span className="text-sm font-medium text-gray-800 text-center">
                {provider.nameZh}
              </span>
              <span className="text-xs text-gray-500 text-center mt-1">
                {provider.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProviderSelector;
