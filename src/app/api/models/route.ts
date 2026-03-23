import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { getProviderById, type ProviderType } from '@/lib/model-providers';

// GET - 获取用户的所有模型配置
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ProviderType | null;

    let query = 'SELECT * FROM user_model_configs WHERE user_id = ?';
    const params: string[] = [session.user.id];

    if (type) {
      query += ' AND provider_type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const configs = db.prepare(query).all(...params) as any[];

    // 解析 model_ids JSON
    const parsedConfigs = configs.map(config => ({
      ...config,
      model_ids: config.model_ids ? JSON.parse(config.model_ids) : [],
    }));

    return NextResponse.json({ configs: parsedConfigs });
  } catch (error) {
    console.error('Get model configs error:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

// POST - 创建新的模型配置
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const {
      provider_id,
      provider_type,
      protocol,
      name,
      api_url,
      api_key,
      enabled = true,
      is_default = false,
      model_ids = [],
    } = body;

    // 验证必填字段
    if (!provider_id || !provider_type || !protocol || !name) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 验证 provider_id 是否有效
    const provider = getProviderById(provider_id);
    if (!provider) {
      return NextResponse.json({ error: '不支持的供应商' }, { status: 400 });
    }

    // 如果设置为默认，先取消其他默认
    if (is_default) {
      db.prepare(`
        UPDATE user_model_configs
        SET is_default = 0, updated_at = datetime('now')
        WHERE user_id = ? AND provider_type = ?
      `).run(session.user.id, provider_type);
    }

    const id = generateId();
    db.prepare(`
      INSERT INTO user_model_configs
      (id, user_id, provider_id, provider_type, protocol, name, api_url, api_key, enabled, is_default, model_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      id,
      session.user.id,
      provider_id,
      provider_type,
      protocol,
      name,
      api_url || null,
      api_key || null,
      enabled ? 1 : 0,
      is_default ? 1 : 0,
      JSON.stringify(model_ids)
    );

    const config = db.prepare('SELECT * FROM user_model_configs WHERE id = ?').get(id) as any;

    return NextResponse.json({
      config: {
        ...config,
        model_ids: config.model_ids ? JSON.parse(config.model_ids) : [],
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Create model config error:', error);
    return NextResponse.json({ error: '创建配置失败' }, { status: 500 });
  }
}
