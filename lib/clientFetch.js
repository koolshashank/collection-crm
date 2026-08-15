"use client";

/**
 * Client-side fetch wrapper — every UI call goes through this.
 * Never throws: returns { ok, status, data, error }.
 * Redirects to /login on 401 (expired session).
 */
export async function clientFetch(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      credentials: "same-origin",
      ...options,
      signal: controller.signal,
    });
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
      return { ok: false, status: 401, data: null, error: "Session expired" };
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : (data?.message || `Request failed (${res.status})`) };
  } catch (err) {
    const aborted = err?.name === "AbortError";
    return {
      ok: false,
      status: 0,
      data: null,
      error: aborted ? "Request timed out — please try again" : "Network error — check your connection",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function postJson(url, body, timeoutMs) {
  return clientFetch(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
    timeoutMs
  );
}
