import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import PublicPageLayout from '../components/PublicPageLayout';

export const metadata: Metadata = {
  title: 'Compliance Tracker FAQs for Businesses | ComplianceTracker',
  description: 'Get answers about business compliance tracking, requirements, evidence management, corrective actions, team access, review dates, reminders and reports.',
  alternates: { canonical: '/faq' },
  keywords: [
    'compliance tracker FAQ',
    'business compliance tracking questions',
    'compliance tracking software questions',
    'compliance register questions',
    'compliance evidence tracking',
    'corrective action tracking',
  ],
  openGraph: {
    title: 'Compliance Tracker FAQs | ComplianceTracker',
    description: 'Answers about business compliance tracking, evidence, corrective actions and team workflows in ComplianceTracker.',
    url: '/faq',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Compliance Tracker FAQs | ComplianceTracker',
    description: 'Find answers about compliance tracker software and organising business compliance work.',
  },
};

const questions = [
  [
    'What is compliance tracker software?',
    'Compliance tracker software gives a business a structured place to record the requirements it wants to monitor, assign responsibility, track status, organise supporting evidence and follow up on outstanding work. It helps bring these related activities together instead of relying on disconnected records and task lists.',
  ],
  [
    'What can I track with ComplianceTracker?',
    'You can record business requirements, categorise them, assign responsible people, update their status and set review dates. You can also connect supporting documents, manage corrective actions and use reports to review recorded progress.',
  ],
  [
    'Who is ComplianceTracker designed for?',
    'ComplianceTracker is designed for businesses and teams that need a more organised way to coordinate ongoing compliance work. It can help teams keep track of requirements, supporting records, responsibilities and follow-up activities in a shared workspace.',
  ],
  [
    'Can I use it to track internal policies and procedures?',
    'Yes. You can record relevant internal requirements, such as policies, procedures and other business standards, alongside the external requirements your business has identified. Your team remains responsible for deciding what needs to be recorded.',
  ],
  [
    'Can I upload supporting documents and evidence?',
    'Yes. You can upload supporting documents and associate evidence with relevant compliance records. This helps keep policies, procedures, certificates and other supporting material connected to the work they relate to.',
  ],
  [
    'Can I assign requirements to team members?',
    'Yes. You can use a shared workspace to coordinate work with team members and assign responsibility for requirements and corrective actions. Workspace roles and permissions help manage access and changes.',
  ],
  [
    'Can I track corrective actions?',
    'Yes. You can create corrective actions, assign responsibility, set due dates and monitor their status. This gives your team a place to record follow-up work and review what remains outstanding.',
  ],
  [
    'Can I track review dates and upcoming deadlines?',
    'Yes. Compliance records can include review dates so your team can keep track of when information should be checked again. ComplianceTracker also supports reminders to help bring upcoming reviews and deadlines to your attention.',
  ],
  [
    'Can I see the progress of our compliance work?',
    'ComplianceTracker includes reports that help you review recorded requirement statuses and identify work that may need attention. The information reflects the records your team maintains in the workspace.',
  ],
  [
    'Can more than one person use a workspace?',
    'Yes. ComplianceTracker supports shared workspaces and team member invitations, with workspace roles and permissions. This helps people coordinate responsibilities while managing who can access or change records.',
  ],
  [
    'Does ComplianceTracker tell me which laws apply to my business?',
    'No. Your business is responsible for identifying the laws, regulations, contractual obligations and other requirements that apply to its activities. ComplianceTracker helps you record and track the requirements you identify; it does not determine which ones apply.',
  ],
  [
    'Does using ComplianceTracker guarantee that my business is compliant?',
    'No. The software helps organise records and track compliance-related work, but it cannot guarantee that a business meets every applicable requirement. It does not replace qualified legal or compliance advice, independent audits or certification.',
  ],
  [
    'Can ComplianceTracker replace our existing spreadsheets?',
    'It can provide a more structured workspace for tracking requirements, evidence, responsibilities and follow-up actions. Whether you move away from spreadsheets entirely depends on your business processes and how your team chooses to use the software.',
  ],
  [
    'How do I get started with ComplianceTracker?',
    'Start by identifying the requirements your business wants to track. Add them to your compliance register, assign responsible people, record review dates and attach relevant supporting evidence. You can then use corrective actions and reports to help manage follow-up and review progress.',
  ],
];

export default function FAQPage() {
  return (
    <PublicPageLayout
      eyebrow="Frequently asked questions"
      title="Answers to your compliance tracking questions."
      description="Find out how ComplianceTracker helps businesses record requirements, organise evidence, assign responsibility, manage follow-up actions and review progress."
    >
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Help centre</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Common questions
          </h2>
        </div>
        <p className="text-sm font-medium text-slate-500">
          {questions.length} answers to help you get started
        </p>
      </div>

      <div className="space-y-4">
        {questions.map(([question, answer], index) => (
          <details
            key={question}
            className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_22px_rgba(15,45,32,0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_12px_30px_rgba(15,75,45,0.07)] open:border-emerald-200 open:bg-gradient-to-br open:from-emerald-50/70 open:to-white open:shadow-[0_10px_30px_rgba(15,75,45,0.06)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 marker:hidden sm:gap-5 sm:px-6 sm:py-6 [&::-webkit-details-marker]:hidden">
              <span className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-bold tabular-nums text-emerald-900 transition-colors group-open:bg-emerald-900 group-open:text-white">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-[15px] font-semibold leading-7 tracking-tight text-slate-900 sm:text-base">
                  {question}
                </span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 group-hover:border-emerald-300 group-hover:text-emerald-800 group-open:rotate-45 group-open:border-emerald-300 group-open:bg-emerald-100 group-open:text-emerald-900">
                <Plus className="h-4 w-4" />
              </span>
            </summary>
            <div className="px-5 pb-6 pl-[4.25rem] sm:px-6 sm:pb-7 sm:pl-[4.75rem]">
              <p className="max-w-3xl border-l-2 border-emerald-200 pl-4 text-sm leading-7 text-slate-600 sm:text-[15px]">
                {answer}
              </p>
            </div>
          </details>
        ))}
      </div>

      <div className="relative mt-12 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 p-6 shadow-[0_10px_32px_rgba(15,75,45,0.055)] sm:mt-14 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">
          Still have a question?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
          Explore the product pages to learn more about the tools available in ComplianceTracker.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/features"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-md"
          >
            Explore features
          </a>
          <a
            href="/how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-900"
          >
            How it works
          </a>
        </div>
      </div>
    </PublicPageLayout>
  );
}
