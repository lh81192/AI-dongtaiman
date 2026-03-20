"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

interface LikeButtonProps {
  projectId: string;
  initialLiked?: boolean;
  initialCount?: number;
  onStateChange?: (liked: boolean, count: number) => void;
}

export function LikeButton({
  projectId,
  initialLiked = false,
  initialCount = 0,
  onStateChange,
}: LikeButtonProps) {
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch initial like status when component mounts
    const fetchLikeStatus = async () => {
      try {
        const userId = session?.user?.id;
        const params = userId ? `?userId=${userId}` : "";
        const response = await fetch(`/api/projects/${projectId}/like${params}`);
        if (response.ok) {
          const data = await response.json();
          setIsLiked(data.isLiked);
          setLikeCount(data.likeCount);
        }
      } catch (error) {
        console.error("Failed to fetch like status:", error);
      }
    };

    fetchLikeStatus();
  }, [projectId, session?.user?.id]);

  const handleLike = async () => {
    if (!session) {
      alert("请先登录");
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      const method = isLiked ? "DELETE" : "POST";
      const response = await fetch(`/api/projects/${projectId}/like`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.isLiked);
        setLikeCount(data.likeCount);
        onStateChange?.(data.isLiked, data.likeCount);
      } else {
        const error = await response.json();
        alert(error.error || "操作失败");
      }
    } catch (error) {
      console.error("Like action failed:", error);
      alert("操作失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLike}
      disabled={isLoading}
      className={`gap-2 ${isLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground"}`}
    >
      <Heart
        className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}
      />
      <span>{likeCount}</span>
    </Button>
  );
}
