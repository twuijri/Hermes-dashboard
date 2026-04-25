"use client";
import { cn } from "@/lib/utils";
import { Loader2, type LucideIcon } from "lucide-react";
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode, forwardRef } from "react";

type Variant = "default" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  default:
    "bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] border border-transparent",
  outline:
    "bg-transparent text-[var(--color-fg)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]",
  ghost:
    "bg-transparent text-[var(--color-muted-strong)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-hover)] border border-transparent",
  danger:
    "bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 border border-[var(--color-danger)]/30",
  success:
    "bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20 border border-[var(--color-success)]/30",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", icon: Icon, loading, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed select-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...rest}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          Icon && <Icon className="size-3.5 shrink-0" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)]",
        "placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/40",
        "disabled:opacity-50 disabled:cursor-not-allowed transition",
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-fg)] resize-y",
        "placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/40",
        "disabled:opacity-50 disabled:cursor-not-allowed transition font-mono",
        className,
      )}
      {...rest}
    />
  ),
);
Textarea.displayName = "Textarea";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "glass rounded-xl border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-5 border-b border-[var(--color-border)]", className)}>{children}</div>;
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warn";
const badgeClasses: Record<BadgeTone, string> = {
  neutral: "bg-[var(--color-surface)] text-[var(--color-muted-strong)] border-[var(--color-border)]",
  accent: "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/30",
  success: "bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30",
  danger: "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30",
  warn: "bg-[var(--color-warn)]/15 text-[var(--color-warn)] border-[var(--color-warn)]/30",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium",
        badgeClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-[var(--color-muted)]", className)} />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 mb-8">
      <div className="min-w-0">
        {eyebrow && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] mb-2">{eyebrow}</div>
        )}
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-[var(--color-muted)] mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4 flex items-start gap-3">
      <div className="text-sm flex-1">
        <div className="font-medium text-[var(--color-danger)] mb-0.5">حدث خطأ</div>
        <div className="text-[var(--color-muted)] text-xs break-all">{message}</div>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-16 px-6">
      {Icon && <Icon className="size-10 mx-auto text-[var(--color-muted)] mb-4 opacity-60" />}
      <div className="text-sm font-medium text-[var(--color-fg)] mb-1">{title}</div>
      {description && <div className="text-xs text-[var(--color-muted)] max-w-sm mx-auto">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--color-muted-strong)] mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block text-[11px] text-[var(--color-muted)] mt-1">{hint}</span>}
      {error && <span className="block text-[11px] text-[var(--color-danger)] mt-1">{error}</span>}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-white transition-transform",
          checked ? "translate-x-[-18px]" : "translate-x-[-2px]",
        )}
      />
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "glass rounded-xl border border-[var(--color-border)] shadow-2xl w-full overflow-hidden",
          width,
        )}
      >
        {title && (
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="text-sm font-semibold">{title}</div>
            <button
              onClick={onClose}
              className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition"
              aria-label="إغلاق"
            >
              ×
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
