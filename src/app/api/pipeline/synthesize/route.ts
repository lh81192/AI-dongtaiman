import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runGenerationPipeline, getPipelineStatus, initPipelineStatus } from '@/lib/services/generation-service';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const projectId = formData.get('projectId') as string;
    const epubFile = formData.get('epubFile') as File;
    const configStr = formData.get('config') as string;

    if (!projectId || !epubFile) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const config = configStr ? JSON.parse(configStr) : {};

    // Initialize pipeline status so GET handler can poll immediately
    initPipelineStatus(projectId, 10);

    runGenerationPipeline({
      projectId,
      epubFile,
      config: {
        videoDuration: config.videoDuration || 5,
        videoResolution: config.videoResolution || '720p',
        videoAspectRatio: config.videoAspectRatio || '16:9',
        bgmVolume: config.bgmVolume || 0.3,
        voiceVolume: config.voiceVolume || 1.0,
        sfxVolume: config.sfxVolume || 0.5,
        ...config,
      },
      userId: session.user.id,
    }).catch(console.error);

    return NextResponse.json({
      message: '生成任务已启动',
      projectId,
    });
  } catch (error) {
    console.error('Start generation error:', error);
    return NextResponse.json({ error: '启动生成失败' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });
    }

    const status = getPipelineStatus(projectId);

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Get status error:', error);
    return NextResponse.json({ error: '获取状态失败' }, { status: 500 });
  }
}
