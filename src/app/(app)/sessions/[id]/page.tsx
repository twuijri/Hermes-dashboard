"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ChevronRight, User, Bot, Wrench, Trash2, AlertTriangle } from "lucide-react";
import { api, type SessionMessage } from "@/lib/hermes-api";
import { Badge, Button, Card, CardBody, CardHeader, ErrorBanner, PageHeader, Spinner } from "@/components/ui-kit";
import { useRouter } from "next/navigation";

const ROLE_META: Record<
  SessionMessage["role"],
  { icon: typeof User; label: string; tone: "neutral" | "accent" | "success" | "warn" }
> = {
  user: { icon: User, label: "مستخدم", tone: "accent" },
  assistant: { icon: Bot, label: "مساعد", tone: "success" },
  system: { icon: AlertTriangle, label: "نظام", tone: "warn" },
  tool: { icon: Wrench, label: "أداة", tone: "neutral" },
};

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [messages, setMessages] = useState<SessionMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    api
      .getSessionMessages(id)
      .then((r) => setMessages(r.messages))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("حذف الجلسة نهائياً؟")) return;
    try {
      await api.deleteSession(id);
      router.push("/sessions");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <Link href="/sessions" className="hover:text-[var(--color-fg)] inline-flex items-center gap-1">
              <ChevronRight className="size-3.5" />
              الجلسات
            </Link>
          </>
        }
        title="تفاصيل الجلسة"
        description={<code className="text-[11px] font-mono text-[var(--color-muted)]">{id}</code>}
        actions={
          <Button variant="outline" size="sm" icon={Trash2} onClick={handleDelete}>
            حذف
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner />
        </div>
      ) : !messages || messages.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-12 text-sm text-[var(--color-muted)]">
              لا توجد رسائل في هذه الجلسة
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((m, i) => {
            const meta = ROLE_META[m.role];
            const Icon = meta.icon;
            return (
              <Card key={i}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-[var(--color-muted-strong)]" />
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {m.tool_name && <code className="text-xs font-mono">{m.tool_name}</code>}
                    {m.timestamp && (
                      <span className="text-[11px] text-[var(--color-muted)] ms-auto">
                        {new Date(m.timestamp * 1000).toLocaleString("ar")}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardBody>
                  {m.content && (
                    <pre className="whitespace-pre-wrap text-sm text-[var(--color-fg)] font-sans leading-relaxed">
                      {m.content}
                    </pre>
                  )}
                  {m.tool_calls && m.tool_calls.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {m.tool_calls.map((tc) => (
                        <ToolCallBlock key={tc.id} toolCall={tc} />
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToolCallBlock({
  toolCall,
}: {
  toolCall: { id: string; function: { name: string; arguments: string } };
}) {
  const [open, setOpen] = useState(false);
  let args = toolCall.function.arguments;
  try {
    args = JSON.stringify(JSON.parse(args), null, 2);
  } catch {
    // keep raw
  }
  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-[var(--color-surface-hover)] transition"
      >
        <span className="inline-flex items-center gap-2">
          <Wrench className="size-3.5 text-[var(--color-muted)]" />
          <code className="font-mono">{toolCall.function.name}</code>
        </span>
        <span className="text-[var(--color-muted)]">{open ? "إخفاء" : "عرض"}</span>
      </button>
      {open && (
        <pre className="text-[11px] font-mono px-3 py-2 bg-[var(--color-surface)] border-t border-[var(--color-border)] overflow-x-auto">
          {args}
        </pre>
      )}
    </div>
  );
}
