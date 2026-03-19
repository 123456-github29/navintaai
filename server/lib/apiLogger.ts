/**
 * Centralized API call logger for tracking all external API usage.
 * Stores recent logs in memory and outputs to console for debugging.
 */

import { log } from "../vite";

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  service: string;
  method: string;
  endpoint: string;
  durationMs: number;
  status: "success" | "error";
  statusCode?: number;
  error?: string;
  requestSummary?: string;
  responseSummary?: string;
}

const MAX_LOG_ENTRIES = 200;
const logEntries: ApiLogEntry[] = [];
let logCounter = 0;

function generateId(): string {
  return `api-${++logCounter}-${Date.now()}`;
}

function truncate(str: string, maxLen: number = 200): string {
  if (!str) return "";
  return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
}

export function getRecentLogs(limit: number = 50, service?: string): ApiLogEntry[] {
  let filtered = service
    ? logEntries.filter((e) => e.service === service)
    : logEntries;
  return filtered.slice(-limit);
}

export function clearLogs(): void {
  logEntries.length = 0;
}

export function getLogStats(): Record<string, { total: number; errors: number; avgDurationMs: number }> {
  const stats: Record<string, { total: number; errors: number; totalDuration: number }> = {};
  for (const entry of logEntries) {
    if (!stats[entry.service]) {
      stats[entry.service] = { total: 0, errors: 0, totalDuration: 0 };
    }
    stats[entry.service].total++;
    if (entry.status === "error") stats[entry.service].errors++;
    stats[entry.service].totalDuration += entry.durationMs;
  }
  const result: Record<string, { total: number; errors: number; avgDurationMs: number }> = {};
  for (const [svc, s] of Object.entries(stats)) {
    result[svc] = {
      total: s.total,
      errors: s.errors,
      avgDurationMs: s.total > 0 ? Math.round(s.totalDuration / s.total) : 0,
    };
  }
  return result;
}

/**
 * Log an external API call. Call this wrapper around any external API invocation.
 */
export async function logApiCall<T>(opts: {
  service: string;
  method: string;
  endpoint: string;
  requestSummary?: string;
  fn: () => Promise<T>;
}): Promise<T> {
  const start = Date.now();
  const entry: ApiLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    service: opts.service,
    method: opts.method,
    endpoint: opts.endpoint,
    durationMs: 0,
    status: "success",
    requestSummary: opts.requestSummary,
  };

  try {
    const result = await opts.fn();
    entry.durationMs = Date.now() - start;
    entry.status = "success";
    entry.responseSummary = truncate(
      typeof result === "string" ? result : JSON.stringify(result),
    );

    log(
      `[api:${entry.service}] ${entry.method} ${entry.endpoint} → 200 OK (${entry.durationMs}ms)`,
    );

    pushEntry(entry);
    return result;
  } catch (err: any) {
    entry.durationMs = Date.now() - start;
    entry.status = "error";
    entry.statusCode = err?.status || err?.statusCode;
    entry.error = truncate(err?.message || String(err));

    log(
      `[api:${entry.service}] ${entry.method} ${entry.endpoint} → ERROR ${entry.statusCode || "?"} (${entry.durationMs}ms): ${truncate(entry.error, 100)}`,
    );

    pushEntry(entry);
    throw err;
  }
}

function pushEntry(entry: ApiLogEntry): void {
  logEntries.push(entry);
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries.splice(0, logEntries.length - MAX_LOG_ENTRIES);
  }
}
