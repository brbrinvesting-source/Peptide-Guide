'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { peptides } from '@/lib/peptide-data';
import { ROUTE_LABELS, type AdminRoute, type Cycle, type CycleEntry, type DoseLog } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'peptide-cycles';

const FREQUENCIES = [
  'Daily',
  'EOD',
  '3x/week',
  '2x/week',
  'Weekly',
  'Protocol-specific',
] as const;

type Frequency = (typeof FREQUENCIES)[number];

const DOSE_UNITS = ['mcg', 'mg', 'IU', 'mg/kg'] as const;
type DoseUnit = (typeof DOSE_UNITS)[number];

const ADMIN_ROUTES: AdminRoute[] = [
  'subcutaneous',
  'intramuscular',
  'intranasal',
  'oral',
  'topical',
  'sublingual',
];

const GOAL_OPTIONS = [
  'Fat Loss',
  'Visceral Fat Loss',
  'Muscle Gain',
  'Healing & Recovery',
  'Joints & Pain',
  'Cognitive Performance',
  'Sexual Health',
  'Anti-Aging',
  'Immune Support',
  'Sleep Quality',
  'Energy & Endurance',
  'Cardiovascular Health',
  'Hair Growth',
  'Gut Health',
  'Longevity',
  'Skin Health',
  'Testosterone Support',
  'Other',
];

const ENTRY_COLORS = [
  'bg-green-900/30 border-green-800/40',
  'bg-blue-900/30 border-blue-800/40',
  'bg-purple-900/30 border-purple-800/40',
  'bg-amber-900/30 border-amber-800/40',
  'bg-cyan-900/30 border-cyan-800/40',
  'bg-pink-900/30 border-pink-800/40',
  'bg-teal-900/30 border-teal-800/40',
  'bg-orange-900/30 border-orange-800/40',
];

const BAR_COLORS = [
  'bg-green-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-orange-500',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function diffDays(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function getPeptideName(id: string): string {
  const found = peptides.find((p) => p.id === id);
  return found ? found.name : id;
}

function shouldDoseToday(entry: CycleEntry, dateStr: string): boolean {
  if (dateStr < entry.startDate || dateStr > entry.endDate) return false;
  const dayOffset = diffDays(entry.startDate, dateStr);
  switch (entry.frequency as Frequency) {
    case 'Daily': return true;
    case 'EOD': return dayOffset % 2 === 0;
    case '3x/week': return [0, 2, 4].includes(dayOffset % 7);
    case '2x/week': return [0, 3].includes(dayOffset % 7);
    case 'Weekly': return dayOffset % 7 === 0;
    case 'Protocol-specific': return true;
    default: return true;
  }
}

// ─── Empty form state ─────────────────────────────────────────────────────────

const emptyForm = () => ({
  peptideId: '',
  dose: '',
  doseUnit: 'mcg' as DoseUnit,
  frequency: 'Daily' as Frequency,
  route: 'subcutaneous' as AdminRoute,
  startDate: todayStr(),
  endDate: addDays(todayStr(), 28),
  notes: '',
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap',
        active
          ? 'border-green-500 text-green-400 bg-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900/50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500',
        'focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600',
        props.className ?? '',
      ].join(' ')}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100',
        'focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600',
        props.className ?? '',
      ].join(' ')}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={[
        'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none',
        'focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600',
        props.className ?? '',
      ].join(' ')}
    />
  );
}

// ─── Gantt Timeline ───────────────────────────────────────────────────────────

function GanttTimeline({ entries }: { entries: CycleEntry[] }) {
  const dated = entries.filter((e) => e.startDate && e.endDate);
  if (dated.length === 0) return null;

  const allDates = dated.flatMap((e) => [e.startDate, e.endDate]);
  const minDate = allDates.reduce((a, b) => (a < b ? a : b));
  const maxDate = allDates.reduce((a, b) => (a > b ? a : b));
  const totalDays = diffDays(minDate, maxDate) || 1;
  const today = todayStr();
  const todayOffset = diffDays(minDate, today);
  const showTodayLine = todayOffset >= 0 && todayOffset <= totalDays;

  return (
    <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
        Visual Timeline
      </h3>
      <div className="relative">
        {/* Date axis labels */}
        <div className="flex justify-between text-xs text-gray-600 mb-2 px-1">
          <span>{formatDate(minDate)}</span>
          <span>{formatDate(maxDate)}</span>
        </div>

        {/* Bars */}
        <div className="space-y-2 relative">
          {/* Today marker */}
          {showTodayLine && (
            <div
              className="absolute top-0 bottom-0 w-px bg-green-500/60 z-10 pointer-events-none"
              style={{ left: `${(todayOffset / totalDays) * 100}%` }}
            >
              <span
                className="absolute -top-5 -translate-x-1/2 text-xs text-green-400 whitespace-nowrap"
              >
                Today
              </span>
            </div>
          )}

          {dated.map((entry, i) => {
            const startOffset = diffDays(minDate, entry.startDate);
            const duration = diffDays(entry.startDate, entry.endDate);
            const leftPct = (startOffset / totalDays) * 100;
            const widthPct = (duration / totalDays) * 100;
            const colorClass = BAR_COLORS[i % BAR_COLORS.length];

            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-24 shrink-0 truncate">
                  {getPeptideName(entry.peptideId)}
                </span>
                <div className="flex-1 h-6 relative bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`absolute h-full rounded-full opacity-80 ${colorClass}`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(widthPct, 2)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Export Text ──────────────────────────────────────────────────────────────

function exportCycleText(cycle: Cycle): string {
  const lines: string[] = [
    `=== ${cycle.name} ===`,
    `Goal: ${cycle.goal}`,
    `Created: ${formatDate(cycle.createdAt)}`,
    '',
    'PEPTIDES:',
  ];
  cycle.entries.forEach((e) => {
    lines.push(
      `• ${getPeptideName(e.peptideId)} — ${e.doseMcg} ${e.doseUnit} ${e.frequency} via ${ROUTE_LABELS[e.route]}`
    );
    lines.push(`  Start: ${formatDate(e.startDate)} | End: ${formatDate(e.endDate)}`);
    if (e.notes) lines.push(`  Notes: ${e.notes}`);
    lines.push('');
  });
  if (cycle.breakAfterWeeks) {
    lines.push(`BREAK: ${cycle.breakAfterWeeks} weeks`);
    lines.push('');
  }
  if (cycle.notes) {
    lines.push(`General Notes: ${cycle.notes}`);
  }
  return lines.join('\n');
}

// ─── Main inner component (uses useSearchParams) ──────────────────────────────

function CycleBuilderInner() {
  const searchParams = useSearchParams();
  const addPeptideId = searchParams.get('add') ?? '';

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<'build' | 'my-cycles' | 'dose-log'>(
    addPeptideId ? 'build' : 'build'
  );

  // ── Cycles persistence ──
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setCycles(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  const saveCycles = useCallback((updated: Cycle[]) => {
    setCycles(updated);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(updated));
    } catch {}
  }, []);

  // ── Build Cycle form ──
  const [cycleName, setCycleName] = useState('');
  const [cycleGoal, setCycleGoal] = useState('');
  const [cycleNotes, setCycleNotes] = useState('');
  const [breakWeeks, setBreakWeeks] = useState('');
  const [cycleEntries, setCycleEntries] = useState<CycleEntry[]>([]);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);

  // Peptide entry form
  const [entryForm, setEntryForm] = useState(() => emptyForm());
  const [editingEntryIdx, setEditingEntryIdx] = useState<number | null>(null);
  const [formError, setFormError] = useState('');

  // Pre-select peptide from query param
  useEffect(() => {
    if (addPeptideId) {
      setEntryForm((prev) => ({ ...prev, peptideId: addPeptideId }));
    }
  }, [addPeptideId]);

  // ── Dose Log state ──
  const [logCycleId, setLogCycleId] = useState<string | null>(null);
  const [logDate, setLogDate] = useState(todayStr());

  const logCycle = useMemo(
    () => cycles.find((c) => c.id === logCycleId) ?? null,
    [cycles, logCycleId]
  );

  // ── Duration calc ──
  function calcDuration(start: string, end: string): string {
    if (!start || !end) return '—';
    const d = diffDays(start, end);
    if (d < 0) return 'Invalid';
    if (d < 7) return `${d} days`;
    const weeks = Math.round(d / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  }

  // ── Entry form handlers ──
  function handleAddEntry() {
    setFormError('');
    if (!entryForm.peptideId) {
      setFormError('Please select a peptide.');
      return;
    }
    if (!entryForm.dose || Number(entryForm.dose) <= 0) {
      setFormError('Please enter a valid dose amount.');
      return;
    }
    if (!entryForm.startDate || !entryForm.endDate) {
      setFormError('Please select start and end dates.');
      return;
    }
    if (entryForm.startDate > entryForm.endDate) {
      setFormError('End date must be after start date.');
      return;
    }

    const newEntry: CycleEntry = {
      peptideId: entryForm.peptideId,
      doseMcg: Number(entryForm.dose),
      doseUnit: entryForm.doseUnit,
      frequency: entryForm.frequency,
      route: entryForm.route,
      startDate: entryForm.startDate,
      endDate: entryForm.endDate,
      notes: entryForm.notes || undefined,
    };

    if (editingEntryIdx !== null) {
      setCycleEntries((prev) => {
        const updated = [...prev];
        updated[editingEntryIdx] = newEntry;
        return updated;
      });
      setEditingEntryIdx(null);
    } else {
      setCycleEntries((prev) => [...prev, newEntry]);
    }
    setEntryForm(emptyForm());
  }

  function handleEditEntry(idx: number) {
    const entry = cycleEntries[idx];
    setEntryForm({
      peptideId: entry.peptideId,
      dose: String(entry.doseMcg),
      doseUnit: entry.doseUnit,
      frequency: entry.frequency as Frequency,
      route: entry.route,
      startDate: entry.startDate,
      endDate: entry.endDate,
      notes: entry.notes ?? '',
    });
    setEditingEntryIdx(idx);
  }

  function handleRemoveEntry(idx: number) {
    setCycleEntries((prev) => prev.filter((_, i) => i !== idx));
    if (editingEntryIdx === idx) {
      setEditingEntryIdx(null);
      setEntryForm(emptyForm());
    }
  }

  function handleSaveCycle() {
    if (!cycleName.trim()) {
      alert('Please enter a cycle name.');
      return;
    }
    if (cycleEntries.length === 0) {
      alert('Please add at least one peptide to the cycle.');
      return;
    }

    if (editingCycleId) {
      saveCycles(
        cycles.map((c) =>
          c.id === editingCycleId
            ? {
                ...c,
                name: cycleName,
                goal: cycleGoal,
                notes: cycleNotes || undefined,
                entries: cycleEntries,
                breakAfterWeeks: breakWeeks ? Number(breakWeeks) : undefined,
              }
            : c
        )
      );
      setEditingCycleId(null);
    } else {
      const newCycle: Cycle = {
        id: generateId(),
        name: cycleName,
        goal: cycleGoal,
        notes: cycleNotes || undefined,
        entries: cycleEntries,
        breakAfterWeeks: breakWeeks ? Number(breakWeeks) : undefined,
        createdAt: todayStr(),
        logs: [],
      };
      saveCycles([...cycles, newCycle]);
    }

    setCycleName('');
    setCycleGoal('');
    setCycleNotes('');
    setBreakWeeks('');
    setCycleEntries([]);
    setEntryForm(emptyForm());
    setActiveTab('my-cycles');
  }

  function handleLoadForEdit(cycle: Cycle) {
    setCycleName(cycle.name);
    setCycleGoal(cycle.goal);
    setCycleNotes(cycle.notes ?? '');
    setBreakWeeks(cycle.breakAfterWeeks ? String(cycle.breakAfterWeeks) : '');
    setCycleEntries(cycle.entries);
    setEditingCycleId(cycle.id);
    setActiveTab('build');
  }

  function handleDeleteCycle(id: string) {
    if (!confirm('Delete this cycle? This cannot be undone.')) return;
    saveCycles(cycles.filter((c) => c.id !== id));
    if (logCycleId === id) setLogCycleId(null);
  }

  function handleExportCycle(cycle: Cycle) {
    const text = exportCycleText(cycle);
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="
        position:fixed;inset:0;background:rgba(0,0,0,.75);
        display:flex;align-items:center;justify-content:center;z-index:9999;
        padding:1rem;
      ">
        <div style="
          background:#111827;border:1px solid #374151;border-radius:12px;
          padding:1.5rem;max-width:600px;width:100%;max-height:80vh;overflow:auto;
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h2 style="color:#e5e7eb;font-size:1rem;font-weight:600;">Export Cycle</h2>
            <button id="__close-export" style="color:#9ca3af;font-size:1.25rem;background:none;border:none;cursor:pointer;">✕</button>
          </div>
          <pre style="
            background:#030712;border:1px solid #1f2937;border-radius:8px;
            padding:1rem;color:#d1d5db;font-size:0.75rem;line-height:1.6;
            white-space:pre-wrap;word-break:break-word;
          ">${text}</pre>
          <button id="__copy-export" style="
            margin-top:1rem;background:#16a34a;color:white;border:none;
            border-radius:8px;padding:.5rem 1rem;font-size:.875rem;cursor:pointer;
          ">Copy to Clipboard</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#__close-export')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#__copy-export')?.addEventListener('click', () => {
      navigator.clipboard.writeText(text).then(() => {
        const btn = modal.querySelector('#__copy-export') as HTMLButtonElement;
        if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy to Clipboard'; }, 2000); }
      });
    });
    modal.addEventListener('click', (e) => { if (e.target === modal.firstElementChild) modal.remove(); });
  }

  // ── Dose log handlers ──
  function toggleDoseLog(peptideId: string, taken: boolean, notes: string) {
    if (!logCycleId) return;
    saveCycles(
      cycles.map((c) => {
        if (c.id !== logCycleId) return c;
        const existing = c.logs.findIndex(
          (l) => l.date === logDate && l.peptideId === peptideId
        );
        const entry = c.entries.find((e) => e.peptideId === peptideId);
        if (!entry) return c;
        const newLog: DoseLog = {
          date: logDate,
          peptideId,
          dose: entry.doseMcg,
          doseUnit: entry.doseUnit,
          taken,
          notes: notes || undefined,
        };
        const newLogs = [...c.logs];
        if (existing >= 0) {
          newLogs[existing] = newLog;
        } else {
          newLogs.push(newLog);
        }
        return { ...c, logs: newLogs };
      })
    );
  }

  function updateDoseNotes(peptideId: string, notes: string) {
    if (!logCycleId) return;
    saveCycles(
      cycles.map((c) => {
        if (c.id !== logCycleId) return c;
        const existing = c.logs.findIndex(
          (l) => l.date === logDate && l.peptideId === peptideId
        );
        if (existing < 0) return c;
        const newLogs = [...c.logs];
        newLogs[existing] = { ...newLogs[existing], notes: notes || undefined };
        return { ...c, logs: newLogs };
      })
    );
  }

  // Entries due today in log
  const todayEntries = useMemo(() => {
    if (!logCycle) return [];
    return logCycle.entries.filter((e) => shouldDoseToday(e, logDate));
  }, [logCycle, logDate]);

  // Last 7 days for mini calendar
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(logDate, -(6 - i)));
  }, [logDate]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    );
  }

  // ─── Cycle totals helpers ──
  function cycleTotalDuration(cycle: Cycle): string {
    const dates = cycle.entries.flatMap((e) => [e.startDate, e.endDate]).filter(Boolean);
    if (dates.length === 0) return '—';
    const min = dates.reduce((a, b) => (a < b ? a : b));
    const max = dates.reduce((a, b) => (a > b ? a : b));
    return calcDuration(min, max);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Page header */}
      <div className="border-b border-gray-800 bg-gray-900/60 py-10 px-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-white">Cycle Builder</h1>
          <p className="mt-2 text-gray-400 text-sm">
            Plan, track, and log your peptide protocols. All data is stored locally in your browser.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-800 bg-gray-950 px-4">
        <div className="mx-auto max-w-7xl flex gap-1 pt-2">
          <TabButton active={activeTab === 'build'} onClick={() => setActiveTab('build')}>
            Build Cycle{editingCycleId ? ' (Editing)' : ''}
          </TabButton>
          <TabButton active={activeTab === 'my-cycles'} onClick={() => setActiveTab('my-cycles')}>
            My Cycles ({cycles.length})
          </TabButton>
          <TabButton active={activeTab === 'dose-log'} onClick={() => setActiveTab('dose-log')}>
            Dose Log{logCycle ? ` — ${logCycle.name}` : ''}
          </TabButton>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">

        {/* ═══════════ TAB 1: BUILD CYCLE ═══════════ */}
        {activeTab === 'build' && (
          <div className="space-y-8">
            {/* Cycle meta */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-base font-semibold text-gray-100 mb-5">Cycle Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Cycle Name *</Label>
                  <Input
                    type="text"
                    value={cycleName}
                    onChange={(e) => setCycleName(e.target.value)}
                    placeholder="e.g., Summer Cut, Healing Protocol"
                  />
                </div>
                <div>
                  <Label>Primary Goal</Label>
                  <Select
                    value={cycleGoal}
                    onChange={(e) => setCycleGoal(e.target.value)}
                  >
                    <option value="">Select a goal...</option>
                    {GOAL_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Break After Cycle (weeks)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={breakWeeks}
                    onChange={(e) => setBreakWeeks(e.target.value)}
                    placeholder="e.g., 4"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>General Notes</Label>
                  <Textarea
                    value={cycleNotes}
                    onChange={(e) => setCycleNotes(e.target.value)}
                    placeholder="Protocol rationale, goals, observations..."
                  />
                </div>
              </div>
            </div>

            {/* Add peptide form */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-base font-semibold text-gray-100 mb-5">
                {editingEntryIdx !== null ? 'Edit Peptide Entry' : 'Add Peptide to Cycle'}
              </h2>

              {formError && (
                <div className="mb-4 rounded-lg bg-red-950/40 border border-red-800/50 px-4 py-2.5 text-sm text-red-400">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Peptide select */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <Label>Peptide *</Label>
                  <Select
                    value={entryForm.peptideId}
                    onChange={(e) => setEntryForm((f) => ({ ...f, peptideId: e.target.value }))}
                  >
                    <option value="">Select a peptide...</option>
                    {peptides
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </Select>
                </div>

                {/* Dose amount + unit */}
                <div>
                  <Label>Dose Amount *</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 5.5rem', gap: '0.5rem' }}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9.]*"
                      min="0"
                      value={entryForm.dose}
                      onChange={(e) => setEntryForm((f) => ({ ...f, dose: e.target.value }))}
                      placeholder="e.g., 500"
                    />
                    <Select
                      value={entryForm.doseUnit}
                      onChange={(e) => setEntryForm((f) => ({ ...f, doseUnit: e.target.value as DoseUnit }))}
                    >
                      {DOSE_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={entryForm.frequency}
                    onChange={(e) => setEntryForm((f) => ({ ...f, frequency: e.target.value as Frequency }))}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </Select>
                </div>

                {/* Route */}
                <div>
                  <Label>Route</Label>
                  <Select
                    value={entryForm.route}
                    onChange={(e) => setEntryForm((f) => ({ ...f, route: e.target.value as AdminRoute }))}
                  >
                    {ADMIN_ROUTES.map((r) => (
                      <option key={r} value={r}>{ROUTE_LABELS[r]}</option>
                    ))}
                  </Select>
                </div>

                {/* Start date */}
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={entryForm.startDate}
                    onChange={(e) => setEntryForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>

                {/* End date */}
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={entryForm.endDate}
                    onChange={(e) => setEntryForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <Label>Entry Notes (optional)</Label>
                  <Input
                    type="text"
                    value={entryForm.notes}
                    onChange={(e) => setEntryForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Timing notes, injection site, etc."
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleAddEntry}
                  className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
                >
                  {editingEntryIdx !== null ? 'Update Entry' : 'Add to Cycle'}
                </button>
                {editingEntryIdx !== null && (
                  <button
                    onClick={() => {
                      setEditingEntryIdx(null);
                      setEntryForm(emptyForm());
                      setFormError('');
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Entries table */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <h2 className="text-base font-semibold text-gray-100">
                  Current Cycle Entries ({cycleEntries.length})
                </h2>
              </div>

              {cycleEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">No peptides added yet — use the form above</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-950/40">
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Peptide</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Dose</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Frequency</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Route</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Start</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">End</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Duration</th>
                        <th className="py-3 px-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {cycleEntries.map((entry, idx) => (
                        <tr
                          key={idx}
                          className={`border-l-2 ${ENTRY_COLORS[idx % ENTRY_COLORS.length]} ${
                            editingEntryIdx === idx ? 'ring-1 ring-inset ring-green-500/40' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-medium text-gray-100">
                            {getPeptideName(entry.peptideId)}
                            {entry.notes && (
                              <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {entry.doseMcg} {entry.doseUnit}
                          </td>
                          <td className="py-3 px-4 text-gray-300">{entry.frequency}</td>
                          <td className="py-3 px-4 text-gray-300">{ROUTE_LABELS[entry.route]}</td>
                          <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{formatDate(entry.startDate)}</td>
                          <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{formatDate(entry.endDate)}</td>
                          <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                            {calcDuration(entry.startDate, entry.endDate)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleEditEntry(idx)}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRemoveEntry(idx)}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Gantt timeline */}
            {cycleEntries.length > 0 && <GanttTimeline entries={cycleEntries} />}

            {/* Save cycle */}
            <div className="flex gap-4 items-center">
              <button
                onClick={handleSaveCycle}
                className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-green-900/30"
              >
                {editingCycleId ? 'Update Cycle' : 'Save Cycle'}
              </button>
              {editingCycleId && (
                <button
                  onClick={() => {
                    setEditingCycleId(null);
                    setCycleName('');
                    setCycleGoal('');
                    setCycleNotes('');
                    setBreakWeeks('');
                    setCycleEntries([]);
                    setEntryForm(emptyForm());
                  }}
                  className="px-4 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-sm transition-colors"
                >
                  Cancel Edit
                </button>
              )}
              <p className="text-xs text-gray-600">
                Requires a name and at least 1 peptide entry.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════ TAB 2: MY CYCLES ═══════════ */}
        {activeTab === 'my-cycles' && (
          <div className="space-y-5">
            {cycles.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900 py-24 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-base font-medium text-gray-400 mb-1">No saved cycles yet</p>
                <p className="text-sm text-gray-600 mb-6">Build your first cycle to get started.</p>
                <button
                  onClick={() => setActiveTab('build')}
                  className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
                >
                  Build a Cycle
                </button>
              </div>
            ) : (
              cycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-5 border-b border-gray-800">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white">{cycle.name}</h3>
                      {cycle.goal && (
                        <p className="text-sm text-green-400 mt-0.5">Goal: {cycle.goal}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        <span>Created {formatDate(cycle.createdAt)}</span>
                        <span>{cycle.entries.length} peptide{cycle.entries.length !== 1 ? 's' : ''}</span>
                        <span>Duration: {cycleTotalDuration(cycle)}</span>
                        {cycle.breakAfterWeeks && (
                          <span>Break: {cycle.breakAfterWeeks}w</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        onClick={() => handleLoadForEdit(cycle)}
                        className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 text-xs font-medium transition-colors"
                      >
                        View &amp; Edit
                      </button>
                      <button
                        onClick={() => {
                          setLogCycleId(cycle.id);
                          setLogDate(todayStr());
                          setActiveTab('dose-log');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-medium transition-colors"
                      >
                        Start Logging
                      </button>
                      <button
                        onClick={() => handleExportCycle(cycle)}
                        className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-xs font-medium transition-colors"
                      >
                        Export as Text
                      </button>
                      <button
                        onClick={() => handleDeleteCycle(cycle.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-900/50 text-red-500 hover:text-red-400 hover:border-red-800 text-xs font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Peptide list */}
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                      Peptides
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cycle.entries.map((e, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-300"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                          />
                          {getPeptideName(e.peptideId)} — {e.doseMcg}{e.doseUnit} {e.frequency}
                        </span>
                      ))}
                    </div>
                    {cycle.notes && (
                      <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                        {cycle.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══════════ TAB 3: DOSE LOG ═══════════ */}
        {activeTab === 'dose-log' && (
          <div className="space-y-6">
            {!logCycleId || !logCycle ? (
              /* No cycle selected */
              <div className="rounded-xl border border-gray-800 bg-gray-900 py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-base font-medium text-gray-400 mb-1">No cycle selected for logging</p>
                <p className="text-sm text-gray-600 mb-6">
                  Go to <strong className="text-gray-400">My Cycles</strong> and click "Start Logging" to begin tracking doses.
                </p>
                {cycles.length > 0 && (
                  <div className="mt-4 max-w-xs mx-auto">
                    <Label>Or select a cycle:</Label>
                    <Select
                      value={logCycleId ?? ''}
                      onChange={(e) => setLogCycleId(e.target.value || null)}
                    >
                      <option value="">Select cycle...</option>
                      {cycles.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </div>
                )}
                {cycles.length === 0 && (
                  <button
                    onClick={() => setActiveTab('build')}
                    className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
                  >
                    Build a Cycle First
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Cycle header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{logCycle.name}</h2>
                    {logCycle.goal && (
                      <p className="text-sm text-green-400">Goal: {logCycle.goal}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setLogCycleId(null)}
                    className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-xs font-medium transition-colors"
                  >
                    Change Cycle
                  </button>
                </div>

                {/* Date navigator */}
                <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-5 py-3">
                  <button
                    onClick={() => setLogDate((d) => addDays(d, -1))}
                    className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
                    aria-label="Previous day"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-base font-semibold text-white">{formatDate(logDate)}</p>
                    {logDate === todayStr() && (
                      <p className="text-xs text-green-400">Today</p>
                    )}
                  </div>
                  <button
                    onClick={() => setLogDate((d) => addDays(d, 1))}
                    className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
                    aria-label="Next day"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {logDate !== todayStr() && (
                    <button
                      onClick={() => setLogDate(todayStr())}
                      className="ml-2 px-3 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 hover:text-white transition-colors"
                    >
                      Today
                    </button>
                  )}
                </div>

                {/* Dose items */}
                {todayEntries.length === 0 ? (
                  <div className="rounded-xl border border-gray-800 bg-gray-900 py-10 text-center">
                    <p className="text-sm text-gray-500">No doses scheduled on this date.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Summary */}
                    <div className="text-sm text-gray-400">
                      {(() => {
                        const taken = todayEntries.filter((e) => {
                          const log = logCycle.logs.find(
                            (l) => l.date === logDate && l.peptideId === e.peptideId
                          );
                          return log?.taken;
                        }).length;
                        return (
                          <span>
                            <span className="font-semibold text-white">{taken}</span>
                            {' of '}
                            <span className="font-semibold text-white">{todayEntries.length}</span>
                            {' doses taken'}
                          </span>
                        );
                      })()}
                    </div>

                    {todayEntries.map((entry, idx) => {
                      const log = logCycle.logs.find(
                        (l) => l.date === logDate && l.peptideId === entry.peptideId
                      );
                      const isTaken = log?.taken === true;
                      const isSkipped = log?.taken === false;
                      const isLogged = log !== undefined;

                      let rowColor = 'border-gray-800 bg-gray-900';
                      if (isTaken) rowColor = 'border-green-800/50 bg-green-950/20';
                      else if (isSkipped) rowColor = 'border-orange-800/50 bg-orange-950/20';

                      return (
                        <div
                          key={idx}
                          className={`rounded-xl border p-4 transition-colors ${rowColor}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-100">
                                {getPeptideName(entry.peptideId)}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {entry.doseMcg} {entry.doseUnit} — {entry.frequency} — {ROUTE_LABELS[entry.route]}
                              </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => toggleDoseLog(entry.peptideId, true, log?.notes ?? '')}
                                className={[
                                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                                  isTaken
                                    ? 'bg-green-600 text-white'
                                    : 'border border-gray-700 text-gray-400 hover:border-green-700 hover:text-green-400',
                                ].join(' ')}
                              >
                                Taken
                              </button>
                              <button
                                onClick={() => toggleDoseLog(entry.peptideId, false, log?.notes ?? '')}
                                className={[
                                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                                  isSkipped
                                    ? 'bg-orange-600 text-white'
                                    : 'border border-gray-700 text-gray-400 hover:border-orange-700 hover:text-orange-400',
                                ].join(' ')}
                              >
                                Skip
                              </button>
                            </div>
                          </div>
                          {isLogged && (
                            <div className="mt-3">
                              <input
                                type="text"
                                value={log?.notes ?? ''}
                                onChange={(e) => updateDoseNotes(entry.peptideId, e.target.value)}
                                placeholder="Add a note for this dose..."
                                className="w-full rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 7-day history mini grid */}
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
                    Last 7 Days
                  </h3>
                  <div className="grid grid-cols-7 gap-2">
                    {last7Days.map((day) => {
                      const dayEntries = logCycle.entries.filter((e) =>
                        shouldDoseToday(e, day)
                      );
                      const dayLogs = logCycle.logs.filter((l) => l.date === day);
                      const takenCount = dayLogs.filter((l) => l.taken).length;
                      const skippedCount = dayLogs.filter((l) => !l.taken).length;
                      const totalScheduled = dayEntries.length;
                      const isToday = day === todayStr();
                      const isSelected = day === logDate;

                      return (
                        <button
                          key={day}
                          onClick={() => setLogDate(day)}
                          className={[
                            'flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-colors',
                            isSelected
                              ? 'border border-green-600/50 bg-green-950/30'
                              : isToday
                                ? 'border border-gray-600 bg-gray-800'
                                : 'border border-gray-800 hover:border-gray-700 hover:bg-gray-800/50',
                          ].join(' ')}
                        >
                          <span className="text-xs text-gray-500">
                            {new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className={`text-xs font-bold ${isToday ? 'text-green-400' : 'text-gray-300'}`}>
                            {new Date(day + 'T00:00:00').getDate()}
                          </span>
                          {totalScheduled > 0 ? (
                            <span className={[
                              'text-xs font-semibold',
                              takenCount === totalScheduled
                                ? 'text-green-400'
                                : skippedCount > 0
                                  ? 'text-orange-400'
                                  : 'text-gray-600',
                            ].join(' ')}>
                              {takenCount}/{totalScheduled}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-700">—</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page export with Suspense boundary ───────────────────────────────────────

export default function CycleBuilderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-gray-500 text-sm">Loading cycle builder...</span>
      </div>
    }>
      <CycleBuilderInner />
    </Suspense>
  );
}
