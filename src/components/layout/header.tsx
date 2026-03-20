'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold">
            AI 漫剧生成平台
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm hover:text-primary">
              工作台
            </Link>
            <Link href="/gallery" className="text-sm hover:text-primary">
              作品广场
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {status === 'loading' ? (
            <span className="text-sm text-gray-500">加载中...</span>
          ) : session ? (
            <>
              <span className="text-sm text-gray-600">
                欢迎, {session.user?.name || session.user?.email}
              </span>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  控制台
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                退出登录
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  登录
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">注册</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
