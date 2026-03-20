import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import path from "path";
import fs from "fs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Download project video
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get project with video info
    const project = db.prepare(`
      SELECT id, user_id, title, status, video_url
      FROM projects
      WHERE id = ?
    `).get(id) as {
      id: string;
      user_id: string;
      title: string;
      status: string;
      video_url: string | null;
    } | undefined;

    if (!project) {
      return NextResponse.json(
        { error: "作品不存在" },
        { status: 404 }
      );
    }

    // Check if user is the owner (or admin)
    if (project.user_id !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "无权限下载该作品" },
        { status: 403 }
      );
    }

    // Check if project is completed
    if (project.status !== 'completed') {
      return NextResponse.json(
        { error: "作品尚未完成，无法下载" },
        { status: 400 }
      );
    }

    // Check if video exists
    if (!project.video_url) {
      return NextResponse.json(
        { error: "视频文件不存在" },
        { status: 404 }
      );
    }

    // Get the file path - video_url should be a path like /uploads/videos/xxx.mp4
    const videoPath = project.video_url.startsWith('/')
      ? path.join(process.cwd(), "public", project.video_url)
      : path.join(process.cwd(), "public", project.video_url);

    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return NextResponse.json(
        { error: "视频文件不存在或已被删除" },
        { status: 404 }
      );
    }

    // Get file stats
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const fileName = path.basename(videoPath);

    // Read file
    const fileBuffer = fs.readFileSync(videoPath);

    // Create response with appropriate headers for file download
    const headers = new Headers();
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(project.title)}.mp4"`);
    headers.set("Content-Length", fileSize.toString());

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Download video error:", error);
    return NextResponse.json(
      { error: "下载视频失败" },
      { status: 500 }
    );
  }
}
