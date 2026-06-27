'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  X,
  Plus,
  Layers,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  RotateCcw,
  Target,
} from 'lucide-react';
import { peptides } from '@/lib/peptide-data';
import { GOAL_LABELS, GoalType, Peptide } from '@/lib/types';

// ─── Popular pre-built stacks ─────────────────────────────────────────────────

interface PopularStack {
  name: string;
  tag: string;
  tagColor: string;
  peptideNames: string[];
  peptideIds: string[];
  summary: string;
}

const POPULAR_STACKS: PopularStack[] = [
  {
    name: 'The Wolverine Stack',
    tag: 'Healing',
    tagColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    peptideNames: ['BPC-157', 'TB-500'],
    peptideIds: ['bpc-157', 'tb-500'],
    summary:
      'The gold standard healing combination. BPC-157 works locally at injury sites while TB-500 provides systemic tissue repair and anti-inflammatory effects. Highly synergistic.',
  },
  {
    name: 'GH Optimization Stack',
    tag: 'Growth Hormone',
    tagColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    peptideNames: ['CJC-1295 No DAC', 'Ipamorelin'],
    peptideIds: ['cjc-1295-no-dac', 'ipamorelin'],
    summary:
      'A clean GH pulse stack. CJC-1295 (without DAC) amplifies the GH signal and Ipamorelin triggers the release — together they produce strong, natural GH pulses without cortisol or prolactin spikes.',
  },
  {
    name: 'Fat Loss Stack',
    tag: 'Weight Loss',
    tagColor: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    peptideNames: ['Tesamorelin', 'AOD9604', 'GH Frag 176-191'],
    peptideIds: ['tesamorelin', 'aod9604', 'gh-frag-176-191'],
    summary:
      'A triple-threat for fat mobilization. Tesamorelin targets visceral fat, AOD9604 stimulates fat oxidation, and GH Frag 176-191 mimics the lipolytic tail of GH without raising IGF-1.',
  },
  {
    name: 'Cognitive Stack',
    tag: 'Mental',
    tagColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    peptideNames: ['Semax', 'Selank', 'Dihexa'],
    peptideIds: ['semax', 'selank', 'dihexa'],
    summary:
      'Semax boosts BDNF and focus, Selank reduces anxiety without sedation, and Dihexa potently enhances synaptogenesis. Together they cover cognitive enhancement, neuroprotection, and mood.',
  },
  {
    name: 'Anti-Aging Stack',
    tag: 'Longevity',
    tagColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    peptideNames: ['Epithalon', 'GHK-Cu', 'NAD+'],
    peptideIds: ['epithalon', 'ghk-cu', 'nad'],
    summary:
      'Epithalon lengthens telomeres and restores pineal function, GHK-Cu promotes collagen synthesis and cellular repair, and NAD+ powers mitochondrial function and DNA repair pathways.',
  },
  {
    name: 'Testosterone Stack',
    tag: 'Hormonal',
    tagColor: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    peptideNames: ['Gonadorelin', 'Enclomiphene', 'HCG'],
    peptideIds: ['gonadorelin', 'enclomiphene', 'hcg'],
    summary:
      'A comprehensive HPG axis support protocol. Gonadorelin pulses stimulate LH/FSH, Enclomiphene blocks estrogen feedback at the pituitary, and HCG directly stimulates Leydig cells.',
  },
  {
    name: 'Recovery & Performance',
    tag: 'Athletic',
    tagColor: 'bg-red-500/15 text-red-400 border-red-500/30',
    peptideNames: ['BPC-157', 'TB-500', 'IGF-LR3'],
    peptideIds: ['bpc-157', 'tb-500', 'igf-lr3'],
    summary:
      'Maximum recovery and performance. BPC-157 and TB-500 handle tissue repair while IGF-LR3 dramatically amplifies nutrient partitioning and muscle protein synthesis.',
  },
  {
    name: 'Immune Stack',
    tag: 'Immune',
    tagColor: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    peptideNames: ['Thymosin Alpha 1', 'LL-37', 'KPV'],
    peptideIds: ['thymosin-alpha-1', 'll-37', 'kpv'],
    summary:
      'Thymosin Alpha-1 modulates adaptive immunity and T-cell function, LL-37 provides broad-spectrum antimicrobial defense, and KPV reduces inflammation through melanocortin pathways.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EXPERIENCE_COLORS: Record<string, string> = {
  beginner: 'bg-green-500/15 text-green-400 border-green-500/30',
  intermediate: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  advanced: 'bg-red-500/15 text-red-400 border-red-500/30',
};

type CompatibilityStatus = 'synergistic' | 'neutral' | 'redundant' | 'complementary';

function getPairStatus(a: Peptide, b: Peptide): CompatibilityStatus {
  const aSyn = a.stacks.synergistic.some((e) => e.id === b.id);
  const bSyn = b.stacks.synergistic.some((e) => e.id === a.id);
  const aRed = a.stacks.redundant.some((e) => e.id === b.id);
  const bRed = b.stacks.redundant.some((e) => e.id === a.id);
  const aComp = a.stacks.complementary.some((e) => e.id === b.id);
  const bComp = b.stacks.complementary.some((e) => e.id === a.id);

  if (aSyn || bSyn) return 'synergistic';
  if (aRed || bRed) return 'redundant';
  if (aComp || bComp) return 'complementary';
  return 'neutral';
}

function getSynReason(a: Peptide, b: Peptide): string | null {
  const entry =
    a.stacks.synergistic.find((e) => e.id === b.id) ||
    b.stacks.synergistic.find((e) => e.id === a.id);
  return entry?.reason ?? null;
}

function getRedReason(a: Peptide, b: Peptide): string | null {
  const entry =
    a.stacks.redundant.find((e) => e.id === b.id) ||
    b.stacks.redundant.find((e) => e.id === a.id);
  return entry?.reason ?? null;
}

function getCompReason(a: Peptide, b: Peptide): string | null {
  const entry =
    a.stacks.complementary.find((e) => e.id === b.id) ||
    b.stacks.complementary.find((e) => e.id === a.id);
  return entry?.reason ?? null;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function CompatBadge({ status }: { status: CompatibilityStatus }) {
  const map: Record<
    CompatibilityStatus,
    { label: string; className: string }
  > = {
    synergistic: {
      label: 'Synergistic',
      className: 'bg-green-500/15 text-green-400 border-green-500/30',
    },
    neutral: {
      label: 'Neutral',
      className: 'bg-gray-700/50 text-gray-400 border-gray-700',
    },
    redundant: {
      label: 'Redundant',
      className: 'bg-red-500/15 text-red-400 border-red-500/30',
    },
    complementary: {
      label: 'Complementary',
      className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    },
  };
  const { label, className } = map[status];
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${className}`}
    >
      {label}
    </span>
  );
}

// ─── Popular Stack Card ───────────────────────────────────────────────────────

function PopularStackCard({
  stack,
  onUse,
}: {
  stack: PopularStack;
  onUse: (ids: string[]) => void;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-100">{stack.name}</h3>
        <span
          className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${stack.tagColor}`}
        >
          {stack.tag}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {stack.peptideNames.map((name) => (
          <span
            key={name}
            className="text-xs px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-700"
          >
            {name}
          </span>
        ))}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed flex-1">{stack.summary}</p>

      <button
        onClick={() => onUse(stack.peptideIds)}
        className="self-start inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 hover:border-green-500/40 transition-all"
      >
        <Layers className="w-3.5 h-3.5" aria-hidden="true" />
        Use This Stack
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StackingPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Peptide[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const MAX_STACK = 5;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return peptides;
    return peptides.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.aliases?.some((a) => a.toLowerCase().includes(q))
    );
  }, [search]);

  function addPeptide(p: Peptide) {
    if (selected.length >= MAX_STACK) return;
    if (selected.some((s) => s.id === p.id)) return;
    setSelected((prev) => [...prev, p]);
  }

  function removePeptide(id: string) {
    setSelected((prev) => prev.filter((p) => p.id !== id));
  }

  function loadStack(ids: string[]) {
    const found = ids
      .map((id) => peptides.find((p) => p.id === id))
      .filter(Boolean) as Peptide[];
    setSelected(found.slice(0, MAX_STACK));
    // On mobile, collapse sidebar after loading a stack
    setSidebarOpen(false);
  }

  // ── Derived analysis ────────────────────────────────────────────────────────

  const pairs = useMemo(() => {
    const result: Array<{
      a: Peptide;
      b: Peptide;
      status: CompatibilityStatus;
    }> = [];
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        result.push({
          a: selected[i],
          b: selected[j],
          status: getPairStatus(selected[i], selected[j]),
        });
      }
    }
    return result;
  }, [selected]);

  const synPairs = useMemo(
    () => pairs.filter((p) => p.status === 'synergistic'),
    [pairs]
  );
  const redPairs = useMemo(
    () => pairs.filter((p) => p.status === 'redundant'),
    [pairs]
  );
  const compPairs = useMemo(
    () => pairs.filter((p) => p.status === 'complementary'),
    [pairs]
  );

  const allGoals = useMemo<GoalType[]>(() => {
    const set = new Set<GoalType>();
    selected.forEach((p) => p.goals.forEach((g) => set.add(g)));
    return Array.from(set);
  }, [selected]);

  // Simple protocol suggestion
  const protocol = useMemo(() => {
    if (selected.length === 0) return '';
    const names = selected.map((p) => p.name).join(', ');
    const hasSyn = synPairs.length > 0;
    const hasRed = redPairs.length > 0;
    const hasComp = compPairs.length > 0;

    let text = `This stack includes ${names}. `;
    if (hasSyn) {
      text += `${synPairs.map((p) => `${p.a.name} + ${p.b.name}`).join(' and ')} are synergistic and can be run concurrently. `;
    }
    if (hasComp) {
      text += `${compPairs.map((p) => `${p.a.name} and ${p.b.name}`).join(', ')} work best in alternating or complementary cycles rather than simultaneous use. `;
    }
    if (hasRed) {
      text += `Note: ${redPairs.map((p) => `${p.a.name} and ${p.b.name}`).join(', ')} may be redundant — consider choosing one or alternating them. `;
    }
    if (!hasSyn && !hasComp && !hasRed) {
      text += 'No explicit interactions are documented for this combination; all peptides appear compatible for concurrent use.';
    }
    return text.trim();
  }, [selected, synPairs, redPairs, compPairs]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Page header */}
      <div className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-green-500" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-100 tracking-tight">
                Peptide Stacking Guide
              </h1>
              <p className="text-gray-400 text-sm mt-1 max-w-xl">
                Select up to {MAX_STACK} peptides to analyze synergies,
                conflicts, and get a suggested protocol. Or explore popular
                pre-built stacks below.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <aside className="lg:w-72 flex-shrink-0">
            {/* Mobile toggle */}
            <button
              className="lg:hidden w-full flex items-center justify-between px-4 py-2.5 mb-3 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-300"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-expanded={sidebarOpen}
            >
              <span className="font-medium">
                Peptide Selector
                {selected.length > 0 && (
                  <span className="ml-2 text-xs text-green-400">
                    ({selected.length} selected)
                  </span>
                )}
              </span>
              {sidebarOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-500" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" aria-hidden="true" />
              )}
            </button>

            <div
              className={`space-y-4 ${sidebarOpen ? 'block' : 'hidden'} lg:block`}
            >
              {/* Selected peptides */}
              {selected.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
                    Your Stack ({selected.length}/{MAX_STACK})
                  </p>
                  {selected.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20"
                    >
                      <span className="text-xs font-medium text-green-300 truncate">
                        {p.name}
                      </span>
                      <button
                        onClick={() => removePeptide(p.id)}
                        className="flex-shrink-0 text-green-600 hover:text-red-400 transition-colors"
                        aria-label={`Remove ${p.name}`}
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {selected.length > 0 && (
                    <button
                      onClick={() => setSelected([])}
                      className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors py-1 flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      Clear all
                    </button>
                  )}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Search peptides..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Peptide list */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="max-h-[460px] overflow-y-auto divide-y divide-gray-800/60">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-6">
                      No peptides found
                    </p>
                  ) : (
                    filtered.map((p) => {
                      const isSelected = selected.some((s) => s.id === p.id);
                      const isFull =
                        selected.length >= MAX_STACK && !isSelected;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between gap-2 px-3 py-2.5 transition-colors ${
                            isSelected
                              ? 'bg-green-500/10'
                              : isFull
                              ? 'opacity-40'
                              : 'hover:bg-gray-800/60'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-200 truncate">
                              {p.name}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {p.experienceLevel}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              isSelected ? removePeptide(p.id) : addPeptide(p)
                            }
                            disabled={isFull}
                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400'
                                : isFull
                                ? 'border-gray-700 text-gray-700 cursor-not-allowed'
                                : 'border-gray-700 text-gray-500 hover:border-green-500/50 hover:text-green-400 hover:bg-green-500/10'
                            }`}
                            aria-label={
                              isSelected ? `Remove ${p.name}` : `Add ${p.name}`
                            }
                          >
                            {isSelected ? (
                              <X className="w-3 h-3" aria-hidden="true" />
                            ) : (
                              <Plus className="w-3 h-3" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {selected.length > 0 && (
                <div className="text-xs text-gray-600 text-center">
                  Analysis updates automatically as you add peptides
                </div>
              )}
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

            {selected.length === 0 ? (
              /* Popular stacks */
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-100 mb-1">
                    Popular Stacks
                  </h2>
                  <p className="text-sm text-gray-500">
                    Click &quot;Use This Stack&quot; to load a pre-built combination and
                    analyze it, or build your own using the selector on the left.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {POPULAR_STACKS.map((stack) => (
                    <PopularStackCard
                      key={stack.name}
                      stack={stack}
                      onUse={loadStack}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Stack analysis */
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-100">
                    Stack Analysis
                  </h2>
                  <span className="text-xs text-gray-500">
                    {selected.length} peptide{selected.length !== 1 ? 's' : ''} selected
                  </span>
                </div>

                {/* Selected peptide cards */}
                <div className="flex flex-wrap gap-2">
                  {selected.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800"
                    >
                      <span className="text-sm font-medium text-gray-200">
                        {p.name}
                      </span>
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded-full border capitalize ${
                          EXPERIENCE_COLORS[p.experienceLevel] ??
                          'bg-gray-800 text-gray-400 border-gray-700'
                        }`}
                      >
                        {p.experienceLevel}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Compatibility Matrix */}
                {pairs.length > 0 && (
                  <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-500" aria-hidden="true" />
                      <h3 className="text-sm font-bold text-gray-100">
                        Compatibility Matrix
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="px-4 py-2 text-left text-gray-500 font-medium w-1/3">
                              Pair
                            </th>
                            <th className="px-4 py-2 text-left text-gray-500 font-medium w-1/4">
                              Compatibility
                            </th>
                            <th className="px-4 py-2 text-left text-gray-500 font-medium">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                          {pairs.map(({ a, b, status }) => {
                            const reason =
                              getSynReason(a, b) ||
                              getRedReason(a, b) ||
                              getCompReason(a, b) ||
                              'No specific interaction documented.';
                            return (
                              <tr
                                key={`${a.id}-${b.id}`}
                                className="hover:bg-gray-800/40 transition-colors"
                              >
                                <td className="px-4 py-2.5 font-medium text-gray-300 whitespace-nowrap">
                                  {a.name} + {b.name}
                                </td>
                                <td className="px-4 py-2.5">
                                  <CompatBadge status={status} />
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 leading-relaxed">
                                  {reason}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Synergistic Pairs */}
                {synPairs.length > 0 && (
                  <section className="bg-gray-900 border border-green-500/20 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-green-500/10 flex items-center gap-2">
                      <CheckCircle2
                        className="w-4 h-4 text-green-500"
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-bold text-gray-100">
                        Synergistic Pairs
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-800/40">
                      {synPairs.map(({ a, b }) => {
                        const reason = getSynReason(a, b);
                        return (
                          <div
                            key={`${a.id}-${b.id}`}
                            className="px-4 py-3 space-y-1"
                          >
                            <p className="text-sm font-semibold text-green-300">
                              {a.name} + {b.name}
                            </p>
                            {reason && (
                              <p className="text-xs text-gray-400 leading-relaxed">
                                {reason}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Redundant / Conflicts */}
                {redPairs.length > 0 && (
                  <section className="bg-gray-900 border border-red-500/20 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-red-500/10 flex items-center gap-2">
                      <AlertTriangle
                        className="w-4 h-4 text-red-400"
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-bold text-gray-100">
                        Redundant / Conflicts
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-800/40">
                      {redPairs.map(({ a, b }) => {
                        const reason = getRedReason(a, b);
                        return (
                          <div
                            key={`${a.id}-${b.id}`}
                            className="px-4 py-3 space-y-1"
                          >
                            <p className="text-sm font-semibold text-red-300">
                              {a.name} + {b.name}
                            </p>
                            {reason && (
                              <p className="text-xs text-gray-400 leading-relaxed">
                                {reason}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Complementary Cycles */}
                {compPairs.length > 0 && (
                  <section className="bg-gray-900 border border-blue-500/20 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-blue-500/10 flex items-center gap-2">
                      <RotateCcw
                        className="w-4 h-4 text-blue-400"
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-bold text-gray-100">
                        Complementary Cycles
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-800/40">
                      {compPairs.map(({ a, b }) => {
                        const reason = getCompReason(a, b);
                        return (
                          <div
                            key={`${a.id}-${b.id}`}
                            className="px-4 py-3 space-y-1"
                          >
                            <p className="text-sm font-semibold text-blue-300">
                              {a.name} alternating with {b.name}
                            </p>
                            {reason && (
                              <p className="text-xs text-gray-400 leading-relaxed">
                                {reason}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Suggested Protocol */}
                {protocol && (
                  <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                      <Layers
                        className="w-4 h-4 text-green-500"
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-bold text-gray-100">
                        Suggested Protocol
                      </h3>
                    </div>
                    <div className="px-4 py-4">
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {protocol}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selected.map((p) => (
                          <Link
                            key={p.id}
                            href={`/peptides/${p.id}`}
                            className="text-xs text-green-400 hover:text-green-300 underline underline-offset-2 transition-colors"
                          >
                            {p.name} dosing →
                          </Link>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Goals Covered */}
                {allGoals.length > 0 && (
                  <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                      <Target
                        className="w-4 h-4 text-green-500"
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-bold text-gray-100">
                        Goals Covered
                      </h3>
                    </div>
                    <div className="px-4 py-4 flex flex-wrap gap-2">
                      {allGoals.map((g) => (
                        <span
                          key={g}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20"
                        >
                          <MinusCircle
                            className="w-3 h-3 text-green-500"
                            aria-hidden="true"
                          />
                          {GOAL_LABELS[g]}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Edge case: single peptide, no pairs yet */}
                {pairs.length === 0 && selected.length === 1 && (
                  <div className="text-center py-10 text-gray-600 text-sm">
                    Add at least one more peptide to see compatibility analysis.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
