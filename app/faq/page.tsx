import type { Metadata } from 'next';
import PublicPageLayout from '../components/PublicPageLayout';

export const metadata: Metadata = {
  title: 'Compliance Tracker FAQs | ComplianceTracker',
  description: 'Find answers about compliance tracker software, compliance registers, evidence uploads, corrective actions, team access and business compliance tracking.',
  alternates: { canonical: '/faq' },
  keywords: ['compliance tracker FAQ', 'compliance tracking software questions', 'compliance register questions'],
  openGraph: {
    title: 'Compliance Tracker FAQs | ComplianceTracker',
    description: 'Answers about compliance tracking, evidence, corrective actions and using ComplianceTracker with a team.',
    url: '/faq',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'Compliance Tracker FAQs | ComplianceTracker', description: 'Get answers about compliance tracker software and its features.' },
};

const questions = [
  ['What is compliance tracker software?', 'It helps a business record the requirements it needs to monitor, track status and responsibility, organise supporting evidence and follow up on outstanding work.'],
  ['What can I track with ComplianceTracker?', 'You can record business requirements, their status, responsible people and review dates, then organise related evidence and corrective actions.'],
  ['Can I upload supporting documents?', 'Yes. You can upload supporting documents and associate evidence with compliance records so the material is easier to find in context.'],
  ['Can I assign work to team members?', 'Yes. You can invite people into a shared workspace and assign responsibility for requirements and corrective actions. Workspace roles and permissions help manage who can change records.'],
  ['Can I track corrective actions?', 'Yes. You can create corrective actions, assign responsibility and monitor progress as your team follows up on outstanding work.'],
  ['Does ComplianceTracker tell me which laws apply to my business?', 'No. Your business is responsible for identifying the laws, regulations and other requirements that apply to its activities.'],
  ['Does using the software guarantee compliance?', 'No. The software helps organise records and track work, but it cannot guarantee compliance or replace professional advice, audits or certification.'],
  ['Can more than one person use a workspace?', 'Yes. ComplianceTracker supports shared workspaces and invitations for team members, with workspace roles and permissions.'],
];

export default function FAQPage() {
  return <PublicPageLayout eyebrow="Frequently asked questions" title="ComplianceTracker questions and answers" description="Learn what compliance tracker software does and how ComplianceTracker helps teams organise requirements, evidence and follow-up work.">
    <div className="divide-y divide-slate-200">
      {questions.map(([question, answer]) => (
        <section key={question} className="py-7 first:pt-0">
          <h2 className="text-lg font-semibold text-slate-950">{question}</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-600">{answer}</p>
        </section>
      ))}
    </div>
  </PublicPageLayout>;
}
