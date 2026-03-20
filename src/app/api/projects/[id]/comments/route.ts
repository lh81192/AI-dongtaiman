import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateId } from "@/lib/utils";
import { escapeHtml } from "@/lib/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get comments for a project
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

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

    // Get current user from session (for owner check)
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    // Get total comment count
    const totalCountResult = db.prepare(`
      SELECT COUNT(*) as count FROM comments WHERE project_id = ? AND parent_id IS NULL
    `).get(projectId) as { count: number };

    const totalCount = totalCountResult.count;

    // Get comments with user info
    const comments = db.prepare(`
      SELECT
        c.id,
        c.user_id,
        c.project_id,
        c.parent_id,
        c.content,
        c.created_at,
        c.updated_at,
        u.nickname,
        u.avatar,
        (SELECT COUNT(*) FROM comments rc WHERE rc.parent_id = c.id) as reply_count
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.project_id = ? AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(projectId, limit, offset) as {
      id: string;
      user_id: string;
      project_id: string;
      parent_id: string | null;
      content: string;
      created_at: string;
      updated_at: string;
      nickname: string | null;
      avatar: string | null;
      reply_count: number;
    }[];

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = db.prepare(`
          SELECT
            c.id,
            c.user_id,
            c.project_id,
            c.parent_id,
            c.content,
            c.created_at,
            c.updated_at,
            u.nickname,
            u.avatar
          FROM comments c
          LEFT JOIN users u ON c.user_id = u.id
          WHERE c.parent_id = ?
          ORDER BY c.created_at ASC
        `).all(comment.id) as {
          id: string;
          user_id: string;
          project_id: string;
          parent_id: string | null;
          content: string;
          created_at: string;
          updated_at: string;
          nickname: string | null;
          avatar: string | null;
        }[];

        // Sanitize content to prevent XSS
        const sanitizedComment = {
          ...comment,
          content: escapeHtml(comment.content),
          nickname: comment.nickname ? escapeHtml(comment.nickname) : null,
          replies: replies.map(reply => ({
            ...reply,
            content: escapeHtml(reply.content),
            nickname: reply.nickname ? escapeHtml(reply.nickname) : null,
          })),
          isOwner: currentUserId === comment.user_id,
        };

        return sanitizedComment;
      })
    );

    return NextResponse.json({
      comments: commentsWithReplies,
      totalCount,
      page,
      limit,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: "获取评论失败" },
      { status: 500 }
    );
  }
}

// POST - Create a comment or reply
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

    const body = await request.json();
    const { content, parentId } = body;

    // Validate content
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "请输入评论内容" },
        { status: 400 }
      );
    }

    if (content.trim().length > 1000) {
      return NextResponse.json(
        { error: "评论内容不能超过 1000 字符" },
        { status: 400 }
      );
    }

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

    // If replying, check if parent comment exists
    if (parentId) {
      const parentComment = db.prepare(`
        SELECT id FROM comments WHERE id = ? AND project_id = ?
      `).get(parentId, projectId);

      if (!parentComment) {
        return NextResponse.json(
          { error: "父评论不存在" },
          { status: 404 }
        );
      }
    }

    // Create comment
    const commentId = generateId();
    db.prepare(`
      INSERT INTO comments (id, user_id, project_id, parent_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(commentId, userId, projectId, parentId || null, content.trim());

    // Get the created comment with user info
    const newComment = db.prepare(`
      SELECT
        c.id,
        c.user_id,
        c.project_id,
        c.parent_id,
        c.content,
        c.created_at,
        c.updated_at,
        u.nickname,
        u.avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(commentId) as {
      id: string;
      user_id: string;
      project_id: string;
      parent_id: string | null;
      content: string;
      created_at: string;
      updated_at: string;
      nickname: string | null;
      avatar: string | null;
    };

    return NextResponse.json({
      message: parentId ? "回复成功" : "评论成功",
      comment: {
        ...newComment,
        content: escapeHtml(newComment.content),
        nickname: newComment.nickname ? escapeHtml(newComment.nickname) : null,
        replies: [],
        reply_count: 0,
        isOwner: true,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: "评论失败" },
      { status: 500 }
    );
  }
}
