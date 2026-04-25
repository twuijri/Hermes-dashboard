"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  MessagesSquare,
  Search,
  Trash2,
  Terminal,
  MessageCircle,
  Hash,
  Globe,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, type SessionInfo, type SessionSearchResult } from "@/lib/hermes-api";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Spinner,
} from "@/components/ui-kit";

const PAGE_SIZE = 20;

const SOURCE_ICON: Record<string, typeof Terminal> = {
  cli: Terminal,
  telegram: MessageCircle,
  discord: Hash,
  slack: MessagesSquare,
  whatsapp: Globe,
  cron: Clock,
};

function timeAgo(ts: number) {
  const sec = (Date.now() - ts * 1000) / 1000;
  if (sec < 60) return `${Math.floor(sec)} ث`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} س`;
  return `${Math.floor(h / 24)} ي`;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SessionSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async (off: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSessions(PAGE_SIZE, off);
      setSessions(data.sessions);
      setTotal(data.total);
      setOffset(off);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      load(0);
    }
  }, [search, load]);

  useEffect(() => {
    if (!search.trim()) return;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const r = await api.searchSessions(search.trim());
        setSearchResults(r.results);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm("حذف الجلسة نهائياً؟")) return;
    try {
      await api.deleteSession(id);
      load(offset);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <MessagesSquare className="size-3.5" />
            <span>الجلسات</span>
          </>
        }
        title="جلسات المحادثة"
        description={`${total} جلسة محفوظة`}
      />

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted)]" />
        <input
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pr-10 pl-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          placeholder="بحث في محتوى الجلسات…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <ErrorBanner message={error} onRetry={() => load(offset)} />}

      {searchResults !== null ? (
        <Card>
          <CardBody className="p-0">
            {searching ? (
              <div className="py-12 flex justify-center">
                <Spinner />
              </div>
            ) : searchResults.length === 0 ? (
              <EmptyState
                icon={Search}
                title="لا نتائج"
                description={`لم يُعثر على أي جلسة تحتوي "${search}"`}
              />
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {searchResults.map((r, i) => (
                  <Link
                    key={i}
                    href={`/sessions/${r.session_id}`}
                    className="block px-4 py-3 hover:bg-[var(--color-surface-hover)] transition"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-[10px] font-mono text-[var(--color-muted)]">
                        {r.session_id.slice(0, 8)}
                      </code>
                      {r.source && <Badge>{r.source}</Badge>}
                      {r.role && <Badge tone="accent">{r.role}</Badge>}
                    </div>
                    <SnippetHighlight snippet={r.snippet} />
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ) : loading && sessions.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Spinner />
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessagesSquare}
            title="لا توجد جلسات"
            description="بمجرد ما يستقبل البوت رسالة، تظهر هنا."
          />
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-[var(--color-muted)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-right font-medium px-4 py-2.5">العنوان</th>
                  <th className="text-right font-medium px-4 py-2.5">المصدر</th>
                  <th className="text-right font-medium px-4 py-2.5">الموديل</th>
                  <th className="text-right font-medium px-4 py-2.5">رسائل</th>
                  <th className="text-right font-medium px-4 py-2.5">توكنز</th>
                  <th className="text-right font-medium px-4 py-2.5">آخر نشاط</th>
                  <th className="text-right font-medium px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const Icon = (s.source && SOURCE_ICON[s.source]) || MessagesSquare;
                  return (
                    <tr
                      key={s.id}
                      className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-surface-hover)]/50"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/sessions/${s.id}`}
                          className="hover:text-[var(--color-accent)] transition flex items-center gap-2"
                        >
                          <span className="truncate max-w-xs block">
                            {s.title ?? <span className="text-[var(--color-muted)]">بدون عنوان</span>}
                          </span>
                          {s.is_active && <Badge tone="success">نشطة</Badge>}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-strong)]">
                          <Icon className="size-3.5" />
                          {s.source ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-muted-strong)]">
                        {s.model ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--color-muted-strong)]">
                        {s.message_count}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--color-muted-strong)] tabular-nums">
                        {(s.input_tokens + s.output_tokens).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">
                        {timeAgo(s.last_active)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(s.id)}
                          title="حذف"
                        >
                          <Trash2 className="size-3.5 text-[var(--color-danger)]" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {searchResults === null && total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-muted)]">
            صفحة {currentPage} من {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              icon={ChevronRight}
              disabled={offset === 0}
              onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
            >
              السابق
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => load(offset + PAGE_SIZE)}
            >
              التالي
              <ChevronLeft className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SnippetHighlight({ snippet }: { snippet: string }) {
  const parts: React.ReactNode[] = [];
  const regex = />>>(.*?)<<</g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(snippet)) !== null) {
    if (match.index > last) parts.push(snippet.slice(last, match.index));
    parts.push(
      <mark key={i++} className="bg-[var(--color-warn)]/30 text-[var(--color-warn)] px-0.5 rounded">
        {match[1]}
      </mark>,
    );
    last = regex.lastIndex;
  }
  if (last < snippet.length) parts.push(snippet.slice(last));
  return <p className="text-xs text-[var(--color-muted-strong)] mt-0.5">{parts}</p>;
}
