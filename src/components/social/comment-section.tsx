"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface Comment {
  id: string;
  user_id: string;
  project_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  nickname: string | null;
  avatar: string | null;
  reply_count: number;
  replies: Comment[];
  isOwner: boolean;
}

interface CommentSectionProps {
  projectId: string;
}

export function CommentSection({ projectId }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const limit = 10;

  useEffect(() => {
    fetchComments();
  }, [projectId, page]);

  const fetchComments = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const userId = session?.user?.id;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (userId) {
        params.append("userId", userId);
      }

      const response = await fetch(
        `/api/projects/${projectId}/comments?${params}`
      );

      if (response.ok) {
        const data = await response.json();
        if (page === 1) {
          setComments(data.comments);
        } else {
          setComments((prev) => [...prev, ...data.comments]);
        }
        setTotalCount(data.totalCount);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      alert("请先登录");
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments((prev) => [data.comment, ...prev]);
        setTotalCount((prev) => prev + 1);
        setNewComment("");
      } else {
        const error = await response.json();
        alert(error.error || "评论失败");
      }
    } catch (error) {
      console.error("Failed to submit comment:", error);
      alert("评论失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!session) {
      alert("请先登录");
      return;
    }

    if (!replyContent.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: replyContent.trim(),
          parentId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments((prev) =>
          prev.map((comment) => {
            if (comment.id === parentId) {
              return {
                ...comment,
                replies: [...comment.replies, data.comment],
                reply_count: comment.reply_count + 1,
              };
            }
            return comment;
          })
        );
        setReplyContent("");
        setReplyingTo(null);
      } else {
        const error = await response.json();
        alert(error.error || "回复失败");
      }
    } catch (error) {
      console.error("Failed to submit reply:", error);
      alert("回复失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && comments.length < totalCount) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Comment Form */}
      <div className="border-b pb-6">
        <h3 className="text-lg font-semibold mb-4">
          评论 ({totalCount})
        </h3>
        <form onSubmit={handleSubmitComment}>
          <textarea
            className="w-full p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
            placeholder={session ? "发表你的评论..." : "请先登录后评论"}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={!session || submitting}
          />
          <div className="flex justify-end mt-2">
            <Button
              type="submit"
              disabled={!session || !newComment.trim() || submitting}
            >
              {submitting ? "提交中..." : "发表评论"}
            </Button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-3">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {comment.avatar ? (
                  <img
                    src={comment.avatar}
                    alt={comment.nickname || "用户"}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-primary font-semibold">
                    {(comment.nickname || "用户").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {comment.nickname || "匿名用户"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
                <div className="flex gap-4 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    disabled={!session}
                    className="text-muted-foreground h-auto p-0"
                  >
                    回复
                  </Button>
                  {comment.reply_count > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Toggle replies visibility
                        setComments((prev) =>
                          prev.map((c) => {
                            if (c.id === comment.id) {
                              return {
                                ...c,
                                // Toggle by filtering - if all visible, hide. Otherwise show all
                                replies: c.replies.length > 0 ? [] : c.replies,
                              };
                            }
                            return c;
                          })
                        );
                      }}
                      className="text-muted-foreground h-auto p-0"
                    >
                      {comment.reply_count} 条回复
                    </Button>
                  )}
                </div>

                {/* Reply Form */}
                {replyingTo === comment.id && (
                  <div className="mt-3 ml-4">
                    <textarea
                      className="w-full p-2 border rounded-md resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={2}
                      placeholder="写下你的回复..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      disabled={submitting}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent("");
                        }}
                      >
                        取消
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={!replyContent.trim() || submitting}
                      >
                        {submitting ? "提交中..." : "回复"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 ml-4 space-y-3 border-l-2 border-primary/20 pl-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {reply.avatar ? (
                            <img
                              src={reply.avatar}
                              alt={reply.nickname || "用户"}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-primary text-sm font-semibold">
                              {(reply.nickname || "用户").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {reply.nickname || "匿名用户"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(reply.created_at)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm whitespace-pre-wrap break-words">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {comments.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            暂无评论，快来抢沙发吧！
          </div>
        )}

        {isLoading && (
          <div className="text-center py-4 text-muted-foreground">
            加载中...
          </div>
        )}

        {comments.length < totalCount && !isLoading && (
          <div className="text-center">
            <Button variant="outline" onClick={loadMore}>
              加载更多评论
            </Button>
          </div>
        )}
      </div>

      <div ref={commentsEndRef} />
    </div>
  );
}
