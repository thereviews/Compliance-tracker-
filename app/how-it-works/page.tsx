import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ClipboardList,
  FileCheck2,
  ListChecks,
  ChartNoAxesCombined,
  ArrowRight,
  CheckCircle2,
  Workflow,
} from 'lucide-react';
import PublicPageLayout from '../components/PublicPageLayout';

export const metadata: Metadata = {
  title: 'How Compliance Tracking Works | ComplianceTracker',
  description:
    'Learn how to record business compliance requirements, connect evidence, assign corrective actions and monitor review dates with ComplianceTracker.',
  alternates: { canonical: '/how-it-works' },
  keywords: [
    'how compliance tracking works',
    'business compliance tracking',
    'compliance tracking process',
  ],
  openGraph: {
    title: 'How Compliance Tracking Works | ComplianceTracker',
    description:
      'Follow a practical workflow for recording requirements, keeping evidence, assigning actions and reviewing progress.',
    url: '/how-it-works',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'How Compliance Tracking Works | ComplianceTracker',
    description: 'See how ComplianceTracker helps teams organise requirements, evidence and follow-up work.',
  },
};

const steps = [
  {
    number: '01',
    label: 'Start with clarity',
    title: 'Record the requirements',
    description:
      'Add the business requirements you need to track. Record their status, responsible person and relevant review dates.',
    outcome: 'A structured register of the work your business needs to monitor.',
    icon: ClipboardList,
  },
  {
    number: '02',
    label: 'Keep the context',
    title: 'Keep supporting evidence together',
    description:
      'Upload documents and connect them to relevant register entries so supporting information is easier to find.',
    outcome: 'Supporting documents connected to the relevant requirements.',
    icon: FileCheck2,
  },
  {
    number: '03',
    label: 'Move work forward',
    title: 'Assign and follow up on actions',
    description:
      'Create corrective actions, assign responsibility and monitor progress as your team addresses outstanding work.',
    outcome: 'Follow-up work with a clear owner and trackable progress.',
    icon: ListChecks,
  },
  {
    number: '04',
    label: 'Stay informed',
    title: 'Review status and progress',
    description:
      'Use reports and your workspace overview to identify outstanding work and keep upcoming dates in view.',
    outcome: 'A clearer view of current status and what needs attention.',
    icon: ChartNoAxesCombined,
  },
];

export default function HowItWorksPage() {
  return (
    <PublicPageLayout
      eyebrow="How it works"
      title="A clearer way to manage your compliance workflow."
      description="ComplianceTracker is built around the practical work of managing business requirements: record what matters, keep evidence connected, assign follow-up and review progress."
    >
      <section className="relative mb-14 overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/70 p-6 shadow-[0_12px_36px_rgba(15,75,45,0.055)] sm:p-9">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-emerald-900 shadow-sm">
            <Workflow className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              The workflow
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              From requirements to informed follow-up.
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Keep the key parts of your compliance process connected in one shared workspace.
            </p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex min-h-[58px] items-center gap-3 rounded-xl border border-emerald-100/80 bg-white/80 p-3 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-900 text-xs font-bold text-white shadow-sm">
                {index + 1}
              </span>
              <span className="text-sm font-semibold leading-5 text-slate-800">
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Four practical steps</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          How your team uses ComplianceTracker
        </h2>
      </div>

      <div className="relative space-y-5 sm:space-y-6">
        <div className="absolute bottom-10 left-[2.1rem] top-10 hidden w-px bg-emerald-100 sm:block" />

        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <section
              key={step.number}
              className="group relative grid gap-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_5px_24px_rgba(15,45,32,0.035)] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_14px_34px_rgba(15,75,45,0.075)] sm:grid-cols-[76px_1fr] sm:gap-6 sm:p-7"
            >
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white shadow-md transition-transform duration-200 group-hover:scale-105">
                <Icon className="h-6 w-6" strokeWidth={1.8} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-bold tracking-[0.16em] text-emerald-800">
                    STEP {step.number}
                  </span>
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                    {step.label}
                  </span>
                </div>

                <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                  {step.description}
                </p>

                <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-100/80 bg-emerald-50/50 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <p className="text-sm leading-6 text-slate-600">
                    <span className="font-semibold text-slate-800">The result: </span>
                    {step.outcome}
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="relative mt-14 grid gap-7 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-7 text-white shadow-[0_18px_45px_rgba(15,35,28,0.16)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
            One connected workspace
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Keep the work connected, from start to follow-up.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Instead of separating requirements, documents and follow-up into disconnected lists, ComplianceTracker gives your team a shared workspace for the records and actions involved in its compliance process.
          </p>
        </div>
        <Link
          href="/signup"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-md"
        >
          Get started <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </PublicPageLayout>
  );
}
