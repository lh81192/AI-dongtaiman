"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Episode } from "@/stores/episode-store";

const statusColors: Record<string, { dot: string; text: string; bg: string }> = {
  draft: {
    dot: "bg-gray-400",
    text: "text-gray-600",
    bg: "bg-gray-50",
  },
  processing: {
    dot: "bg-amber-400 animate-status-pulse",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
  completed: {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
  },
};

interface EpisodeCardProps {
  episode: Episode;
  projectId: string;
  onEdit: (episode: Episode) => void;
  onDelete: (episode: Episode) => void;
}

export function EpisodeCard({
  episode,
  projectId,
  onEdit,
  onDelete,
}: EpisodeCardProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const te = useTranslations("episode");
  const tc = useTranslations("common");
  const colors = statusColors[episode.status] || statusColors.draft;

  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-[--border-subtle] bg-white p-4 transition-all duration-200 hover:border-[--border-hover] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      {/* Drag handle */}
      <div className="flex-shrink-0 cursor-grab text-[--text-muted] opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Sequence number */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 font-display text-sm font-semibold text-primary">
        {episode.sequence}
      </div>

      {/* Title + status (links to script page) */}
      <Link
        href={`/${locale}/project/${projectId}/episodes/${episode.id}/script`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <h3 className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-[--text-primary]">
          {episode.title}
        </h3>
        <span
          className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
          {t(
            `projectStatus.${episode.status}` as
              | "projectStatus.draft"
              | "projectStatus.processing"
              | "projectStatus.completed"
          )}
        </span>
      </Link>

      {/* Actions menu */}
      <div className="relative flex-shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-[--text-muted] opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.preventDefault();
            // Toggle a simple dropdown using details/summary pattern
            const menu = (e.currentTarget as HTMLElement).nextElementSibling;
            menu?.classList.toggle("hidden");
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        <div className="absolute right-0 top-full z-10 mt-1 hidden min-w-[140px] rounded-xl border border-[--border-subtle] bg-white py-1 shadow-lg">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[--text-secondary] transition-colors hover:bg-[--surface] hover:text-[--text-primary]"
            onClick={() => onEdit(episode)}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>{te("edit")}</span>
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50"
            onClick={() => onDelete(episode)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{tc("delete")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
