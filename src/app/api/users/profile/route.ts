import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Get current user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const user = db.prepare(`
      SELECT
        id,
        email,
        nickname,
        avatar,
        role,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
    `).get(session.user.id) as {
      id: string;
      email: string;
      nickname: string | null;
      avatar: string | null;
      role: string;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // Get user stats
    const stats = {
      projectCount: db.prepare(`
        SELECT COUNT(*) as count FROM projects WHERE user_id = ?
      `).get(session.user.id) as { count: number },
      likesCount: db.prepare(`
        SELECT COUNT(*) as count FROM likes WHERE user_id = ?
      `).get(session.user.id) as { count: number },
      favoritesCount: db.prepare(`
        SELECT COUNT(*) as count FROM favorites WHERE user_id = ?
      `).get(session.user.id) as { count: number },
    };

    return NextResponse.json({
      user: {
        ...user,
        stats: {
          projects: stats.projectCount.count,
          likes: stats.likesCount.count,
          favorites: stats.favoritesCount.count,
        },
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "获取用户资料失败" },
      { status: 500 }
    );
  }
}

// PUT - Update current user profile
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nickname, avatar } = body;

    // Check if nickname is already taken by another user
    if (nickname) {
      const existingUser = db.prepare(`
        SELECT id FROM users WHERE nickname = ? AND id != ?
      `).get(nickname, session.user.id) as { id: string } | undefined;

      if (existingUser) {
        return NextResponse.json(
          { error: "该昵称已被使用" },
          { status: 400 }
        );
      }
    }

    // Update user profile
    db.prepare(`
      UPDATE users
      SET nickname = COALESCE(?, nickname),
          avatar = COALESCE(?, avatar),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(nickname || null, avatar || null, session.user.id);

    // Get updated user
    const updatedUser = db.prepare(`
      SELECT
        id,
        email,
        nickname,
        avatar,
        role,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
    `).get(session.user.id) as {
      id: string;
      email: string;
      nickname: string | null;
      avatar: string | null;
      role: string;
      created_at: string;
      updated_at: string;
    };

    return NextResponse.json({
      message: "资料更新成功",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "更新用户资料失败" },
      { status: 500 }
    );
  }
}
