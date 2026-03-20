import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-20 px-4">
        <div className="text-center max-w-3xl space-y-6">
          <h1 className="text-5xl font-bold">AI 漫剧生成平台</h1>
          <p className="text-xl text-gray-600">
            将静态漫画转化为动态漫剧，释放您的创意潜能
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/register">
              <Button size="lg">立即开始</Button>
            </Link>
            <Link href="/gallery">
              <Button variant="outline" size="lg">
                浏览作品
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">功能特点</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>AI 智能生成</CardTitle>
                <CardDescription>先进的 AI 技术</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  采用先进的 AI 算法，自动将静态漫画转换为动态漫剧，
                  保留原作风格的同时添加动态效果。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>多种风格</CardTitle>
                <CardDescription>丰富的视觉效果</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  支持多种漫剧风格选择，满足不同类型漫画的转换需求，
                  无论是少年漫、少女漫还是其他风格。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>一键分享</CardTitle>
                <CardDescription>便捷的社交分享</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  生成完成后可一键分享到作品广场，
                  让更多人欣赏您的创意作品。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
