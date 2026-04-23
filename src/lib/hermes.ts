"use client";

export async function hermes<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const url = `/api/hermes/${path.replace(/^\//, "")}`;
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hermes ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}
