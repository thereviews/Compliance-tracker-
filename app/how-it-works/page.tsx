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
      <section className="mb-14 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800 shadow-sm">
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
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="text-xs font-semibold leading-5 text-slate-700 sm:text-sm">
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-8">
        <p className="text-sm font-semibold text-emerald-800">Four practical steps</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          How your team uses ComplianceTracker
        </h2>
      </div>

      <div className="relative space-y-5">
        <div className="absolute bottom-10 left-[2.1rem] top-10 hidden w-px bg-emerald-100 sm:block" />

        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <section
              key={step.number}
              className="relative grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-emerald-200 sm:grid-cols-[76px_1fr] sm:gap-6 sm:p-7"
            >
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950 text-white shadow-sm">
                <Icon className="h-6 w-6" strokeWidth={1.8} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold tracking-wider text-emerald-800">
                    STEP {step.number}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                    {step.label}
                  </span>
                </div>

                <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-600">
                  {step.description}
                </p>

                <div className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4">
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

      <section className="mt-14 grid gap-7 rounded-2xl bg-slate-950 p-7 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:p-9">
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
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-50"
        >
          Get started <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </PublicPageLayout>
  );
}
