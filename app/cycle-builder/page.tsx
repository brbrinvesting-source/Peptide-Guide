'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from 'react';
import { useSearchParams } from 'next/navigation';
import LZString from 'lz-string';
import { peptides } from '@/lib/peptide-data';
import { ROUTE_LABELS, type AdminRoute, type Cycle, type CycleEntry, type DoseLog, type TitrationStep } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'peptide-cycles';

const FREQUENCIES = [
  'Daily',
  'EOD',
  '3x/week',
  '2x/week',
  'Weekly',
  'Custom Days',
  'Protocol-specific',
] as const;

type Frequency = (typeof FREQUENCIES)[number];

// JS getDay() order: 0=Sun,1=Mon,...,6=Sat. DAY_NAMES is Mon-first, so index i → getDay (i+1)%7.
const CUSTOM_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon→Sun in display order

function formatCustomDays(days: number[]): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return [...days]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => names[d])
    .join(', ');
}

function displayFrequency(entry: { frequency: string; customDays?: number[] }): string {
  if (entry.frequency === 'Custom Days' && entry.customDays?.length) {
    return formatCustomDays(entry.customDays);
  }
  return entry.frequency;
}

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

function encodeCycle(cycle: Cycle): string {
  try {
    // Strip personal data (logs, id) — recipient gets a fresh id on import
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, logs, ...shareable } = cycle;
    return LZString.compressToEncodedURIComponent(JSON.stringify(shareable));
  } catch { return ''; }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().split('T')[0];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function sortEntries(entries: CycleEntry[]): CycleEntry[] {
  return [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function calcInjectionVolume(
  dose: string,
  doseUnit: string,
  vialSizeMg: string,
  waterMl: string
): { volumeMl: string; iu: string } | null {
  const d = Number(dose);
  const vs = Number(vialSizeMg);
  const wm = Number(waterMl);
  if (!d || !vs || !wm) return null;
  const concMgPerMl = vs / wm;
  const doseMg = doseUnit === 'mcg' ? d / 1000 : doseUnit === 'mg' ? d : null;
  if (doseMg === null) return null;
  const volumeMl = doseMg / concMgPerMl;
  return {
    volumeMl: parseFloat(volumeMl.toFixed(4)).toString(),
    iu: parseFloat((volumeMl * 100).toFixed(2)).toString(),
  };
}

function getActiveDose(entry: CycleEntry, dateStr: string): number {
  if (!entry.titration?.length) return entry.doseMcg;
  const sorted = [...entry.titration].sort((a, b) => a.date.localeCompare(b.date));
  let dose = entry.doseMcg;
  for (const step of sorted) {
    if (step.date <= dateStr) dose = Number(step.dose);
  }
  return dose;
}

function calcVialsNeeded(entry: CycleEntry): number | null {
  if (!entry.vialSize || !entry.startDate || !entry.endDate) return null;
  const vialSizeMg = Number(entry.vialSize);
  if (!vialSizeMg || entry.frequency === 'Protocol-specific') return null;
  const toMg = (dose: number): number | null => {
    if (entry.doseUnit === 'mg') return dose;
    if (entry.doseUnit === 'mcg') return dose / 1000;
    return null; // IU and mg/kg can't be normalised to mg without extra info
  };
  let totalDoseMg = 0;
  const endD = new Date(entry.endDate + 'T00:00:00');
  for (let d = new Date(entry.startDate + 'T00:00:00'); d <= endD; d.setDate(d.getDate() + 1)) {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yr}-${mo}-${dy}`;
    if (!shouldDoseToday(entry, dateStr)) continue;
    const doseMg = toMg(getActiveDose(entry, dateStr));
    if (doseMg === null) return null;
    totalDoseMg += doseMg;
  }
  return Math.ceil(totalDoseMg / vialSizeMg);
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
    case 'Custom Days':
      return (entry.customDays ?? []).includes(new Date(dateStr + 'T00:00:00').getDay());
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
  customDays: [] as number[],
  timeOfDay: '' as '' | 'AM' | 'PM',
  route: 'subcutaneous' as AdminRoute,
  startDate: todayStr(),
  endDate: addDays(todayStr(), 28),
  notes: '',
  vialSize: '',
  vialWaterMl: '',
  titration: [] as TitrationStep[],
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

  const todayPct = (todayOffset / totalDays) * 100;
  // Suppress start/end labels when Today would collide (within 18% of either edge)
  const hideStart = showTodayLine && todayPct < 18;
  const hideEnd = showTodayLine && todayPct > 82;

  return (
    <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
        Visual Timeline
      </h3>
      <div className="relative">
        {/* Three-point date axis: start | today | end */}
        <div className="relative h-5 mb-2">
          {!hideStart && (
            <span className="absolute left-0 text-xs text-gray-500">{formatDate(minDate)}</span>
          )}
          {showTodayLine && (
            <span
              className="absolute -translate-x-1/2 text-xs text-green-400 font-medium whitespace-nowrap"
              style={{ left: `${todayPct}%` }}
            >
              Today · {formatDate(today)}
            </span>
          )}
          {!hideEnd && (
            <span className="absolute right-0 text-xs text-gray-500">{formatDate(maxDate)}</span>
          )}
        </div>

        {/* Bars */}
        <div className="space-y-2">
          {dated.map((entry, i) => {
            const startOffset = diffDays(minDate, entry.startDate);
            const duration = diffDays(entry.startDate, entry.endDate);
            const leftPct = (startOffset / totalDays) * 100;
            const widthPct = (duration / totalDays) * 100;
            const colorClass = BAR_COLORS[i % BAR_COLORS.length];
            const activeToday = showTodayLine && today >= entry.startDate && today <= entry.endDate;

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
                  {activeToday && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white/70 z-10 pointer-events-none"
                      style={{ left: `${todayPct}%` }}
                    />
                  )}
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
    let doseLine = `• ${getPeptideName(e.peptideId)} — ${e.doseMcg} ${e.doseUnit} ${displayFrequency(e)} via ${ROUTE_LABELS[e.route]}`;
    if (e.vialSize && e.vialWaterMl) {
      const calc = calcInjectionVolume(String(e.doseMcg), e.doseUnit, String(e.vialSize), String(e.vialWaterMl));
      if (calc) doseLine += ` (${calc.volumeMl} ml / ${calc.iu} IU per dose)`;
      doseLine += ` [Vial: ${e.vialSize}mg in ${e.vialWaterMl}ml]`;
    }
    lines.push(doseLine);
    lines.push(`  Start: ${formatDate(e.startDate)} | End: ${formatDate(e.endDate)}`);
    if (e.titration?.length) {
      lines.push(`  Titration Schedule:`);
      [...e.titration].sort((a, b) => a.date.localeCompare(b.date)).forEach((step) => {
        const sc = e.vialSize && e.vialWaterMl
          ? calcInjectionVolume(step.dose, e.doseUnit, String(e.vialSize), String(e.vialWaterMl))
          : null;
        const vol = sc ? ` (${sc.volumeMl} ml / ${sc.iu} IU)` : '';
        lines.push(`    ${formatDate(step.date)}: ${step.dose} ${e.doseUnit}${vol}`);
      });
    }
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
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'build' | 'schedule' | 'my-cycles' | 'dose-log'>(
    tabParam === 'my-cycles' ? 'my-cycles'
    : tabParam === 'schedule' ? 'schedule'
    : tabParam === 'dose-log' ? 'dose-log'
    : 'build'
  );

  // ── Schedule state ──
  const [scheduleWeekStart, setScheduleWeekStart] = useState(() => getWeekMonday(todayStr()));
  const [scheduleCycleId, setScheduleCycleId] = useState<string | null>(null);

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

  // ── Share / export / import state ──
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

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

  // Cycle length (drives endDate)
  const [cycleLengthValue, setCycleLengthValue] = useState('4');
  const [cycleLengthUnit, setCycleLengthUnit] = useState<'days' | 'weeks'>('weeks');

  // Titration sub-form
  const [showTitrationInput, setShowTitrationInput] = useState(false);
  const [titrationDurationValue, setTitrationDurationValue] = useState('');
  const [titrationDurationUnit, setTitrationDurationUnit] = useState<'days' | 'weeks'>('days');
  const [titrationDose, setTitrationDose] = useState('');

  // Pre-select peptide from query param
  useEffect(() => {
    if (addPeptideId) {
      setEntryForm((prev) => ({ ...prev, peptideId: addPeptideId }));
    }
  }, [addPeptideId]);

  // Auto-derive endDate from startDate + cycle length
  useEffect(() => {
    const days = cycleLengthUnit === 'weeks'
      ? Number(cycleLengthValue) * 7
      : Number(cycleLengthValue);
    if (entryForm.startDate && days > 0) {
      setEntryForm((f) => ({ ...f, endDate: addDays(f.startDate, days) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryForm.startDate, cycleLengthValue, cycleLengthUnit]);

  // ── Dose Log state ──
  const [logCycleId, setLogCycleId] = useState<string | null>(null);
  const [logDate, setLogDate] = useState(todayStr());

  // ── Bulk date shift state ──
  const [bulkShiftCycleId, setBulkShiftCycleId] = useState<string | null>(null);
  const [bulkShiftSelected, setBulkShiftSelected] = useState<Set<number>>(new Set());
  const [bulkShiftDate, setBulkShiftDate] = useState('');

  // ── Entry expand state ──
  const [expandedEntry, setExpandedEntry] = useState<{cycleId: string; idx: number} | null>(null);

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

  // ── Titration step handler ──
  function handleAddTitrationStep() {
    const durationDays = titrationDurationUnit === 'weeks'
      ? Number(titrationDurationValue) * 7
      : Number(titrationDurationValue);
    if (!durationDays || durationDays <= 0) { alert('Please enter a valid duration.'); return; }
    if (!titrationDose || Number(titrationDose) <= 0) { alert('Please enter a valid dose amount.'); return; }
    if (!entryForm.startDate) { alert('Please set a start date first.'); return; }
    const sortedSteps = [...entryForm.titration].sort((a, b) => a.date.localeCompare(b.date));
    const previousDate = sortedSteps.length > 0 ? sortedSteps[sortedSteps.length - 1].date : entryForm.startDate;
    const newDate = addDays(previousDate, durationDays);
    if (entryForm.endDate && newDate > entryForm.endDate) {
      alert('This dose change falls after the cycle end date.'); return;
    }
    setEntryForm((f) => ({
      ...f,
      titration: [...f.titration, { date: newDate, dose: titrationDose }],
    }));
    setTitrationDurationValue('');
    setTitrationDose('');
    setShowTitrationInput(false);
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
    if (entryForm.frequency === 'Custom Days' && entryForm.customDays.length === 0) {
      setFormError('Please select at least one day for custom schedule.');
      return;
    }

    const newEntry: CycleEntry = {
      peptideId: entryForm.peptideId,
      doseMcg: Number(entryForm.dose),
      doseUnit: entryForm.doseUnit,
      frequency: entryForm.frequency,
      customDays: entryForm.frequency === 'Custom Days' ? [...entryForm.customDays] : undefined,
      timeOfDay: entryForm.timeOfDay || undefined,
      route: entryForm.route,
      startDate: entryForm.startDate,
      endDate: entryForm.endDate,
      notes: entryForm.notes || undefined,
      vialSize: entryForm.vialSize ? Number(entryForm.vialSize) : undefined,
      vialWaterMl: entryForm.vialWaterMl ? Number(entryForm.vialWaterMl) : undefined,
      titration: entryForm.titration.length > 0 ? [...entryForm.titration] : undefined,
    };

    const newEntries = sortEntries(
      editingEntryIdx !== null
        ? cycleEntries.map((e, i) => (i === editingEntryIdx ? newEntry : e))
        : [...cycleEntries, newEntry]
    );

    setCycleEntries(newEntries);
    if (editingEntryIdx !== null) setEditingEntryIdx(null);

    // Auto-save immediately when editing an existing saved cycle
    if (editingCycleId) {
      saveCycles(cycles.map((c) =>
        c.id === editingCycleId ? { ...c, entries: newEntries } : c
      ));
    }

    setEntryForm(emptyForm());
    setCycleLengthValue('4');
    setCycleLengthUnit('weeks');
    setShowTitrationInput(false);
    setTitrationDurationValue('');
    setTitrationDurationUnit('days');
    setTitrationDose('');
  }

  function handleEditEntry(idx: number) {
    const entry = cycleEntries[idx];
    // Reverse-compute cycle length for the UI
    const entryDays = diffDays(entry.startDate, entry.endDate);
    if (entryDays % 7 === 0 && entryDays > 0) {
      setCycleLengthValue(String(entryDays / 7));
      setCycleLengthUnit('weeks');
    } else {
      setCycleLengthValue(String(Math.max(entryDays, 1)));
      setCycleLengthUnit('days');
    }
    setEntryForm({
      peptideId: entry.peptideId,
      dose: String(entry.doseMcg),
      doseUnit: entry.doseUnit,
      frequency: entry.frequency as Frequency,
      customDays: entry.customDays ? [...entry.customDays] : [],
      timeOfDay: entry.timeOfDay ?? '',
      route: entry.route,
      startDate: entry.startDate,
      endDate: entry.endDate,
      notes: entry.notes ?? '',
      vialSize: entry.vialSize ? String(entry.vialSize) : '',
      vialWaterMl: entry.vialWaterMl ? String(entry.vialWaterMl) : '',
      titration: entry.titration ? [...entry.titration] : [],
    });
    setShowTitrationInput(false);
    setTitrationDurationValue('');
    setTitrationDurationUnit('days');
    setTitrationDose('');
    setEditingEntryIdx(idx);
  }

  function handleRemoveEntry(idx: number) {
    const newEntries = cycleEntries.filter((_, i) => i !== idx);
    setCycleEntries(newEntries);
    if (editingEntryIdx === idx) {
      setEditingEntryIdx(null);
      setEntryForm(emptyForm());
    }
    if (editingCycleId) {
      saveCycles(cycles.map((c) =>
        c.id === editingCycleId ? { ...c, entries: newEntries } : c
      ));
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
    setCycleEntries(sortEntries(cycle.entries));
    setEditingCycleId(cycle.id);
    setActiveTab('build');
  }

  function handleLoadForEditAtEntry(cycle: Cycle, unsortedIdx: number) {
    const sorted = sortEntries(cycle.entries);
    const entry = cycle.entries[unsortedIdx];
    const sortedIdx = sorted.indexOf(entry);
    setCycleName(cycle.name);
    setCycleGoal(cycle.goal);
    setCycleNotes(cycle.notes ?? '');
    setBreakWeeks(cycle.breakAfterWeeks ? String(cycle.breakAfterWeeks) : '');
    setCycleEntries(sorted);
    setEditingCycleId(cycle.id);
    const entryDays = diffDays(entry.startDate, entry.endDate);
    if (entryDays % 7 === 0 && entryDays > 0) {
      setCycleLengthValue(String(entryDays / 7));
      setCycleLengthUnit('weeks');
    } else {
      setCycleLengthValue(String(Math.max(entryDays, 1)));
      setCycleLengthUnit('days');
    }
    setEntryForm({
      peptideId: entry.peptideId,
      dose: String(entry.doseMcg),
      doseUnit: entry.doseUnit,
      frequency: entry.frequency as Frequency,
      customDays: entry.customDays ? [...entry.customDays] : [],
      timeOfDay: entry.timeOfDay ?? '',
      route: entry.route,
      startDate: entry.startDate,
      endDate: entry.endDate,
      notes: entry.notes ?? '',
      vialSize: entry.vialSize ? String(entry.vialSize) : '',
      vialWaterMl: entry.vialWaterMl ? String(entry.vialWaterMl) : '',
      titration: entry.titration ? [...entry.titration] : [],
    });
    setShowTitrationInput(false);
    setTitrationDurationValue('');
    setTitrationDurationUnit('days');
    setTitrationDose('');
    setEditingEntryIdx(sortedIdx >= 0 ? sortedIdx : unsortedIdx);
    setActiveTab('build');
  }

  function handleDeleteCycle(id: string) {
    if (!confirm('Delete this cycle? This cannot be undone.')) return;
    saveCycles(cycles.filter((c) => c.id !== id));
    if (logCycleId === id) setLogCycleId(null);
  }

  function handleBulkShiftDates(cycleId: string) {
    if (!bulkShiftDate || bulkShiftSelected.size === 0) return;
    saveCycles(cycles.map((c) => {
      if (c.id !== cycleId) return c;
      return {
        ...c,
        entries: c.entries.map((entry, i) => {
          if (!bulkShiftSelected.has(i)) return entry;
          const offset = diffDays(entry.startDate, bulkShiftDate);
          return {
            ...entry,
            startDate: bulkShiftDate,
            endDate: addDays(entry.endDate, offset),
            titration: entry.titration?.map((t) => ({ ...t, date: addDays(t.date, offset) })),
          };
        }),
      };
    }));
    setBulkShiftCycleId(null);
    setBulkShiftSelected(new Set());
    setBulkShiftDate('');
  }

  function handleShareCycle(cycle: Cycle) {
    const encoded = encodeCycle(cycle);
    const url = `${window.location.origin}/shared?c=${encoded}`;
    if (navigator.share) {
      navigator.share({ title: cycle.name, url }).catch(() => setShareUrl(url));
    } else {
      setShareUrl(url);
    }
  }

  function handleExportJson(cycle: Cycle) {
    const json = JSON.stringify(cycle, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cycle.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const cycle = JSON.parse(e.target?.result as string) as Cycle;
        if (!cycle.name || !Array.isArray(cycle.entries)) {
          alert('Invalid cycle file — make sure it is a Peptide Guide JSON export.');
          return;
        }
        const imported: Cycle = { ...cycle, id: generateId(), logs: cycle.logs ?? [] };
        saveCycles([...cycles, imported]);
        setActiveTab('my-cycles');
        alert(`"${cycle.name}" imported successfully!`);
      } catch {
        alert('Could not read this file. Make sure it is a valid Peptide Guide JSON export.');
      }
    };
    reader.readAsText(file);
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
        const existingIdx = c.logs.findIndex(
          (l) => l.date === logDate && l.peptideId === peptideId
        );
        const entry = c.entries.find((e) => e.peptideId === peptideId);
        if (!entry) return c;
        const newLogs = [...c.logs];
        // Clicking the already-active button removes the log entry
        if (existingIdx >= 0 && c.logs[existingIdx].taken === taken) {
          newLogs.splice(existingIdx, 1);
        } else {
          const newLog: DoseLog = {
            date: logDate,
            peptideId,
            dose: getActiveDose(entry, logDate),
            doseUnit: entry.doseUnit,
            taken,
            notes: notes || undefined,
          };
          if (existingIdx >= 0) {
            newLogs[existingIdx] = newLog;
          } else {
            newLogs.push(newLog);
          }
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
    const timeOrder = (t?: string) => t === 'AM' ? 0 : t === 'PM' ? 1 : 2;
    return logCycle.entries
      .filter((e) => shouldDoseToday(e, logDate))
      .sort((a, b) => {
        const timeDiff = timeOrder(a.timeOfDay) - timeOrder(b.timeOfDay);
        if (timeDiff !== 0) return timeDiff;
        return getPeptideName(a.peptideId).localeCompare(getPeptideName(b.peptideId));
      });
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

      {/* ── Share Link Modal ── */}
      {shareUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setShareUrl(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Share Cycle Link</h2>
              <button
                onClick={() => setShareUrl(null)}
                className="text-gray-500 hover:text-gray-300 text-xl leading-none transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Anyone who opens this link can preview and import your cycle.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 min-w-0 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-300 focus:outline-none"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl).then(() => {
                    setCopiedId('modal');
                    setTimeout(() => setCopiedId(null), 2000);
                  }).catch(() => {
                    const input = document.querySelector('[data-share-input]') as HTMLInputElement;
                    input?.select();
                  });
                }}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                {copiedId === 'modal' ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-600">
              Tap the link above to select it, then copy manually if the button doesn't work.
            </p>
          </div>
        </div>
      )}

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
      <div className="border-b border-gray-800 bg-gray-950 px-4 overflow-x-auto">
        <div className="mx-auto max-w-7xl flex gap-1 pt-2 min-w-max">
          <TabButton active={activeTab === 'build'} onClick={() => setActiveTab('build')}>
            Build Cycle{editingCycleId ? ' (Editing)' : ''}
          </TabButton>
          <TabButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')}>
            Schedule
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
                    onChange={(e) => setEntryForm((f) => ({ ...f, frequency: e.target.value as Frequency, customDays: [] }))}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </Select>
                </div>

                {/* Custom day picker */}
                {entryForm.frequency === 'Custom Days' && (
                  <div>
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {CUSTOM_DAY_ORDER.map((jsDay) => {
                        const name = DAY_NAMES[(jsDay + 6) % 7];
                        const selected = entryForm.customDays.includes(jsDay);
                        return (
                          <button
                            key={jsDay}
                            type="button"
                            onClick={() =>
                              setEntryForm((f) => ({
                                ...f,
                                customDays: selected
                                  ? f.customDays.filter((d) => d !== jsDay)
                                  : [...f.customDays, jsDay],
                              }))
                            }
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                              selected
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                    {entryForm.customDays.length === 0 && (
                      <p className="text-xs text-amber-500 mt-1.5">Select at least one day.</p>
                    )}
                  </div>
                )}

                {/* Time of Day */}
                <div>
                  <Label>Time of Day</Label>
                  <Select
                    value={entryForm.timeOfDay}
                    onChange={(e) => setEntryForm((f) => ({ ...f, timeOfDay: e.target.value as '' | 'AM' | 'PM' }))}
                  >
                    <option value="">Not specified</option>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
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

                {/* Cycle Length */}
                <div>
                  <Label>Cycle Length</Label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={cycleLengthValue}
                      onChange={(e) => setCycleLengthValue(e.target.value)}
                      className="w-16 flex-shrink-0 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                    />
                    <select
                      value={cycleLengthUnit}
                      onChange={(e) => setCycleLengthUnit(e.target.value as 'days' | 'weeks')}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </div>
                  {entryForm.endDate && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      Ends: <span className="text-gray-400">{formatDate(entryForm.endDate)}</span>
                    </p>
                  )}
                </div>

                {/* Vial Reconstitution Calculator */}
                <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-gray-700/60 bg-gray-800/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Vial Reconstitution (optional)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Vial Size (mg)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={entryForm.vialSize}
                        onChange={(e) => setEntryForm((f) => ({ ...f, vialSize: e.target.value }))}
                        placeholder="e.g., 5"
                      />
                    </div>
                    <div>
                      <Label>BAC Water Added (ml)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={entryForm.vialWaterMl}
                        onChange={(e) => setEntryForm((f) => ({ ...f, vialWaterMl: e.target.value }))}
                        placeholder="e.g., 2"
                      />
                    </div>
                  </div>
                  {(() => {
                    const calc = calcInjectionVolume(entryForm.dose, entryForm.doseUnit, entryForm.vialSize, entryForm.vialWaterMl);
                    if (!calc) return (
                      <p className="mt-2 text-xs text-gray-600">
                        Enter vial size + water volume above to see your injection amount per dose.
                      </p>
                    );
                    return (
                      <div className="mt-3 flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 rounded-lg bg-green-950/40 border border-green-800/40 px-3 py-2">
                          <span className="text-xs text-gray-400">Volume per dose:</span>
                          <span className="text-sm font-semibold text-green-400">{calc.volumeMl} ml</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg bg-green-950/40 border border-green-800/40 px-3 py-2">
                          <span className="text-xs text-gray-400">Insulin syringe:</span>
                          <span className="text-sm font-semibold text-green-400">{calc.iu} IU</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Titration Schedule */}
                <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-gray-700/60 bg-gray-800/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Titration Schedule (optional)
                    </p>
                    {!showTitrationInput && (
                      <button
                        type="button"
                        onClick={() => setShowTitrationInput(true)}
                        className="text-xs text-green-400 hover:text-green-300 transition-colors"
                      >
                        + Add dose change
                      </button>
                    )}
                  </div>

                  {entryForm.titration.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <p className="text-xs text-gray-500 mb-1.5">
                        Starting: <span className="text-gray-300">{entryForm.dose || '—'} {entryForm.doseUnit}</span>
                        {entryForm.startDate && <span className="text-gray-600"> from {formatDate(entryForm.startDate)}</span>}
                      </p>
                      {[...entryForm.titration]
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((step, si) => {
                          const sc = calcInjectionVolume(step.dose, entryForm.doseUnit, entryForm.vialSize, entryForm.vialWaterMl);
                          const daysIn = entryForm.startDate ? diffDays(entryForm.startDate, step.date) : null;
                          const durationLabel = daysIn !== null
                            ? (daysIn % 7 === 0 ? `${daysIn / 7}w` : `${daysIn}d`)
                            : null;
                          return (
                            <div key={si} className="flex items-center justify-between rounded-md bg-gray-800 px-3 py-2 text-sm">
                              <span className="text-gray-400">
                                {durationLabel && <span className="text-gray-500 text-xs mr-1">+{durationLabel}</span>}
                                {formatDate(step.date)} →{' '}
                                <span className="font-medium text-white">{step.dose} {entryForm.doseUnit}</span>
                                {sc && <span className="text-green-400 text-xs"> ({sc.volumeMl} ml / {sc.iu} IU)</span>}
                              </span>
                              <button
                                type="button"
                                onClick={() => setEntryForm((f) => ({
                                  ...f,
                                  titration: f.titration.filter((_, j) => j !== si),
                                }))}
                                className="ml-3 text-xs text-red-500 hover:text-red-400 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {showTitrationInput && (
                    <div className="mt-2 rounded-lg border border-gray-700 bg-gray-800 p-3">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <Label>Duration at this dose</Label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              value={titrationDurationValue}
                              onChange={(e) => setTitrationDurationValue(e.target.value)}
                              placeholder="e.g. 2"
                              className="w-16 flex-shrink-0 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                            />
                            <select
                              value={titrationDurationUnit}
                              onChange={(e) => setTitrationDurationUnit(e.target.value as 'days' | 'weeks')}
                              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                            >
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                            </select>
                          </div>
                          {titrationDurationValue && Number(titrationDurationValue) > 0 && entryForm.startDate && (() => {
                            const dd = titrationDurationUnit === 'weeks'
                              ? Number(titrationDurationValue) * 7
                              : Number(titrationDurationValue);
                            const sorted = [...entryForm.titration].sort((a, b) => a.date.localeCompare(b.date));
                            const prev = sorted.length > 0 ? sorted[sorted.length - 1].date : entryForm.startDate;
                            return (
                              <p className="mt-1 text-xs text-gray-500">
                                Changes on: <span className="text-gray-400">{formatDate(addDays(prev, dd))}</span>
                              </p>
                            );
                          })()}
                        </div>
                        <div>
                          <Label>New Dose ({entryForm.doseUnit})</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={titrationDose}
                            onChange={(e) => setTitrationDose(e.target.value)}
                            placeholder="e.g., 2"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAddTitrationStep}
                          className="px-4 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-semibold transition-colors"
                        >
                          Add Step
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowTitrationInput(false); setTitrationDurationValue(''); setTitrationDurationUnit('days'); setTitrationDose(''); }}
                          className="px-4 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-xs transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {entryForm.titration.length === 0 && !showTitrationInput && (
                    <p className="text-xs text-gray-600">
                      No dose changes planned. Use "Add dose change" to schedule dose escalations.
                    </p>
                  )}
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
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Frequency / Time</th>
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
                          <td className="py-3 px-4 text-gray-300">
                            {displayFrequency(entry)}
                            {entry.timeOfDay && (
                              <span className="ml-1 text-xs text-green-400">({entry.timeOfDay})</span>
                            )}
                          </td>
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

        {/* ═══════════ TAB 2: SCHEDULE ═══════════ */}
        {activeTab === 'schedule' && (() => {
          const weekDays = Array.from({ length: 7 }, (_, i) => addDays(scheduleWeekStart, i));
          const weekEnd = weekDays[6];
          const today = todayStr();

          const activeCycle = scheduleCycleId
            ? cycles.find((c) => c.id === scheduleCycleId) ?? cycles[0] ?? null
            : cycles[0] ?? null;

          return (
            <div className="space-y-5">

              {/* Week navigation */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScheduleWeekStart((w) => addDays(w, -7))}
                  className="p-2 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white transition-colors"
                  aria-label="Previous week"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1 text-center">
                  <p className="text-sm font-semibold text-white">
                    {new Date(scheduleWeekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' – '}
                    {new Date(weekEnd + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {scheduleWeekStart !== getWeekMonday(today) && (
                    <button
                      onClick={() => setScheduleWeekStart(getWeekMonday(today))}
                      className="text-xs text-green-400 hover:text-green-300 transition-colors"
                    >
                      Back to this week
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setScheduleWeekStart((w) => addDays(w, 7))}
                  className="p-2 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white transition-colors"
                  aria-label="Next week"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Cycle picker */}
              {cycles.length > 1 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Showing cycle:</span>
                  <Select
                    value={scheduleCycleId ?? cycles[0]?.id ?? ''}
                    onChange={(e) => setScheduleCycleId(e.target.value)}
                    className="text-xs py-1.5"
                  >
                    {cycles.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
              )}

              {cycles.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900 py-20 text-center">
                  <p className="text-base font-medium text-gray-400 mb-1">No cycles saved yet</p>
                  <p className="text-sm text-gray-600 mb-6">Build a cycle first to see your weekly schedule.</p>
                  <button
                    onClick={() => setActiveTab('build')}
                    className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
                  >
                    Build a Cycle
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {weekDays.map((day, di) => {
                    const isToday = day === today;
                    const isPast = day < today;
                    const scheduled = activeCycle
                      ? activeCycle.entries.filter((e) => shouldDoseToday(e, day))
                      : [];

                    return (
                      <div
                        key={day}
                        className={[
                          'rounded-xl border overflow-hidden',
                          isToday
                            ? 'border-green-700/60 bg-green-950/15'
                            : isPast
                            ? 'border-gray-800 bg-gray-900/40 opacity-60'
                            : 'border-gray-800 bg-gray-900',
                        ].join(' ')}
                      >
                        {/* Day header */}
                        <div className={[
                          'flex items-center gap-3 px-4 py-2.5 border-b',
                          isToday ? 'border-green-800/40 bg-green-950/20' : 'border-gray-800',
                        ].join(' ')}>
                          <div className="flex items-baseline gap-2">
                            <span className={`text-sm font-bold ${isToday ? 'text-green-400' : 'text-gray-300'}`}>
                              {DAY_NAMES[di]}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {isToday && (
                            <span className="ml-1 px-2 py-0.5 rounded-full bg-green-600 text-white text-xs font-semibold">
                              Today
                            </span>
                          )}
                          {scheduled.length > 0 && (
                            <span className="ml-auto text-xs text-gray-500">
                              {scheduled.length} dose{scheduled.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Compounds */}
                        {scheduled.length === 0 ? (
                          <div className="px-4 py-3">
                            <p className="text-xs text-gray-600 italic">No doses scheduled</p>
                          </div>
                        ) : (
                          <div className="px-4 py-3 space-y-2">
                            {scheduled.map((entry, ei) => {
                              const activeDose = getActiveDose(entry, day);
                              const calc = entry.vialSize && entry.vialWaterMl
                                ? calcInjectionVolume(String(activeDose), entry.doseUnit, String(entry.vialSize), String(entry.vialWaterMl))
                                : null;
                              const colorDot = BAR_COLORS[(activeCycle?.entries.indexOf(entry) ?? ei) % BAR_COLORS.length];

                              return (
                                <div key={ei} className="flex items-start gap-2.5">
                                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${colorDot}`} />
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium text-gray-100">
                                      {getPeptideName(entry.peptideId)}
                                    </span>
                                    <span className="mx-1.5 text-gray-600">·</span>
                                    <span className={`text-sm font-semibold ${activeDose !== entry.doseMcg ? 'text-green-400' : 'text-gray-200'}`}>
                                      {activeDose} {entry.doseUnit}
                                    </span>
                                    {calc && (
                                      <span className="ml-1.5 text-xs text-green-500">
                                        = {calc.volumeMl} ml / {calc.iu} IU
                                      </span>
                                    )}
                                    <span className="ml-1.5 text-xs text-gray-500">
                                      {displayFrequency(entry)}{entry.timeOfDay ? ` (${entry.timeOfDay})` : ''} · {ROUTE_LABELS[entry.route]}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Link to dose log */}
              {activeCycle && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      setLogCycleId(activeCycle.id);
                      setLogDate(today);
                      setActiveTab('dose-log');
                    }}
                    className="text-xs text-gray-500 hover:text-green-400 transition-colors"
                  >
                    Log today's doses in Dose Log →
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══════════ TAB 3: MY CYCLES ═══════════ */}
        {activeTab === 'my-cycles' && (
          <div className="space-y-5">

            {/* Hidden file input for JSON import */}
            <input
              ref={importFileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = '';
              }}
            />

            {/* Top toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                {cycles.length} saved cycle{cycles.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => importFileRef.current?.click()}
                className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 text-xs font-medium transition-colors"
              >
                ↑ Import from JSON
              </button>
            </div>

            {cycles.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900 py-24 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-base font-medium text-gray-400 mb-1">No saved cycles yet</p>
                <p className="text-sm text-gray-600 mb-6">Build your first cycle or import one from another device.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab('build')}
                    className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
                  >
                    Build a Cycle
                  </button>
                  <button
                    onClick={() => importFileRef.current?.click()}
                    className="px-5 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white text-sm font-semibold transition-colors"
                  >
                    Import JSON
                  </button>
                </div>
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
                        onClick={() => handleShareCycle(cycle)}
                        className="px-3 py-1.5 rounded-lg border border-green-800/60 text-green-400 hover:bg-green-900/30 text-xs font-medium transition-colors"
                      >
                        Share Link
                      </button>
                      <button
                        onClick={() => handleExportJson(cycle)}
                        className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-xs font-medium transition-colors"
                      >
                        Save as JSON
                      </button>
                      <button
                        onClick={() => handleExportCycle(cycle)}
                        className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-xs font-medium transition-colors"
                      >
                        Export Text
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
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Peptides
                      </p>
                      {bulkShiftCycleId === cycle.id ? (
                        <button
                          onClick={() => { setBulkShiftCycleId(null); setBulkShiftSelected(new Set()); setBulkShiftDate(''); }}
                          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => { setBulkShiftCycleId(cycle.id); setBulkShiftSelected(new Set()); setBulkShiftDate(''); }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          Shift Dates
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {cycle.entries.map((e, i) => {
                        const calc = e.vialSize && e.vialWaterMl
                          ? calcInjectionVolume(String(e.doseMcg), e.doseUnit, String(e.vialSize), String(e.vialWaterMl))
                          : null;
                        const isShiftMode = bulkShiftCycleId === cycle.id;
                        const isSelected = bulkShiftSelected.has(i);
                        const isExpanded = !isShiftMode && expandedEntry?.cycleId === cycle.id && expandedEntry?.idx === i;
                        return (
                          <div
                            key={i}
                            className={`rounded-lg border transition-colors ${
                              isShiftMode
                                ? isSelected
                                  ? 'bg-indigo-900/30 border-indigo-500/60 cursor-pointer'
                                  : 'bg-gray-800 border-gray-700/50 cursor-pointer hover:border-gray-600'
                                : isExpanded
                                  ? 'bg-gray-800 border-gray-600'
                                  : 'bg-gray-800 border-gray-700/50'
                            }`}
                          >
                            {/* Tappable header row */}
                            <div
                              className={`px-3 py-2.5 ${!isShiftMode ? 'cursor-pointer select-none' : ''}`}
                              onClick={isShiftMode ? () => {
                                setBulkShiftSelected((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(i)) next.delete(i); else next.add(i);
                                  return next;
                                });
                              } : () => {
                                setExpandedEntry(isExpanded ? null : { cycleId: cycle.id, idx: i });
                              }}
                            >
                              <div className="flex items-center gap-x-2">
                                {isShiftMode && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="w-3.5 h-3.5 rounded border-gray-600 accent-indigo-500 flex-shrink-0 pointer-events-none"
                                  />
                                )}
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                                <span className="text-sm font-medium text-gray-100 flex-1">{getPeptideName(e.peptideId)}</span>
                                <span className="text-sm text-gray-300">{e.doseMcg} {e.doseUnit}</span>
                                {calc && (
                                  <span className="text-xs text-green-400 font-medium">{calc.volumeMl} ml</span>
                                )}
                                {!isShiftMode && (
                                  <svg
                                    className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                              </div>
                              <div className="mt-0.5 ml-4 text-xs text-gray-500">
                                {displayFrequency(e)}{e.timeOfDay ? ` (${e.timeOfDay})` : ''} · {ROUTE_LABELS[e.route]}
                              </div>
                            </div>

                            {/* Expanded details panel */}
                            {isExpanded && (
                              <div className="border-t border-gray-700 px-3 py-3 space-y-2.5">
                                {/* Date range */}
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Dates</span>
                                  <span className="text-xs text-gray-300">
                                    {formatDate(e.startDate)} → {formatDate(e.endDate)}
                                    <span className="text-gray-500 ml-1">({calcDuration(e.startDate, e.endDate)})</span>
                                  </span>
                                </div>
                                {/* Dose detail */}
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Dose</span>
                                  <span className="text-xs text-gray-300">
                                    {e.doseMcg} {e.doseUnit}
                                    {calc && <span className="text-green-400 ml-1">= {calc.volumeMl} ml / {calc.iu} IU</span>}
                                  </span>
                                </div>
                                {/* Vial */}
                                {e.vialSize && e.vialWaterMl && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Vial</span>
                                    <span className="text-xs text-gray-300">{e.vialSize} mg in {e.vialWaterMl} ml BAC water</span>
                                  </div>
                                )}
                                {/* Vials Needed */}
                                {e.vialSize && (() => {
                                  const vials = calcVialsNeeded(e);
                                  if (vials === null) return null;
                                  return (
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-500">Vials Needed</span>
                                      <span className="text-xs font-semibold text-amber-400">
                                        {vials} vial{vials !== 1 ? 's' : ''}
                                        {e.titration?.length ? ' (incl. titration)' : ''}
                                      </span>
                                    </div>
                                  );
                                })()}
                                {/* Titration */}
                                {e.titration && e.titration.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Titration schedule</p>
                                    <div className="space-y-0.5 ml-2">
                                      {[...e.titration].sort((a, b) => a.date.localeCompare(b.date)).map((step, j) => {
                                        const sc = e.vialSize && e.vialWaterMl
                                          ? calcInjectionVolume(step.dose, e.doseUnit, String(e.vialSize), String(e.vialWaterMl))
                                          : null;
                                        return (
                                          <p key={j} className="text-xs text-gray-400">
                                            {formatDate(step.date)} → <span className="text-gray-200">{step.dose} {e.doseUnit}</span>
                                            {sc && <span className="text-green-500"> ({sc.volumeMl} ml / {sc.iu} IU)</span>}
                                          </p>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {/* Entry notes */}
                                {e.notes && (
                                  <p className="text-xs text-gray-500 italic">{e.notes}</p>
                                )}
                                {/* Edit button */}
                                <button
                                  onClick={() => handleLoadForEditAtEntry(cycle, i)}
                                  className="w-full mt-1 rounded-md bg-gray-700 hover:bg-gray-600 border border-gray-600 px-3 py-2 text-xs font-medium text-gray-200 transition-colors text-center"
                                >
                                  Edit this entry
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Bulk shift controls */}
                    {bulkShiftCycleId === cycle.id && (
                      <div className="mt-3 rounded-lg bg-gray-800/60 border border-gray-700 px-4 py-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              if (bulkShiftSelected.size === cycle.entries.length) {
                                setBulkShiftSelected(new Set());
                              } else {
                                setBulkShiftSelected(new Set(cycle.entries.map((_, i) => i)));
                              }
                            }}
                            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                          >
                            {bulkShiftSelected.size === cycle.entries.length ? 'Deselect all' : 'Select all'}
                          </button>
                          <span className="text-xs text-gray-500">{bulkShiftSelected.size} selected</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-gray-400 whitespace-nowrap">New start date</label>
                          <input
                            type="date"
                            value={bulkShiftDate}
                            onChange={(e) => setBulkShiftDate(e.target.value)}
                            className="flex-1 min-w-0 rounded-md bg-gray-700 border border-gray-600 px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                          />
                          <button
                            onClick={() => handleBulkShiftDates(cycle.id)}
                            disabled={bulkShiftSelected.size === 0 || !bulkShiftDate}
                            className="rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 text-sm font-medium text-white transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                        {bulkShiftDate && bulkShiftSelected.size > 0 && (
                          <p className="text-xs text-gray-500">
                            Sets start date of {bulkShiftSelected.size} compound{bulkShiftSelected.size !== 1 ? 's' : ''} to {formatDate(bulkShiftDate)}, preserving each duration
                          </p>
                        )}
                      </div>
                    )}

                    {cycle.notes && (
                      <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                        {cycle.notes}
                      </p>
                    )}
                  </div>

                  {/* Visual timeline */}
                  {cycle.entries.length > 0 && (
                    <div className="px-5 pb-5">
                      <GanttTimeline entries={cycle.entries} />
                    </div>
                  )}
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
                                {(() => {
                                  const activeDose = getActiveDose(entry, logDate);
                                  const calc = entry.vialSize && entry.vialWaterMl
                                    ? calcInjectionVolume(String(activeDose), entry.doseUnit, String(entry.vialSize), String(entry.vialWaterMl))
                                    : null;
                                  return (
                                    <>
                                      <span className={activeDose !== entry.doseMcg ? 'text-green-400 font-medium' : ''}>
                                        {activeDose} {entry.doseUnit}
                                      </span>
                                      {calc && <span className="text-green-500"> = {calc.volumeMl} ml / {calc.iu} IU</span>}
                                      {' — '}{displayFrequency(entry)}{entry.timeOfDay ? ` (${entry.timeOfDay})` : ''} — {ROUTE_LABELS[entry.route]}
                                    </>
                                  );
                                })()}
                              </p>
                              {entry.notes && (
                                <p className="text-xs text-amber-400/80 mt-1 italic">
                                  📝 {entry.notes}
                                </p>
                              )}
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
