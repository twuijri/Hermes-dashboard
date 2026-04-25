"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, Wrench, Search, RefreshCw } from "lucide-react";
import { api, type SkillInfo, type ToolsetInfo } from "@/lib/hermes-api";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Spinner,
  Switch,
} from "@/components/ui-kit";
import { cn } from "@/lib/utils";

function prettyCategory(raw: string | null | undefined): string {
  if (!raw) return "عام";
  return raw
    .split(/[-_/]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillInfo[] | null>(null);
  const [toolsets, setToolsets] = useState<ToolsetInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"skills" | "toolsets">("skills");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t] = await Promise.all([api.getSkills(), api.getToolsets()]);
      setSkills(s);
      setToolsets(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const categories = useMemo(() => {
    if (!skills) return [];
    const set = new Set<string>();
    for (const s of skills) set.add(s.category || "general");
    return [...set].sort();
  }, [skills]);

  const visibleSkills = useMemo(() => {
    if (!skills) return [];
    const lower = search.trim().toLowerCase();
    return skills.filter((s) => {
      if (activeCategory && (s.category || "general") !== activeCategory) return false;
      if (lower) {
        return (
          s.name.toLowerCase().includes(lower) ||
          s.description.toLowerCase().includes(lower)
        );
      }
      return true;
    });
  }, [skills, search, activeCategory]);

  const visibleToolsets = useMemo(() => {
    if (!toolsets) return [];
    const lower = search.trim().toLowerCase();
    if (!lower) return toolsets;
    return toolsets.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.label.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower),
    );
  }, [toolsets, search]);

  const handleToggle = async (skill: SkillInfo) => {
    setBusy((b) => new Set(b).add(skill.name));
    try {
      await api.toggleSkill(skill.name, !skill.enabled);
      setSkills((cur) =>
        cur ? cur.map((s) => (s.name === skill.name ? { ...s, enabled: !s.enabled } : s)) : cur,
      );
    } catch (e) {
      setToast({ msg: String(e), type: "err" });
    } finally {
      setBusy((b) => {
        const next = new Set(b);
        next.delete(skill.name);
        return next;
      });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <Sparkles className="size-3.5" />
            <span>المهارات والأدوات</span>
          </>
        }
        title="المهارات"
        description={
          skills && toolsets
            ? `${skills.filter((s) => s.enabled).length} مهارة مفعّلة من أصل ${skills.length} · ${toolsets.length} مجموعة أدوات`
            : "إدارة المهارات والأدوات"
        }
        actions={
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={load} disabled={loading}>
            تحديث
          </Button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex border border-[var(--color-border)] rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setView("skills")}
            className={cn(
              "px-3 py-1.5 text-xs transition inline-flex items-center gap-1.5",
              view === "skills"
                ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                : "hover:bg-[var(--color-surface-hover)] text-[var(--color-muted-strong)]",
            )}
          >
            <Sparkles className="size-3.5" />
            مهارات
          </button>
          <button
            type="button"
            onClick={() => setView("toolsets")}
            className={cn(
              "px-3 py-1.5 text-xs transition inline-flex items-center gap-1.5",
              view === "toolsets"
                ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                : "hover:bg-[var(--color-surface-hover)] text-[var(--color-muted-strong)]",
            )}
          >
            <Wrench className="size-3.5" />
            أدوات
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted)]" />
          <input
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pr-10 pl-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
            placeholder={view === "skills" ? "بحث في المهارات…" : "بحث في الأدوات…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && !skills ? (
        <div className="flex items-center justify-center py-24">
          <Spinner />
        </div>
      ) : view === "skills" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
          <aside>
            <Card className="p-1 sticky top-4">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-1.5 rounded-md text-xs text-right transition",
                  !activeCategory
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-fg-strong)] border border-[var(--color-accent)]/30"
                    : "text-[var(--color-muted-strong)] hover:bg-[var(--color-surface-hover)] border border-transparent",
                )}
              >
                <span>كل المهارات</span>
                <span className="text-[10px] opacity-60">{skills?.length ?? 0}</span>
              </button>
              {categories.map((cat) => {
                const count = skills?.filter((s) => (s.category || "general") === cat).length ?? 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-1.5 rounded-md text-xs text-right transition",
                      activeCategory === cat
                        ? "bg-[var(--color-accent)]/15 text-[var(--color-fg-strong)] border border-[var(--color-accent)]/30"
                        : "text-[var(--color-muted-strong)] hover:bg-[var(--color-surface-hover)] border border-transparent",
                    )}
                  >
                    <span className="truncate">{prettyCategory(cat)}</span>
                    <span className="text-[10px] opacity-60">{count}</span>
                  </button>
                );
              })}
            </Card>
          </aside>

          <div>
            {visibleSkills.length === 0 ? (
              <Card>
                <EmptyState icon={Sparkles} title="لا توجد مهارات مطابقة" />
              </Card>
            ) : (
              <Card>
                <CardBody className="p-0">
                  <div className="divide-y divide-[var(--color-border)]">
                    {visibleSkills.map((s) => (
                      <div key={s.name} className="px-4 py-3 flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{s.name}</span>
                            <Badge>{prettyCategory(s.category)}</Badge>
                          </div>
                          {s.description && (
                            <p className="text-xs text-[var(--color-muted)] mt-1">
                              {s.description}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={s.enabled}
                          disabled={busy.has(s.name)}
                          onChange={() => handleToggle(s)}
                        />
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleToolsets.length === 0 ? (
            <Card className="sm:col-span-2">
              <EmptyState icon={Wrench} title="لا توجد أدوات" />
            </Card>
          ) : (
            visibleToolsets.map((t) => (
              <Card key={t.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="size-4 text-[var(--color-muted-strong)]" />
                      <span className="font-medium text-sm">{t.label || t.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.configured ? <Badge tone="success">مهيّأة</Badge> : <Badge tone="warn">غير مهيّأة</Badge>}
                      {t.enabled ? <Badge tone="success">مفعّلة</Badge> : <Badge>متوقفة</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  {t.description && (
                    <p className="text-xs text-[var(--color-muted-strong)] mb-3">{t.description}</p>
                  )}
                  {t.tools.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {t.tools.map((tool) => (
                        <Badge key={tool}>{tool}</Badge>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {toast && (
        <div
          className={cn(
            "fixed bottom-4 left-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm border",
            toast.type === "ok"
              ? "bg-[var(--color-success)]/15 border-[var(--color-success)]/30 text-[var(--color-success)]"
              : "bg-[var(--color-danger)]/15 border-[var(--color-danger)]/30 text-[var(--color-danger)]",
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
