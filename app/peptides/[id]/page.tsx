import { notFound } from 'next/navigation';
import Link from 'next/link';
import { peptides } from '@/lib/peptide-data';
import {
  CATEGORY_LABELS,
  GOAL_LABELS,
  ROUTE_LABELS,
  type PeptideCategory,
  type ExperienceLevel,
} from '@/lib/types';

// ─── helpers ──────────────────────────────────────────────────────────────────

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

function Card({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-800 bg-gray-900 ${className}`}>
      <div className="border-b border-gray-800 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-gray-300">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
          {item}
        </li>
      ))}
    </ul>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function PeptideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const peptide = peptides.find((p) => p.id === id);
  if (!peptide) return notFound();

  // Lookup helpers for stacking sections
  function getPeptideName(id: string) {
    const found = peptides.find((p) => p.id === id);
    if (found) return found.name;
    // fallback: prettify the id
    return id
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  const dosingRows: { label: string; value: string | undefined }[] = [
    { label: 'Typical Dose', value: peptide.dosing.typical },
    { label: 'Range', value: peptide.dosing.range },
    { label: 'Frequency', value: peptide.dosing.frequency },
    { label: 'Route(s)', value: peptide.dosing.route.map((r) => ROUTE_LABELS[r]).join(', ') },
    { label: 'Cycle Length', value: peptide.dosing.cycleLength },
    { label: 'Break Period', value: peptide.dosing.breakLength },
    { label: 'Timing', value: peptide.dosing.timing },
    { label: 'Loading Dose', value: peptide.dosing.loading },
    { label: 'Notes', value: peptide.dosing.notes },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900 px-4 py-8">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/peptides" className="hover:text-gray-300 transition-colors">
              Library
            </Link>
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-300">{peptide.name}</span>
          </nav>

          {/* Name */}
          <h1 className="text-3xl font-bold text-white">{peptide.name}</h1>

          {/* Aliases */}
          {peptide.aliases && peptide.aliases.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              also known as:{' '}
              <span className="text-gray-400">{peptide.aliases.join(', ')}</span>
            </p>
          )}

          {/* Badges row */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Category badges */}
            {peptide.categories.map((cat) => (
              <span
                key={cat}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[cat]}`}
              >
                {CATEGORY_LABELS[cat]}
              </span>
            ))}

            {/* Experience level */}
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${EXPERIENCE_COLORS[peptide.experienceLevel]}`}
            >
              {peptide.experienceLevel}
            </span>

            {/* Route badges */}
            {peptide.dosing.route.map((r) => (
              <span
                key={r}
                className="rounded-full border border-gray-600 bg-gray-800 px-2.5 py-0.5 text-xs text-gray-300"
              >
                {ROUTE_LABELS[r]}
              </span>
            ))}
          </div>

          {/* Half-life */}
          {peptide.halfLife && (
            <p className="mt-3 text-sm text-gray-500">
              Half-life:{' '}
              <span className="font-medium text-gray-300">{peptide.halfLife}</span>
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* ── Left column ── */}
          <div className="flex flex-col gap-6 lg:flex-1">
            {/* About */}
            <Card title="About">
              <p className="text-sm text-gray-300 leading-relaxed">{peptide.description}</p>
              <div className="mt-4 border-t border-gray-800 pt-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Mechanism of Action
                </p>
                <p className="text-sm text-gray-300 leading-relaxed">{peptide.mechanism}</p>
              </div>
            </Card>

            {/* Primary Benefits */}
            <Card title="Primary Benefits">
              <BulletList items={peptide.primaryBenefits} />
            </Card>

            {/* Dosing & Protocol */}
            <Card title="Dosing & Protocol">
              <p className="mb-3 text-xs text-gray-600">
                Source: community reports + PubMed data. Always consult a qualified
                healthcare provider before use.
              </p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-800">
                  {dosingRows.map(({ label, value }) =>
                    value ? (
                      <tr key={label}>
                        <td className="py-2 pr-4 font-medium text-gray-400 whitespace-nowrap">
                          {label}
                        </td>
                        <td className="py-2 text-gray-200">{value}</td>
                      </tr>
                    ) : null
                  )}
                </tbody>
              </table>
            </Card>

            {/* Side Effects */}
            <Card title="Side Effects & Considerations">
              <BulletList items={peptide.sideEffects} />
            </Card>

            {/* Research Notes */}
            {peptide.researchNotes && (
              <Card title="Research Notes">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {peptide.researchNotes}
                </p>
              </Card>
            )}

            {/* Stacking Guide */}
            <div className="rounded-xl border border-gray-800 bg-gray-900">
              <div className="border-b border-gray-800 px-5 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Stacking Guide
                </h2>
              </div>

              <div className="divide-y divide-gray-800">
                {/* Synergistic */}
                <div className="px-5 py-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    Synergistic Stacks
                  </h3>
                  {peptide.stacks.synergistic.length === 0 ? (
                    <p className="text-sm text-gray-600">None listed.</p>
                  ) : (
                    <div className="space-y-2">
                      {peptide.stacks.synergistic.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-950/60 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/peptides/${entry.id}`}
                              className="text-sm font-semibold text-green-400 hover:text-green-300 transition-colors"
                            >
                              {getPeptideName(entry.id)}
                            </Link>
                            <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                              {entry.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Redundant / Avoid */}
                <div className="px-5 py-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                    Redundant / Avoid Together
                  </h3>
                  {peptide.stacks.redundant.length === 0 ? (
                    <p className="text-sm text-gray-600">None listed.</p>
                  ) : (
                    <div className="space-y-2">
                      {peptide.stacks.redundant.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 rounded-lg border border-red-900/30 bg-red-950/20 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/peptides/${entry.id}`}
                              className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors"
                            >
                              {getPeptideName(entry.id)}
                            </Link>
                            <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                              {entry.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Complementary Cycles */}
                <div className="px-5 py-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    Complementary Cycles
                  </h3>
                  {peptide.stacks.complementary.length === 0 ? (
                    <p className="text-sm text-gray-600">None listed.</p>
                  ) : (
                    <div className="space-y-2">
                      {peptide.stacks.complementary.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 rounded-lg border border-blue-900/30 bg-blue-950/20 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/peptides/${entry.id}`}
                              className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              {getPeptideName(entry.id)}
                            </Link>
                            <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                              {entry.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-6 lg:w-80 xl:w-96">
            {/* Storage & Reconstitution */}
            <Card title="Storage & Reconstitution">
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Storage
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed">{peptide.storage}</p>
                </div>
                {peptide.reconstitution && (
                  <div className="border-t border-gray-800 pt-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Reconstitution
                    </p>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {peptide.reconstitution}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Goals Addressed */}
            <Card title="Goals Addressed">
              <ul className="space-y-2">
                {peptide.goals.map((goal) => (
                  <li key={goal} className="flex items-center gap-2 text-sm text-gray-300">
                    <svg
                      className="h-4 w-4 shrink-0 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {GOAL_LABELS[goal]}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Quick Stats */}
            <Card title="Quick Stats">
              <dl className="space-y-3 text-sm">
                {peptide.halfLife && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Half-Life</dt>
                    <dd className="text-right font-medium text-gray-200">{peptide.halfLife}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Admin Routes</dt>
                  <dd className="text-right font-medium text-gray-200">
                    {peptide.dosing.route.map((r) => ROUTE_LABELS[r]).join(', ')}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Experience Level</dt>
                  <dd className="text-right">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${EXPERIENCE_COLORS[peptide.experienceLevel]}`}
                    >
                      {peptide.experienceLevel}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Cycle Length</dt>
                  <dd className="text-right font-medium text-gray-200">
                    {peptide.dosing.cycleLength}
                  </dd>
                </div>
                {peptide.dosing.breakLength && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Break Period</dt>
                    <dd className="text-right font-medium text-gray-200">
                      {peptide.dosing.breakLength}
                    </dd>
                  </div>
                )}
              </dl>
            </Card>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <Link
                href="/peptides"
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Library
              </Link>

              <Link
                href={`/cycle-builder?add=${peptide.id}`}
                className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add to Cycle Builder
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
