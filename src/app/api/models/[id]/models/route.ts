import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - 从供应商 API 获取模型列表
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;

    // 获取用户配置
    const config = db.prepare(
      'SELECT * FROM user_model_configs WHERE id = ? AND user_id = ?'
    ).get(id) as any;

    if (!config) {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 });
    }

    const apiUrl = config.api_url;
    const apiKey = config.api_key;

    if (!apiUrl) {
      return NextResponse.json({ error: '未配置 API 地址' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: '未配置 API 密钥' }, { status: 400 });
    }

    // 根据协议类型构建请求
    let endpoint = '';
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.protocol === 'gemini' || config.protocol === 'google') {
      // Gemini 协议
      endpoint = `${apiUrl}/models?key=${apiKey}`;
      headers = {};
    } else {
      // OpenAI / 国产兼容协议
      endpoint = `${apiUrl}/models`;
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `获取模型列表失败: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 统一解析模型列表
    let models: { id: string; name?: string }[] = [];

    if (config.protocol === 'gemini' || config.protocol === 'google') {
      // Gemini 格式
      models = (data.models || []).map((m: any) => ({
        id: m.name?.replace('models/', '') || m.name,
        name: m.displayName || m.name,
      }));
    } else {
      // OpenAI 兼容格式
      models = (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
      }));
    }

    // 更新配置的 model_ids
    db.prepare(`
      UPDATE user_model_configs
      SET model_ids = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(models.map(m => m.id)), id);

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Fetch models error:', error);
    return NextResponse.json({ error: '获取模型列表失败' }, { status: 500 });
  }
}
