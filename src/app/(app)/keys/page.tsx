"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  Pencil,
  Save,
  Trash2,
  X,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { api, type EnvVarInfo } from "@/lib/hermes-api";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorBanner,
  Input,
  PageHeader,
  Spinner,
} from "@/components/ui-kit";
import { cn } from "@/lib/utils";

const CATEGORY_AR: Record<string, string> = {
  provider: "مزوّدات الموديل",
  tool: "أدوات",
  messaging: "المراسلة",
  setting: "إعدادات",
  other: "أخرى",
};

export default function KeysPage() {
  const [envVars, setEnvVars] = useState<Record<string, EnvVarInfo> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEnvVars();
      setEnvVars(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const grouped = useMemo(() => {
    if (!envVars) return [];
    const lower = search.trim().toLowerCase();
    const map: Record<string, [string, EnvVarInfo][]> = {};
    for (const [key, info] of Object.entries(envVars)) {
      if (info.advanced && !showAdvanced) continue;
      if (lower) {
        const matches =
          key.toLowerCase().includes(lower) ||
          info.description.toLowerCase().includes(lower);
        if (!matches) continue;
      }
      const cat = info.category || "other";
      if (!map[cat]) map[cat] = [];
      map[cat].push([key, info]);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, items]) => ({ cat, items: items.sort((a, b) => a[0].localeCompare(b[0])) }));
  }, [envVars, showAdvanced, search]);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await api.setEnvVar(key, edits[key] ?? "");
      setEdits((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      await refresh();
      setToast({ msg: `تم حفظ ${key}`, type: "ok" });
    } catch (e) {
      setToast({ msg: `فشل الحفظ: ${e}`, type: "err" });
    } finally {
      setSaving(null);
    }
  };

  const handleClear = async (key: string) => {
    if (!confirm(`حذف القيمة من ${key}؟`)) return;
    setSaving(key);
    try {
      await api.deleteEnvVar(key);
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      await refresh();
      setToast({ msg: `تم حذف ${key}`, type: "ok" });
    } catch (e) {
      setToast({ msg: `فشل الحذف: ${e}`, type: "err" });
    } finally {
      setSaving(null);
    }
  };

  const handleReveal = async (key: string) => {
    if (revealed[key]) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    try {
      const resp = await api.revealEnvVar(key);
      setRevealed((prev) => ({ ...prev, [key]: resp.value }));
    } catch (e) {
      setToast({ msg: `فشل الكشف: ${e}`, type: "err" });
    }
  };

  const toggleCollapsed = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const setCount = useMemo(() => {
    if (!envVars) return 0;
    return Object.values(envVars).filter((v) => v.is_set).length;
  }, [envVars]);

  if (loading && !envVars) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <KeyRound className="size-3.5" />
            <span>المفاتيح</span>
          </>
        }
        title="مفاتيح API ومتغيرات البيئة"
        description={`${setCount} مفتاح مفعّل من أصل ${envVars ? Object.keys(envVars).length : 0}`}
        actions={
          <>
            <label className="flex items-center gap-2 text-xs text-[var(--color-muted-strong)] cursor-pointer">
              <input
                type="checkbox"
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
                className="accent-[var(--color-accent)]"
              />
              متقدم
            </label>
          </>
        }
      />

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted)]" />
        <input
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pr-10 pl-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          placeholder="بحث في المفاتيح…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {grouped.length === 0 ? (
        <Card>
          <EmptyState
            icon={KeyRound}
            title="لا توجد مفاتيح مطابقة"
            description={search ? `جرّب كلمة بحث أخرى` : "فعّل عرض المفاتيح المتقدّمة"}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ cat, items }) => {
            const isCollapsed = collapsed.has(cat);
            return (
              <Card key={cat}>
                <CardHeader className="cursor-pointer" >
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(cat)}
                    className="flex items-center justify-between gap-3 w-full text-right"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="size-4 text-[var(--color-muted)]" />
                      ) : (
                        <ChevronDown className="size-4 text-[var(--color-muted)]" />
                      )}
                      <span className="text-sm font-semibold">
                        {CATEGORY_AR[cat] ?? cat}
                      </span>
                      <Badge>{items.length}</Badge>
                    </div>
                    <span className="text-[11px] text-[var(--color-muted)]">
                      {items.filter(([, i]) => i.is_set).length} مفعّل
                    </span>
                  </button>
                </CardHeader>
                {!isCollapsed && (
                  <CardBody className="p-0">
                    <div className="divide-y divide-[var(--color-border)]">
                      {items.map(([key, info]) => (
                        <EnvVarRow
                          key={key}
                          varKey={key}
                          info={info}
                          edits={edits}
                          setEdits={setEdits}
                          revealed={revealed}
                          saving={saving}
                          onSave={handleSave}
                          onClear={handleClear}
                          onReveal={handleReveal}
                          onCancelEdit={(k) =>
                            setEdits((prev) => {
                              const next = { ...prev };
                              delete next[k];
                              return next;
                            })
                          }
                        />
                      ))}
                    </div>
                  </CardBody>
                )}
              </Card>
            );
          })}
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

function EnvVarRow({
  varKey,
  info,
  edits,
  setEdits,
  revealed,
  saving,
  onSave,
  onClear,
  onReveal,
  onCancelEdit,
}: {
  varKey: string;
  info: EnvVarInfo;
  edits: Record<string, string>;
  setEdits: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  revealed: Record<string, string>;
  saving: string | null;
  onSave: (k: string) => void;
  onClear: (k: string) => void;
  onReveal: (k: string) => void;
  onCancelEdit: (k: string) => void;
}) {
  const isEditing = edits[varKey] !== undefined;
  const isRevealed = !!revealed[varKey];
  const isSaving = saving === varKey;
  const displayValue = isRevealed ? revealed[varKey] : info.redacted_value ?? "—";

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-mono font-semibold text-[var(--color-fg)]">
              {varKey}
            </code>
            {info.is_set ? (
              <Badge tone="success">مفعّل</Badge>
            ) : (
              <Badge tone="neutral">فارغ</Badge>
            )}
            {info.is_password && <Badge tone="warn">سرّي</Badge>}
            {info.advanced && <Badge>متقدم</Badge>}
            {info.tools.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
          {info.description && (
            <p className="text-xs text-[var(--color-muted)] mt-1">{info.description}</p>
          )}
          {info.url && (
            <a
              href={info.url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-[var(--color-accent)] hover:underline inline-flex items-center gap-1 mt-1"
            >
              <ExternalLink className="size-3" />
              الحصول على المفتاح
            </a>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1">
          {info.is_set && !isEditing && (
            <Button variant="ghost" size="sm" onClick={() => onReveal(varKey)} title={isRevealed ? "إخفاء" : "إظهار"}>
              {isRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </Button>
          )}
          {!isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={Pencil}
                onClick={() => setEdits((p) => ({ ...p, [varKey]: "" }))}
              >
                {info.is_set ? "تعديل" : "إضافة"}
              </Button>
              {info.is_set && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Trash2}
                  loading={isSaving}
                  onClick={() => onClear(varKey)}
                />
              )}
            </>
          ) : (
            <Button variant="ghost" size="sm" icon={X} onClick={() => onCancelEdit(varKey)} />
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mt-3 flex items-center gap-2">
          <Input
            type={info.is_password ? "password" : "text"}
            value={edits[varKey]}
            onChange={(e) => setEdits((p) => ({ ...p, [varKey]: e.target.value }))}
            placeholder="القيمة الجديدة"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && onSave(varKey)}
            className="flex-1"
          />
          <Button size="sm" icon={Save} loading={isSaving} onClick={() => onSave(varKey)}>
            حفظ
          </Button>
        </div>
      ) : info.is_set ? (
        <div className="mt-2">
          <code className="text-xs font-mono text-[var(--color-muted-strong)] bg-[var(--color-surface)] px-2 py-1 rounded">
            {displayValue}
          </code>
        </div>
      ) : null}
    </div>
  );
}
