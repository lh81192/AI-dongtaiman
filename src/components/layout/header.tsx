'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-soft group-hover:shadow-soft-lg transition-shadow">
                <span className="text-xl">🎬</span>
              </div>
              <span className="text-lg font-heading font-bold text-gradient hidden sm:block">
                AI 漫剧
              </span>
            </Link>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1 ml-8">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
              >
                工作台
              </Link>
              <Link
                href="/dashboard/settings"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
              >
                模型配置
              </Link>
              <Link
                href="/gallery"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
              >
                作品广场
              </Link>
            </nav>
          </div>

          {/* Auth */}
          <div className="flex items-center gap-3">
            {status === 'loading' ? (
              <span className="text-sm text-muted-foreground">加载中...</span>
            ) : session ? (
              <>
                <div className="hidden sm:flex items-center gap-2 mr-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold">
                    {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {session.user?.name || session.user?.email}
                  </span>
                </div>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    控制台
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="border-gray-300 hover:border-primary hover:text-primary"
                >
                  退出
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    登录
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="btn-primary">
                    注册
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
