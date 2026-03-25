'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface PipelineResult {
  success: boolean;
  tenantId?: string;
  slug?: string;
  appUrl?: string;
  steps?: Array<{ step: string; success: boolean; error?: string }>;
  error?: string;
  message?: string;
}

interface PipelineStatusProps {
  result: PipelineResult | null;
  isRunning: boolean;
  statusText?: string;
  secret: string;
  onReset: () => void;
  onRetry?: () => void;
}

export function PipelineStatus({ result, isRunning, statusText, secret, onReset, onRetry }: PipelineStatusProps) {
  if (isRunning) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assembling your app...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-sm text-muted-foreground">
              {statusText || 'Running pipeline — creating tenant, seeding data, running health check...'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-6">
      {/* Result Header */}
      <Card className={result.success ? 'border-green-500/50' : 'border-destructive/50'}>
        <CardHeader>
          <CardTitle className={result.success ? 'text-green-600' : 'text-destructive'}>
            {result.success ? 'App assembled successfully!' : 'Pipeline failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.message && (
            <p className="text-sm">{result.message}</p>
          )}
          {result.error && (
            <p className="text-sm text-destructive">{result.error}</p>
          )}
          {result.slug && (
            <div className="text-sm">
              <span className="text-muted-foreground">Slug: </span>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{result.slug}</code>
            </div>
          )}
          {result.tenantId && (
            <div className="text-sm">
              <span className="text-muted-foreground">Tenant ID: </span>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{result.tenantId}</code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      {result.steps && result.steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      step.success ? 'bg-green-500' : 'bg-destructive'
                    }`}
                  />
                  <span className="text-sm font-medium">{step.step}</span>
                  {step.error && (
                    <span className="text-xs text-destructive ml-auto">{step.error}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview iframe */}
      {result.success && result.appUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mx-auto" style={{ maxWidth: 400 }}>
              <div className="rounded-2xl border-4 border-foreground/10 overflow-hidden shadow-lg">
                <iframe
                  src={result.appUrl}
                  className="w-full bg-white"
                  style={{ height: 700 }}
                  title="App Preview"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                {result.appUrl}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bot Setup */}
      {result.success && result.appUrl && (
        <BotSetupCard appUrl={result.appUrl} secret={secret} />
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onReset}>
          Build another app
        </Button>
        {!result.success && onRetry && (
          <Button variant="destructive" onClick={onRetry}>
            Retry
          </Button>
        )}
        {result.success && result.appUrl && (
          <Button
            variant="default"
            onClick={() => window.open(result.appUrl, '_blank')}
          >
            Open in new tab
          </Button>
        )}
      </div>
    </div>
  );
}

/** Bot setup card — connect assembled app to a Telegram bot */
function BotSetupCard({ appUrl, secret }: { appUrl: string; secret: string }) {
  const [botToken, setBotToken] = useState('');
  const [menuText, setMenuText] = useState('Open App');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<{
    success: boolean;
    botUsername?: string;
    tMeLink?: string;
    error?: string;
    results?: Array<{ action: string; success: boolean; error?: string }>;
  } | null>(null);

  async function handleSetup() {
    if (!botToken.trim()) return;
    setLoading(true);
    setSetupResult(null);

    try {
      const res = await fetch('/api/orchestrator/bot/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          botToken,
          webAppUrl: appUrl,
          menuButtonText: menuText,
          description: description || undefined,
        }),
      });

      const data = await res.json();
      setSetupResult(data);
    } catch (err) {
      setSetupResult({
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connect to Telegram Bot</CardTitle>
        <CardDescription>
          Paste a bot token from @BotFather to set up the Menu Button automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Bot Token *</label>
            <Input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456:ABC-DEF..."
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Menu Button Text</label>
            <Input
              value={menuText}
              onChange={(e) => setMenuText(e.target.value)}
              placeholder="Open App"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Bot Description (optional)</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Your Mini App description"
          />
        </div>

        <Button
          onClick={handleSetup}
          disabled={!botToken.trim() || loading}
          variant="outline"
        >
          {loading ? 'Setting up...' : 'Setup Bot'}
        </Button>

        {setupResult && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              setupResult.success
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-destructive/50 bg-destructive/5'
            }`}
          >
            {setupResult.success ? (
              <>
                <p className="font-medium text-green-600">
                  Bot @{setupResult.botUsername} configured!
                </p>
                <p className="text-muted-foreground mt-1">
                  Open:{' '}
                  <a
                    href={setupResult.tMeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {setupResult.tMeLink}
                  </a>
                </p>
              </>
            ) : (
              <p className="text-destructive">{setupResult.error}</p>
            )}

            {setupResult.results && (
              <div className="mt-2 space-y-1">
                {setupResult.results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        r.success ? 'bg-green-500' : 'bg-destructive'
                      }`}
                    />
                    <span>{r.action}</span>
                    {r.error && (
                      <span className="text-destructive ml-auto">{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
