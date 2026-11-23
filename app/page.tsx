import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Menu,
  ClipboardList,
  FileCheck2,
  ListChecks,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ChartNoAxesCombined,
  Users,
  LockKeyhole,
  FileText,
  ChevronRight,
  Check,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Compliance Tracker for Businesses | ComplianceTracker',
  description:
    'Use ComplianceTracker to track business compliance requirements, organise evidence, assign actions and keep important review dates in one workspace.',
  alternates: { canonical: '/' },
  keywords: [
    'compliance tracker',
    'compliance tracker for businesses',
    'business compliance tracking software',
  ],
  openGraph: {
    title: 'Compliance Tracker for Businesses | ComplianceTracker',
    description:
      'Track business requirements, organise evidence, assign actions and monitor compliance progress in one workspace.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Compliance Tracker for Businesses | ComplianceTracker',
    description:
      'Track business requirements, organise evidence and manage compliance actions in one workspace.',
  },
};

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="ComplianceTracker home">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#123c32] text-white shadow-sm">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <span className="text-[18px] font-bold tracking-tight text-[#172b25]">
        Compliance<span className="text-[#258568]">Tracker</span>
      </span>
    </Link>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[680px]">
      <div className="absolute -inset-8 rounded-[40px] bg-[#b9dfce]/50 blur-3xl" />

      <div className="relative rounded-2xl border border-[#dce8e1] bg-white p-2 shadow-[0_30px_90px_-35px_rgba(23,59,45,0.3)] sm:rounded-3xl sm:p-3">
        <div className="overflow-hidden rounded-xl border border-[#edf1ed] bg-white sm:rounded-2xl">
          <div className="flex h-14 items-center justify-between border-b border-[#edf1ed] px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123c32] text-white">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-[#20352d]">ComplianceTracker</p>
                <p className="text-[10px] text-slate-400">Business workspace</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-[#edf7f1] px-3 py-1 text-[10px] font-semibold text-[#267653] sm:inline-flex">
                Workspace overview
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf2ee] text-[10px] font-bold text-[#456457]">
                AC
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[108px_minmax(0,1fr)] sm:grid-cols-[155px_minmax(0,1fr)]">
            <aside className="border-r border-[#edf1ed] bg-[#f8faf8] p-2.5 sm:p-4">
              <p className="mb-3 px-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Workspace
              </p>
              {[
                { label: 'Overview', icon: ChartNoAxesCombined, active: true },
                { label: 'Register', icon: ClipboardList },
                { label: 'Evidence', icon: FileCheck2 },
                { label: 'Actions', icon: ListChecks },
                { label: 'Reports', icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-2.5 text-[9px] font-medium sm:text-[11px] ${
                      item.active
                        ? 'bg-[#e9f4ed] text-[#216b4c]'
                        : 'text-slate-500'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                );
              })}
              <div className="mt-5 border-t border-[#e8eee9] pt-3">
                <p className="px-2 text-[9px] text-slate-400">MANAGEMENT</p>
                <div className="mt-2 flex items-center gap-2 px-2 py-2 text-[9px] text-slate-500 sm:text-[11px]">
                  <Users className="h-3.5 w-3.5" /> Team
                </div>
              </div>
            </aside>

            <div className="min-w-0 p-3 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold text-[#398263] sm:text-xs">
                    WORKSPACE OVERVIEW
                  </p>
                  <h2 className="mt-1 text-base font-bold tracking-tight text-[#20352d] sm:text-xl">
                    Good morning
                  </h2>
                  <p className="mt-1 text-[9px] text-slate-500 sm:text-[11px]">
                    Here is your compliance position.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#174b3b] px-2.5 py-2 text-[9px] font-semibold text-white sm:px-3 sm:text-[10px]">
                  + Add requirement
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4">
                {[
                  { label: 'Requirements', value: '24', icon: ClipboardList, color: 'text-[#284b3b]' },
                  { label: 'Compliant', value: '12', icon: ShieldCheck, color: 'text-emerald-600' },
                  { label: 'Open actions', value: '5', icon: ListChecks, color: 'text-amber-600' },
                  { label: 'Evidence files', value: '18', icon: FileCheck2, color: 'text-[#398263]' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border border-[#e8eee9] bg-white p-2.5 sm:p-3">
                      <Icon className={`h-4 w-4 ${item.color}`} />
                      <p className={`mt-2 text-xl font-bold ${item.color} sm:text-2xl`}>
                        {item.value}
                      </p>
                      <p className="mt-0.5 text-[9px] text-slate-500 sm:text-[10px]">
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#e8eee9] p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-[#34483d] sm:text-xs">
                      Compliance progress
                    </p>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full" style={{ background: 'conic-gradient(#26845f 0% 50%, #dcece2 50% 100%)' }}>
                      <div className="flex h-[57px] w-[57px] items-center justify-center rounded-full bg-white">
                        <span className="text-sm font-bold text-[#284b3b]">50%</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      {[
                        ['Compliant', 'bg-emerald-600', '12'],
                        ['In progress', 'bg-[#8bbba0]', '7'],
                        ['Needs review', 'bg-amber-500', '3'],
                        ['Non-compliant', 'bg-rose-500', '2'],
                      ].map(([label, color, value]) => (
                        <div key={label} className="flex items-center justify-between gap-1 text-[8px] sm:text-[9px]">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
                            {label}
                          </span>
                          <span className="font-semibold text-slate-700">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e8eee9] p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-[#34483d] sm:text-xs">
                      Needs attention
                    </p>
                    <CircleAlert className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {[
                      ['Overdue requirements', '2', 'text-rose-600', 'bg-rose-50'],
                      ['Missing evidence', '3', 'text-amber-600', 'bg-amber-50'],
                      ['Open actions', '5', 'text-[#398263]', 'bg-[#edf7f1]'],
                    ].map(([label, value, color, bg]) => (
                      <div key={label} className="flex items-center justify-between rounded-lg bg-[#f8faf8] px-2.5 py-2">
                        <span className="text-[9px] text-slate-600">{label}</span>
                        <span className={`rounded-md ${bg} px-2 py-1 text-[9px] font-bold ${color}`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-[#e8eee9] p-3 sm:mt-4 sm:p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-[#34483d] sm:text-xs">
                    Recent requirements
                  </p>
                  <span className="text-[9px] font-semibold text-[#398263]">
                    View register →
                  </span>
                </div>
                {[
                  ['Review access permissions', 'In progress', 'bg-blue-50 text-blue-700'],
                  ['Maintain security policy', 'Needs review', 'bg-amber-50 text-amber-700'],
                  ['Document staff training', 'Compliant', 'bg-emerald-50 text-emerald-700'],
                ].map(([name, status, style]) => (
                  <div key={name} className="flex items-center justify-between gap-2 border-t border-[#edf1ed] py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-[9px] font-medium text-slate-700 sm:text-[10px]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#6c9d80]" />
                      <span className="truncate">{name}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-semibold ${style}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-[8px] text-slate-400">
                Illustrative product preview
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-xl border border-[#e4ece5] bg-white p-3 shadow-xl sm:flex lg:-left-8">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf7f1] text-[#398263]">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-bold text-[#263b30]">Everything in view</p>
          <p className="text-[10px] text-slate-500">One organised workspace</p>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    icon: ClipboardList,
    number: '01',
    title: 'A clear compliance register',
    text: 'Keep requirements, owners, statuses and important review dates organised in one place.',
  },
  {
    icon: FileCheck2,
    number: '02',
    title: 'Evidence you can find',
    text: 'Keep supporting documents connected to the compliance work they help demonstrate.',
  },
  {
    icon: ListChecks,
    number: '03',
    title: 'Actions with ownership',
    text: 'Assign corrective actions, follow progress and make responsibilities easier to track.',
  },
  {
    icon: CalendarDays,
    number: '04',
    title: 'Important dates in view',
    text: 'Keep deadlines and upcoming reviews visible so important requirements do not get overlooked.',
  },
];

export default function HomePage() {
  return (
    <main className="home-page min-h-screen overflow-hidden bg-white text-[#20352d]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'ComplianceTracker',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://compliancetracker-app.com',
            description:
              'Software for tracking business compliance requirements, organising evidence, assigning corrective actions and monitoring deadlines.',
          }),
        }}
      />

      <header className="sticky top-0 z-50 border-b border-[#edf1ed] bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Brand />

          <nav className="hidden items-center gap-9 md:flex" aria-label="Main navigation">
            <Link href="/features" className="text-sm font-medium text-slate-600 transition hover:text-[#258568]">
              Features
            </Link>
            <Link href="/how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-[#258568]">
              How it works
            </Link>
            <Link href="/faq" className="text-sm font-medium text-slate-600 transition hover:text-[#258568]">
              FAQs
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/signin" className="hidden px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-[#258568] sm:inline-flex">
              Sign in
            </Link>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-[#174b3b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#103b2e]">
              Get started for free <ArrowRight className="h-4 w-4" />
            </Link>
            <details className="relative md:hidden">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-700">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </summary>
              <div className="absolute right-0 top-full mt-2 flex w-48 flex-col rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <Link href="/features" className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">Features</Link>
                <Link href="/how-it-works" className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">How it works</Link>
                <Link href="/faq" className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">FAQs</Link>
                <Link href="/signin" className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">Sign in</Link>
              </div>
            </details>
          </div>
        </div>
      </header>

      <section className="relative isolate px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_38%,rgba(205,232,215,0.72),transparent_48%)]" />
        <div className="pointer-events-none absolute -left-40 top-10 -z-10 h-80 w-80 rounded-full bg-[#f1f7f2] blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12">
          <div className="max-w-xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dcebe0] bg-[#f1f8f3] px-3.5 py-2 text-xs font-semibold text-[#286b4e]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Business compliance, made clearer
            </div>

            <h1 className="text-[2.75rem] font-bold leading-[1.07] tracking-[-0.055em] text-[#19372b] sm:text-6xl lg:text-[4.35rem]">
              Stay on top of every{' '}
              <span className="text-[#398263]">compliance requirement.</span>
            </h1>

            <p className="mt-7 max-w-lg text-base leading-8 text-slate-600 sm:text-lg">
              Bring requirements, supporting evidence, responsibilities and deadlines together in one straightforward workspace.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#174b3b] px-7 text-sm font-semibold text-white shadow-lg shadow-[#174b3b]/15 transition hover:-translate-y-0.5 hover:bg-[#103b2e]">
                Get started for free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/features" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#dce6de] bg-white px-7 text-sm font-semibold text-[#304b3d] transition hover:border-[#a9c9b3] hover:bg-[#f8fbf8]">
                Explore features <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#398263]" /> Clear ownership
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#398263]" /> Organised evidence
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#398263]" /> Visible deadlines
              </span>
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section className="border-y border-[#e8eee9] bg-[#f8faf8] px-5 py-9 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-7 sm:grid-cols-3 sm:gap-8">
          {[
            { icon: ClipboardList, title: 'Know what needs attention', text: 'Keep requirements and their current status visible.' },
            { icon: FileCheck2, title: 'Keep evidence organised', text: 'Connect supporting documents to the work they support.' },
            { icon: Clock3, title: 'Keep responsibilities clear', text: 'Track owners, actions and important review dates.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e1ebe3] bg-white text-[#398263] shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#263d30]">{item.title}</h2>
                  <p className="mt-1.5 text-xs leading-6 text-slate-500">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#398263]">
              ONE CONNECTED WORKSPACE
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#19372b] sm:text-4xl">
              The essential parts of compliance, brought together.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-500">
              Move away from scattered spreadsheets and disconnected files. Keep the day-to-day work of tracking compliance in one organised place.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.number} className="group rounded-2xl border border-[#e6ede7] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#c4d9c9] hover:shadow-xl hover:shadow-[#214c36]/5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf6ef] text-[#398263] transition group-hover:bg-[#174b3b] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold tracking-widest text-[#b0c5b5]">
                      {item.number}
                    </span>
                  </div>
                  <h3 className="mt-7 text-base font-bold text-[#263d30]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#173d31] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a6d3b6]">
              A MORE ORGANISED APPROACH
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Make compliance easier to follow, manage and review.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#d0e0d5] sm:text-base">
              Start bringing your requirements, evidence and actions into one clear workspace.
            </p>
          </div>
          <Link href="/signup" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-[#174b3b] transition hover:-translate-y-0.5 hover:bg-[#edf6ef]">
            Get started for free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#e8eee9] bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Brand />
            <p className="text-[11px] text-slate-400">
              A clearer way to keep business compliance organised.
            </p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
            <Link href="/features" className="transition hover:text-[#258568]">Features</Link>
            <Link href="/how-it-works" className="transition hover:text-[#258568]">How it works</Link>
            <Link href="/about" className="transition hover:text-[#258568]">About</Link>
            <Link href="/faq" className="transition hover:text-[#258568]">FAQs</Link>
            <Link href="/signin" className="transition hover:text-[#258568]">Sign in</Link>
          </nav>
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} ComplianceTracker. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
