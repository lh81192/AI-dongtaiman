import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { ProjectCard } from "@/components/project-card";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { Clapperboard, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");
  const user = await requireUser(locale);

  const allProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt));

  return (
    <div className="animate-page-in space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--primary]/10 text-[--primary] shadow-md shadow-[--primary]/10">
            <Clapperboard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-[--foreground]">
              {t("title")}
            </h2>
            {allProjects.length > 0 && (
              <p className="text-xs text-[--text-muted]">
                {allProjects.length} {allProjects.length === 1 ? "project" : "projects"}
              </p>
            )}
          </div>
        </div>
        <CreateProjectDialog />
      </div>

      {allProjects.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center rounded-3xl border border-[--border-subtle] bg-[--card]/50 py-20 px-6 overflow-hidden">
          {/* Decorative background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-96 h-96 bg-[--primary]/5 rounded-full blur-3xl" />
            <div className="absolute right-1/4 bottom-0 w-48 h-48 bg-[--accent]/5 rounded-full blur-2xl" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Animated icon */}
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[--primary]/15 to-[--accent]/10 shadow-xl shadow-[--primary]/10 animate-float">
              <Clapperboard className="h-9 w-9 text-[--primary]" />
            </div>

            <h3 className="mb-3 font-display text-xl font-semibold text-[--foreground]">
              {t("title")}
            </h3>

            <p className="mb-8 max-w-md text-[--text-secondary]">
              {t("noProjects")}
            </p>

            <div className="relative">
              <CreateProjectDialog />
              <div className="absolute -right-8 top-1/2 -translate-y-1/2">
                <Sparkles className="h-5 w-5 text-[--primary]/40 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {allProjects.map((project, index) => (
            <div
              key={project.id}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <ProjectCard
                id={project.id}
                title={project.title}
                status={project.status}
                createdAt={project.createdAt.toISOString()}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
