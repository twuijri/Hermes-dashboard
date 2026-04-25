"use client";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Cpu,
  Hash,
  RefreshCw,
  TrendingUp,
  Coins,
  Sparkles,
} from "lucide-react";
import { api, type AnalyticsResponse, type AnalyticsDailyEntry } from "@/lib/hermes-api";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorBanner,
  PageHeader,
  Spinner,
} from "@/components/ui-kit";
import { cn } from "@/lib/utils";

const PERIODS = [
  { label: "٧ أيام", days: 7 },
  { label: "٣٠ يوم", days: 30 },
  { label: "٩٠ يوم", days: 90 },
] as const;

const CHART_HEIGHT = 160;

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} ك`;
  return String(n);
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatDate(day: string): string {
  try {
    const d = new Date(day + "T00:00:00");
    return d.toLocaleDateString("ar", { month: "short", day: "numeric" });
  } catch {
    return day;
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.getAnalytics(days);
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <BarChart3 className="size-3.5" />
            <span>التحليلات</span>
          </>
        }
        title="تحليل الاستخدام"
        description={`آخر ${days} يوم`}
        actions={
          <>
            <div className="inline-flex border border-[var(--color-border)] rounded-md overflow-hidden">
              {PERIODS.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => setDays(p.days)}
                  className={cn(
                    "px-2.5 py-1 text-xs transition",
                    days === p.days
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                      : "hover:bg-[var(--color-surface-hover)] text-[var(--color-muted-strong)]",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={load} disabled={loading}>
              تحديث
            </Button>
          </>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24">
          <Spinner />
        </div>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Hash className="size-5 text-[var(--color-accent)]" />}
              label="نداءات API"
              value={data.totals.total_api_calls.toLocaleString()}
              sub={`عبر ${data.totals.total_sessions} جلسة`}
            />
            <SummaryCard
              icon={<Cpu className="size-5 text-[var(--color-accent)]" />}
              label="توكنز إدخال"
              value={formatTokens(data.totals.total_input)}
            />
            <SummaryCard
              icon={<TrendingUp className="size-5 text-[var(--color-accent)]" />}
              label="توكنز إخراج"
              value={formatTokens(data.totals.total_output)}
            />
            <SummaryCard
              icon={<Coins className="size-5 text-[var(--color-accent)]" />}
              label="التكلفة المقدّرة"
              value={formatCost(data.totals.total_estimated_cost)}
              sub={`فعلية: ${formatCost(data.totals.total_actual_cost)}`}
            />
          </div>

          <TokenBarChart daily={data.daily} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Cpu className="size-4 text-[var(--color-muted-strong)]" />
                  حسب الموديل
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {data.by_model.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[var(--color-muted)]">لا بيانات</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
                      <tr>
                        <th className="text-right font-medium px-4 py-2">الموديل</th>
                        <th className="text-right font-medium px-4 py-2">جلسات</th>
                        <th className="text-right font-medium px-4 py-2">توكنز</th>
                        <th className="text-right font-medium px-4 py-2">تكلفة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_model.map((m) => (
                        <tr key={m.model} className="border-t border-[var(--color-border)]/60">
                          <td className="px-4 py-2 font-mono text-xs">{m.model}</td>
                          <td className="px-4 py-2 text-[var(--color-muted-strong)]">{m.sessions}</td>
                          <td className="px-4 py-2 text-[var(--color-muted-strong)]">
                            {formatTokens(m.input_tokens + m.output_tokens)}
                          </td>
                          <td className="px-4 py-2 text-[var(--color-muted-strong)]">
                            {formatCost(m.estimated_cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4 text-[var(--color-muted-strong)]" />
                  أكثر المهارات استخداماً
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {data.skills.top_skills.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[var(--color-muted)]">لا بيانات</div>
                ) : (
                  <ul className="divide-y divide-[var(--color-border)]">
                    {data.skills.top_skills.slice(0, 10).map((s) => (
                      <li key={s.skill} className="flex items-center justify-between px-4 py-2">
                        <span className="text-sm">{s.skill}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[var(--color-muted)] tabular-nums">
                            {s.total_count}
                          </span>
                          <Badge tone="accent">{s.percentage.toFixed(1)}%</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[var(--color-muted)]">{label}</span>
          <span className="text-[var(--color-muted-strong)]">{icon}</span>
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="text-[11px] text-[var(--color-muted)] mt-1">{sub}</div>}
      </CardBody>
    </Card>
  );
}

function TokenBarChart({ daily }: { daily: AnalyticsDailyEntry[] }) {
  if (daily.length === 0) return null;
  const max = Math.max(...daily.map((d) => d.input_tokens + d.output_tokens), 1);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="size-4 text-[var(--color-muted-strong)]" />
            استخدام التوكنز اليومي
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--color-muted)]">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-[var(--color-accent)]/40" />
              إدخال
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-[var(--color-accent)]" />
              إخراج
            </div>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="flex items-end gap-[2px] overflow-x-auto" style={{ height: CHART_HEIGHT }} dir="ltr">
          {daily.map((d) => {
            const inputH = Math.round((d.input_tokens / max) * CHART_HEIGHT);
            const outputH = Math.round((d.output_tokens / max) * CHART_HEIGHT);
            const total = d.input_tokens + d.output_tokens;
            return (
              <div
                key={d.day}
                className="flex-1 min-w-[8px] group relative flex flex-col justify-end"
                title={`${formatDate(d.day)}: ${formatTokens(total)}`}
              >
                <div
                  className="bg-[var(--color-accent)] transition-opacity group-hover:opacity-80"
                  style={{ height: outputH }}
                />
                <div
                  className="bg-[var(--color-accent)]/40 transition-opacity group-hover:opacity-80"
                  style={{ height: inputH }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-[var(--color-muted)] mt-2 px-1" dir="ltr">
          <span>{formatDate(daily[0].day)}</span>
          <span>{formatDate(daily[daily.length - 1].day)}</span>
        </div>
      </CardBody>
    </Card>
  );
}
