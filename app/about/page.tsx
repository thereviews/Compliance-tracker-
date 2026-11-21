import type { Metadata } from 'next';
import PublicPageLayout from '../components/PublicPageLayout';

export const metadata: Metadata = {
  title: 'About ComplianceTracker | Business Compliance Software',
  description: 'Discover ComplianceTracker, a practical workspace that helps businesses organise compliance requirements, supporting evidence, corrective actions and review dates.',
  alternates: { canonical: '/about' },
  keywords: ['about ComplianceTracker', 'business compliance software', 'compliance tracking tool'],
  openGraph: {
    title: 'About ComplianceTracker | Business Compliance Software',
    description: 'Learn about the purpose and practical approach behind ComplianceTracker.',
    url: '/about',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'About ComplianceTracker | Business Compliance Software', description: 'Learn about a practical workspace for organising business compliance work.' },
};

export default function AboutPage() {
  return <PublicPageLayout eyebrow="About ComplianceTracker" title="Making compliance work easier to organise" description="ComplianceTracker is a software workspace designed to help businesses keep track of the requirements, records and follow-up work involved in their compliance activities.">
    <div className="max-w-3xl space-y-8 text-base leading-8 text-slate-600">
      <section><h2 className="text-2xl font-semibold text-slate-950">Why ComplianceTracker exists</h2><p className="mt-4">Compliance work can become difficult to coordinate when requirements live in spreadsheets, evidence is stored in separate folders and follow-up actions are tracked in different places. It can be hard to see who is responsible, what has been completed and what needs attention next.</p></section>
      <section><h2 className="text-2xl font-semibold text-slate-950">A practical approach</h2><p className="mt-4">ComplianceTracker brings a compliance register, supporting documents, corrective actions, review dates and reporting into one workspace. Teams can organise records, assign responsibility and follow the progress of outstanding work.</p></section>
      <section><h2 className="text-2xl font-semibold text-slate-950">Who it is for</h2><p className="mt-4">It is intended for businesses and teams that want a more structured way to manage compliance tracking. Each business remains responsible for identifying the requirements that apply to it and determining whether those requirements have been met.</p></section>
      <p className="rounded-2xl bg-slate-50 p-6 text-sm leading-7">ComplianceTracker does not replace qualified legal, regulatory or compliance advice, independent audits or certification.</p>
    </div>
  </PublicPageLayout>;
}
