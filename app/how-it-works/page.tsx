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
  title: 'How Compliance Tracking Works: A Business Guide | ComplianceTracker',
  description:
    'Learn how business compliance tracking works, from recording requirements and assigning owners to organising evidence, following corrective actions and reviewing progress.',
  alternates: { canonical: '/how-it-works' },
  keywords: [
    'how compliance tracking works',
    'business compliance tracking',
    'compliance tracking process',
    'how to track business compliance',
    'compliance tracking software',
  ],
  openGraph: {
    title: 'How Compliance Tracking Works: A Business Guide | ComplianceTracker',
    description:
      'Understand the practical compliance tracking process: record requirements, assign responsibility, connect evidence and review outstanding work.',
    url: '/how-it-works',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'How Compliance Tracking Works | ComplianceTracker',
    description:
      'Follow a practical process for organising business requirements, evidence, corrective actions and review dates.',
  },
};

const steps = [
  {
    number: '01',
    label: 'Build your register',
    title: 'Record the requirements your business needs to track',
    description:
      'Start by identifying the obligations and internal requirements relevant to your organisation. Add each item to your compliance register with a useful description, category, current status, responsible person and review date.',
    outcome:
      'A central register that gives your team a structured view of the requirements being monitored.',
    icon: ClipboardList,
  },
  {
    number: '02',
    label: 'Organise your records',
    title: 'Connect documents and supporting evidence',
    description:
      'Upload relevant policies, procedures, certificates, training records and other supporting files. Associate each document with the compliance record it relates to, so your team can find the context behind a requirement.',
    outcome:
      'Supporting documents organised alongside the requirements they help demonstrate or explain.',
    icon: FileCheck2,
  },
  {
    number: '03',
    label: 'Manage follow-up',
    title: 'Assign corrective actions and track progress',
    description:
      'When a requirement needs attention, create a corrective action or follow-up task. Assign an owner, set a due date and update its status as work progresses, giving outstanding items a clear next step.',
    outcome:
      'Follow-up work with visible ownership, deadlines and progress.',
    icon: ListChecks,
  },
  {
    number: '04',
    label: 'Review your position',
    title: 'Monitor compliance status and outstanding work',
    description:
      'Use workspace summaries and compliance reports to review recorded statuses, identify items needing attention and keep upcoming review dates in view. Regular reviews help your team decide what needs to happen next.',
    outcome:
      'A more organised view of recorded progress, upcoming reviews and outstanding tasks.',
    icon: ChartNoAxesCombined,
  },
];

const trackingBenefits = [
  {
    title: 'Clear responsibility',
    body:
      'Record who is responsible for a requirement or follow-up action, making ownership easier to understand across the team.',
  },
  {
    title: 'Connected documentation',
    body:
      'Keep supporting files associated with relevant records instead of searching through unrelated folders and lists.',
  },
  {
    title: 'Visible follow-up',
    body:
      'Use statuses and due dates to see which actions are underway and which items may need attention.',
  },
  {
    title: 'More structured reviews',
    body:
      'Bring register records, evidence and outstanding work into a process your team can review regularly.',
  },
];

export default function HowItWorksPage() {
  return (
    <PublicPageLayout
      eyebrow="How it works"
      title="How to track business compliance with a clear, practical workflow"
      description="ComplianceTracker helps businesses organise the everyday work of compliance tracking. Record relevant requirements, assign responsibility, connect supporting evidence, manage corrective actions and review progress from one shared workspace."
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
              Connect the records, people, documents and actions involved in your business compliance process.
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
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
          Four practical steps
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          The business compliance tracking process
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
          Each stage builds on the previous one. Together, they help your team maintain organised records and keep track of work that still needs attention.
        </p>
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

      <section className="mt-20 border-t border-slate-200 pt-16" aria-labelledby="tracking-benefits-heading">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Why use a structured process?
          </p>
          <h2 id="tracking-benefits-heading" className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            What good compliance tracking helps your team manage
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-slate-600">
            When compliance information is spread across spreadsheets, email and separate document folders, it can be difficult to understand the current position. A structured tracking process brings important records and follow-up work into a more consistent view.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {trackingBenefits.map((benefit) => (
            <article key={benefit.title} className="rounded-2xl border border-slate-200/80 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-950">{benefit.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{benefit.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-20 border-t border-slate-200 pt-16" aria-labelledby="getting-started-heading">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Getting started
          </p>
          <h2 id="getting-started-heading" className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Start with the requirements that matter to your business
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-slate-600">
            Begin by identifying the legal, regulatory, contractual and internal requirements relevant to your organisation. Add the items you want to monitor, decide who is responsible and establish a review routine that fits your business.
          </p>
          <p className="mt-4 text-[15px] leading-7 text-slate-600">
            ComplianceTracker provides a place to organise and monitor the records your team creates. It does not determine which laws apply to your business or replace professional compliance advice.
          </p>
          <p className="mt-5 text-sm leading-7 text-slate-600">
            Explore the <Link href="/features" className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950">compliance tracker features</Link> to see what you can manage, or visit the <Link href="/faq" className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950">frequently asked questions</Link> for more details.
          </p>
        </div>
      </section>

      <section className="relative mt-14 grid gap-7 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-7 text-white shadow-[0_18px_45px_rgba(15,35,28,0.16)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
            One connected workspace
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Keep the work connected, from start to follow-up.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Bring requirements, supporting documents and follow-up actions into a shared workspace. Give your team a clearer way to organise records and review the work that remains outstanding.
          </p>
        </div>
        <Link
          href="/signup"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-md"
        >
          Get started for free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </PublicPageLayout>
  );
}
