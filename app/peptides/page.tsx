'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { peptides } from '@/lib/peptide-data';
import {
  CATEGORY_LABELS,
  GOAL_LABELS,
  type PeptideCategory,
  type GoalType,
  type ExperienceLevel,
} from '@/lib/types';

const CATEGORY_COLORS: Record<PeptideCategory, string> = {
  'gh-secretagogue': 'bg-green-900/60 text-green-300 border-green-700',
  'cognitive':       'bg-blue-900/60 text-blue-300 border-blue-700',
  'weight-loss':     'bg-orange-900/60 text-orange-300 border-orange-700',
  'healing':         'bg-purple-900/60 text-purple-300 border-purple-700',
  'sexual-health':   'bg-pink-900/60 text-pink-300 border-pink-700',
  'immune':          'bg-cyan-900/60 text-cyan-300 border-cyan-700',
  'anti-aging':      'bg-amber-900/60 text-amber-300 border-amber-700',
  'skin':            'bg-rose-900/60 text-rose-300 border-rose-700',
  'hormonal':        'bg-violet-900/60 text-violet-300 border-violet-700',
  'metabolic':       'bg-teal-900/60 text-teal-300 border-teal-700',
  'sarm':            'bg-red-900/60 text-red-300 border-red-700',
  'blend':           'bg-indigo-900/60 text-indigo-300 border-indigo-700',
  'antimicrobial':   'bg-lime-900/60 text-lime-300 border-lime-700',
  'cardiovascular':  'bg-sky-900/60 text-sky-300 border-sky-700',
  'mitochondrial':   'bg-emerald-900/60 text-emerald-300 border-emerald-700',
  'nootropic':       'bg-blue-900/60 text-blue-300 border-blue-700',
  'sleep':           'bg-slate-800/80 text-slate-300 border-slate-600',
  'antioxidant':     'bg-yellow-900/60 text-yellow-300 border-yellow-700',
};

const EXPERIENCE_COLORS: Record<ExperienceLevel, string> = {
  beginner:     'bg-green-900/70 text-green-300 border-green-700',
  intermediate: 'bg-yellow-900/70 text-yellow-300 border-yellow-700',
  advanced:     'bg-red-900/70 text-red-300 border-red-700',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as PeptideCategory[];
const ALL_GOALS = Object.keys(GOAL_LABELS) as GoalType[];
const EXPERIENCE_LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];

export default function PeptidesPage() {
  const [search, setSearch] = useState('');
  const [activeCategories, setActiveCategories] = useState<PeptideCategory[]>([]);
  const [activeGoals, setActiveGoals] = useState<GoalType[]>([]);
  const [activeLevels, setActiveLevels] = useState<ExperienceLevel[]>([]);

  const hasFilters =
    search.trim() !== '' ||
    activeCategories.length > 0 ||
    activeGoals.length > 0 ||
    activeLevels.length > 0;

  function toggleCategory(cat: PeptideCategory) {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function toggleGoal(goal: GoalType) {
    setActiveGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  function toggleLevel(level: ExperienceLevel) {
    setActiveLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  }

  function clearFilters() {
    setSearch('');
    setActiveCategories([]);
    setActiveGoals([]);
    setActiveLevels([]);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return peptides.filter((p) => {
      if (q) {
        const inName = p.name.toLowerCase().includes(q);
        const inAliases = p.aliases?.some((a) => a.toLowerCase().includes(q));
        const inDescription = p.description.toLowerCase().includes(q);
        if (!inName && !inAliases && !inDescription) return false;
      }
      if (activeCategories.length > 0) {
        if (!activeCategories.some((c) => p.categories.includes(c))) return false;
      }
      if (activeGoals.length > 0) {
        if (!activeGoals.some((g) => p.goals.includes(g))) return false;
      }
      if (activeLevels.length > 0) {
        if (!activeLevels.includes(p.experienceLevel)) return false;
      }
      return true;
    });
  }, [search, activeCategories, activeGoals, activeLevels]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Page Header */}
      <div className="border-b border-gray-800 bg-gray-900/60 py-10 px-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-white">Peptide Library</h1>
          <p className="mt-2 text-gray-400">
            Browse and filter our comprehensive database of research peptides with dosing
            protocols, stacking guides, and goal-based recommendations.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Search bar */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, alias, or description..."
            className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>

        {/* Filter row */}
        <div className="space-y-3">
          {/* Categories */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Category
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const active = activeCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      active
                        ? CATEGORY_COLORS[cat]
                        : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goals */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Goal
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_GOALS.map((goal) => {
                const active = activeGoals.includes(goal);
                return (
                  <button
                    key={goal}
                    onClick={() => toggleGoal(goal)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      active
                        ? 'border-green-600 bg-green-900/60 text-green-300'
                        : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {GOAL_LABELS[goal]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Experience Level
            </p>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map((level) => {
                const active = activeLevels.includes(level);
                return (
                  <button
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-all ${
                      active
                        ? EXPERIENCE_COLORS[level]
                        : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Showing{' '}
            <span className="font-semibold text-white">{filtered.length}</span> of{' '}
            <span className="font-semibold text-white">{peptides.length}</span> peptides
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Card grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900 py-20 text-center">
            <svg
              className="mb-4 h-10 w-10 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-400">No peptides found</p>
            <p className="mt-1 text-sm text-gray-600">
              Try adjusting your search or filters.
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 rounded-lg border border-green-700 px-4 py-2 text-sm text-green-400 hover:bg-green-900/30 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((peptide) => (
              <div
                key={peptide.id}
                className="group flex flex-col rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-gray-600 hover:shadow-lg hover:shadow-black/40"
              >
                {/* Name */}
                <div className="mb-3">
                  <Link
                    href={`/peptides/${peptide.id}`}
                    className="text-lg font-bold text-white hover:text-green-400 transition-colors"
                  >
                    {peptide.name}
                  </Link>
                </div>

                {/* Category badges */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {peptide.categories.map((cat) => (
                    <span
                      key={cat}
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[cat]}`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </span>
                  ))}
                </div>

                {/* Description (2-line clamp) */}
                <p className="mb-4 line-clamp-2 flex-1 text-sm text-gray-400 leading-relaxed">
                  {peptide.description}
                </p>

                {/* Experience level */}
                <div className="mb-3">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      EXPERIENCE_COLORS[peptide.experienceLevel]
                    }`}
                  >
                    {peptide.experienceLevel}
                  </span>
                </div>

                {/* Goal tags (first 3) */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {peptide.goals.slice(0, 3).map((goal) => (
                    <span
                      key={goal}
                      className="rounded-md bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                    >
                      {GOAL_LABELS[goal]}
                    </span>
                  ))}
                  {peptide.goals.length > 3 && (
                    <span className="rounded-md bg-gray-800 px-2 py-0.5 text-xs text-gray-600">
                      +{peptide.goals.length - 3} more
                    </span>
                  )}
                </div>

                {/* View Details link */}
                <Link
                  href={`/peptides/${peptide.id}`}
                  className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-green-400 hover:text-green-300 transition-colors"
                >
                  View Details
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
