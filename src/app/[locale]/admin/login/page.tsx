import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Shield, AlertCircle } from "lucide-react";
import { AdminLoginForm } from "@/components/admin-login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoIcon } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasAdminSession, isAdminAuthConfigured } from "@/lib/admin/session";

export default async function AdminLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ disabled?: string }>;
}) {
  const { locale } = await params;
  const { disabled } = await searchParams;
  const t = await getTranslations("admin");

  if (isAdminAuthConfigured() && (await hasAdminSession())) {
    redirect(`/${locale}/admin`);
  }

  const isDisabled = disabled === "1" || !isAdminAuthConfigured();

  return (
    <div className="relative min-h-screen bg-[--background] text-[--foreground]">
      {/* Background gradient mesh */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--primary)/8,transparent_60%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[--border-subtle] bg-[--background]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <Link href={`/${locale}`} className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[--primary] text-[--primary-foreground] shadow-lg shadow-[--primary]/20 transition-transform duration-200 group-hover:scale-105">
              <LogoIcon size={18} />
            </div>
            <span className="font-display text-base font-semibold text-[--foreground]">{t("brand")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-12 px-4 py-12 lg:px-8 lg:py-16">
        {/* Left side - Branding */}
        <div className="hidden flex-1 space-y-6 lg:block animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-[--primary]/20 bg-[--primary]/8 px-4 py-1.5 text-sm font-medium text-[--primary]">
            <Shield className="h-4 w-4" />
            {t("eyebrow")}
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-[--foreground] lg:text-5xl leading-tight">
            {t("title")}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-[--text-secondary]">
            {t("description")}
          </p>

          {/* Decorative shield */}
          <div className="relative mt-8 h-64 w-full overflow-hidden rounded-3xl">
            <div className="absolute inset-0 rounded-3xl border border-[--border-subtle] bg-[--card]/50 backdrop-blur-sm" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Shield className="h-32 w-32 text-[--primary]/20" strokeWidth={1} />
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <Card className="w-full max-w-md border-[--border-subtle] bg-[--card]/90 shadow-2xl shadow-black/5 backdrop-blur-sm animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-[--foreground]">{t("login")}</CardTitle>
            <CardDescription classNameName="text-[--text-secondary]">
              {isDisabled ? t("disabledDescription") : t("loginCardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDisabled ? (
              <div className="rounded-xl border border-[--warning]/30 bg-[--warning]/10 px-4 py-3 text-sm text-[--warning]">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  {t("disabledTitle")}
                </div>
                <p className="text-[--text-secondary]">{t("disabledHint")}</p>
              </div>
            ) : (
              <AdminLoginForm />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
