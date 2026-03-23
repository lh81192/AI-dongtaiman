import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPipelineStatus } from '@/lib/services/generation-service';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { projectId } = await params;

    // Check project ownership and get info in one query
    const project = db.prepare(`
      SELECT id, user_id, title, status, video_url, cover_image, updated_at
      FROM projects WHERE id = ?
    `).get(projectId) as { id: string; user_id: string; title: string; status: string; video_url: string; cover_image: string; updated_at: string } | undefined;

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    if (project.user_id !== session.user.id) {
      return NextResponse.json({ error: '无权限查看此项目' }, { status: 403 });
    }

    // Get pipeline status
    const status = getPipelineStatus(projectId);

    // Build projectInfo from the same result
    const projectInfo = {
      id: project.id,
      title: project.title,
      status: project.status,
      video_url: project.video_url,
      cover_image: project.cover_image,
      updated_at: project.updated_at,
    };

    // Get scenes
    const scenes = db.prepare(`
      SELECT id, page_index, scene_description, mood, sequence_index
      FROM scenes WHERE project_id = ?
      ORDER BY sequence_index
    `).all(projectId) as any[];

    return NextResponse.json({
      project: projectInfo,
      pipeline: status,
      scenes,
    });
  } catch (error) {
    console.error('Get pipeline status error:', error);
    return NextResponse.json({ error: '获取状态失败' }, { status: 500 });
  }
}
