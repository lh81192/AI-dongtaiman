import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get favorite status and count for a project
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    // Get total favorite count
    const favoriteCountResult = db.prepare(`
      SELECT COUNT(*) as count FROM favorites WHERE project_id = ?
    `).get(projectId) as { count: number };

    const favoriteCount = favoriteCountResult.count;

    // Check if current user has favorited
    let isFavorited = false;
    if (userId) {
      const existingFavorite = db.prepare(`
        SELECT id FROM favorites WHERE user_id = ? AND project_id = ?
      `).get(userId, projectId);
      isFavorited = !!existingFavorite;
    }

    return NextResponse.json({
      favoriteCount,
      isFavorited,
    });
  } catch (error) {
    console.error("Get favorite error:", error);
    return NextResponse.json(
      { error: "获取收藏状态失败" },
      { status: 500 }
    );
  }
}

// POST - Favorite a project
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

    // Check if already favorited
    const existingFavorite = db.prepare(`
      SELECT id FROM favorites WHERE user_id = ? AND project_id = ?
    `).get(userId, projectId);

    if (existingFavorite) {
      return NextResponse.json(
        { error: "已经收藏过该作品" },
        { status: 400 }
      );
    }

    // Create favorite
    const favoriteId = generateId();
    db.prepare(`
      INSERT INTO favorites (id, user_id, project_id, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(favoriteId, userId, projectId);

    // Get updated favorite count
    const favoriteCountResult = db.prepare(`
      SELECT COUNT(*) as count FROM favorites WHERE project_id = ?
    `).get(projectId) as { count: number };

    return NextResponse.json({
      message: "收藏成功",
      favoriteCount: favoriteCountResult.count,
      isFavorited: true,
    }, { status: 201 });
  } catch (error) {
    console.error("Favorite error:", error);
    return NextResponse.json(
      { error: "收藏失败" },
      { status: 500 }
    );
  }
}

// DELETE - Unfavorite a project
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

    // Check if favorite exists
    const existingFavorite = db.prepare(`
      SELECT id FROM favorites WHERE user_id = ? AND project_id = ?
    `).get(userId, projectId) as { id: string } | undefined;

    if (!existingFavorite) {
      return NextResponse.json(
        { error: "尚未收藏该作品" },
        { status: 400 }
      );
    }

    // Delete favorite
    db.prepare(`
      DELETE FROM favorites WHERE user_id = ? AND project_id = ?
    `).run(userId, projectId);

    // Get updated favorite count
    const favoriteCountResult = db.prepare(`
      SELECT COUNT(*) as count FROM favorites WHERE project_id = ?
    `).get(projectId) as { count: number };

    return NextResponse.json({
      message: "取消收藏成功",
      favoriteCount: favoriteCountResult.count,
      isFavorited: false,
    });
  } catch (error) {
    console.error("Unfavorite error:", error);
    return NextResponse.json(
      { error: "取消收藏失败" },
      { status: 500 }
    );
  }
}
