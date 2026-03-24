"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { FileUpload } from "@/components/project/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Loader2, BookOpen } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((selectedFile: File | null) => {
    setFile(selectedFile);
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate inputs
    if (!title.trim()) {
      setError("请输入作品标题");
      return;
    }

    if (!file) {
      setError("请上传 EPUB 文件");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      if (description.trim()) {
        formData.append("description", description.trim());
      }
      formData.append("file", file);

      const response = await fetch("/api/projects", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "创建作品失败");
      }

      // Redirect to project detail or dashboard
      router.push(`/dashboard/projects/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建作品失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回作品列表
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            创建新作品
          </CardTitle>
          <CardDescription>
            上传您的 EPUB 漫画文件，开始生成动态漫
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Title input */}
            <div className="space-y-2">
              <Label htmlFor="title">作品标题 *</Label>
              <Input
                id="title"
                type="text"
                placeholder="输入作品标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                maxLength={100}
              />
              <p className="text-xs text-gray-500">
                建议使用简洁明了的标题，便于识别和管理
              </p>
            </div>

            {/* Description input */}
            <div className="space-y-2">
              <Label htmlFor="description">作品描述</Label>
              <Input
                id="description"
                type="text"
                placeholder="简要描述作品内容（可选）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                maxLength={200}
              />
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label>EPUB 文件 *</Label>
              <FileUpload
                onFileChange={handleFileChange}
                accept=".epub"
                maxSize={50 * 1024 * 1024} // 50MB
                disabled={isSubmitting}
              />
            </div>

            {/* Submit buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <Link href="/dashboard">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                >
                  取消
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting || !title.trim() || !file}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建作品"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-medium text-blue-900 mb-2">上传提示</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 请确保上传的 EPUB 文件内容完整，包含所有页面</li>
            <li>• 支持图文混排的 EPUB 文件</li>
            <li>• 文件大小不超过 50MB</li>
            <li>• 上传后系统将自动解析文件内容并生成视频</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
