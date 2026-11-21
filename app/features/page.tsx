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
  return <PublicPageLayout eyebrow="Platform features" title="The tools to keep business compliance organised" description="ComplianceTracker brings your compliance register, supporting evidence, corrective actions and review dates together in one workspace.">
    <div className="grid gap-10 sm:grid-cols-2">
      {features.map(([heading, body], i) => (
        <section key={heading} className="border-t border-slate-200 pt-5">
          <p className="text-xs font-bold tracking-widest text-blue-700">0{i + 1}</p>
          <h2 className="mt-3 text-xl font-semibold text-slate-950">{heading}</h2>
          <p className="mt-3 text-[15px] leading-7 text-slate-600">{body}</p>
        </section>
      ))}
    </div>
    <p className="mt-14 rounded-2xl bg-slate-50 p-6 text-sm leading-7 text-slate-600">ComplianceTracker is a tracking and organisation tool. It does not provide legal advice, certify compliance or guarantee that a business meets every applicable requirement.</p>
  </PublicPageLayout>;
}
