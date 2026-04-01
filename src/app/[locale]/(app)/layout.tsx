import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Settings } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { LogoIcon } from "@/components/logo";
import { requireUser } from "@/lib/auth/require-user";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("common");
  await requireUser(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-[--border-subtle] bg-[--background]/80 px-4 backdrop-blur-xl lg:px-6">
        <Link href={`/${locale}/app`} className="flex items-center gap-2 group">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[--primary]/10 text-[--primary]">
            <LogoIcon size={14} />
          </div>
          <span className="font-display text-sm font-semibold text-[--text-primary]">{t("appName")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href={`/${locale}/settings`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[--border-subtle] bg-[--surface] text-[--text-muted] transition-all duration-200 hover:border-[--border-hover] hover:bg-[--surface-hover] hover:text-[--text-primary]"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 bg-[--background] p-6 lg:p-8">{children}</main>
    </div>
  );
}
