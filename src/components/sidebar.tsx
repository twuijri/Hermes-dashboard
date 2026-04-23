"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Settings,
  KeyRound,
  MessagesSquare,
  ScrollText,
  BarChart3,
  Timer,
  Sparkles,
  Network,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/providers", label: "البروفايدرز", icon: Network },
  { href: "/config", label: "الإعدادات", icon: Settings },
  { href: "/keys", label: "مفاتيح API", icon: KeyRound },
  { href: "/sessions", label: "الجلسات", icon: MessagesSquare },
  { href: "/logs", label: "السجلات", icon: ScrollText },
  { href: "/analytics", label: "التحليلات", icon: BarChart3 },
  { href: "/cron", label: "المهام المجدولة", icon: Timer },
  { href: "/skills", label: "المهارات", icon: Sparkles },
];

export function Sidebar({ username }: { username?: string | null }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 right-0 w-64 glass border-l border-[var(--color-border)] flex flex-col">
      <div className="px-5 py-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/20">
            <ShieldCheck className="size-4.5 text-[var(--color-accent-fg)]" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight leading-tight">Hermes</div>
            <div className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">Control Panel</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition group",
                active
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-fg-strong)] border border-[var(--color-accent)]/30"
                  : "text-[var(--color-muted-strong)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg)] border border-transparent"
              )}
            >
              <Icon className={cn("size-4 shrink-0", active && "text-[var(--color-accent)]")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{username ?? "admin"}</div>
            <div className="text-[10px] text-[var(--color-muted)]">متصل</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 rounded-md hover:bg-[var(--color-surface-hover)] text-[var(--color-muted)] hover:text-[var(--color-danger)] transition"
            title="تسجيل الخروج"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
