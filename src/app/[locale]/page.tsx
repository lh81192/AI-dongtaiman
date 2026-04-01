import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, CheckCircle2, Clapperboard, ImageIcon, Languages, Sparkles, Video } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoIcon } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";

const featureIcons = [Sparkles, Languages, ImageIcon, Video];
const stepIcons = [Clapperboard, ImageIcon, Video];

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("landing");
  const currentUser = await getCurrentUser();

  const features = [0, 1, 2, 3].map((index) => ({
    title: t(`features.items.${index}.title`),
    description: t(`features.items.${index}.description`),
    Icon: featureIcons[index],
  }));

  const steps = [0, 1, 2].map((index) => ({
    title: t(`workflow.items.${index}.title`),
    description: t(`workflow.items.${index}.description`),
    Icon: stepIcons[index],
  }));

  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      {/* Subtle gradient mesh background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--primary)/8,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,var(--accent)/6,transparent_40%)]" />
      </div>

      {/* Header with glass effect */}
      <header className="sticky top-0 z-30 border-b border-[--border-subtle] bg-[--background]/70 backdrop-blur-xl">
        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <Link href={`/${locale}`} className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--primary] text-[--primary-foreground] shadow-lg shadow-[--primary]/20 transition-transform duration-200 group-hover:scale-105">
              <LogoIcon size={20} />
            </div>
            <div>
              <div className="font-display text-base font-semibold text-[--foreground]">{t("brand")}</div>
              <div className="text-xs text-[--text-muted]">{t("tagline")}</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            {currentUser ? (
              <Link href={`/${locale}/app`}>
                <Button size="sm" className="shadow-md shadow-[--primary]/10">{t("openApp")}</Button>
              </Link>
            ) : (
              <>
                <Link href={`/${locale}/login`}>
                  <Button variant="ghost" size="sm">{t("login")}</Button>
                </Link>
                <Link href={`/${locale}/register`}>
                  <Button size="sm" className="shadow-md shadow-[--primary]/10">{t("register")}</Button>
                </Link>
              </>
            )}
            <Link href={`/${locale}/admin/login`}>
              <Button variant="ghost" size="sm" className="text-[--text-muted]">{t("admin")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-7xl flex-col gap-20 px-4 py-16 lg:px-8 lg:py-24">
        {/* Hero Section */}
        <section className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-8">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[--primary]/20 bg-[--primary]/8 px-4 py-1.5 text-sm font-medium text-[--primary] backdrop-blur-sm animate-fade-up">
              <Sparkles className="h-4 w-4" />
              {t("eyebrow")}
            </div>

            {/* Headline */}
            <div className="space-y-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <h1 className="font-display text-4xl font-bold tracking-tight text-[--foreground] sm:text-5xl lg:text-6xl leading-[1.1]">
                {t("hero.title")}
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-[--text-secondary]">
                {t("hero.description")}
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <Link href={`/${locale}/${currentUser ? "app" : "register"}`}>
                <Button size="lg" className="gap-2 shadow-lg shadow-[--primary]/15">
                  {currentUser ? t("openApp") : t("hero.primaryCta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/${locale}/login`}>
                <Button size="lg" variant="outline" className="gap-2">
                  {t("hero.secondaryCta")}
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-3 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-[--border-subtle] bg-[--card]/80 px-4 py-3.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-[--border-hover] hover:shadow-md"
                >
                  <div className="text-xl font-semibold text-[--foreground]">{t(`stats.items.${index}.value`)}</div>
                  <div className="text-sm text-[--text-secondary]">{t(`stats.items.${index}.label`)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Card */}
          <Card className="overflow-hidden border-[--border-subtle] bg-[--card]/90 shadow-2xl shadow-black/5 backdrop-blur-sm animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <CardHeader>
              <CardTitle className="text-[--foreground]">{t("preview.title")}</CardTitle>
              <CardDescription className="text-[--text-secondary]">{t("preview.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-[--border-subtle] bg-[--surface] p-4 transition-all duration-200 hover:border-[--border-hover] hover:bg-[--surface-hover]"
                >
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[--foreground]">
                    <CheckCircle2 className="h-4 w-4 text-[--primary]" />
                    {t(`preview.items.${index}.title`)}
                  </div>
                  <p className="text-sm leading-relaxed text-[--text-secondary]">
                    {t(`preview.items.${index}.description`)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Features Section */}
        <section className="space-y-10">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[--foreground] lg:text-4xl">
              {t("features.title")}
            </h2>
            <p className="text-lg text-[--text-secondary]">{t("features.description")}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map(({ title, description, Icon }) => (
              <Card
                key={title}
                className="border-[--border-subtle] bg-[--card]/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 hover:border-[--border-hover]"
              >
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[--primary]/10 text-[--primary] shadow-md shadow-[--primary]/10">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-[--foreground]">{title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-[--text-secondary] leading-relaxed">
                  {description}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Workflow Section */}
        <section className="space-y-10">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[--foreground] lg:text-4xl">
              {t("workflow.title")}
            </h2>
            <p className="text-lg text-[--text-secondary]">{t("workflow.description")}</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {steps.map(({ title, description, Icon }, index) => (
              <Card
                key={title}
                className="relative border-[--border-subtle] bg-[--card]/80 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 hover:border-[--border-hover]"
              >
                {/* Step number background */}
                <div className="absolute right-4 top-4 text-6xl font-bold text-[--primary]/5">
                  0{index + 1}
                </div>
                <CardHeader>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[--primary]/10 text-[--primary] shadow-md shadow-[--primary]/10">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <CardTitle className="text-[--foreground]">{title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-[--text-secondary] leading-relaxed">
                  {description}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden rounded-3xl border border-[--primary]/20 bg-[--card]/80 px-8 py-12 backdrop-blur-xl shadow-2xl shadow-[--primary]/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,var(--primary)/10,transparent_60%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[--foreground] lg:text-4xl">
                {t("cta.title")}
              </h2>
              <p className="text-lg text-[--text-secondary]">{t("cta.description")}</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href={`/${locale}/${currentUser ? "app" : "register"}`}>
                <Button size="lg" className="gap-2 shadow-lg shadow-[--primary]/15">
                  {currentUser ? t("openApp") : t("cta.primary")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/${locale}/login`}>
                <Button size="lg" variant="outline" className="gap-2">
                  {t("cta.secondary")}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[--border-subtle] pt-8 text-center text-sm text-[--text-muted]">
          <p>© 2026 SketchLive. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
