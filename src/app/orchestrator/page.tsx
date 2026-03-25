'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { BriefForm, type BriefFormData, type ImageFiles, type StaffImageFiles } from './_components/brief-form';
import { PipelineStatus, type PipelineResult } from './_components/pipeline-status';
import { AnalyticsDashboard } from './_components/analytics-dashboard';
import { AiPromptForm } from './_components/ai-prompt-form';

type PageState = 'form' | 'running' | 'done';
type FormMode = 'manual' | 'ai';

const SECRET_KEY = 'orchestrator_secret';

export default function OrchestratorPage() {
  const [state, setState] = useState<PageState>('form');
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [secret, setSecret] = useState('');
  const [statusText, setStatusText] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('manual');

  const lastBriefRef = useRef<{ brief: BriefFormData; imageFiles: ImageFiles; logoFile: File | null; staffImageFiles: StaffImageFiles } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(SECRET_KEY);
    if (saved) setSecret(saved);
  }, []);

  function handleSecretChange(value: string) {
    setSecret(value);
    localStorage.setItem(SECRET_KEY, value);
  }

  async function handleGo(brief: BriefFormData, imageFiles: ImageFiles, logoFile: File | null, staffImageFiles: StaffImageFiles) {
    if (!secret.trim()) {
      alert('Please enter the ORCHESTRATOR_SECRET first');
      return;
    }

    lastBriefRef.current = { brief, imageFiles, logoFile, staffImageFiles };

    setState('running');
    setResult(null);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    };

    try {
      // Step 1: Upload logo if provided
      let logoAssetId: string | undefined;
      if (logoFile) {
        setStatusText('Uploading logo...');
        const base64 = await fileToBase64(logoFile);
        const uploadRes = await fetch('/api/orchestrator/upload', {
          method: 'POST',
          headers,
          body: JSON.stringify({ base64, filename: `logo-${brief.slug}.${logoFile.name.split('.').pop()}` }),
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          logoAssetId = data.assetId;
        }
      }

      // Step 2: Upload item images
      const fileEntries = Object.entries(imageFiles);
      const assetMap: Record<number, string> = {};

      if (fileEntries.length > 0) {
        setStatusText(`Uploading ${fileEntries.length} item images...`);
        for (const [indexStr, file] of fileEntries) {
          const index = parseInt(indexStr);
          const base64 = await fileToBase64(file);
          const uploadRes = await fetch('/api/orchestrator/upload', {
            method: 'POST',
            headers,
            body: JSON.stringify({ base64, filename: file.name }),
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            assetMap[index] = data.assetId;
          }
        }
      }

      // Step 3: Upload staff images
      const staffEntries = Object.entries(staffImageFiles);
      const staffAssetMap: Record<number, string> = {};

      if (staffEntries.length > 0) {
        setStatusText(`Uploading ${staffEntries.length} staff photos...`);
        for (const [indexStr, file] of staffEntries) {
          const index = parseInt(indexStr);
          const base64 = await fileToBase64(file);
          const uploadRes = await fetch('/api/orchestrator/upload', {
            method: 'POST',
            headers,
            body: JSON.stringify({ base64, filename: `staff-${index}-${file.name}` }),
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            staffAssetMap[index] = data.assetId;
          }
        }
      }

      // Step 4: Merge asset IDs into items
      const itemsWithImages = brief.items.map((item, i) => {
        if (assetMap[i]) return { ...item, image: assetMap[i] };
        return item;
      });

      // Step 5: Merge asset IDs into staff
      const staffWithImages = brief.staff?.map((member, i) => {
        if (staffAssetMap[i]) return { ...member, image: staffAssetMap[i] };
        return member;
      });

      // Step 6: Run pipeline
      setStatusText('Running pipeline...');

      const res = await fetch('/api/orchestrator/run', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...brief,
          items: itemsWithImages,
          staff: staffWithImages,
          logoAssetId,
        }),
      });

      const data = await res.json();

      // Step 7: Set marketing data if we have features, promo, or testimonials
      if (data.success && (brief.features?.length || brief.promo || brief.testimonials?.length)) {
        setStatusText('Setting marketing data...');
        const marketingBody: Record<string, unknown> = { tenantSlug: brief.slug };
        if (brief.features?.length) marketingBody.features = brief.features;
        if (brief.promo?.title) {
          marketingBody.promo = brief.promo;
        }
        if (brief.testimonials?.length) marketingBody.testimonials = brief.testimonials;

        await fetch('/api/orchestrator/marketing', {
          method: 'POST',
          headers,
          body: JSON.stringify(marketingBody),
        }).catch(() => {}); // non-critical
      }

      setResult(data);
      setState('done');
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
        steps: [],
      });
      setState('done');
    } finally {
      setStatusText('');
    }
  }

  async function handleAiGenerate(prompt: string) {
    if (!secret.trim()) {
      alert('Please enter the ORCHESTRATOR_SECRET first');
      return;
    }

    setState('running');
    setResult(null);
    setStatusText('AI is generating your app...');

    const lowerPrompt = prompt.toLowerCase();
    let detectedAppType: string | undefined;
    const bookingKeywords = ['booking', 'барбер', 'barber', 'салон', 'salon', 'запись', 'услуг', 'service', 'стрижк', 'маникюр', 'массаж', 'клиник', 'clinic', 'spa', 'спа', 'фитнес', 'fitness', 'мастер', 'расписани', 'schedule', 'working hours', 'часы работы', 'staff', 'персонал'];
    const infobizKeywords = ['курс', 'course', 'обучени', 'инфобиз', 'infobiz', 'вебинар', 'webinar', 'консультац', 'consultation', 'менторств', 'mentor', 'урок', 'lesson', 'pdf', 'article', 'статья', 'knowledge', 'знания', 'coach'];

    if (bookingKeywords.some(kw => lowerPrompt.includes(kw))) detectedAppType = 'booking';
    else if (infobizKeywords.some(kw => lowerPrompt.includes(kw))) detectedAppType = 'infobiz';

    try {
      const res = await fetch('/api/orchestrator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ mode: 'full', prompt, ...(detectedAppType ? { appType: detectedAppType } : {}) }),
      });

      const data = await res.json();
      setResult({
        success: data.success,
        tenantId: data.tenantId,
        slug: data.slug,
        appUrl: data.appUrl,
        steps: data.steps || [],
        error: data.error,
        message: data.message,
      });
      setState('done');
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : 'Network error', steps: [] });
      setState('done');
    } finally {
      setStatusText('');
    }
  }

  function handleRetry() {
    if (lastBriefRef.current) {
      const { brief, imageFiles, logoFile, staffImageFiles } = lastBriefRef.current;
      handleGo(brief, imageFiles, logoFile, staffImageFiles);
    }
  }

  function handleReset() {
    setState('form');
    setResult(null);
  }

  return (
    <div className="space-y-6">
      {/* Secret input */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block">API Secret</label>
            <Input
              type="password"
              value={secret}
              onChange={(e) => handleSecretChange(e.target.value)}
              placeholder="Enter ORCHESTRATOR_SECRET"
              className="max-w-md font-mono rounded-2xl"
            />
            <p className="text-xs text-zinc-500 mt-1">Saved in localStorage. Required for all API calls.</p>
          </div>
        </div>
      </div>

      {/* Analytics */}
      {state === 'form' && <AnalyticsDashboard secret={secret} />}

      {/* Mode tabs */}
      {state === 'form' && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFormMode('manual')}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
              formMode === 'manual'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Manual / Templates
          </button>
          <button
            type="button"
            onClick={() => setFormMode('ai')}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
              formMode === 'ai'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            AI Mode
          </button>
        </div>
      )}

      {/* Main content */}
      {state === 'form' && formMode === 'manual' && <BriefForm onSubmit={handleGo} secret={secret} />}
      {state === 'form' && formMode === 'ai' && (
        <AiPromptForm onSubmit={handleAiGenerate} isDisabled={!secret.trim()} />
      )}

      {state !== 'form' && (
        <PipelineStatus
          result={result}
          isRunning={state === 'running'}
          statusText={statusText}
          secret={secret}
          onReset={handleReset}
          onRetry={result && !result.success ? handleRetry : undefined}
        />
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
