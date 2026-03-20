"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProfile {
  id: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  stats: {
    projects: number;
    likes: number;
    favorites: number;
  };
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    fetchProfile();
  }, [session, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/users/profile");
      const data = await res.json();

      if (res.ok) {
        setProfile(data.user);
        setNickname(data.user.nickname || "");
        setAvatar(data.user.avatar || "");
      } else {
        setError(data.error || "获取资料失败");
      }
    } catch {
      setError("获取资料失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: nickname.trim() || null,
          avatar: avatar.trim() || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("资料更新成功");
        setProfile(data.user);
        // Update session with new nickname/avatar
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            name: data.user.nickname || data.user.email,
            image: data.user.avatar,
          },
        });
      } else {
        setError(data.error || "更新资料失败");
      }
    } catch {
      setError("更新资料失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">个人资料</h1>
        <p className="text-gray-600 mt-1">管理您的账户信息</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>基本资料</CardTitle>
            <CardDescription>修改您的个人信息和头像</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">邮箱不可修改</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname">昵称</Label>
                <Input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="请输入昵称"
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">头像 URL</Label>
                <Input
                  id="avatar"
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
                {avatar && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">预览:</p>
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={avatar} />
                      <AvatarFallback>
                        {nickname?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "保存中..." : "保存修改"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>账户统计</CardTitle>
            <CardDescription>查看您的活动数据</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile?.nickname?.[0]?.toUpperCase() ||
                    profile?.email?.[0]?.toUpperCase() ||
                    "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">
                  {profile?.nickname || "未设置昵称"}
                </h3>
                <p className="text-sm text-gray-500">{profile?.role === 'admin' ? '管理员' : '普通用户'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {profile?.stats.projects || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">作品数</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {profile?.stats.likes || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">获赞数</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {profile?.stats.favorites || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">收藏数</div>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              <p>注册时间: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '-'}</p>
              <p>最后更新: {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('zh-CN') : '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
