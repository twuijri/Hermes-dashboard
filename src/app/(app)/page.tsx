"use client";
import { useEffect, useState } from "react";
import { hermes } from "@/lib/hermes";
import {
  Activity,
  Cpu,
  MessagesSquare,
  Coins,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

type Status = {
  version?: string;
  gateway?: { running?: boolean; pid?: number | null };
  platforms?: Record<string, { connected?: boolean }>;
  active_sessions?: number;
  recent_sessions?: Array<{
    id?: string;
    title?: string;
    model?: string;
    message_count?: number;
    total_tokens?: number;
  }>;
};

export default function HomePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await hermes<Status>("api/status");
        if (!alive) return;
        setStatus(data);
        setError(null);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const gwRunning = !!status?.gateway?.running;
  const platformEntries = Object.entries(status?.platforms ?? {});
  const connectedPlatforms = platformEntries.filter(([, v]) => v?.connected).length;

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] mb-2">
          <Activity className="size-3.5" />
          <span>لوحة التحكم</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">نظرة عامة</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          حالة الوكيل الآن، والمنصات المتصلة، والجلسات الأخيرة
        </p>
      </header>

      {error && (
        <div className="glass rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-[var(--color-danger)] shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-[var(--color-danger)] mb-0.5">تعذّر الاتصال بـ Hermes</div>
            <div className="text-[var(--color-muted)] text-xs">{error}</div>
            <div className="text-[var(--color-muted)] text-xs mt-2">
              تأكد أن خدمة Hermes تعمل على{" "}
              <code className="px-1.5 py-0.5 rounded bg-[var(--color-surface)]">
                {process.env.NEXT_PUBLIC_HERMES_URL ?? "http://127.0.0.1:9119"}
              </code>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Cpu className="size-5" />}
          label="إصدار Hermes"
          value={loading ? "—" : status?.version ?? "غير معروف"}
        />
        <StatCard
          icon={gwRunning ? <CheckCircle2 className="size-5 text-[var(--color-success)]" /> : <XCircle className="size-5 text-[var(--color-danger)]" />}
          label="البوابة (Gateway)"
          value={loading ? "—" : gwRunning ? "تعمل" : "متوقفة"}
          hint={status?.gateway?.pid ? `PID ${status.gateway.pid}` : undefined}
        />
        <StatCard
          icon={<Activity className="size-5" />}
          label="منصات متصلة"
          value={loading ? "—" : `${connectedPlatforms}/${platformEntries.length || "—"}`}
        />
        <StatCard
          icon={<MessagesSquare className="size-5" />}
          label="جلسات نشطة"
          value={loading ? "—" : String(status?.active_sessions ?? 0)}
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">الجلسات الأخيرة</h2>
          <span className="text-xs text-[var(--color-muted)]">تحديث كل ٥ ثواني</span>
        </div>
        <div className="glass rounded-xl border border-[var(--color-border)] overflow-hidden">
          {loading && !status ? (
            <div className="p-10 flex items-center justify-center text-[var(--color-muted)]">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : !status?.recent_sessions?.length ? (
            <div className="p-10 text-center text-sm text-[var(--color-muted)]">لا توجد جلسات بعد</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-right font-medium px-4 py-2.5">العنوان</th>
                  <th className="text-right font-medium px-4 py-2.5">الموديل</th>
                  <th className="text-right font-medium px-4 py-2.5">الرسائل</th>
                  <th className="text-right font-medium px-4 py-2.5">التوكنز</th>
                </tr>
              </thead>
              <tbody>
                {status.recent_sessions.slice(0, 10).map((s, i) => (
                  <tr key={s.id ?? i} className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-hover)]/50">
                    <td className="px-4 py-2.5 truncate max-w-xs">{s.title ?? "بدون عنوان"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-muted-strong)]">{s.model ?? "—"}</td>
                    <td className="px-4 py-2.5 text-[var(--color-muted-strong)]">{s.message_count ?? 0}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-[var(--color-muted-strong)]">
                        <Coins className="size-3" />
                        {(s.total_tokens ?? 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="glass rounded-xl border border-[var(--color-border)] p-5 hover:border-[var(--color-border-strong)] transition">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[var(--color-muted)]">{label}</span>
        <span className="text-[var(--color-muted-strong)]">{icon}</span>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="text-[10px] text-[var(--color-muted)] mt-1 font-mono">{hint}</div>}
    </div>
  );
}
