import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatDuration } from "@/lib/utils";
import { VideoPlayer } from "@/components/player/video-player";
import { LikeButton } from "@/components/social/like-button";
import { CommentSection } from "@/components/social/comment-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Calendar, Clock, BookOpen } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Status mapping for public display
const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: "待处理", className: "bg-gray-100 text-gray-800" },
  processing: { label: "生成中", className: "bg-blue-100 text-blue-800" },
  completed: { label: "已完成", className: "bg-green-100 text-green-800" },
  failed: { label: "失败", className: "bg-red-100 text-red-800" },
};

export default async function PublicProjectPage({ params }: PageProps) {
  const { id } = await params;

  // Get public project info with user info (author)
  const project = db.prepare(`
    SELECT
      p.id,
      p.user_id,
      p.title,
      p.description,
      p.epub_path,
      p.cover_image,
      p.status,
      p.video_url,
      p.duration,
      p.created_at,
      p.updated_at,
      u.nickname as author_nickname,
      u.avatar as author_avatar
    FROM projects p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(id) as {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    epub_path: string;
    cover_image: string | null;
    status: string;
    video_url: string | null;
    duration: number | null;
    created_at: string;
    updated_at: string;
    author_nickname: string | null;
    author_avatar: string | null;
  } | undefined;

  if (!project) {
    notFound();
  }

  // Only show completed projects to public (or show status to owner - but this is public route)
  // For now, we'll show all projects but only videos for completed ones
  const statusInfo = statusMap[project.status] || statusMap.pending;

  // Get like count
  const likeCountResult = db.prepare(`
    SELECT COUNT(*) as count FROM likes WHERE project_id = ?
  `).get(id) as { count: number };
  const likeCount = likeCountResult.count;

  // Get comment count
  const commentCountResult = db.prepare(`
    SELECT COUNT(*) as count FROM comments WHERE project_id = ?
  `).get(id) as { count: number };
  const commentCount = commentCountResult.count;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/gallery" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回作品广场
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Meta */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              {project.description && (
                <p className="text-gray-600 mt-2">{project.description}</p>
              )}
            </div>

            {/* Video Player */}
            {project.status === "completed" && project.video_url ? (
              <Card>
                <CardContent className="p-0">
                  <VideoPlayer
                    src={project.video_url}
                    poster={project.cover_image || undefined}
                    title={project.title}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    {project.cover_image ? (
                      <img
                        src={project.cover_image}
                        alt={project.title}
                        className="w-full max-w-md aspect-video object-cover rounded-lg"
                      />
                    ) : (
                      <BookOpen className="h-16 w-16 text-gray-300" />
                    )}
                    <div>
                      <p className="text-gray-500 font-medium">
                        {statusInfo.label}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {project.status === "pending"
                          ? "作品正在等待处理"
                          : project.status === "processing"
                          ? "视频正在生成中，请稍后再来"
                          : project.status === "failed"
                          ? "视频生成失败"
                          : "视频尚未生成"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">作品信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Author */}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">作者</span>
                    <span className="text-sm font-medium ml-auto">
                      {project.author_nickname || "未知用户"}
                    </span>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">创建时间</span>
                    <span className="text-sm font-medium ml-auto">
                      {formatDate(project.created_at)}
                    </span>
                  </div>

                  {/* Duration */}
                  {project.duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">时长</span>
                      <span className="text-sm font-medium ml-auto">
                        {formatDuration(project.duration)}
                      </span>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">状态</span>
                    <span className={`text-sm px-2 py-0.5 rounded-full ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            {project.status === "completed" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    评论 ({commentCount})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CommentSection projectId={project.id} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Author Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">作者</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {project.author_avatar ? (
                      <img
                        src={project.author_avatar}
                        alt={project.author_nickname || "用户"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {project.author_nickname || "未知用户"}
                    </p>
                    <p className="text-sm text-gray-500">
                      创建于 {formatDate(project.created_at)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Like Button */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-4">
                  <LikeButton
                    projectId={project.id}
                    initialCount={likeCount}
                  />
                  <span className="text-sm text-gray-500">
                    {likeCount} 人喜欢
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Link href="/gallery" className="block">
                  <Button variant="outline" className="w-full">
                    查看更多作品
                  </Button>
                </Link>
                <Link href="/" className="block">
                  <Button variant="ghost" className="w-full">
                    返回首页
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
