import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - 获取单个模型配置
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;

    const config = db.prepare(
      'SELECT * FROM user_model_configs WHERE id = ? AND user_id = ?'
    ).get(id) as any;

    if (!config) {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 });
    }

    return NextResponse.json({
      config: {
        ...config,
        model_ids: config.model_ids ? JSON.parse(config.model_ids) : [],
      }
    });
  } catch (error) {
    console.error('Get model config error:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

// PUT - 更新模型配置
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // 检查配置是否存在且属于当前用户
    const existing = db.prepare(
      'SELECT * FROM user_model_configs WHERE id = ? AND user_id = ?'
    ).get(id) as any;

    if (!existing) {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 });
    }

    const {
      name,
      api_url,
      api_key,
      enabled,
      is_default,
      model_ids,
    } = body;

    // 如果设置为默认，先取消其他默认
    if (is_default && !existing.is_default) {
      db.prepare(`
        UPDATE user_model_configs
        SET is_default = 0, updated_at = datetime('now')
        WHERE user_id = ? AND provider_type = ?
      `).run(session.user.id, existing.provider_type);
    }

    db.prepare(`
      UPDATE user_model_configs
      SET name = ?,
          api_url = ?,
          api_key = COALESCE(?, api_key),
          enabled = ?,
          is_default = ?,
          model_ids = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? existing.name,
      api_url ?? existing.api_url,
      api_key ?? null,
      enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled,
      is_default !== undefined ? (is_default ? 1 : 0) : existing.is_default,
      model_ids !== undefined ? JSON.stringify(model_ids) : existing.model_ids,
      id
    );

    const config = db.prepare('SELECT * FROM user_model_configs WHERE id = ?').get(id) as any;

    return NextResponse.json({
      config: {
        ...config,
        model_ids: config.model_ids ? JSON.parse(config.model_ids) : [],
      }
    });
  } catch (error) {
    console.error('Update model config error:', error);
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 });
  }
}

// DELETE - 删除模型配置
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;

    const result = db.prepare(
      'DELETE FROM user_model_configs WHERE id = ? AND user_id = ?'
    ).run(id, session.user.id);

    if (result.changes === 0) {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 });
    }

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete model config error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
