'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, Target, Sparkles } from 'lucide-react';
import { peptides } from '@/lib/peptide-data';
import { GOAL_LABELS, GoalType, Peptide } from '@/lib/types';

// ─── Goal metadata ────────────────────────────────────────────────────────────

const GOAL_ICONS: Record<GoalType, string> = {
  'weight-loss': '⚖️',
  'visceral-fat-loss': '🔥',
  'muscle-gain': '💪',
  'testosterone': '⚡',
  'healing': '🩹',
  'joints-pain': '🦴',
  'skin': '✨',
  'mental': '🧠',
  'sexual': '❤️',
  'anti-aging': '🕐',
  'immune': '🛡️',
  'sleep': '🌙',
  'energy': '⚡',
  'cardiovascular': '❤️‍🔥',
  'hair': '💈',
  'gut-health': '🌿',
  'longevity': '♾️',
};

const ALL_GOALS = Object.keys(GOAL_LABELS) as GoalType[];

const EXPERIENCE_COLORS: Record<string, string> = {
  beginner: 'bg-green-500/15 text-green-400 border-green-500/30',
  intermediate: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  advanced: 'bg-red-500/15 text-red-400 border-red-500/30',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GoalButton({
  goal,
  selected,
  onToggle,
}: {
  goal: GoalType;
  selected: boolean;
  onToggle: (g: GoalType) => void;
}) {
  return (
    <button
      onClick={() => onToggle(goal)}
      className={`
        flex flex-col items-center gap-2 p-4 rounded-xl border text-center
        transition-all duration-150 select-none cursor-pointer
        ${
          selected
            ? 'bg-green-500/15 border-green-500/60 ring-1 ring-green-500/40 text-green-300'
            : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300 hover:bg-gray-800/60'
        }
      `}
      aria-pressed={selected}
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {GOAL_ICONS[goal]}
      </span>
      <span className="text-xs font-medium leading-tight">
        {GOAL_LABELS[goal]}
      </span>
      {selected && (
        <CheckCircle2
          className="w-3.5 h-3.5 text-green-400 absolute top-2 right-2"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function PeptideCard({
  peptide,
  matchedGoals,
}: {
  peptide: Peptide;
  matchedGoals: GoalType[];
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4 hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/peptides/${peptide.id}`}
            className="text-base font-semibold text-gray-100 hover:text-green-400 transition-colors leading-tight"
          >
            {peptide.name}
          </Link>
          {peptide.aliases && peptide.aliases.length > 0 && (
            <p className="text-xs text-gray-600 mt-0.5 truncate">
              {peptide.aliases.join(', ')}
            </p>
          )}
        </div>
        <span
          className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${
            EXPERIENCE_COLORS[peptide.experienceLevel] ??
            'bg-gray-800 text-gray-400 border-gray-700'
          }`}
        >
          {peptide.experienceLevel}
        </span>
      </div>

      {/* Matched goals */}
      <div className="flex flex-wrap gap-1.5">
        {matchedGoals.map((g) => (
          <span
            key={g}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20"
          >
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            {GOAL_LABELS[g]}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">
        {peptide.description}
      </p>

      {/* Top 3 benefits */}
      {peptide.primaryBenefits.length > 0 && (
        <ul className="space-y-1">
          {peptide.primaryBenefits.slice(0, 3).map((b) => (
            <li key={b} className="flex items-start gap-2 text-xs text-gray-400">
              <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
              {b}
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      <div className="pt-1">
        <Link
          href={`/peptides/${peptide.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 hover:border-green-500/40 transition-all"
        >
          View Full Details
        </Link>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const [selectedGoals, setSelectedGoals] = useState<GoalType[]>([]);
  const [step, setStep] = useState<'select' | 'results'>('select');

  // Toggle a goal on/off
  function toggleGoal(goal: GoalType) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
    // If already in results view, auto-update results
    if (step === 'results') {
      // stay in results — results re-derive from selectedGoals reactively
    }
  }

  // Scored results: peptides matching at least 1 goal, sorted by match count desc
  const scoredPeptides = useMemo(() => {
    if (selectedGoals.length === 0) return [];
    return peptides
      .map((p) => {
        const matched = selectedGoals.filter((g) => p.goals.includes(g));
        return { peptide: p, matchedGoals: matched, score: matched.length };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [selectedGoals]);

  // Stacking suggestion: top 3-5 by score when 2+ goals selected
  const stackSuggestion = useMemo(() => {
    if (selectedGoals.length < 2 || scoredPeptides.length === 0) return [];
    return scoredPeptides.slice(0, Math.min(5, scoredPeptides.length));
  }, [selectedGoals, scoredPeptides]);

  const selectedGoalNames = selectedGoals.map((g) => GOAL_LABELS[g]).join(', ');

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ── Step 1: Goal selection ── */}
        {step === 'select' && (
          <div className="space-y-8">
            {/* Page header */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/5 text-green-400 text-xs font-medium tracking-wide">
                <Target className="w-3.5 h-3.5" aria-hidden="true" />
                Goal-Based Finder
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-100 tracking-tight">
                Find Peptides By Goal
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                Select one or more goals below to discover the best peptides for your needs.
              </p>
            </div>

            {/* Goal grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {ALL_GOALS.map((goal) => (
                <div key={goal} className="relative">
                  <GoalButton
                    goal={goal}
                    selected={selectedGoals.includes(goal)}
                    onToggle={toggleGoal}
                  />
                </div>
              ))}
            </div>

            {/* Selection summary + CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-gray-800">
              <p className="text-sm text-gray-500">
                {selectedGoals.length === 0
                  ? 'No goals selected'
                  : `${selectedGoals.length} goal${selectedGoals.length > 1 ? 's' : ''} selected`}
              </p>
              <button
                onClick={() => setStep('results')}
                disabled={selectedGoals.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-500 hover:bg-green-400 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-gray-950 font-semibold text-sm transition-colors shadow-lg shadow-green-500/20 disabled:shadow-none"
              >
                Find Peptides
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Results ── */}
        {step === 'results' && (
          <div className="space-y-10">
            {/* Back + header */}
            <div className="space-y-4">
              <button
                onClick={() => setStep('select')}
                className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-green-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                Modify Goals
              </button>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
                  Peptides for:{' '}
                  <span className="text-green-400">{selectedGoalNames}</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  {scoredPeptides.length} peptide
                  {scoredPeptides.length !== 1 ? 's' : ''} matched — sorted by
                  relevance
                </p>
              </div>

              {/* Inline goal pills for quick modification */}
              <div className="flex flex-wrap gap-2">
                {ALL_GOALS.map((goal) => (
                  <button
                    key={goal}
                    onClick={() => toggleGoal(goal)}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                      selectedGoals.includes(goal)
                        ? 'bg-green-500/15 border-green-500/50 text-green-400'
                        : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                    }`}
                    aria-pressed={selectedGoals.includes(goal)}
                  >
                    {GOAL_ICONS[goal]} {GOAL_LABELS[goal]}
                  </button>
                ))}
              </div>
            </div>

            {/* Results grid */}
            {scoredPeptides.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <div className="text-4xl">🔍</div>
                <p className="text-gray-400 font-medium">No peptides match the selected goals</p>
                <p className="text-gray-600 text-sm">Try selecting different or additional goals</p>
                <button
                  onClick={() => setStep('select')}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  Back to Goal Selection
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scoredPeptides.map(({ peptide, matchedGoals }) => (
                  <PeptideCard
                    key={peptide.id}
                    peptide={peptide}
                    matchedGoals={matchedGoals}
                  />
                ))}
              </div>
            )}

            {/* Stacking suggestions */}
            {stackSuggestion.length >= 2 && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-400" aria-hidden="true" />
                  <h2 className="text-lg font-bold text-gray-100">
                    Suggested Starter Stack
                  </h2>
                </div>
                <p className="text-sm text-gray-400">
                  Based on your selected goals, these peptides cover the most
                  overlap and are commonly combined together:
                </p>
                <div className="flex flex-wrap gap-3">
                  {stackSuggestion.map(({ peptide, score }) => (
                    <Link
                      key={peptide.id}
                      href={`/peptides/${peptide.id}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-green-500/40 transition-colors group"
                    >
                      <span className="text-sm font-medium text-gray-200 group-hover:text-green-400 transition-colors">
                        {peptide.name}
                      </span>
                      <span className="text-xs text-green-500 font-semibold">
                        {score}/{selectedGoals.length}
                      </span>
                    </Link>
                  ))}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  This combination addresses your selected goals with complementary
                  mechanisms. Each peptide is scored by how many of your goals it
                  covers. Visit{' '}
                  <Link
                    href="/stacking"
                    className="text-green-400 hover:text-green-300 transition-colors"
                  >
                    the stacking guide
                  </Link>{' '}
                  to analyze this combination in detail.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
