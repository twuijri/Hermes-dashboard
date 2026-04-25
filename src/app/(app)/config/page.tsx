"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings,
  Save,
  Code,
  FormInput,
  RotateCcw,
  Download,
  Upload,
  Search,
  X,
} from "lucide-react";
import { api } from "@/lib/hermes-api";
import { getNestedValue, setNestedValue } from "@/lib/nested";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Spinner,
  Switch,
  Textarea,
} from "@/components/ui-kit";
import { cn } from "@/lib/utils";

type FieldSchema = {
  type?: string;
  description?: string;
  category?: string;
  options?: string[];
};

type SchemaMap = Record<string, FieldSchema>;

const CATEGORY_AR: Record<string, string> = {
  general: "عام",
  agent: "الوكيل",
  terminal: "الطرفية",
  display: "العرض",
  delegation: "التفويض",
  memory: "الذاكرة",
  compression: "الضغط",
  security: "الأمان",
  browser: "المتصفح",
  voice: "الصوت",
  tts: "TTS",
  stt: "STT",
  logging: "السجلات",
  discord: "ديسكورد",
  auxiliary: "إضافي",
};

function prettyCategory(cat: string): string {
  return CATEGORY_AR[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function ConfigPage() {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [schema, setSchema] = useState<SchemaMap | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [defaults, setDefaults] = useState<Record<string, unknown> | null>(null);
  const [activeCategory, setActiveCategory] = useState("");
  const [yamlMode, setYamlMode] = useState(false);
  const [yamlText, setYamlText] = useState("");
  const [yamlLoading, setYamlLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([api.getConfig(), api.getSchema(), api.getDefaults()])
      .then(([cfg, sch, def]) => {
        setConfig(cfg);
        setSchema(sch.fields as SchemaMap);
        setCategoryOrder(sch.category_order ?? []);
        setDefaults(def);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    if (yamlMode && !yamlText) {
      setYamlLoading(true);
      api
        .getConfigRaw()
        .then((r) => setYamlText(r.yaml))
        .catch((e) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setYamlLoading(false));
    }
  }, [yamlMode, yamlText]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const categories = useMemo(() => {
    if (!schema) return [];
    const all = new Set<string>();
    for (const s of Object.values(schema)) all.add(s.category ?? "general");
    const ordered = categoryOrder.filter((c) => all.has(c));
    const extra = [...all].filter((c) => !categoryOrder.includes(c)).sort();
    return [...ordered, ...extra];
  }, [schema, categoryOrder]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const categoryCounts = useMemo(() => {
    if (!schema) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const s of Object.values(schema)) {
      const cat = s.category ?? "general";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [schema]);

  const isSearching = searchQuery.trim().length > 0;
  const lower = searchQuery.toLowerCase();

  const visibleFields = useMemo(() => {
    if (!schema) return [];
    return Object.entries(schema).filter(([key, s]) => {
      if (isSearching) {
        return (
          key.toLowerCase().includes(lower) ||
          (s.description ?? "").toLowerCase().includes(lower)
        );
      }
      return (s.category ?? "general") === activeCategory;
    });
  }, [schema, isSearching, lower, activeCategory]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.saveConfig(config);
      setToast({ msg: "تم حفظ الإعدادات", type: "ok" });
    } catch (e) {
      setToast({ msg: `فشل الحفظ: ${e}`, type: "err" });
    } finally {
      setSaving(false);
    }
  };

  const handleYamlSave = async () => {
    setSaving(true);
    try {
      await api.saveConfigRaw(yamlText);
      const fresh = await api.getConfig();
      setConfig(fresh);
      setToast({ msg: "تم حفظ YAML", type: "ok" });
    } catch (e) {
      setToast({ msg: `فشل الحفظ: ${e}`, type: "err" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!defaults) return;
    if (!confirm("استعادة كل الحقول إلى القيم الافتراضية؟")) return;
    setConfig(structuredClone(defaults));
  };

  const handleExport = () => {
    if (!config) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hermes-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result as string);
        setConfig(imported);
        setToast({ msg: "تم استيراد الإعدادات", type: "ok" });
      } catch {
        setToast({ msg: "JSON غير صالح", type: "err" });
      }
    };
    reader.readAsText(file);
  };

  if (!config || !schema) {
    return (
      <div className="flex items-center justify-center py-24">
        {error ? <ErrorBanner message={error} /> : <Spinner />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <Settings className="size-3.5" />
            <span>الإعدادات</span>
          </>
        }
        title="إعدادات Hermes"
        description="حقول تأتي من schema الباك إند مباشرة"
        actions={
          <>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <Button variant="ghost" size="sm" icon={Download} onClick={handleExport}>
              تصدير
            </Button>
            <Button variant="ghost" size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()}>
              استيراد
            </Button>
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={handleReset}>
              استعادة
            </Button>
            <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
            <Button
              variant={yamlMode ? "default" : "outline"}
              size="sm"
              icon={yamlMode ? FormInput : Code}
              onClick={() => setYamlMode((v) => !v)}
            >
              {yamlMode ? "نموذج" : "YAML"}
            </Button>
            <Button
              size="sm"
              icon={Save}
              loading={saving}
              onClick={yamlMode ? handleYamlSave : handleSave}
            >
              حفظ
            </Button>
          </>
        }
      />

      {error && <ErrorBanner message={error} />}

      {yamlMode ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Code className="size-4" />
              YAML الخام
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {yamlLoading ? (
              <div className="py-12 flex items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <Textarea
                value={yamlText}
                onChange={(e) => setYamlText(e.target.value)}
                className="min-h-[600px] border-0 rounded-none rounded-b-xl"
                spellCheck={false}
              />
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4">
          <aside className="sm:w-56 sm:shrink-0">
            <div className="sm:sticky sm:top-4 space-y-3">
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-muted)]" />
                <input
                  className={cn(
                    "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pr-8 pl-3 py-1.5 text-xs text-[var(--color-fg)]",
                    "placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]",
                  )}
                  placeholder="بحث في الإعدادات…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <Card className="p-1">
                <div className="flex flex-col">
                  {categories.map((cat) => {
                    const isActive = !isSearching && activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setSearchQuery("");
                          setActiveCategory(cat);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-xs text-right transition",
                          isActive
                            ? "bg-[var(--color-accent)]/15 text-[var(--color-fg-strong)] border border-[var(--color-accent)]/30"
                            : "text-[var(--color-muted-strong)] hover:bg-[var(--color-surface-hover)] border border-transparent",
                        )}
                      >
                        <span>{prettyCategory(cat)}</span>
                        <span className="text-[10px] tabular-nums opacity-60">
                          {categoryCounts[cat] || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {isSearching ? <Search className="size-4" /> : null}
                    {isSearching ? "نتائج البحث" : prettyCategory(activeCategory)}
                  </div>
                  <Badge>{visibleFields.length} حقل</Badge>
                </div>
              </CardHeader>
              <CardBody>
                {visibleFields.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--color-muted)]">
                    لا توجد حقول
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visibleFields.map(([key, s]) => (
                      <AutoField
                        key={key}
                        schemaKey={key}
                        schema={s}
                        value={getNestedValue(config, key)}
                        onChange={(v) => setConfig(setNestedValue(config, key, v))}
                      />
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
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

function AutoField({
  schemaKey,
  schema,
  value,
  onChange,
}: {
  schemaKey: string;
  schema: FieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const rawLabel = schemaKey.split(".").pop() ?? schemaKey;
  const label = rawLabel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const hint = (
    <>
      {schemaKey.includes(".") && (
        <span className="block text-[10px] font-mono text-[var(--color-muted)]/70">{schemaKey}</span>
      )}
      {schema.description && (
        <span className="block text-xs text-[var(--color-muted)]">{schema.description}</span>
      )}
    </>
  );

  if (schema.type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-4 py-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{label}</span>
          {hint}
        </div>
        <Switch checked={!!value} onChange={onChange} />
      </div>
    );
  }

  if (schema.type === "select") {
    const opts = schema.options ?? [];
    return (
      <Field label={label}>
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-accent)]"
        >
          {opts.map((o) => (
            <option key={o} value={o}>
              {o || "(none)"}
            </option>
          ))}
        </select>
        <div className="mt-1">{hint}</div>
      </Field>
    );
  }

  if (schema.type === "number") {
    return (
      <Field label={label}>
        <Input
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange(0);
            const n = Number(raw);
            if (!Number.isNaN(n)) onChange(n);
          }}
        />
        <div className="mt-1">{hint}</div>
      </Field>
    );
  }

  if (schema.type === "text") {
    return (
      <Field label={label}>
        <Textarea
          rows={3}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="mt-1">{hint}</div>
      </Field>
    );
  }

  if (schema.type === "list") {
    return (
      <Field label={label}>
        <Input
          value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder="قيم مفصولة بفاصلة"
        />
        <div className="mt-1">{hint}</div>
      </Field>
    );
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return (
      <div className="border border-[var(--color-border)] rounded-lg p-3 space-y-2">
        <div className="text-xs font-medium">{label}</div>
        {hint}
        {Object.entries(obj).map(([sub, sv]) => (
          <div key={sub} className="flex flex-col gap-1">
            <span className="text-[11px] text-[var(--color-muted)]">{sub}</span>
            <Input
              value={String(sv ?? "")}
              onChange={(e) => onChange({ ...obj, [sub]: e.target.value })}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Field label={label}>
      <Input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      <div className="mt-1">{hint}</div>
    </Field>
  );
}
