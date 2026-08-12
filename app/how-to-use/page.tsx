import Link from 'next/link';
import { ArrowLeft, BookOpen, Hammer, FolderOpen, Pencil, CalendarDays, FlaskConical, Share2, Smartphone, ChevronRight } from 'lucide-react';

const sections = [
  {
    num: '01',
    icon: BookOpen,
    title: 'Browsing the Compound Library',
    description: 'The library covers 85+ compounds with mechanism, benefits, dosing protocols, side effects, half-life, and storage.',
    steps: [
      { label: 'Open the app', detail: 'and tap Peptide Guide in the nav to reach the main library.' },
      { label: 'Search', detail: 'for a compound by name or alias using the search bar.' },
      { label: 'Filter by Goal', detail: 'to narrow to compounds matching an objective — Fat Loss, Healing, Cognitive, and more.' },
      { label: 'Tap any compound', detail: 'to open its full detail page: mechanism, primary benefits, side effects, dosing ranges, stacking suggestions, and storage.' },
    ],
    tip: 'Storage temperatures are shown in both °C and °F — no conversion needed.',
  },
  {
    num: '02',
    icon: Hammer,
    title: 'Building a Cycle',
    description: 'Create a fully customized protocol with doses, schedules, and optional titration for each compound.',
    steps: [
      { label: 'Tap Cycle Builder', detail: 'in the nav.' },
      { label: 'Name your cycle', detail: 'select a goal, and optionally set a break period.' },
      { label: 'Add compounds', detail: 'one by one — set dose, unit, frequency, time of day, and administration route.' },
      { label: 'Set a start date', detail: 'and cycle length. The end date is calculated automatically.' },
      { label: 'Optional:', detail: 'enter vial size + BAC water to auto-calculate injection volume (ml and IU) per dose.' },
      { label: 'Optional:', detail: 'add a titration schedule for dose escalation — set the date and new dose for each step.' },
      { label: 'Tap Save Cycle', detail: 'when all compounds are added.' },
    ],
  },
  {
    num: '03',
    icon: FolderOpen,
    title: 'Viewing Your Saved Cycles',
    description: 'Each saved cycle shows a summary, a compound list, and a Gantt timeline. Tap any row to go deeper.',
    steps: [
      { label: 'Tap My Cycles', detail: 'in the nav to see all saved protocols.' },
      { label: 'Tap any compound row', detail: 'to expand it — reveals date range, duration, injection volume, vial info, and titration schedule.' },
      { label: 'Vials Needed', detail: 'is automatically calculated for each compound, accounting for titration dose changes.' },
      { label: 'The Gantt timeline', detail: 'at the bottom of each card shows all compounds on a shared calendar axis.' },
    ],
    tip: 'Tap a row again to collapse it and keep the list clean when you have many compounds.',
  },
  {
    num: '04',
    icon: Pencil,
    title: 'Editing a Compound Entry',
    description: 'Jump directly to any compound\'s edit form with one tap — no scrolling through the full builder.',
    steps: [
      { label: 'Expand the row', detail: 'by tapping a compound in My Cycles.' },
      { label: 'Tap Edit this entry', detail: 'at the bottom of the expanded panel.' },
      { label: 'The Cycle Builder opens', detail: 'with that compound\'s form pre-loaded and ready to edit.' },
      { label: 'Make changes', detail: 'then tap Update Entry, followed by Update Cycle.' },
    ],
  },
  {
    num: '05',
    icon: CalendarDays,
    title: 'Shifting Start Dates',
    description: 'Reschedule multiple compounds at once — useful when a protocol needs to start later than planned.',
    steps: [
      { label: 'Tap Shift Dates', detail: 'at the top-right of the Peptides section in My Cycles.' },
      { label: 'Select compounds', detail: 'by tapping rows, or use Select All.' },
      { label: 'Pick a new start date', detail: 'from the calendar. Each selected compound shifts to that date; durations are preserved.' },
      { label: 'Tap Apply.', detail: 'Tap Cancel at any time to exit without saving.' },
    ],
    tip: 'Titration dates shift automatically with the rest of the entry — no manual adjustment needed.',
  },
  {
    num: '06',
    icon: FlaskConical,
    title: 'Logging Daily Doses',
    description: 'Keep a daily record of what you administered and when.',
    steps: [
      { label: 'Tap Dose Log', detail: 'in the nav.' },
      { label: 'Select the cycle', detail: 'you are currently running.' },
      { label: 'Choose the date', detail: '(defaults to today).' },
      { label: 'Check off', detail: 'each compound you administered. The log saves automatically.' },
    ],
  },
  {
    num: '07',
    icon: Share2,
    title: 'Sharing a Protocol',
    description: 'Send a read-only view of any cycle to anyone — no account required on either end.',
    steps: [
      { label: 'Open My Cycles', detail: 'and find the cycle you want to share.' },
      { label: 'Tap Share Link.', detail: 'The full protocol is encoded into the URL.' },
      { label: 'Copy or send the link.', detail: 'Recipients can view all compounds, doses, and dates without creating an account.' },
    ],
    tip: 'Cycle data is stored locally on your device only. Nothing is sent to a server unless you explicitly share a link.',
  },
  {
    num: '08',
    icon: Smartphone,
    title: 'Adding to Your Home Screen',
    description: 'Install the app for a full-screen, native-like experience on any device.',
    steps: [],
    platforms: [
      {
        name: 'iPhone / Safari',
        steps: [
          'Open the app in Safari',
          'Tap the Share button (box with arrow)',
          'Scroll and tap Add to Home Screen',
          'Tap Add',
        ],
      },
      {
        name: 'Android / Chrome',
        steps: [
          'Open the app in Chrome',
          'Tap the ⋮ menu (top right)',
          'Tap Add to Home screen',
          'Tap Add',
        ],
      },
    ],
    tip: 'Launches fullscreen with no browser bars. Your saved cycles stay right where you left them.',
  },
];

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <p className="text-xs font-mono tracking-widest text-green-500 uppercase mb-2">User Guide</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-100 tracking-tight leading-tight mb-3">
            How to Use the App
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
            Everything you need to go from browsing compounds to running a full tracked protocol.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.num}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
            >
              {/* Section header */}
              <div className="px-5 pt-5 pb-4 border-b border-gray-800">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center mt-0.5">
                    <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] text-green-500" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs text-gray-600">{section.num}</span>
                    </div>
                    <h2 className="text-base font-semibold text-gray-100">{section.title}</h2>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{section.description}</p>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="px-5 py-4 space-y-3">
                {section.steps.length > 0 && (
                  <ul className="space-y-2.5">
                    {section.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 mt-[0.45rem]" />
                        <span className="text-gray-400 leading-relaxed">
                          <span className="font-medium text-gray-200">{step.label}</span>{' '}
                          {step.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Platform grid for home screen section */}
                {section.platforms && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    {section.platforms.map((platform) => (
                      <div
                        key={platform.name}
                        className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-4"
                      >
                        <p className="font-mono text-xs tracking-wider text-green-500 uppercase mb-3">
                          {platform.name}
                        </p>
                        <ol className="space-y-1.5">
                          {platform.steps.map((step, i) => (
                            <li key={i} className="flex gap-2.5 text-sm text-gray-400">
                              <span className="font-mono text-xs text-gray-600 mt-0.5 w-3 flex-shrink-0 text-right">
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tip */}
                {section.tip && (
                  <div className="flex gap-2.5 bg-green-500/5 border border-green-500/20 rounded-lg px-3.5 py-2.5 mt-1">
                    <span className="flex-shrink-0 w-1 rounded-full bg-green-500 self-stretch" />
                    <p className="text-xs text-gray-400 leading-relaxed">
                      <span className="font-semibold text-green-400">Tip: </span>
                      {section.tip}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Privacy note */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4 mt-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-400">Your data stays on your device.</span>{' '}
            Cycles, logs, and settings are stored in your browser's local storage. Nothing is uploaded to a server. Clearing your browser data will erase saved cycles — use <span className="text-gray-300">Save as JSON</span> in My Cycles to back up your protocols.
          </p>
        </div>

        {/* CTA footer */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-4">
          <Link
            href="/peptides"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-green-500 hover:bg-green-400 text-gray-950 font-semibold text-sm transition-colors"
          >
            Browse the Library
          </Link>
          <Link
            href="/cycle-builder"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-100 font-semibold text-sm transition-colors border border-gray-700"
          >
            Open Cycle Builder
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
