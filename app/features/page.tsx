import type { Metadata } from 'next';
import PublicPageLayout from '../components/PublicPageLayout';

export const metadata: Metadata = {
  title: 'Compliance Tracker Features | ComplianceTracker',
  description: 'Explore compliance tracker features for recording business requirements, organising evidence, assigning corrective actions, tracking deadlines and reviewing progress.',
  alternates: { canonical: '/features' },
  keywords: ['compliance tracker features', 'compliance register software', 'compliance evidence tracking', 'corrective action tracking'],
  openGraph: {
    title: 'Compliance Tracker Features | ComplianceTracker',
    description: 'See how to track requirements, evidence, corrective actions, deadlines and team responsibilities.',
    url: '/features',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'Compliance Tracker Features | ComplianceTracker', description: 'Explore tools for compliance registers, evidence, corrective actions and deadlines.' },
};

const features = [
  ['Compliance register', 'Record business requirements and keep descriptions, status, ownership and review dates together in a structured register.'],
  ['Documents and evidence', 'Upload supporting documents and associate evidence with relevant compliance records, keeping context alongside each requirement.'],
  ['Corrective actions', 'Turn gaps and follow-up work into trackable actions. Assign responsibility and monitor progress.'],
  ['Deadlines and reminders', 'Keep review dates and important deadlines visible so your team can follow up on work that is coming due.'],
  ['Compliance reports', 'Review compliance status and outstanding work through summaries and reports.'],
  ['Team workspace', 'Invite colleagues into a shared workspace and use workspace roles and permissions to manage access to records.'],
];

export default function FeaturesPage() {
  return (
    <PublicPageLayout
      eyebrow="Platform features"
      title="The tools to keep business compliance organised"
      description="ComplianceTracker brings your compliance register, supporting evidence, corrective actions and review dates together in one workspace."
    >
      <section>
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              Your workspace
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Everything connected in one place
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-slate-500">
            Six practical tools designed to support the everyday work of compliance tracking.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {features.map(([heading, body], i) => (
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

              <h2 className="relative mt-7 text-xl font-semibold tracking-tight text-slate-950 sm:text-[22px]">
                {heading}
              </h2>
              <p className="relative mt-3 flex-1 text-[15px] leading-7 text-slate-600">
                {body}
              </p>
              <div className="relative mt-6 h-px w-full bg-gradient-to-r from-emerald-200 via-slate-100 to-transparent" />
            </article>
          ))}
        </div>
      </section>

      <aside className="relative mt-12 overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 p-6 shadow-[0_8px_28px_rgba(120,80,20,0.04)] sm:mt-14 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <span className="text-lg font-bold">!</span>
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Important distinction
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              ComplianceTracker is a tracking and organisation tool. It does not provide legal advice, certify compliance or guarantee that a business meets every applicable requirement.
            </p>
          </div>
        </div>
      </aside>
    </PublicPageLayout>
  );
}
