import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function GalleryPage() {
  // Mock gallery data - will be replaced with database queries
  const publicProjects = [
    {
      id: '1',
      title: '示例作品 1',
      author: '用户 A',
      description: '这是一个示例作品',
      likes: 42,
      views: 156,
    },
    {
      id: '2',
      title: '示例作品 2',
      author: '用户 B',
      description: '另一个示例作品',
      likes: 28,
      views: 89,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">作品广场</h1>
        <p className="text-gray-600 mt-1">发现来自社区的精彩漫剧作品</p>
      </div>

      {publicProjects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-500">还没有公开作品</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {publicProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">{project.title}</CardTitle>
                <CardDescription>作者: {project.author}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{project.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>❤️ {project.likes}</span>
                  <span>👁 {project.views}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
