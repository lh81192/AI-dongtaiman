import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get like status and count for a project
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    // Get total like count
    const likeCountResult = db.prepare(`
      SELECT COUNT(*) as count FROM likes WHERE project_id = ?
    `).get(projectId) as { count: number };

    const likeCount = likeCountResult.count;

    // Check if current user has liked
    let isLiked = false;
    if (userId) {
      const existingLike = db.prepare(`
        SELECT id FROM likes WHERE user_id = ? AND project_id = ?
      `).get(userId, projectId);
      isLiked = !!existingLike;
    }

    return NextResponse.json({
      likeCount,
      isLiked,
    });
  } catch (error) {
    console.error("Get like error:", error);
    return NextResponse.json(
      { error: "获取点赞状态失败" },
      { status: 500 }
    );
  }
}

// POST - Like a project
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const userId = session.user.id;

    // Check if project exists
    const project = db.prepare(`
      SELECT id FROM projects WHERE id = ?
    `).get(projectId);

    if (!project) {
      return NextResponse.json(
        { error: "作品不存在" },
        { status: 404 }
      );
    }

    // Check if already liked
    const existingLike = db.prepare(`
      SELECT id FROM likes WHERE user_id = ? AND project_id = ?
    `).get(userId, projectId);

    if (existingLike) {
      return NextResponse.json(
        { error: "已经点赞过该作品" },
        { status: 400 }
      );
    }

    // Create like
    const likeId = generateId();
    db.prepare(`
      INSERT INTO likes (id, user_id, project_id, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(likeId, userId, projectId);

    // Get updated like count
    const likeCountResult = db.prepare(`
      SELECT COUNT(*) as count FROM likes WHERE project_id = ?
    `).get(projectId) as { count: number };

    return NextResponse.json({
      message: "点赞成功",
      likeCount: likeCountResult.count,
      isLiked: true,
    }, { status: 201 });
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json(
      { error: "点赞失败" },
      { status: 500 }
    );
  }
}

// DELETE - Unlike a project
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const userId = session.user.id;

    // Check if like exists
    const existingLike = db.prepare(`
      SELECT id FROM likes WHERE user_id = ? AND project_id = ?
    `).get(userId, projectId) as { id: string } | undefined;

    if (!existingLike) {
      return NextResponse.json(
        { error: "尚未点赞该作品" },
        { status: 400 }
      );
    }

    // Delete like
    db.prepare(`
      DELETE FROM likes WHERE user_id = ? AND project_id = ?
    `).run(userId, projectId);

    // Get updated like count
    const likeCountResult = db.prepare(`
      SELECT COUNT(*) as count FROM likes WHERE project_id = ?
    `).get(projectId) as { count: number };

    return NextResponse.json({
      message: "取消点赞成功",
      likeCount: likeCountResult.count,
      isLiked: false,
    });
  } catch (error) {
    console.error("Unlike error:", error);
    return NextResponse.json(
      { error: "取消点赞失败" },
      { status: 500 }
    );
  }
}
