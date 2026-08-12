import Link from 'next/link';
import {
  BookOpen,
  Target,
  Layers,
  CalendarDays,
  FileText,
  ArrowRight,
  FlaskConical,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

const stats = [
  { value: '85+', label: 'Peptides' },
  { value: 'Goal', label: 'Based Finder' },
  { value: 'Stacking', label: 'Guide' },
  { value: 'Cycle', label: 'Builder' },
];

const features = [
  {
    icon: BookOpen,
    title: 'Peptide Library',
    description:
      'Browse our comprehensive database of 85+ peptides with detailed profiles, mechanisms of action, dosing protocols, and side effect breakdowns — filterable by category, goal, and experience level.',
    href: '/peptides',
    cta: 'Browse Library',
  },
  {
    icon: Target,
    title: 'Goal-Based Finder',
    description:
      'Not sure where to start? Select your goals — weight loss, muscle gain, healing, cognitive enhancement, anti-aging, and more — and get a curated list of peptides matched to what you want to achieve.',
    href: '/goals',
    cta: 'Find By Goal',
  },
  {
    icon: Layers,
    title: 'Stacking Guide',
    description:
      'Understand which peptides are synergistic, which are redundant, and which complement each other. Avoid common stacking mistakes and build protocols with confidence.',
    href: '/stacking',
    cta: 'View Stacking Guide',
  },
  {
    icon: CalendarDays,
    title: 'Cycle Builder',
    description:
      'Build complete peptide protocols with dosing schedules, cycle lengths, and break periods. Log doses, track progress, and maintain a full history of your research cycles.',
    href: '/cycle-builder',
    cta: 'Build a Cycle',
  },
  {
    icon: FileText,
    title: 'Research Notes',
    description:
      'Each peptide entry is backed by PubMed-referenced research notes, so you can dig into the science behind the mechanisms. Follow the evidence, not the hype.',
    href: '/peptides',
    cta: 'Read Research',
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="relative bg-gray-950 overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/5 text-green-400 text-xs font-medium tracking-wide mb-8">
            <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
            Research Reference — Not Medical Advice
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            <span className="bg-gradient-to-r from-green-400 via-green-300 to-emerald-400 bg-clip-text text-transparent">
              Your Complete
            </span>
            <br />
            <span className="text-gray-100">Peptide Research Guide</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-gray-400 leading-relaxed mb-10">
            A research-backed reference covering 85+ peptides — with detailed
            mechanisms, dosing protocols, goal-based recommendations, stacking
            guides, and a full cycle builder.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/peptides"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-500 hover:bg-green-400 text-gray-950 font-semibold text-sm transition-colors shadow-lg shadow-green-500/20"
            >
              Browse the Library
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/goals"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-100 font-semibold text-sm transition-colors border border-gray-700"
            >
              Find by Goal
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/cycle-builder?tab=my-cycles"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-green-400 font-semibold text-sm transition-colors border border-green-800/60"
            >
              My Cycle
              <CalendarDays className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4">
            <Link
              href="/how-to-use"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              How to use the app
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-gray-900 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <dt className="text-2xl sm:text-3xl font-extrabold text-green-400">
                  {stat.value}
                </dt>
                <dd className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider font-medium">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-950 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-3">
              Everything You Need in One Place
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm">
              From raw research to actionable protocols — built for serious
              self-experimenters and researchers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.href + feature.title}
                  href={feature.href}
                  className="group flex flex-col bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-green-500/30 rounded-xl p-6 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                      <Icon
                        className="w-5 h-5 text-green-500"
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="text-base font-semibold text-gray-100 group-hover:text-green-400 transition-colors">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed flex-1 mb-5">
                    {feature.description}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-500 group-hover:text-green-400 transition-colors">
                    {feature.cta}
                    <ArrowRight
                      className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-gray-950 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border-l-4 border-red-500 bg-red-950/20 border border-red-900/40 p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wide mb-1">
                  For Research Purposes Only
                </h3>
                <p className="text-sm text-red-300/80 leading-relaxed">
                  All content on this site is intended for <strong className="text-red-300">educational and research purposes only</strong>. Peptides discussed here are <strong className="text-red-300">not approved by the FDA</strong> for human use and are not intended to diagnose, treat, cure, or prevent any disease. Nothing on this site constitutes medical advice. Always consult a qualified healthcare professional before beginning any peptide protocol. Use of this information is at your own risk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
