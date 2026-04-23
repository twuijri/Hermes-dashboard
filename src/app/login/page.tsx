"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const from = sp.get("from") ?? "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      return;
    }
    router.replace(from);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/30">
            <ShieldCheck className="size-5 text-[var(--color-accent-fg)]" />
          </div>
          <div>
            <div className="text-xl font-semibold tracking-tight">Hermes Dashboard</div>
            <div className="text-xs text-[var(--color-muted)]">Secure control panel</div>
          </div>
        </div>

        <div className="glass rounded-2xl border border-[var(--color-border)] p-8 shadow-2xl">
          <h1 className="text-2xl font-semibold mb-1">مرحباً بعودتك</h1>
          <p className="text-sm text-[var(--color-muted)] mb-6">سجّل الدخول للوصول للوحة التحكم</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-strong)] mb-1.5">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted-strong)] mb-1.5">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-fg)] font-medium py-2.5 text-sm hover:bg-[var(--color-accent-hover)] transition disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              دخول
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--color-muted)] mt-6">
          محمي بطبقة مصادقة منفصلة عن خدمة Hermes
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
