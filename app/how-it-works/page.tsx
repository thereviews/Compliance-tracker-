import type { Metadata } from 'next';
import PublicPageLayout from '../components/PublicPageLayout';

export const metadata: Metadata = {
  title: 'How Compliance Tracking Works | ComplianceTracker',
  description: 'Learn how to record business compliance requirements, connect evidence, assign corrective actions and monitor review dates with ComplianceTracker.',
  alternates: { canonical: '/how-it-works' },
  keywords: ['how compliance tracking works', 'business compliance tracking', 'compliance tracking process'],
  openGraph: {
    title: 'How Compliance Tracking Works | ComplianceTracker',
    description: 'Follow a practical workflow for recording requirements, keeping evidence, assigning actions and reviewing progress.',
    url: '/how-it-works',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'How Compliance Tracking Works | ComplianceTracker', description: 'See how ComplianceTracker helps teams organise requirements, evidence and follow-up work.' },
};

const steps = [
  ['Record the requirements', 'Add the business requirements you need to track. Record their status, responsible person and relevant review dates.'],
  ['Keep supporting evidence together', 'Upload documents and connect them to relevant register entries so supporting information is easier to find.'],
  ['Assign and follow up on actions', 'Create corrective actions, assign responsibility and monitor progress as your team addresses outstanding work.'],
  ['Review status and progress', 'Use reports and your workspace overview to identify outstanding work and keep upcoming dates in view.'],
];

export default function HowItWorksPage() {
  return <PublicPageLayout eyebrow="How it works" title="A straightforward workflow for compliance tracking" description="ComplianceTracker is built around the practical work of managing business requirements: record what matters, keep evidence connected, assign follow-up and review progress.">
    <div className="space-y-10">
      {steps.map(([heading, body], i) => (
        <section key={heading} className="grid gap-4 border-b border-slate-200 pb-9 sm:grid-cols-[76px_1fr] sm:gap-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-700">{i + 1}</div>
          <div><h2 className="text-xl font-semibold text-slate-950">{heading}</h2><p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-600">{body}</p></div>
        </section>
      ))}
    </div>
    <section className="mt-12"><h2 className="text-2xl font-semibold">One connected place for the work</h2><p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-600">Instead of separating requirements, documents and follow-up into disconnected lists, ComplianceTracker gives your team a shared workspace for the records and actions involved in its compliance process.</p></section>
  </PublicPageLayout>;
}
