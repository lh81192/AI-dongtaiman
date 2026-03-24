import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { runGenerationPipeline } from "@/lib/services/generation-service";
import type { GenerationConfig } from "@/lib/pipeline/types";
import { readFile } from "fs/promises";
import { join } from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get project
    const project = db.prepare(`
      SELECT id, user_id, title, status, epub_path FROM projects WHERE id = ?
    `).get(id) as {
      id: string;
      user_id: string;
      title: string;
      status: string;
      epub_path: string;
    } | undefined;

    if (!project) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权限操作该作品" }, { status: 403 });
    }

    if (project.status === "processing") {
      return NextResponse.json({ error: "作品正在生成中" }, { status: 400 });
    }

    if (!project.epub_path) {
      return NextResponse.json({ error: "EPUB 文件不存在" }, { status: 400 });
    }

    // Get project audio config
    const projectConfig = db.prepare(`
      SELECT voice_model, voice_params, bgm_model, sfx_model
      FROM project_configs WHERE project_id = ?
    `).get(id) as {
      voice_model: string | null;
      voice_params: string | null;
      bgm_model: string | null;
      sfx_model: string | null;
    } | undefined;

    if (!projectConfig) {
      return NextResponse.json({ error: "项目配置不存在" }, { status: 400 });
    }

    // Get user's enabled model configs
    const modelConfigs = db.prepare(`
      SELECT id, provider_id, provider_type, api_url, api_key, model_ids, is_default
      FROM user_model_configs
      WHERE user_id = ? AND enabled = 1
    `).all(userId) as {
      id: string;
      provider_id: string;
      provider_type: string;
      api_url: string | null;
      api_key: string | null;
      model_ids: string | null;
      is_default: number;
    }[];

    const textConfig = modelConfigs.find(c => c.provider_type === "text");
    const imageConfig = modelConfigs.find(c => c.provider_type === "image");
    const videoConfig = modelConfigs.find(c => c.provider_type === "video");

    if (!textConfig || !imageConfig || !videoConfig) {
      return NextResponse.json(
        { error: "请先在设置中配置文本、图像和视频模型" },
        { status: 400 }
      );
    }

    // Parse model_ids (stored as JSON array)
    const parseModelIds = (modelIdsStr: string | null): string[] => {
      if (!modelIdsStr) return [];
      try { return JSON.parse(modelIdsStr); } catch { return []; }
    };

    // Build GenerationConfig with user_model_configs.id (primary key)
    const genConfig: GenerationConfig = {
      textModelConfigId: textConfig.id,
      textModel: parseModelIds(textConfig.model_ids)[0],
      imageModelConfigId: imageConfig.id,
      imageModel: parseModelIds(imageConfig.model_ids)[0],
      videoModelConfigId: videoConfig.id,
      videoModel: parseModelIds(videoConfig.model_ids)[0],
      // Audio configs: project stores provider_id, find matching user_model_configs.id
      voiceModelConfigId: projectConfig.voice_model
        ? modelConfigs.find(c => c.provider_id === projectConfig.voice_model)?.id
        : undefined,
      defaultVoiceId: projectConfig.voice_params
        ? (JSON.parse(projectConfig.voice_params) as { voiceId?: string }).voiceId
        : undefined,
      bgmModelConfigId: projectConfig.bgm_model
        ? modelConfigs.find(c => c.provider_id === projectConfig.bgm_model)?.id
        : undefined,
      sfxModelConfigId: projectConfig.sfx_model
        ? modelConfigs.find(c => c.provider_id === projectConfig.sfx_model)?.id
        : undefined,
      videoDuration: 5,
      videoResolution: "720p",
      videoAspectRatio: "16:9",
      bgmVolume: 0.3,
      voiceVolume: 1.0,
      sfxVolume: 0.5,
    };

    // Read EPUB file from disk
    // DB stores paths like "/uploads/epubs/xxx.epub" (with leading /)
    // Always resolve relative to project public directory
    const epubPath = project.epub_path.startsWith("/")
      ? join(process.cwd(), "public", project.epub_path.slice(1))
      : join(process.cwd(), "public", project.epub_path);

    let epubBuffer: Buffer;
    try {
      epubBuffer = await readFile(epubPath);
    } catch {
      return NextResponse.json({ error: "无法读取 EPUB 文件" }, { status: 500 });
    }

    const epubFile = new File([epubBuffer], "epub.epub", { type: "application/epub+zip" });

    // Update project status to processing
    db.prepare(`
      UPDATE projects SET status = 'processing', updated_at = datetime('now') WHERE id = ?
    `).run(id);

    // Fire-and-forget pipeline
    console.log('[GenerateRoute] Starting pipeline for project:', id);
    runGenerationPipeline({
      projectId: id,
      epubFile,
      config: genConfig,
      userId,
    }).then(() => console.log('[GenerateRoute] Pipeline completed for project:', id))
      .catch((error) => {
      try {
        db.prepare(`UPDATE projects SET status = 'failed', updated_at = datetime('now') WHERE id = ?`).run(id);
        db.prepare(`UPDATE pipeline_status SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE project_id = ?`).run(String(error), id);
      } catch {}
      console.error("[GenerateRoute] Pipeline failed:", error);
    });

    return NextResponse.json({ message: "生成任务已启动", projectId: id }, { status: 201 });
  } catch (error) {
    console.error("[GenerateRoute] Error:", error);
    return NextResponse.json({ error: "启动生成任务失败" }, { status: 500 });
  }
}
