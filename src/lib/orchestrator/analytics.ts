/**
 * Orchestrator Analytics — lightweight in-memory + file-backed stats.
 *
 * Tracks: total assemblies, success/failure counts, per-appType breakdown,
 * recent assembly log (last 100 entries).
 *
 * Data is persisted to a JSON file so it survives server restarts.
 * File path: .orchestrator-analytics.json (project root, gitignored).
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.orchestrator-data');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const MAX_LOG_ENTRIES = 100;

export interface AssemblyEvent {
  slug: string;
  appType: 'ecommerce' | 'booking' | 'infobiz';
  success: boolean;
  itemCount: number;
  locale: string;
  currency: string;
  durationMs: number;
  error?: string;
  timestamp: string; // ISO
}

export interface AnalyticsData {
  totalAssemblies: number;
  successCount: number;
  failureCount: number;
  byAppType: Record<string, { total: number; success: number }>;
  byCurrency: Record<string, number>;
  byLocale: Record<string, number>;
  avgDurationMs: number;
  recentAssemblies: AssemblyEvent[];
}

const DEFAULT_DATA: AnalyticsData = {
  totalAssemblies: 0,
  successCount: 0,
  failureCount: 0,
  byAppType: {},
  byCurrency: {},
  byLocale: {},
  avgDurationMs: 0,
  recentAssemblies: [],
};

/** In-memory cache */
let cached: AnalyticsData | null = null;

async function ensureDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

async function loadData(): Promise<AnalyticsData> {
  if (cached) return cached;

  try {
    const raw = await readFile(ANALYTICS_FILE, 'utf-8');
    cached = { ...DEFAULT_DATA, ...JSON.parse(raw) };
    return cached!;
  } catch {
    cached = { ...DEFAULT_DATA };
    return cached;
  }
}

async function saveData(data: AnalyticsData): Promise<void> {
  await ensureDir();
  cached = data;
  await writeFile(ANALYTICS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Record a pipeline assembly event.
 */
export async function trackAssembly(event: Omit<AssemblyEvent, 'timestamp'>): Promise<void> {
  const data = await loadData();

  const entry: AssemblyEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  data.totalAssemblies++;
  if (event.success) {
    data.successCount++;
  } else {
    data.failureCount++;
  }

  // By appType
  if (!data.byAppType[event.appType]) {
    data.byAppType[event.appType] = { total: 0, success: 0 };
  }
  data.byAppType[event.appType].total++;
  if (event.success) data.byAppType[event.appType].success++;

  // By currency
  data.byCurrency[event.currency] = (data.byCurrency[event.currency] || 0) + 1;

  // By locale
  data.byLocale[event.locale] = (data.byLocale[event.locale] || 0) + 1;

  // Avg duration (rolling average)
  data.avgDurationMs = Math.round(
    (data.avgDurationMs * (data.totalAssemblies - 1) + event.durationMs) / data.totalAssemblies,
  );

  // Recent log (FIFO, max 100)
  data.recentAssemblies.unshift(entry);
  if (data.recentAssemblies.length > MAX_LOG_ENTRIES) {
    data.recentAssemblies = data.recentAssemblies.slice(0, MAX_LOG_ENTRIES);
  }

  await saveData(data);
}

/**
 * Get current analytics data.
 */
export async function getAnalytics(): Promise<AnalyticsData> {
  return loadData();
}

/**
 * Reset analytics (for testing).
 */
export async function resetAnalytics(): Promise<void> {
  await saveData({ ...DEFAULT_DATA });
}
