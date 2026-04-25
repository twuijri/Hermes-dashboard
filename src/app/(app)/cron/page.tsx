"use client";
import { useCallback, useEffect, useState } from "react";
import { Clock, Pause, Play, Plus, Trash2, Zap, RefreshCw } from "lucide-react";
import { api, type CronJob } from "@/lib/hermes-api";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Modal,
  PageHeader,
  Spinner,
  Textarea,
} from "@/components/ui-kit";
import { cn } from "@/lib/utils";

const STATE_TONE: Record<string, "success" | "warn" | "danger" | "neutral"> = {
  enabled: "success",
  scheduled: "success",
  active: "success",
  paused: "warn",
  error: "danger",
  completed: "neutral",
};

const STATE_AR: Record<string, string> = {
  enabled: "مفعّلة",
  scheduled: "مجدولة",
  active: "نشطة",
  paused: "موقوفة",
  error: "خطأ",
  completed: "مكتملة",
};

function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar");
  } catch {
    return iso;
  }
}

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCronJobs();
      setJobs(data);
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
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handlePauseResume = async (job: CronJob) => {
    setBusyId(job.id);
    try {
      if (job.state === "paused") await api.resumeCronJob(job.id);
      else await api.pauseCronJob(job.id);
      load();
    } catch (e) {
      setToast({ msg: String(e), type: "err" });
    } finally {
      setBusyId(null);
    }
  };

  const handleTrigger = async (job: CronJob) => {
    setBusyId(job.id);
    try {
      await api.triggerCronJob(job.id);
      setToast({ msg: "تم التشغيل اليدوي", type: "ok" });
    } catch (e) {
      setToast({ msg: String(e), type: "err" });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (job: CronJob) => {
    if (!confirm(`حذف المهمة "${job.name || job.prompt.slice(0, 30)}"؟`)) return;
    setBusyId(job.id);
    try {
      await api.deleteCronJob(job.id);
      load();
    } catch (e) {
      setToast({ msg: String(e), type: "err" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <Clock className="size-3.5" />
            <span>المهام المجدولة</span>
          </>
        }
        title="المهام المجدولة"
        description={jobs ? `${jobs.length} مهمة محفوظة` : "إدارة المهام التلقائية"}
        actions={
          <>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={load} disabled={loading}>
              تحديث
            </Button>
            <Button size="sm" icon={Plus} onClick={() => setShowCreate(true)}>
              مهمة جديدة
            </Button>
          </>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading && jobs === null ? (
        <div className="flex items-center justify-center py-24">
          <Spinner />
        </div>
      ) : jobs && jobs.length === 0 ? (
        <Card>
          <EmptyState
            icon={Clock}
            title="لا توجد مهام"
            description="أنشئ مهمة جديدة لتشغيل أوامر تلقائياً على جدول."
            action={
              <Button icon={Plus} onClick={() => setShowCreate(true)}>
                مهمة جديدة
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs?.map((job) => (
            <Card key={job.id}>
              <CardBody className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-medium text-sm">
                      {job.name || job.prompt.slice(0, 60)}
                    </span>
                    <Badge tone={STATE_TONE[job.state] ?? "neutral"}>
                      {STATE_AR[job.state] ?? job.state}
                    </Badge>
                    {job.deliver && <Badge>{job.deliver}</Badge>}
                  </div>
                  <p className="text-xs text-[var(--color-muted-strong)] line-clamp-2 mb-2">
                    {job.prompt}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-[var(--color-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {job.schedule_display || job.schedule.expr}
                    </span>
                    {job.next_run_at && <span>التالي: {formatTime(job.next_run_at)}</span>}
                    {job.last_run_at && <span>آخر تشغيل: {formatTime(job.last_run_at)}</span>}
                  </div>
                  {job.last_error && (
                    <div className="mt-2 text-[11px] text-[var(--color-danger)]">
                      آخر خطأ: {job.last_error}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTrigger(job)}
                    title="تشغيل الآن"
                    loading={busyId === job.id}
                  >
                    <Zap className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePauseResume(job)}
                    title={job.state === "paused" ? "استئناف" : "إيقاف"}
                  >
                    {job.state === "paused" ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(job)}
                    title="حذف"
                  >
                    <Trash2 className="size-3.5 text-[var(--color-danger)]" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateJobModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
            setToast({ msg: "تم إنشاء المهمة", type: "ok" });
          }}
          onError={(msg) => setToast({ msg, type: "err" })}
        />
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

function CreateJobModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [schedule, setSchedule] = useState("");
  const [name, setName] = useState("");
  const [deliver, setDeliver] = useState("local");
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!prompt.trim() || !schedule.trim()) {
      onError("الـ prompt والـ schedule مطلوبَين");
      return;
    }
    setBusy(true);
    try {
      await api.createCronJob({
        prompt: prompt.trim(),
        schedule: schedule.trim(),
        name: name.trim() || undefined,
        deliver,
      });
      onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="مهمة جديدة" width="max-w-lg">
      <div className="space-y-4">
        <Field label="الاسم (اختياري)">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="تلخيص يومي" />
        </Field>
        <Field label="الـ Prompt" hint="ما الذي تريد أن يفعله البوت">
          <Textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="مثال: لخّص لي بريدي اليوم وأرسل النتيجة على تلقرام"
          />
        </Field>
        <Field
          label="الجدولة"
          hint="cron expression أو طبيعي مثل 'daily at 9am'"
        >
          <Input
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="0 9 * * *"
          />
        </Field>
        <Field label="التسليم">
          <select
            value={deliver}
            onChange={(e) => setDeliver(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="local">محلي (سجل)</option>
            <option value="telegram">تلقرام</option>
            <option value="discord">ديسكورد</option>
            <option value="slack">سلاك</option>
            <option value="email">بريد إلكتروني</option>
          </select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            إلغاء
          </Button>
          <Button size="sm" loading={busy} onClick={handleCreate}>
            إنشاء
          </Button>
        </div>
      </div>
    </Modal>
  );
}
