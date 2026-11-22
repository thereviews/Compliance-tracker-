import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import PublicPageLayout from '../components/PublicPageLayout';

export const metadata: Metadata = {
  title: 'Compliance Tracker FAQs | ComplianceTracker',
  description:
    'Find answers about compliance tracker software, compliance registers, evidence uploads, corrective actions, team access and business compliance tracking.',
  alternates: { canonical: '/faq' },
  keywords: [
    'compliance tracker FAQ',
    'compliance tracking software questions',
    'compliance register questions',
  ],
  openGraph: {
    title: 'Compliance Tracker FAQs | ComplianceTracker',
    description:
      'Answers about compliance tracking, evidence, corrective actions and using ComplianceTracker with a team.',
    url: '/faq',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Compliance Tracker FAQs | ComplianceTracker',
    description: 'Get answers about compliance tracker software and its features.',
  },
};

const questions = [
  [
    'What is compliance tracker software?',
    'It helps a business record the requirements it needs to monitor, track status and responsibility, organise supporting evidence and follow up on outstanding work.',
  ],
  [
    'What can I track with ComplianceTracker?',
    'You can record business requirements, their status, responsible people and review dates, then organise related evidence and corrective actions.',
  ],
  [
    'Can I upload supporting documents?',
    'Yes. You can upload supporting documents and associate evidence with compliance records so the material is easier to find in context.',
  ],
  [
    'Can I assign work to team members?',
    'Yes. You can invite people into a shared workspace and assign responsibility for requirements and corrective actions. Workspace roles and permissions help manage who can change records.',
  ],
  [
    'Can I track corrective actions?',
    'Yes. You can create corrective actions, assign responsibility and monitor progress as your team follows up on outstanding work.',
  ],
  [
    'Does ComplianceTracker tell me which laws apply to my business?',
    'No. Your business is responsible for identifying the laws, regulations and other requirements that apply to its activities.',
  ],
  [
    'Does using the software guarantee compliance?',
    'No. The software helps organise records and track work, but it cannot guarantee compliance or replace professional advice, audits or certification.',
  ],
  [
    'Can more than one person use a workspace?',
    'Yes. ComplianceTracker supports shared workspaces and invitations for team members, with workspace roles and permissions.',
  ],
];

export default function FAQPage() {
  return (
    <PublicPageLayout
      eyebrow="Frequently asked questions"
      title="Answers to your compliance tracking questions."
      description="Learn how ComplianceTracker helps your team organise requirements, keep evidence together and stay on top of follow-up work."
    >
      <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Help centre</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Common questions
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          {questions.length} answers to help you get started
        </p>
      </div>

      <div className="space-y-3">
        {questions.map(([question, answer], index) => (
          <details
            key={question}
            className="group rounded-2xl border border-slate-200 bg-white transition-colors open:border-emerald-200 open:bg-emerald-50/30"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-2xl px-5 py-5 marker:hidden sm:px-6 [&::-webkit-details-marker]:hidden">
              <span className="flex items-start gap-4">
                <span className="mt-0.5 text-xs font-semibold tabular-nums text-emerald-700">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-base font-semibold leading-7 text-slate-900">
                  {question}
                </span>
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all group-open:rotate-45 group-open:border-emerald-200 group-open:text-emerald-800">
                <Plus className="h-4 w-4" />
              </span>
            </summary>
            <div className="px-5 pb-6 pl-14 sm:px-6 sm:pl-[4.25rem]">
              <p className="max-w-3xl text-[15px] leading-7 text-slate-600">
                {answer}
              </p>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-950">
          Still have a question?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
          Explore the product pages to learn more about the tools available in ComplianceTracker.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/features"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            Explore features
          </a>
          <a
            href="/how-it-works"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-900"
          >
            How it works
          </a>
        </div>
      </div>
    </PublicPageLayout>
  );
}
