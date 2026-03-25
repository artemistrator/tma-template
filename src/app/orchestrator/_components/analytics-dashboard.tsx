'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AnalyticsData {
  totalAssemblies: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  byAppType: Record<string, { total: number; success: number }>;
  byCurrency: Record<string, number>;
  byLocale: Record<string, number>;
  avgDurationMs: number;
  recentAssemblies: Array<{
    slug: string;
    appType: string;
    success: boolean;
    itemCount: number;
    durationMs: number;
    timestamp: string;
    error?: string;
  }>;
}

interface AnalyticsDashboardProps {
  secret: string;
}

export function AnalyticsDashboard({ secret }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orchestrator/analytics', {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail — analytics is non-critical
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!data || data.totalAssemblies === 0) return null;

  const appTypes = Object.entries(data.byAppType);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Analytics</CardTitle>
            <CardDescription>{data.totalAssemblies} apps assembled</CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Collapse' : 'Details'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="Total" value={data.totalAssemblies} />
          <StatBox
            label="Success rate"
            value={`${data.successRate}%`}
            color={data.successRate >= 80 ? 'text-green-600' : data.successRate >= 50 ? 'text-yellow-600' : 'text-destructive'}
          />
          <StatBox label="Avg time" value={formatDuration(data.avgDurationMs)} />
          <StatBox label="Failed" value={data.failureCount} color={data.failureCount > 0 ? 'text-destructive' : undefined} />
        </div>

        {expanded && (
          <div className="mt-4 space-y-4">
            {/* By App Type */}
            {appTypes.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">By Type</h4>
                <div className="grid grid-cols-3 gap-2">
                  {appTypes.map(([type, stats]) => (
                    <div key={type} className="rounded-md border px-3 py-2">
                      <p className="text-xs text-muted-foreground capitalize">{type}</p>
                      <p className="text-sm font-semibold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}% success
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent assemblies */}
            {data.recentAssemblies.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Recent ({Math.min(data.recentAssemblies.length, 10)})
                </h4>
                <div className="space-y-1.5">
                  {data.recentAssemblies.slice(0, 10).map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/50 last:border-0">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          entry.success ? 'bg-green-500' : 'bg-destructive'
                        }`}
                      />
                      <code className="font-mono">{entry.slug}</code>
                      <span className="text-muted-foreground capitalize">{entry.appType}</span>
                      <span className="text-muted-foreground">{entry.itemCount} items</span>
                      <span className="text-muted-foreground ml-auto">
                        {formatDuration(entry.durationMs)}
                      </span>
                      <span className="text-muted-foreground">
                        {formatTimeAgo(entry.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="text-xs"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color || ''}`}>{value}</p>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
