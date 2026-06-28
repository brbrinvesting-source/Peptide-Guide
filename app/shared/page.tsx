'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { peptides } from '@/lib/peptide-data';
import { ROUTE_LABELS, type Cycle } from '@/lib/types';

const LS_KEY = 'peptide-cycles';

const BAR_COLORS = [
  'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500',
  'bg-cyan-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500',
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPeptideName(id: string): string {
  return peptides.find((p) => p.id === id)?.name ?? id;
}

function decodeCycle(encoded: string): Cycle | null {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = decodeURIComponent(atob(padded));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

function cycleDuration(cycle: Cycle): string {
  const dates = cycle.entries.flatMap((e) => [e.startDate, e.endDate]).filter(Boolean);
  if (!dates.length) return '—';
  const min = dates.reduce((a, b) => (a < b ? a : b));
  const max = dates.reduce((a, b) => (a > b ? a : b));
  const d = diffDays(min, max);
  if (d < 7) return `${d} days`;
  const w = Math.round(d / 7);
  return `${w} week${w !== 1 ? 's' : ''}`;
}

function SharedCycleInner() {
  const searchParams = useSearchParams();
  const encoded = searchParams.get('c') ?? '';
  const [status, setStatus] = useState<'idle' | 'imported' | 'duplicate'>('idle');

  const cycle = decodeCycle(encoded);

  useEffect(() => {
    if (!cycle) return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      const existing: Cycle[] = raw ? JSON.parse(raw) : [];
      if (existing.some((c) => c.name === cycle.name && c.createdAt === cycle.createdAt)) {
        setStatus('duplicate');
      }
    } catch {}
  }, []);

  if (!encoded || !cycle) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white mb-2">Invalid Share Link</h1>
          <p className="text-sm text-gray-500 mb-6">This link is missing or malformed. Ask the sender to regenerate it.</p>
          <Link
            href="/cycle-builder"
            className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
          >
            Go to Cycle Builder
          </Link>
        </div>
      </div>
    );
  }

  function handleImport() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const existing: Cycle[] = raw ? JSON.parse(raw) : [];
      const imported: Cycle = { ...cycle!, id: generateId(), logs: cycle!.logs ?? [] };
      localStorage.setItem(LS_KEY, JSON.stringify([...existing, imported]));
      setStatus('imported');
    } catch {
      alert('Failed to import. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/60 py-10 px-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Peptide Guide
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-xs text-gray-500">Shared Cycle</span>
          </div>
          <h1 className="text-3xl font-bold text-white">{cycle.name}</h1>
          {cycle.goal && <p className="mt-1 text-sm text-green-400">Goal: {cycle.goal}</p>}
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
            <span>{cycle.entries.length} peptide{cycle.entries.length !== 1 ? 's' : ''}</span>
            <span>Duration: {cycleDuration(cycle)}</span>
            {cycle.breakAfterWeeks && <span>Break: {cycle.breakAfterWeeks}w</span>}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">

        {/* Import CTA */}
        <div className="rounded-xl border border-green-800/40 bg-green-950/20 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          {status === 'imported' ? (
            <>
              <div className="flex-1">
                <p className="font-semibold text-green-400">Cycle added to your library!</p>
                <p className="text-xs text-gray-400 mt-0.5">You can view, edit, and log it in the Cycle Builder.</p>
              </div>
              <Link
                href="/cycle-builder"
                className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Open Cycle Builder →
              </Link>
            </>
          ) : status === 'duplicate' ? (
            <>
              <div className="flex-1">
                <p className="font-semibold text-gray-300">Already in your library</p>
                <p className="text-xs text-gray-500 mt-0.5">A cycle with this name is already saved on this device.</p>
              </div>
              <Link
                href="/cycle-builder"
                className="px-5 py-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                View My Cycles →
              </Link>
            </>
          ) : (
            <>
              <div className="flex-1">
                <p className="font-semibold text-gray-100">Add this cycle to your library</p>
                <p className="text-xs text-gray-400 mt-0.5">Saved locally — edit, log doses, and track progress.</p>
              </div>
              <button
                onClick={handleImport}
                className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Add to My Cycles
              </button>
            </>
          )}
        </div>

        {/* Peptide entries */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-100">Peptides in this Cycle</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {cycle.entries.map((e, i) => (
              <div key={i} className="rounded-lg bg-gray-800 border border-gray-700/50 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                  <Link
                    href={`/peptides/${e.peptideId}`}
                    className="text-sm font-medium text-gray-100 hover:text-green-400 transition-colors"
                  >
                    {getPeptideName(e.peptideId)}
                  </Link>
                  <span className="text-sm text-gray-400">—</span>
                  <span className="text-sm text-gray-300">{e.doseMcg} {e.doseUnit}</span>
                  <span className="text-xs text-gray-500">{e.frequency} · {ROUTE_LABELS[e.route]}</span>
                </div>
                <p className="mt-1 ml-4 text-xs text-gray-500">
                  {formatDate(e.startDate)} → {formatDate(e.endDate)}
                </p>
                {e.titration && e.titration.length > 0 && (
                  <div className="mt-1.5 ml-4 space-y-0.5">
                    <p className="text-xs text-gray-600">Titration:</p>
                    {[...e.titration]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((step, j) => (
                        <p key={j} className="text-xs text-gray-400">
                          {formatDate(step.date)} → <span className="text-gray-200">{step.dose} {e.doseUnit}</span>
                        </p>
                      ))}
                  </div>
                )}
                {e.notes && (
                  <p className="mt-1 ml-4 text-xs text-gray-500 italic">{e.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* General notes */}
        {cycle.notes && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Notes</p>
            <p className="text-sm text-gray-400 leading-relaxed">{cycle.notes}</p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 px-5 py-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong className="text-gray-500">Disclaimer:</strong> This cycle was shared by another user for informational purposes only.
            Peptide research is ongoing and community protocols are not medical advice. Consult a qualified healthcare provider before
            starting any peptide regimen.
          </p>
        </div>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Peptide Guide — Research-backed peptide reference
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SharedCyclePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <span className="text-gray-500 text-sm">Loading cycle...</span>
        </div>
      }
    >
      <SharedCycleInner />
    </Suspense>
  );
}
