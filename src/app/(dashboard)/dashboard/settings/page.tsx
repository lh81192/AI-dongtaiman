"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelConfigCard, type ModelConfig } from "@/components/settings/model-config-card";
import { ModelConfigForm, type ModelConfigFormData } from "@/components/settings/model-config-form";
import { ProviderSelector } from "@/components/settings/provider-selector";
import { allProviders, protocolNames, typeNames, getProviderById, type ProviderType, type Protocol } from "@/lib/model-providers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingConfig, setDeletingConfig] = useState<ModelConfig | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Provider selector state
  const [selectedType, setSelectedType] = useState<ProviderType>("text");
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | undefined>(undefined);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchConfigs();
    }
  }, [session]);

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();

      if (res.ok) {
        setConfigs(data.configs);
      } else {
        setError(data.error || "获取配置失败");
      }
    } catch {
      setError("获取配置失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingConfig(null);
    setSelectedProvider(null);
    setSelectedType("text");
    setSelectedProtocol(undefined);
    setShowForm(true);
  };

  const handleEdit = (config: ModelConfig) => {
    setEditingConfig(config);
    const provider = getProviderById(config.provider_id);
    if (provider) {
      setSelectedProvider(provider);
      setSelectedType(provider.type);
      setSelectedProtocol(provider.protocol);
    }
    setShowForm(true);
  };

  const handleDelete = (config: ModelConfig) => {
    setDeletingConfig(config);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingConfig) return;

    setActionLoading(deletingConfig.id);
    try {
      const res = await fetch(`/api/models/${deletingConfig.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setConfigs(configs.filter((c) => c.id !== deletingConfig.id));
        setShowDeleteConfirm(false);
        setDeletingConfig(null);
      } else {
        const data = await res.json();
        setError(data.error || "删除失败");
      }
    } catch {
      setError("删除失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleEnabled = async (config: ModelConfig, enabled: boolean) => {
    setActionLoading(config.id);
    try {
      const res = await fetch(`/api/models/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (res.ok) {
        const data = await res.json();
        setConfigs(configs.map((c) => (c.id === config.id ? data.config : c)));
      } else {
        const data = await res.json();
        setError(data.error || "更新失败");
      }
    } catch {
      setError("更新失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetDefault = async (config: ModelConfig) => {
    setActionLoading(config.id);
    try {
      const res = await fetch(`/api/models/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setConfigs(
          configs.map((c) => {
            if (c.id === config.id) {
              return data.config;
            } else if (
              c.provider_type === config.provider_type &&
              c.is_default === 1
            ) {
              return { ...c, is_default: 0 };
            }
            return c;
          })
        );
      } else {
        const data = await res.json();
        setError(data.error || "设置默认失败");
      }
    } catch {
      setError("设置默认失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmit = async (formData: ModelConfigFormData) => {
    setSaving(true);
    setError("");

    try {
      if (editingConfig) {
        // Update existing config
        const res = await fetch(`/api/models/${editingConfig.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          const data = await res.json();
          setConfigs(configs.map((c) => (c.id === editingConfig.id ? data.config : c)));
          setShowForm(false);
        } else {
          const data = await res.json();
          throw new Error(data.error || "更新失败");
        }
      } else {
        // Create new config
        const res = await fetch("/api/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          const data = await res.json();
          setConfigs([data.config, ...configs]);
          setShowForm(false);
        } else {
          const data = await res.json();
          throw new Error(data.error || "创建失败");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setSaving(false);
    }
  };

  const handleProviderChange = (provider: any) => {
    setSelectedProvider(provider);
  };

  // Group configs by type
  const textConfigs = configs.filter((c) => c.provider_type === "text");
  const imageConfigs = configs.filter((c) => c.provider_type === "image");
  const videoConfigs = configs.filter((c) => c.provider_type === "video");
  const audioConfigs = configs.filter((c) => c.provider_type === "audio");

  // Get provider name mappings
  const getProviderName = (providerId: string) => {
    const provider = getProviderById(providerId);
    return provider?.name || providerId;
  };

  const getProviderNameZh = (providerId: string) => {
    const provider = getProviderById(providerId);
    return provider?.nameZh || providerId;
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            模型配置
          </h1>
          <p className="text-muted-foreground mt-1">
            管理您的 AI 模型供应商配置
          </p>
        </div>
        <Button onClick={handleCreate} className="btn-accent">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          添加配置
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-red-600 hover:text-red-800"
          >
            &times;
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-soft p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <span className="text-2xl">T</span>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">文本模型</p>
              <p className="text-3xl font-heading font-bold text-foreground">
                {textConfigs.length}
              </p>
            </div>
          </div>
        </div>
        <div className="card-soft p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
              <span className="text-2xl">I</span>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">图像模型</p>
              <p className="text-3xl font-heading font-bold text-foreground">
                {imageConfigs.length}
              </p>
            </div>
          </div>
        </div>
        <div className="card-soft p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <span className="text-2xl">V</span>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">视频模型</p>
              <p className="text-3xl font-heading font-bold text-foreground">
                {videoConfigs.length}
              </p>
            </div>
          </div>
        </div>
        <div className="card-soft p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <span className="text-2xl">A</span>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">音频模型</p>
              <p className="text-3xl font-heading font-bold text-foreground">
                {audioConfigs.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {configs.length === 0 && (
        <div className="card-soft p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <span className="text-4xl">AI</span>
          </div>
          <h3 className="text-xl font-heading font-bold text-foreground mb-2">
            还没有配置任何模型
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            添加您的第一个 AI 模型配置，开始使用智能漫剧生成功能
          </p>
          <Button onClick={handleCreate} className="btn-accent">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            添加第一个配置
          </Button>
        </div>
      )}

      {/* Configs by Type */}
      {textConfigs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-heading font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              T
            </span>
            文本模型
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {textConfigs.map((config) => (
              <ModelConfigCard
                key={config.id}
                config={config}
                providerName={getProviderName(config.provider_id)}
                providerNameZh={getProviderNameZh(config.provider_id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleEnabled={handleToggleEnabled}
                onSetDefault={handleSetDefault}
                isLoading={actionLoading === config.id}
              />
            ))}
          </div>
        </div>
      )}

      {imageConfigs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-heading font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
              I
            </span>
            图像模型
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {imageConfigs.map((config) => (
              <ModelConfigCard
                key={config.id}
                config={config}
                providerName={getProviderName(config.provider_id)}
                providerNameZh={getProviderNameZh(config.provider_id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleEnabled={handleToggleEnabled}
                onSetDefault={handleSetDefault}
                isLoading={actionLoading === config.id}
              />
            ))}
          </div>
        </div>
      )}

      {videoConfigs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-heading font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
              V
            </span>
            视频模型
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videoConfigs.map((config) => (
              <ModelConfigCard
                key={config.id}
                config={config}
                providerName={getProviderName(config.provider_id)}
                providerNameZh={getProviderNameZh(config.provider_id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleEnabled={handleToggleEnabled}
                onSetDefault={handleSetDefault}
                isLoading={actionLoading === config.id}
              />
            ))}
          </div>
        </div>
      )}

      {audioConfigs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-heading font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold">
              A
            </span>
            音频模型
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {audioConfigs.map((config) => (
              <ModelConfigCard
                key={config.id}
                config={config}
                providerName={getProviderName(config.provider_id)}
                providerNameZh={getProviderNameZh(config.provider_id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleEnabled={handleToggleEnabled}
                onSetDefault={handleSetDefault}
                isLoading={actionLoading === config.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "编辑配置" : "添加新配置"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {!editingConfig && (
              <ProviderSelector
                selectedType={selectedType}
                selectedProtocol={selectedProtocol}
                selectedProvider={selectedProvider?.id}
                onTypeChange={(type) => {
                  setSelectedType(type);
                  setSelectedProtocol(undefined);
                  setSelectedProvider(null);
                }}
                onProtocolChange={setSelectedProtocol}
                onProviderChange={handleProviderChange}
                providers={allProviders}
                protocolNames={protocolNames}
                typeNames={typeNames}
              />
            )}
            {(!editingConfig || selectedProvider) && (
              <ModelConfigForm
                provider={selectedProvider}
                initialData={
                  editingConfig
                    ? {
                        provider_id: editingConfig.provider_id,
                        provider_type: editingConfig.provider_type,
                        protocol: editingConfig.protocol,
                        name: editingConfig.name,
                        api_url: editingConfig.api_url || "",
                        api_key: "",
                        enabled: editingConfig.enabled === 1,
                        is_default: editingConfig.is_default === 1,
                        model_ids: editingConfig.model_ids,
                      }
                    : undefined
                }
                onSubmit={handleSubmit}
                onCancel={() => setShowForm(false)}
                isLoading={saving}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              确定要删除配置 "
              <span className="font-medium">{deletingConfig?.name}</span>
              " 吗？此操作无法撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={actionLoading !== null}
              >
                {actionLoading ? "删除中..." : "确认删除"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
