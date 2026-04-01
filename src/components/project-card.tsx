"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock, Sparkles, CircleCheck, FileText, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface ProjectCardProps {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

const statusConfig: Record<string, { dot: string; text: string; bg: string }> = {
  draft: {
    dot: "bg-[--text-muted]",
    text: "text-[--text-secondary]",
    bg: "bg-[--muted]",
  },
  processing: {
    dot: "bg-[--warning] animate-status-pulse",
    text: "text-[--warning]",
    bg: "bg-[--warning]/10",
  },
  completed: {
    dot: "bg-[--success]",
    text: "text-[--success]",
    bg: "bg-[--success]/10",
  },
};

export function ProjectCard({ id, title, status, createdAt }: ProjectCardProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const config = statusConfig[status] || statusConfig.draft;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteOpen(false);
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Link href={`/${locale}/project/${id}/episodes`} className="group block">
        <div className="relative flex flex-col rounded-2xl border border-[--border-subtle] bg-[--card] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[--border-hover] hover:shadow-xl hover:shadow-black/5">
          {/* Delete button — top right */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDeleteOpen(true);
            }}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-[--text-muted] opacity-0 transition-all duration-200 hover:bg-[--destructive]/10 hover:text-[--destructive] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ring] group-hover:opacity-100"
            title={tc("delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {/* Icon + Title */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[--primary]/10 text-[--primary] transition-all duration-200 group-hover:bg-[--primary] group-hover:text-[--primary-foreground] group-hover:shadow-lg group-hover:shadow-[--primary]/20">
              {status === "completed" ? (
                <CircleCheck className="h-5 w-5" />
              ) : status === "processing" ? (
                <Sparkles className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <h3 className="font-display text-sm font-semibold leading-snug text-[--foreground] truncate">
                {title}
              </h3>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[--text-muted]">
                <Clock className="h-3.5 w-3.5" />
                <span>{new Date(createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Footer: status + arrow */}
          <div className="mt-4 flex items-center justify-between border-t border-[--border-subtle] pt-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
              {t(`projectStatus.${status}` as "projectStatus.draft" | "projectStatus.processing" | "projectStatus.completed")}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[--surface] text-[--text-muted] transition-all duration-200 group-hover:bg-[--primary] group-hover:text-[--primary-foreground]">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </Link>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[--card] border-[--border-subtle]">
          <DialogHeader>
            <DialogTitle className="text-[--foreground]">{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription className="text-[--text-secondary]">
              {t("deleteConfirmDesc", { title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{tc("cancel")}</DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? tc("loading") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
