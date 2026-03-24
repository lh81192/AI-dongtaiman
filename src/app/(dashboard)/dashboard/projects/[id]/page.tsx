import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneratePanel } from "@/components/project/generate-panel";
import { SceneList } from "@/components/project/scene-list";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Status mapping
const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: "待处理", className: "bg-gray-100 text-gray-800" },
  processing: { label: "生成中", className: "bg-blue-100 text-blue-800" },
  completed: { label: "已完成", className: "bg-green-100 text-green-800" },
  failed: { label: "失败", className: "bg-red-100 text-red-800" },
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  // Get project with config
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
      pc.id as config_id,
      pc.voice_model,
      pc.voice_params,
      pc.bgm_model,
      pc.sfx_model
    FROM projects p
    LEFT JOIN project_configs pc ON p.id = pc.project_id
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
    config_id: string | null;
    voice_model: string | null;
    voice_params: string | null;
    bgm_model: string | null;
    sfx_model: string | null;
  } | undefined;

  if (!project) {
    notFound();
  }

  // Check if user has permission
  if (project.user_id !== session.user.id && session.user.role !== "admin") {
    redirect("/dashboard");
  }

  // Get latest task
  const latestTask = db.prepare(`
    SELECT
      id,
      task_type,
      status,
      progress,
      error_message,
      created_at,
      started_at,
      completed_at
    FROM tasks
    WHERE project_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(id) as {
    id: string;
    task_type: string;
    status: string;
    progress: number;
    error_message: string | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
  } | undefined;

  const statusInfo = statusMap[project.status] || statusMap.pending;

  // Fetch scenes data
  const rawScenes = db.prepare(`
    SELECT s.*,
      kf1.image_url as first_frame_url,
      kf2.image_url as last_frame_url,
      vc.video_url as clip_video_url,
      vc.status as clip_status
    FROM scenes s
    LEFT JOIN key_frames kf1 ON kf1.scene_id = s.id AND kf1.frame_type = 'first'
    LEFT JOIN key_frames kf2 ON kf2.scene_id = s.id AND kf2.frame_type = 'last'
    LEFT JOIN video_clips vc ON vc.scene_id = s.id
    WHERE s.project_id = ?
    ORDER BY s.sequence_index
  `).all(id) as any[];

  // Derive scene status
  function deriveSceneStatus(scene: any): "pending" | "analyzed" | "frames_generated" | "video_generated" {
    if (scene.clip_status === "completed" || scene.clip_video_url) return "video_generated";
    if (scene.frames_status === "completed") return "frames_generated";
    if (scene.scene_description) return "analyzed";
    return "pending";
  }

  const scenes = rawScenes.map((s) => ({
    id: s.id,
    pageIndex: s.page_index,
    imagePath: s.image_path || "",
    rawText: s.raw_text || "",
    sceneDescription: s.scene_description || null,
    cameraType: s.camera_type || null,
    dialogues: s.dialogues ? JSON.parse(s.dialogues) : null,
    mood: s.mood || null,
    status: deriveSceneStatus(s),
    framesStatus: s.frames_status || "pending",
    firstFrameUrl: s.first_frame_url || undefined,
    lastFrameUrl: s.last_frame_url || undefined,
    videoStatus: s.clip_status || undefined,
    videoUrl: s.clip_video_url || undefined,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              返回
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{project.title}</h1>
            <p className="text-gray-600 mt-1">
              {project.description || "暂无描述"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm px-3 py-1 rounded-full ${statusInfo.className}`}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Project Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scenes Management */}
          <SceneList projectId={id} initialScenes={scenes} />

          {/* Video Player */}
          {project.status === "completed" && project.video_url && (
            <Card>
              <CardHeader>
                <CardTitle>生成的视频</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    src={project.video_url}
                    controls
                    className="w-full h-full"
                  >
                    您的浏览器不支持视频播放
                  </video>
                </div>
                {project.duration && (
                  <p className="mt-2 text-sm text-gray-500">
                    时长: {formatDuration(project.duration)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>项目信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">创建时间</p>
                  <p className="font-medium">{formatDate(project.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">更新时间</p>
                  <p className="font-medium">{formatDate(project.updated_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">EPUB 文件</p>
                  <a
                    href={project.epub_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    查看文件
                  </a>
                </div>
                {project.cover_image && (
                  <div>
                    <p className="text-sm text-gray-500">封面图片</p>
                    <a
                      href={project.cover_image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      查看图片
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task Progress */}
          {latestTask && (
            <Card>
              <CardHeader>
                <CardTitle>生成进度</CardTitle>
                <CardDescription>
                  任务 ID: {latestTask.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">状态</span>
                  <span
                    className={`text-sm px-2 py-1 rounded ${
                      latestTask.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : latestTask.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : latestTask.status === "processing"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {latestTask.status === "completed"
                      ? "已完成"
                      : latestTask.status === "failed"
                      ? "失败"
                      : latestTask.status === "processing"
                      ? "处理中"
                      : "待处理"}
                  </span>
                </div>

                {latestTask.status === "processing" && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>进度</span>
                      <span>{latestTask.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${latestTask.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {latestTask.error_message && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      错误信息: {latestTask.error_message}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">创建时间</p>
                    <p>{formatDate(latestTask.created_at)}</p>
                  </div>
                  {latestTask.started_at && (
                    <div>
                      <p className="text-gray-500">开始时间</p>
                      <p>{formatDate(latestTask.started_at)}</p>
                    </div>
                  )}
                  {latestTask.completed_at && (
                    <div>
                      <p className="text-gray-500">完成时间</p>
                      <p>{formatDate(latestTask.completed_at)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Generate Panel */}
        <div>
          <GeneratePanel
            projectId={project.id}
            projectStatus={project.status}
            config={
              project.config_id
                ? {
                    voice_model: project.voice_model,
                    voice_params: project.voice_params
                      ? JSON.parse(project.voice_params)
                      : {},
                    bgm_model: project.bgm_model,
                    sfx_model: project.sfx_model,
                  }
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}
