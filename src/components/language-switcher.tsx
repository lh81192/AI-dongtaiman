"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Globe, Check, ChevronDown } from "lucide-react";

const localeLabels: Record<string, string> = {
  zh: "中文",
  en: "EN",
  ja: "日本語",
  ko: "한국어",
};

const localeFullLabels: Record<string, string> = {
  zh: "中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  const locales = routing.locales;

  const switchLocale = useCallback(
    (newLocale: string) => {
      const segments = pathname.split("/");
      segments[1] = newLocale;
      router.replace(segments.join("/"));
      setOpen(false);
      setFocusedIndex(-1);
    },
    [pathname, router]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setOpen(true);
          setFocusedIndex(locales.indexOf(locale));
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < locales.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : locales.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0) {
            switchLocale(locales[focusedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [open, focusedIndex, locale, locales, switchLocale]
  );

  return (
    <div className="relative" ref={ref} onKeyDown={handleKeyDown}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Language: ${localeFullLabels[locale]}. Press Enter to change.`}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-[--border-subtle] bg-[--surface] px-2.5 text-sm font-medium text-[--text-secondary] transition-all duration-200 hover:border-[--border-hover] hover:bg-[--surface-hover] hover:text-[--text-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--ring] cursor-pointer"
      >
        <Globe className="h-4 w-4" strokeWidth={1.8} />
        <span>{localeLabels[locale]}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[140px] overflow-hidden rounded-xl border border-[--border-subtle] bg-[--card] p-1 shadow-lg shadow-black/5 animate-fade-in"
        >
          {locales.map((loc, index) => (
            <button
              key={loc}
              role="option"
              aria-selected={loc === locale}
              tabIndex={focusedIndex === index ? 0 : -1}
              onClick={() => switchLocale(loc)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 cursor-pointer ${
                loc === locale
                  ? "bg-[--primary]/10 text-[--primary] font-semibold"
                  : "text-[--text-secondary] hover:bg-[--surface-hover] hover:text-[--text-primary]"
              }`}
            >
              <span>{localeFullLabels[loc]}</span>
              {loc === locale && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
