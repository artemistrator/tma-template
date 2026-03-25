import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TMA Orchestrator',
  description: 'Internal production cockpit for assembling Telegram Mini Apps',
};

export default function OrchestratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 select-auto">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-4xl font-semibold tracking-tight">TMA Orchestrator</h1>
          <p className="mt-2 max-w-2xl text-zinc-600">
            Internal production cockpit for assembling Telegram Mini Apps with previews, presets,
            and client-ready configuration.
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}
