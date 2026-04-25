"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Network,
  ShieldCheck,
  ShieldOff,
  Copy,
  ExternalLink,
  RefreshCw,
  LogOut,
  Terminal,
  LogIn,
  Check,
  X,
} from "lucide-react";
import { api, type OAuthProvider, type OAuthStartResponse } from "@/lib/hermes-api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  Modal,
  PageHeader,
  Spinner,
} from "@/components/ui-kit";

const FLOW_LABEL: Record<OAuthProvider["flow"], string> = {
  pkce: "PKCE",
  device_code: "كود الجهاز",
  external: "خارجي",
};

function formatExpiresAt(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const dt = new Date(expiresAt);
  if (Number.isNaN(dt.getTime())) return null;
  const diff = dt.getTime() - Date.now();
  if (diff < 0) return "منتهي";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `ينتهي خلال ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `ينتهي خلال ${hours} س`;
  return `ينتهي خلال ${Math.floor(hours / 24)} ي`;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<OAuthProvider[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loginFor, setLoginFor] = useState<OAuthProvider | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getOAuthProviders();
      setProviders(resp.providers);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCopy = async (provider: OAuthProvider) => {
    try {
      await navigator.clipboard.writeText(provider.cli_command);
      setCopiedId(provider.id);
      setTimeout(() => setCopiedId((v) => (v === provider.id ? null : v)), 1500);
    } catch {
      // ignore
    }
  };

  const handleDisconnect = async (provider: OAuthProvider) => {
    if (!confirm(`فصل ${provider.name}؟`)) return;
    setBusyId(provider.id);
    try {
      await api.disconnectOAuthProvider(provider.id);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const connectedCount = providers?.filter((p) => p.status.logged_in).length ?? 0;
  const totalCount = providers?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Network className="size-3.5" />
            <span>المزوّدات</span>
          </>
        }
        title="البروفايدرز"
        description={
          providers
            ? `${connectedCount} متصل من أصل ${totalCount}`
            : "إدارة تسجيل الدخول إلى مزوّدات النماذج عبر OAuth"
        }
        actions={
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={refresh} disabled={loading}>
            تحديث
          </Button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      <Card>
        {loading && providers === null ? (
          <div className="py-12 flex items-center justify-center">
            <Spinner />
          </div>
        ) : providers && providers.length === 0 ? (
          <EmptyState
            icon={Network}
            title="ما فيه مزوّدات OAuth متاحة"
            description="هذي القائمة تجي من Hermes نفسه. تأكد من تحديث الإعدادات."
          />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {providers?.map((p) => {
              const expiresLabel = formatExpiresAt(p.status.expires_at);
              const isExpired = expiresLabel === "منتهي";
              const isBusy = busyId === p.id;
              return (
                <div key={p.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {p.status.logged_in ? (
                      <ShieldCheck className="size-5 text-[var(--color-success)] shrink-0 mt-0.5" />
                    ) : (
                      <ShieldOff className="size-5 text-[var(--color-muted)] shrink-0 mt-0.5" />
                    )}
                    <div className="flex flex-col min-w-0 gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{p.name}</span>
                        <Badge tone="neutral">{FLOW_LABEL[p.flow]}</Badge>
                        {p.status.logged_in && <Badge tone="success">متصل</Badge>}
                        {isExpired && <Badge tone="danger">منتهي</Badge>}
                        {!isExpired && expiresLabel && <Badge tone="warn">{expiresLabel}</Badge>}
                      </div>
                      {p.status.logged_in && p.status.token_preview && (
                        <code className="text-xs font-mono text-[var(--color-muted-strong)] truncate">
                          <span className="opacity-50">token </span>
                          {p.status.token_preview}
                          {p.status.source_label && (
                            <span className="opacity-40"> · {p.status.source_label}</span>
                          )}
                        </code>
                      )}
                      {!p.status.logged_in && (
                        <span className="text-xs text-[var(--color-muted)]">
                          غير مفعّل — أو شغّل من الطرفية:{" "}
                          <code className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-fg)]">
                            {p.cli_command}
                          </code>
                        </span>
                      )}
                      {p.status.error && (
                        <span className="text-xs text-[var(--color-danger)]">{p.status.error}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.docs_url && (
                      <a
                        href={p.docs_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="الوثائق"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="size-3.5" />
                        </Button>
                      </a>
                    )}
                    {!p.status.logged_in && p.flow !== "external" && (
                      <Button size="sm" icon={LogIn} onClick={() => setLoginFor(p)}>
                        تسجيل الدخول
                      </Button>
                    )}
                    {!p.status.logged_in && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(p)}
                        title="نسخ أمر الـ CLI"
                      >
                        {copiedId === p.id ? (
                          <>
                            <Check className="size-3" />
                            تم النسخ
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            CLI
                          </>
                        )}
                      </Button>
                    )}
                    {p.status.logged_in && p.flow !== "external" && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={isBusy}
                        icon={LogOut}
                        onClick={() => handleDisconnect(p)}
                      >
                        فصل
                      </Button>
                    )}
                    {p.status.logged_in && p.flow === "external" && (
                      <span className="text-[11px] text-[var(--color-muted)] italic px-2 inline-flex items-center gap-1">
                        <Terminal className="size-3" />
                        مُدار خارجياً
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {loginFor && (
        <OAuthLoginModal
          provider={loginFor}
          onClose={() => {
            setLoginFor(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

type Phase = "starting" | "awaiting_user" | "submitting" | "polling" | "approved" | "error";

function OAuthLoginModal({ provider, onClose }: { provider: OAuthProvider; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [start, setStart] = useState<OAuthStartResponse | null>(null);
  const [pkceCode, setPkceCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const isMounted = useRef(true);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    isMounted.current = true;
    api
      .startOAuthLogin(provider.id)
      .then((resp) => {
        if (!isMounted.current) return;
        setStart(resp);
        setSecondsLeft(resp.expires_in);
        setPhase(resp.flow === "device_code" ? "polling" : "awaiting_user");
        if (resp.flow === "pkce") {
          window.open(resp.auth_url, "_blank", "noopener,noreferrer");
        } else {
          window.open(resp.verification_url, "_blank", "noopener,noreferrer");
        }
      })
      .catch((e) => {
        if (!isMounted.current) return;
        setPhase("error");
        setErrorMsg(`فشل بدء تسجيل الدخول: ${e}`);
      });
    return () => {
      isMounted.current = false;
      if (pollTimer.current !== null) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (phase === "approved" || phase === "error") return;
    const tick = setInterval(() => {
      if (!isMounted.current) return;
      setSecondsLeft((s) => {
        if (s !== null && s <= 1) {
          setPhase("error");
          setErrorMsg("انتهت صلاحية الجلسة");
          return 0;
        }
        return s !== null && s > 0 ? s - 1 : 0;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [secondsLeft, phase]);

  useEffect(() => {
    if (!start || start.flow !== "device_code" || phase !== "polling") return;
    const sid = start.session_id;
    pollTimer.current = setInterval(async () => {
      try {
        const resp = await api.pollOAuthSession(provider.id, sid);
        if (!isMounted.current) return;
        if (resp.status === "approved") {
          setPhase("approved");
          if (pollTimer.current !== null) clearInterval(pollTimer.current);
          setTimeout(() => isMounted.current && onClose(), 1200);
        } else if (resp.status !== "pending") {
          setPhase("error");
          setErrorMsg(resp.error_message || `الحالة: ${resp.status}`);
          if (pollTimer.current !== null) clearInterval(pollTimer.current);
        }
      } catch (e) {
        if (!isMounted.current) return;
        setPhase("error");
        setErrorMsg(`فشل الاستعلام: ${e}`);
        if (pollTimer.current !== null) clearInterval(pollTimer.current);
      }
    }, 2000);
    return () => {
      if (pollTimer.current !== null) clearInterval(pollTimer.current);
    };
  }, [start, phase, provider.id, onClose]);

  const handleSubmitPkceCode = async () => {
    if (!start || start.flow !== "pkce" || !pkceCode.trim()) return;
    setPhase("submitting");
    setErrorMsg(null);
    try {
      const resp = await api.submitOAuthCode(provider.id, start.session_id, pkceCode.trim());
      if (!isMounted.current) return;
      if (resp.ok && resp.status === "approved") {
        setPhase("approved");
        setTimeout(() => isMounted.current && onClose(), 1200);
      } else {
        setPhase("error");
        setErrorMsg(resp.message || "فشل تبادل الرمز");
      }
    } catch (e) {
      if (!isMounted.current) return;
      setPhase("error");
      setErrorMsg(`فشل الإرسال: ${e}`);
    }
  };

  const handleClose = async () => {
    if (start && phase !== "approved" && phase !== "error") {
      try {
        await api.cancelOAuthSession(start.session_id);
      } catch {
        // ignore
      }
    }
    onClose();
  };

  const handleCopyUserCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => isMounted.current && setCodeCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const fmtTime = (s: number | null) => {
    if (s === null) return "";
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  return (
    <Modal open onClose={handleClose} title={`الاتصال بـ ${provider.name}`}>
      {secondsLeft !== null && phase !== "approved" && phase !== "error" && (
        <div className="text-xs text-[var(--color-muted)] mb-3">
          تنتهي الجلسة خلال {fmtTime(secondsLeft)}
        </div>
      )}

      {phase === "starting" && (
        <div className="flex items-center gap-3 py-6 text-sm text-[var(--color-muted)]">
          <Spinner className="size-4" />
          جاري بدء تسجيل الدخول…
        </div>
      )}

      {start?.flow === "pkce" && phase === "awaiting_user" && (
        <div className="space-y-4">
          <ol className="text-sm space-y-1.5 list-decimal list-inside text-[var(--color-muted-strong)]">
            <li>افتحت صفحة تسجيل الدخول في تبويب جديد.</li>
            <li>أكمل تسجيل الدخول هناك ثم انسخ الرمز.</li>
            <li>الصق الرمز هنا واضغط إرسال.</li>
          </ol>
          <Input
            value={pkceCode}
            onChange={(e) => setPkceCode(e.target.value)}
            placeholder="الصق الرمز هنا"
            onKeyDown={(e) => e.key === "Enter" && handleSubmitPkceCode()}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <a
              href={start.auth_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)] inline-flex items-center gap-1"
            >
              <ExternalLink className="size-3" />
              إعادة فتح صفحة تسجيل الدخول
            </a>
            <Button size="sm" onClick={handleSubmitPkceCode} disabled={!pkceCode.trim()}>
              إرسال
            </Button>
          </div>
        </div>
      )}

      {phase === "submitting" && (
        <div className="flex items-center gap-3 py-6 text-sm text-[var(--color-muted)]">
          <Spinner className="size-4" />
          جاري تبادل الرمز…
        </div>
      )}

      {start?.flow === "device_code" && phase === "polling" && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-muted-strong)]">
            أدخل هذا الرمز في الصفحة المفتوحة:
          </p>
          <div className="flex items-center justify-between gap-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg p-4">
            <code className="font-mono text-2xl tracking-widest text-[var(--color-fg)]">
              {start.user_code}
            </code>
            <Button variant="outline" size="sm" onClick={() => handleCopyUserCode(start.user_code)}>
              {codeCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
          </div>
          <a
            href={start.verification_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)] inline-flex items-center gap-1"
          >
            <ExternalLink className="size-3" />
            إعادة فتح صفحة التحقق
          </a>
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] border-t border-[var(--color-border)] pt-3">
            <Spinner className="size-3" />
            في انتظار الموافقة…
          </div>
        </div>
      )}

      {phase === "approved" && (
        <div className="flex items-center gap-3 py-6 text-sm text-[var(--color-success)]">
          <Check className="size-5" />
          تم الاتصال — يُغلق…
        </div>
      )}

      {phase === "error" && (
        <div className="space-y-4">
          <div className="border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 rounded-lg p-3 text-sm text-[var(--color-danger)]">
            {errorMsg || "فشل تسجيل الدخول"}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" icon={X} onClick={handleClose}>
              إغلاق
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
