"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollText, RefreshCw } from "lucide-react";
import { api } from "@/lib/hermes-api";
import { Badge, Button, Card, CardBody, ErrorBanner, PageHeader, Spinner, Switch } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

const FILES = ["agent", "errors", "gateway"] as const;
const LEVELS = ["ALL", "DEBUG", "INFO", "WARNING", "ERROR"] as const;
const COMPONENTS = ["all", "gateway", "agent", "tools", "cli", "cron"] as const;
const LINE_COUNTS = [50, 100, 200, 500] as const;

type LineKind = "error" | "warning" | "info" | "debug";
function classify(line: string): LineKind {
  const u = line.toUpperCase();
  if (u.includes("ERROR") || u.includes("CRITICAL") || u.includes("FATAL")) return "error";
  if (u.includes("WARNING") || u.includes("WARN")) return "warning";
  if (u.includes("DEBUG")) return "debug";
  return "info";
}

const LINE_CLASS: Record<LineKind, string> = {
  error: "text-[var(--color-danger)]",
  warning: "text-[var(--color-warn)]",
  info: "text-[var(--color-fg)]",
  debug: "text-[var(--color-muted)]",
};

export default function LogsPage() {
  const [file, setFile] = useState<(typeof FILES)[number]>("agent");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("ALL");
  const [component, setComponent] = useState<(typeof COMPONENTS)[number]>("all");
  const [lineCount, setLineCount] = useState<(typeof LINE_COUNTS)[number]>(100);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.getLogs({ file, lines: lineCount, level, component });
      setLines(r.lines);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 30);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [file, lineCount, level, component]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchLogs, 3000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchLogs]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <ScrollText className="size-3.5" />
            <span>السجلات</span>
          </>
        }
        title="سجلات النظام"
        description={
          <span className="inline-flex items-center gap-2">
            {file} · {level} · {component}
            {loading && <Spinner className="size-3" />}
            {autoRefresh && (
              <Badge tone="success">
                <span className="size-1.5 rounded-full bg-current animate-pulse mr-1" />
                مباشر
              </Badge>
            )}
          </span>
        }
        actions={
          <>
            <div className="flex items-center gap-2 text-xs text-[var(--color-muted-strong)]">
              <Switch checked={autoRefresh} onChange={setAutoRefresh} />
              تحديث تلقائي
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchLogs}
              disabled={loading}
            >
              تحديث
            </Button>
          </>
        }
      />

      <Card>
        <CardBody className="p-3 flex flex-wrap items-center gap-2">
          <FilterPill label="الملف" value={file} options={FILES} onChange={setFile} />
          <FilterPill label="المستوى" value={level} options={LEVELS} onChange={setLevel} />
          <FilterPill label="المكوّن" value={component} options={COMPONENTS} onChange={setComponent} />
          <FilterPill
            label="عدد الأسطر"
            value={lineCount}
            options={LINE_COUNTS}
            onChange={setLineCount}
          />
        </CardBody>
      </Card>

      {error && <ErrorBanner message={error} onRetry={fetchLogs} />}

      <Card>
        <CardBody className="p-0">
          <div
            ref={scrollRef}
            className="font-mono text-[11px] leading-relaxed p-3 overflow-auto bg-[var(--color-bg)]/50 rounded-b-xl"
            style={{ height: "calc(100vh - 320px)", minHeight: 400 }}
            dir="ltr"
          >
            {lines.length === 0 && !loading ? (
              <div className="text-[var(--color-muted)] text-center py-12 font-sans" dir="rtl">
                لا توجد أسطر مطابقة
              </div>
            ) : (
              lines.map((line, i) => (
                <div key={i} className={cn("whitespace-pre-wrap break-all", LINE_CLASS[classify(line)])}>
                  {line}
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function FilterPill<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[11px] text-[var(--color-muted)]">{label}</span>
      <div className="inline-flex border border-[var(--color-border)] rounded-md overflow-hidden">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={String(opt)}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "px-2.5 py-1 text-[11px] transition",
                active
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                  : "hover:bg-[var(--color-surface-hover)] text-[var(--color-muted-strong)]",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
