import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoIcon } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("auth");
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(`/${locale}/app`);
  }

  return (
    <div className="relative min-h-screen bg-[--background] text-[--foreground]">
      {/* Background gradient mesh */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,var(--primary)/10,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,var(--accent)/8,transparent_40%)]" />
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
          <p className="text-sm font-semibold uppercase tracking-wider text-[--primary]">{t("loginEyebrow")}</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-[--foreground] lg:text-5xl leading-tight">
            {t("loginTitle")}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-[--text-secondary]">
            {t("loginDescription")}
          </p>

          {/* Decorative elements */}
          <div className="relative mt-8 h-64 w-full overflow-hidden rounded-3xl">
            <div className="absolute inset-0 rounded-3xl border border-[--border-subtle] bg-[--card]/50 backdrop-blur-sm" />
            <div className="absolute right-8 top-8 h-32 w-32 rounded-2xl bg-[--primary]/10 blur-2xl" />
            <div className="absolute bottom-8 left-8 h-24 w-24 rounded-full bg-[--accent]/10 blur-xl" />
          </div>
        </div>

        {/* Right side - Form */}
        <Card className="w-full max-w-md border-[--border-subtle] bg-[--card]/90 shadow-2xl shadow-black/5 backdrop-blur-sm animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-[--foreground]">{t("login")}</CardTitle>
            <CardDescription className="text-[--text-secondary]">{t("loginCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm mode="login" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
