import Link from 'next/link';
import type { Metadata } from 'next';
import PublicPageLayout from '../components/PublicPageLayout';

export const metadata: Metadata = {
  title: 'Compliance Tracker Features for Business Teams | ComplianceTracker',
  description:
    'Explore compliance tracker features for managing business requirements, assigning owners, organising evidence, following corrective actions and reviewing progress.',
  alternates: { canonical: '/features' },
  keywords: [
    'compliance tracker features',
    'compliance register software',
    'compliance evidence tracking',
    'corrective action tracking',
    'business compliance software',
  ],
  openGraph: {
    title: 'Compliance Tracker Features for Business Teams | ComplianceTracker',
    description:
      'See how to organise requirements, evidence, corrective actions, review dates and team responsibilities in one compliance tracking workspace.',
    url: '/features',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Compliance Tracker Features | ComplianceTracker',
    description:
      'Explore tools for compliance registers, evidence, corrective actions, deadlines and team responsibilities.',
  },
};

const features = [
  {
    heading: 'Compliance register',
    body:
      'Create a structured record for each business requirement. Keep its description, category, current status, responsible owner and next review date together so your team can see what needs attention.',
  },
  {
    heading: 'Documents and evidence',
    body:
      'Upload policies, procedures, certificates and other supporting files. Associate documents with relevant compliance records so the evidence is easier to find and understand in context.',
  },
  {
    heading: 'Corrective actions',
    body:
      'Record issues and follow-up work as actionable tasks. Assign an owner, set a due date and track progress so outstanding work has a clear next step.',
  },
  {
    heading: 'Deadlines and reminders',
    body:
      'Keep review dates and upcoming deadlines visible. Use reminders to help responsible team members follow up on requirements and actions that need attention.',
  },
  {
    heading: 'Compliance reports',
    body:
      'Review recorded compliance statuses and outstanding work through summary views and reports. Use this information to identify records that may need review or follow-up.',
  },
  {
    heading: 'Team workspace',
    body:
      'Bring colleagues into a shared workspace. Assign responsibility for records and actions, and use workspace roles and permissions to manage who can access information.',
  },
];

const workflow = [
  {
    number: '01',
    title: 'Record the requirement',
    body:
      'Add a business obligation or internal requirement to the compliance register. Include enough detail to explain what needs to be addressed and how it will be reviewed.',
  },
  {
    number: '02',
    title: 'Assign responsibility',
    body:
      'Give the requirement an owner and set its status and next review date. Team members can see which records they are responsible for.',
  },
  {
    number: '03',
    title: 'Attach supporting evidence',
    body:
      'Upload relevant documents and associate them with the requirement. This keeps supporting information connected to the record it relates to.',
  },
  {
    number: '04',
    title: 'Follow up and review',
    body:
      'Create corrective actions when work remains outstanding, monitor their progress and use reports to review the overall position.',
  },
];

const examples = [
  {
    title: 'Policies and procedures',
    body:
      'Keep records of internal policies, procedure reviews, approval documents and the evidence used to support them.',
  },
  {
    title: 'Staff training',
    body:
      'Track training-related requirements, assign responsibility for follow-up and organise records that demonstrate completed training.',
  },
  {
    title: 'Supplier reviews',
    body:
      'Record supplier-related checks, review dates, supporting documents and actions that need to be followed up.',
  },
  {
    title: 'Certificates and renewals',
    body:
      'Keep relevant certificates and renewal-related records organised, with important dates visible for review.',
  },
];

export default function FeaturesPage() {
  return (
    <PublicPageLayout
      eyebrow="Platform features"
      title="Compliance tracker features for organised business compliance"
      description="ComplianceTracker gives businesses a shared place to record requirements, assign responsibility, organise supporting evidence, follow corrective actions and review progress. Its features support the practical work of keeping compliance records organised and up to date."
    >
      <section aria-labelledby="features-heading">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              Your workspace
            </p>
            <h2
              id="features-heading"
              className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
            >
              Tools for the everyday work of compliance tracking
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-slate-500">
            Connect requirements, documents, actions and team responsibilities in one workspace.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {features.map(({ heading, body }, i) => (
            <article
              key={heading}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_5px_24px_rgba(15,45,32,0.035)] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_16px_36px_rgba(15,75,45,0.085)] sm:p-7"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-50/70 transition-transform duration-300 group-hover:scale-125" />
              <div className="relative flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-sm font-bold tracking-wide text-emerald-900 transition-colors duration-200 group-hover:bg-emerald-900 group-hover:text-white">
                  0{i + 1}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800/60">
                  Feature
                </span>
              </div>

              <h3 className="relative mt-7 text-xl font-semibold tracking-tight text-slate-950 sm:text-[22px]">
                {heading}
              </h3>
              <p className="relative mt-3 flex-1 text-[15px] leading-7 text-slate-600">
                {body}
              </p>
              <div className="relative mt-6 h-px w-full bg-gradient-to-r from-emerald-200 via-slate-100 to-transparent" />
            </article>
          ))}
        </div>
      </section>

      <section className="mt-20 border-t border-slate-200 pt-16" aria-labelledby="workflow-heading">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Connected workflow
          </p>
          <h2 id="workflow-heading" className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            How the compliance tracking features work together
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-slate-600">
            A compliance register is more useful when requirements are connected to people, evidence and follow-up work. ComplianceTracker brings these parts of the process together so your team can move from recording a requirement to reviewing its progress.
          </p>
        </div>

        <div className="mt-9 grid gap-5 sm:grid-cols-2">
          {workflow.map((item) => (
            <article key={item.number} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
              <p className="text-xs font-bold tracking-[0.16em] text-emerald-800">{item.number}</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>

        <p className="mt-6 text-sm leading-7 text-slate-600">
          See the full process in <Link href="/how-it-works" className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950">how ComplianceTracker works</Link>.
        </p>
      </section>

      <section className="mt-20 border-t border-slate-200 pt-16" aria-labelledby="examples-heading">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Practical examples
          </p>
          <h2 id="examples-heading" className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            What can a business track?
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-slate-600">
            Businesses can use a compliance tracker to organise many types of obligations and internal requirements. The records you create should reflect the requirements relevant to your organisation and the way your team manages them.
          </p>
        </div>

        <div className="mt-9 grid gap-5 sm:grid-cols-2">
          {examples.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200/80 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-20 border-t border-slate-200 pt-16" aria-labelledby="choosing-heading">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Making an informed choice
          </p>
          <h2 id="choosing-heading" className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            What to look for in compliance tracker software
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-slate-600">
            The right compliance tracking software should make it easier to understand what needs attention and who is responsible. When evaluating a tool, consider whether it supports the way your organisation actually manages its requirements.
          </p>
        </div>

        <ul className="mt-7 grid gap-4 sm:grid-cols-2">
          {[
            'A central register for recording requirements and their current status.',
            'Clear ownership so responsibilities are visible to the team.',
            'A practical way to organise documents and link supporting evidence.',
            'Action tracking for issues, gaps and outstanding follow-up work.',
            'Review dates and reminders to help teams keep work moving.',
            'Reports that make it easier to review progress and identify outstanding items.',
          ].map((item) => (
            <li key={item} className="flex gap-3 rounded-xl border border-slate-200/80 bg-white p-4 text-sm leading-6 text-slate-600">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-700" />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-7 text-sm leading-7 text-slate-600">
          Have questions about the product and its intended use? Visit the <Link href="/faq" className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950">compliance tracker FAQs</Link> for more information.
        </p>
      </section>
    </PublicPageLayout>
  );
}
