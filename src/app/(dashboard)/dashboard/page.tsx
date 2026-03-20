import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Mock project data - will be replaced with database queries
const mockProjects = [
  {
    id: '1',
    title: '我的第一个漫剧',
    description: '测试项目',
    status: 'completed',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: '漫画章节1',
    description: '正在生成中',
    status: 'processing',
    createdAt: new Date('2024-01-20'),
  },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">我的作品</h1>
          <p className="text-gray-600 mt-1">管理您的漫剧项目</p>
        </div>
        <Link href="/dashboard/new">
          <Button>创建新作品</Button>
        </Link>
      </div>

      {mockProjects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-500 mb-4">还没有任何作品</p>
            <Link href="/dashboard/new">
              <Button>创建您的第一个漫剧</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockProjects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{project.title}</CardTitle>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        project.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : project.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {project.status === 'completed'
                        ? '已完成'
                        : project.status === 'processing'
                        ? '生成中'
                        : '草稿'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {project.createdAt.toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
