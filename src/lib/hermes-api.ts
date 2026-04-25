const BASE = "/api/hermes";

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function fetchVoid(path: string, init?: RequestInit): Promise<void> {
  const url = `${BASE}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
}

export const api = {
  // Status & gateway
  getStatus: () => fetchJSON<StatusResponse>("api/status"),
  restartGateway: () =>
    fetchJSON<ActionResponse>("api/gateway/restart", { method: "POST" }),
  updateHermes: () =>
    fetchJSON<ActionResponse>("api/hermes/update", { method: "POST" }),
  getActionStatus: (name: string, lines = 200) =>
    fetchJSON<ActionStatusResponse>(
      `api/actions/${encodeURIComponent(name)}/status?lines=${lines}`,
    ),

  // Sessions
  getSessions: (limit = 20, offset = 0) =>
    fetchJSON<PaginatedSessions>(`api/sessions?limit=${limit}&offset=${offset}`),
  searchSessions: (q: string) =>
    fetchJSON<SessionSearchResponse>(`api/sessions/search?q=${encodeURIComponent(q)}`),
  getSessionMessages: (id: string) =>
    fetchJSON<SessionMessagesResponse>(`api/sessions/${encodeURIComponent(id)}/messages`),
  deleteSession: (id: string) =>
    fetchJSON<{ ok: boolean }>(`api/sessions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  // Logs
  getLogs: (params: { file?: string; lines?: number; level?: string; component?: string }) => {
    const qs = new URLSearchParams();
    if (params.file) qs.set("file", params.file);
    if (params.lines) qs.set("lines", String(params.lines));
    if (params.level && params.level !== "ALL") qs.set("level", params.level);
    if (params.component && params.component !== "all") qs.set("component", params.component);
    return fetchJSON<LogsResponse>(`api/logs?${qs.toString()}`);
  },

  // Analytics
  getAnalytics: (days: number) =>
    fetchJSON<AnalyticsResponse>(`api/analytics/usage?days=${days}`),

  // Config
  getConfig: () => fetchJSON<Record<string, unknown>>("api/config"),
  getDefaults: () => fetchJSON<Record<string, unknown>>("api/config/defaults"),
  getSchema: () =>
    fetchJSON<{ fields: Record<string, ConfigFieldSchema>; category_order: string[] }>(
      "api/config/schema",
    ),
  getModelInfo: () => fetchJSON<ModelInfoResponse>("api/model/info"),
  saveConfig: (config: Record<string, unknown>) =>
    fetchJSON<{ ok: boolean }>("api/config", {
      method: "PUT",
      body: JSON.stringify({ config }),
    }),
  getConfigRaw: () => fetchJSON<{ yaml: string }>("api/config/raw"),
  saveConfigRaw: (yaml_text: string) =>
    fetchJSON<{ ok: boolean }>("api/config/raw", {
      method: "PUT",
      body: JSON.stringify({ yaml_text }),
    }),

  // Env (API keys)
  getEnvVars: () => fetchJSON<Record<string, EnvVarInfo>>("api/env"),
  setEnvVar: (key: string, value: string) =>
    fetchJSON<{ ok: boolean }>("api/env", {
      method: "PUT",
      body: JSON.stringify({ key, value }),
    }),
  deleteEnvVar: (key: string) =>
    fetchJSON<{ ok: boolean }>("api/env", {
      method: "DELETE",
      body: JSON.stringify({ key }),
    }),
  revealEnvVar: (key: string) =>
    fetchJSON<{ key: string; value: string }>("api/env/reveal", {
      method: "POST",
      body: JSON.stringify({ key }),
    }),

  // OAuth providers
  getOAuthProviders: () =>
    fetchJSON<OAuthProvidersResponse>("api/providers/oauth"),
  disconnectOAuthProvider: (providerId: string) =>
    fetchJSON<{ ok: boolean; provider: string }>(
      `api/providers/oauth/${encodeURIComponent(providerId)}`,
      { method: "DELETE" },
    ),
  startOAuthLogin: (providerId: string) =>
    fetchJSON<OAuthStartResponse>(
      `api/providers/oauth/${encodeURIComponent(providerId)}/start`,
      { method: "POST", body: "{}" },
    ),
  submitOAuthCode: (providerId: string, sessionId: string, code: string) =>
    fetchJSON<OAuthSubmitResponse>(
      `api/providers/oauth/${encodeURIComponent(providerId)}/submit`,
      { method: "POST", body: JSON.stringify({ session_id: sessionId, code }) },
    ),
  pollOAuthSession: (providerId: string, sessionId: string) =>
    fetchJSON<OAuthPollResponse>(
      `api/providers/oauth/${encodeURIComponent(providerId)}/poll/${encodeURIComponent(sessionId)}`,
    ),
  cancelOAuthSession: (sessionId: string) =>
    fetchJSON<{ ok: boolean }>(
      `api/providers/oauth/sessions/${encodeURIComponent(sessionId)}`,
      { method: "DELETE" },
    ),

  // Cron
  getCronJobs: () => fetchJSON<CronJob[]>("api/cron/jobs"),
  getCronJob: (id: string) =>
    fetchJSON<CronJob>(`api/cron/jobs/${encodeURIComponent(id)}`),
  createCronJob: (job: { prompt: string; schedule: string; name?: string; deliver?: string }) =>
    fetchJSON<CronJob>("api/cron/jobs", {
      method: "POST",
      body: JSON.stringify(job),
    }),
  updateCronJob: (id: string, patch: Partial<{ prompt: string; schedule: string; name: string; deliver: string }>) =>
    fetchJSON<CronJob>(`api/cron/jobs/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  pauseCronJob: (id: string) =>
    fetchJSON<{ ok: boolean }>(`api/cron/jobs/${encodeURIComponent(id)}/pause`, { method: "POST" }),
  resumeCronJob: (id: string) =>
    fetchJSON<{ ok: boolean }>(`api/cron/jobs/${encodeURIComponent(id)}/resume`, { method: "POST" }),
  triggerCronJob: (id: string) =>
    fetchJSON<{ ok: boolean }>(`api/cron/jobs/${encodeURIComponent(id)}/trigger`, { method: "POST" }),
  deleteCronJob: (id: string) =>
    fetchJSON<{ ok: boolean }>(`api/cron/jobs/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // Skills
  getSkills: () => fetchJSON<SkillInfo[]>("api/skills"),
  toggleSkill: (name: string, enabled: boolean) =>
    fetchJSON<{ ok: boolean }>("api/skills/toggle", {
      method: "PUT",
      body: JSON.stringify({ name, enabled }),
    }),
  getToolsets: () => fetchJSON<ToolsetInfo[]>("api/tools/toolsets"),
};

// ── Types ───────────────────────────────────────────────────────────────

export interface ActionResponse {
  name: string;
  ok: boolean;
  pid: number;
}

export interface ActionStatusResponse {
  exit_code: number | null;
  lines: string[];
  name: string;
  pid: number | null;
  running: boolean;
}

export interface PlatformStatus {
  error_code?: string;
  error_message?: string;
  state: string;
  updated_at: string;
}

export interface StatusResponse {
  active_sessions: number;
  config_path: string;
  config_version: number;
  env_path: string;
  gateway_exit_reason: string | null;
  gateway_health_url: string | null;
  gateway_pid: number | null;
  gateway_platforms: Record<string, PlatformStatus>;
  gateway_running: boolean;
  gateway_state: string | null;
  gateway_updated_at: string | null;
  hermes_home: string;
  latest_config_version: number;
  release_date: string;
  version: string;
  recent_sessions?: Array<{
    id?: string;
    title?: string;
    model?: string;
    message_count?: number;
    total_tokens?: number;
  }>;
}

export interface SessionInfo {
  id: string;
  source: string | null;
  model: string | null;
  title: string | null;
  started_at: number;
  ended_at: number | null;
  last_active: number;
  is_active: boolean;
  message_count: number;
  tool_call_count: number;
  input_tokens: number;
  output_tokens: number;
  preview: string | null;
}

export interface PaginatedSessions {
  sessions: SessionInfo[];
  total: number;
  limit: number;
  offset: number;
}

export interface EnvVarInfo {
  is_set: boolean;
  redacted_value: string | null;
  description: string;
  url: string | null;
  category: string;
  is_password: boolean;
  tools: string[];
  advanced: boolean;
}

export interface SessionMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    function: { name: string; arguments: string };
  }>;
  tool_name?: string;
  tool_call_id?: string;
  timestamp?: number;
}

export interface SessionMessagesResponse {
  session_id: string;
  messages: SessionMessage[];
}

export interface LogsResponse {
  file: string;
  lines: string[];
}

export interface AnalyticsDailyEntry {
  day: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  reasoning_tokens: number;
  estimated_cost: number;
  actual_cost: number;
  sessions: number;
  api_calls: number;
}

export interface AnalyticsModelEntry {
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  sessions: number;
  api_calls: number;
}

export interface AnalyticsSkillEntry {
  skill: string;
  view_count: number;
  manage_count: number;
  total_count: number;
  percentage: number;
  last_used_at: number | null;
}

export interface AnalyticsSkillsSummary {
  total_skill_loads: number;
  total_skill_edits: number;
  total_skill_actions: number;
  distinct_skills_used: number;
}

export interface AnalyticsResponse {
  daily: AnalyticsDailyEntry[];
  by_model: AnalyticsModelEntry[];
  totals: {
    total_input: number;
    total_output: number;
    total_cache_read: number;
    total_reasoning: number;
    total_estimated_cost: number;
    total_actual_cost: number;
    total_sessions: number;
    total_api_calls: number;
  };
  skills: {
    summary: AnalyticsSkillsSummary;
    top_skills: AnalyticsSkillEntry[];
  };
}

export interface CronJob {
  id: string;
  name?: string;
  prompt: string;
  schedule: { kind: string; expr: string; display: string };
  schedule_display: string;
  enabled: boolean;
  state: string;
  deliver?: string;
  last_run_at?: string | null;
  next_run_at?: string | null;
  last_error?: string | null;
}

export interface SkillInfo {
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

export interface ToolsetInfo {
  name: string;
  label: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  tools: string[];
}

export interface SessionSearchResult {
  session_id: string;
  snippet: string;
  role: string | null;
  source: string | null;
  model: string | null;
  session_started: number | null;
}

export interface SessionSearchResponse {
  results: SessionSearchResult[];
}

export interface ModelInfoResponse {
  model: string;
  provider: string;
  auto_context_length: number;
  config_context_length: number;
  effective_context_length: number;
  capabilities: {
    supports_tools?: boolean;
    supports_vision?: boolean;
    supports_reasoning?: boolean;
    context_window?: number;
    max_output_tokens?: number;
    model_family?: string;
  };
}

export interface OAuthProviderStatus {
  logged_in: boolean;
  source?: string | null;
  source_label?: string | null;
  token_preview?: string | null;
  expires_at?: string | null;
  has_refresh_token?: boolean;
  last_refresh?: string | null;
  error?: string;
}

export interface OAuthProvider {
  id: string;
  name: string;
  flow: "pkce" | "device_code" | "external";
  cli_command: string;
  docs_url: string;
  status: OAuthProviderStatus;
}

export interface OAuthProvidersResponse {
  providers: OAuthProvider[];
}

export type OAuthStartResponse =
  | {
      session_id: string;
      flow: "pkce";
      auth_url: string;
      expires_in: number;
    }
  | {
      session_id: string;
      flow: "device_code";
      user_code: string;
      verification_url: string;
      expires_in: number;
      poll_interval: number;
    };

export interface OAuthSubmitResponse {
  ok: boolean;
  status: "approved" | "error";
  message?: string;
}

export interface OAuthPollResponse {
  session_id: string;
  status: "pending" | "approved" | "denied" | "expired" | "error";
  error_message?: string | null;
  expires_at?: number | null;
}

export interface ConfigFieldSchema {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  category?: string;
  enum?: string[];
  default?: unknown;
  advanced?: boolean;
}

// re-export helper for pages that need raw fetch
export { fetchJSON, fetchVoid };
