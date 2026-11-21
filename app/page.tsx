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
  AlertCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Compliance Tracker for Businesses | ComplianceTracker',
  description: 'Use ComplianceTracker to track business compliance requirements, organise evidence, assign actions and keep important review dates in one workspace.',
  alternates: { canonical: '/' },
  keywords: ['compliance tracker', 'compliance tracker for businesses', 'business compliance tracking software'],
  openGraph: {
    title: 'Compliance Tracker for Businesses | ComplianceTracker',
    description: 'Track business requirements, organise evidence, assign actions and monitor compliance progress in one workspace.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Compliance Tracker for Businesses | ComplianceTracker',
    description: 'Track business requirements, organise evidence and manage compliance actions in one workspace.',
  },
};

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="ComplianceTracker home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <span className="text-[17px] font-bold tracking-tight text-slate-950">
        Compliance<span className="text-blue-600">Tracker</span>
      </span>
    </Link>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[650px]">
      <div className="absolute -inset-5 rounded-[35px] bg-blue-200/40 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_25px_80px_-30px_rgba(15,23,42,0.28)] sm:rounded-3xl">
        <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-900">ComplianceTracker</p>
              <p className="text-[10px] text-slate-400">Workspace overview</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            Workspace
          </span>
        </div>

        <div className="grid grid-cols-[125px_minmax(0,1fr)] sm:grid-cols-[155px_minmax(0,1fr)]">
          <aside className="border-r border-slate-100 bg-slate-50/80 p-3 sm:p-4">
            <p className="mb-3 px-2 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
              Workspace
            </p>
            {[
              ['Overview', true],
              ['Compliance register', false],
              ['Documents & evidence', false],
              ['Actions', false],
              ['Reports', false],
              ['Settings & team', false],
            ].map(([label, active]) => (
              <div
                key={String(label)}
                className={`mb-1 rounded-lg px-2 py-2.5 text-[9px] font-medium sm:text-[10px] ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-slate-500'
                }`}
              >
                {label}
              </div>
            ))}
          </aside>

          <div className="min-w-0 p-3 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-medium text-blue-700">Workspace overview</p>
                <h2 className="mt-1 text-base font-bold tracking-tight text-slate-950 sm:text-xl">
                  Compliance dashboard
                </h2>
                <p className="mt-1 text-[9px] text-slate-500 sm:text-[11px]">
                  Your compliance position at a glance
                </p>
              </div>
              <span className="rounded-lg bg-blue-600 px-2.5 py-2 text-[9px] font-semibold text-white">
                + Add record
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4">
              {[
                { label: 'Requirements', value: '21', icon: ClipboardList, color: 'text-slate-900' },
                { label: 'Compliant', value: '6', icon: ShieldCheck, color: 'text-emerald-600' },
                { label: 'Open actions', value: '5', icon: ListChecks, color: 'text-amber-600' },
                { label: 'Evidence', value: '18', icon: FileCheck2, color: 'text-blue-600' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
                    <div className="flex items-center justify-between">
                      <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                      <span className="text-[8px] text-slate-400">Overview</span>
                    </div>
                    <p className={`mt-2 text-xl font-bold ${item.color} sm:text-2xl`}>{item.value}</p>
                    <p className="mt-0.5 text-[9px] text-slate-500">{item.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-[1fr_1fr]">
              <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-slate-800 sm:text-xs">Compliance status</p>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'conic-gradient(#059669 0% 29%, #2563eb 29% 72%, #d97706 72% 86%, #e11d48 86% 100%)' }}
                  >
                    <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white">
                      <span className="text-sm font-bold text-slate-900">29%</span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {[
                      ['Compliant', 'bg-emerald-500', '6'],
                      ['In progress', 'bg-blue-600', '9'],
                      ['Under review', 'bg-amber-500', '3'],
                      ['Non-compliant', 'bg-rose-600', '3'],
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

              <div className="rounded-xl border border-slate-200 p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-slate-800 sm:text-xs">Needs attention</p>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="mt-3 space-y-3">
                  {[
                    ['Overdue requirements', '3', 'text-rose-600', 'bg-rose-50'],
                    ['Missing evidence', '2', 'text-amber-600', 'bg-amber-50'],
                    ['Open actions', '5', 'text-blue-600', 'bg-blue-50'],
                  ].map(([label, value, color, bg]) => (
                    <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2">
                      <span className="text-[9px] text-slate-600">{label}</span>
                      <span className={`rounded-md ${bg} px-2 py-1 text-[9px] font-bold ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 p-3 sm:mt-4 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-slate-800 sm:text-xs">Recent requirements</p>
                <span className="text-[9px] font-semibold text-blue-700">View register ↗</span>
              </div>
              {[
                ['Review access permissions', 'In progress', 'bg-blue-50 text-blue-700'],
                ['Maintain security policy', 'Under review', 'bg-amber-50 text-amber-700'],
                ['Document staff training', 'Complete', 'bg-emerald-50 text-emerald-700'],
              ].map(([name, status, style]) => (
                <div key={name} className="flex items-center justify-between gap-2 border-t border-slate-100 py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-[9px] font-medium text-slate-700 sm:text-[10px]">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{name}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-semibold ${style}`}>{status}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-[8px] text-slate-400">Illustrative product preview</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">

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
            description: 'Software for tracking business compliance requirements, organising evidence, assigning corrective actions and monitoring deadlines.',
          }),
        }}
      />

      <header className="relative z-20 border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Brand />

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <Link href="/features" className="text-sm font-medium text-slate-600 transition hover:text-blue-700">Features</Link>
            <Link href="/how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-blue-700">How it works</Link>
            <Link href="/faq" className="text-sm font-medium text-slate-600 transition hover:text-blue-700">FAQs</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/signin" className="hidden px-3 py-2 text-sm font-semibold text-slate-600 hover:text-blue-700 sm:inline-flex">
              Sign in
            </Link>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              Get started <ArrowRight className="h-4 w-4" />
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

      <section className="relative isolate px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_35%,rgba(219,234,254,0.75),transparent_48%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-12">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Business compliance, organised
            </div>

            <h1 className="text-[2.65rem] font-bold leading-[1.08] tracking-[-0.055em] text-slate-950 sm:text-5xl lg:text-[3.7rem]">
              A clearer way to <span className="text-blue-600">track compliance.</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Manage requirements, evidence, responsibilities and deadlines in one straightforward workspace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-200/60 transition hover:-translate-y-0.5 hover:bg-blue-700">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/signin" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Sign in
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Clear ownership</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Organised evidence</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Visible deadlines</span>
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50/80 px-5 py-6 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-3 sm:gap-8">
          {[
            { icon: ClipboardList, title: 'Track requirements', text: 'Keep obligations and their status in one register.' },
            { icon: FileCheck2, title: 'Connect evidence', text: 'Keep supporting documents alongside the work.' },
            { icon: CalendarDays, title: 'Stay accountable', text: 'Assign actions and keep important dates visible.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-slate-100 px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Brand />
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} ComplianceTracker. All rights reserved.</p>
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
            <Link href="/features" className="hover:text-blue-700">Features</Link>
            <Link href="/how-it-works" className="hover:text-blue-700">How it works</Link>
            <Link href="/about" className="hover:text-blue-700">About</Link>
            <Link href="/faq" className="hover:text-blue-700">FAQs</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
