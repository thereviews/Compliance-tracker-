import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Menu,
  ClipboardList,
  FileCheck2,
  ListChecks,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ChartNoAxesCombined,
  Users,
  LockKeyhole,
  FileText,
  ChevronRight,
  Check,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Compliance Tracker Software for Businesses | ComplianceTracker',
  description:
    'Track business compliance requirements, assign responsibilities, organise supporting evidence and monitor deadlines in one practical compliance tracker.',
  alternates: { canonical: '/' },
  keywords: [
    'compliance tracker',
    'compliance tracker software',
    'compliance tracking software for businesses',
    'business compliance tracker',
    'track compliance requirements',
  ],
  openGraph: {
    title: 'Compliance Tracker Software for Businesses | ComplianceTracker',
    description:
      'Organise business requirements, evidence, corrective actions and review dates in one compliance tracking workspace.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Compliance Tracker Software for Businesses | ComplianceTracker',
    description:
      'Track requirements, organise evidence, assign actions and keep business compliance work visible.',
  },
};

const faqs = [
  {
    question: 'What is a compliance tracker?',
    answer:
      'A compliance tracker is a tool for recording the requirements an organisation needs to follow and monitoring the work associated with them. It can help a team keep requirements, responsible people, current statuses, supporting evidence, actions and review dates organised.',
  },
  {
    question: 'What can I track with ComplianceTracker?',
    answer:
      'You can record business compliance requirements, add descriptions and relevant details, assign responsibility, monitor status and review dates, attach supporting evidence, and create corrective actions for work that needs follow-up.',
  },
  {
    question: 'Can I upload documents and link them to requirements?',
    answer:
      'Yes. You can upload supporting documents and associate evidence with relevant compliance records. This helps keep the documents connected to the requirements they support instead of leaving them scattered across unrelated folders.',
  },
  {
    question: 'Can more than one person work in a workspace?',
    answer:
      'ComplianceTracker includes team workspace functionality. You can invite colleagues and use workspace roles to support collaboration and control access.',
  },
  {
    question: 'Is a compliance tracker a replacement for legal advice?',
    answer:
      'No. ComplianceTracker helps organise and monitor compliance work, but it does not determine which laws apply to your organisation or guarantee that your business meets its legal obligations. Your organisation remains responsible for identifying applicable requirements and obtaining professional advice when needed.',
  },
  {
    question: 'When should a business move beyond spreadsheets?',
    answer:
      'A spreadsheet may be sufficient for a small number of straightforward requirements. A dedicated tracker can become useful when several people share responsibility, evidence needs to be connected to individual requirements, actions need follow-up, or review dates are becoming difficult to coordinate.',
  },
];

const features = [
  {
    icon: ClipboardList,
    number: '01',
    title: 'Compliance register',
    text: 'Create a record for each requirement, including its status, owner and next review date.',
  },
  {
    icon: FileCheck2,
    number: '02',
    title: 'Documents and evidence',
    text: 'Store policies and records alongside the requirements they help support.',
  },
  {
    icon: ListChecks,
    number: '03',
    title: 'Corrective actions',
    text: 'Assign follow-up tasks to an owner and track each action until it is completed.',
  },
  {
    icon: CalendarDays,
    number: '04',
    title: 'Deadlines and reviews',
    text: 'Keep important dates in view and make upcoming reviews easier to identify and follow up.',
  },
  {
    icon: ChartNoAxesCombined,
    number: '05',
    title: 'Compliance reports',
    text: 'Review summaries of compliance status and outstanding work to understand where attention is needed.',
  },
  {
    icon: Users,
    number: '06',
    title: 'Team workspace',
    text: 'Bring colleagues into a shared workspace with roles and permissions for team collaboration.',
  },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="ComplianceTracker home">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#123c32] text-white shadow-sm">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <span className="text-[18px] font-bold tracking-tight text-[#172b25]">
        Compliance<span className="text-[#258568]">Tracker</span>
      </span>
    </Link>
  );
}

function DashboardPreview() {
  const metrics = [
    { label: 'Requirements', value: '24', icon: ClipboardList, color: 'text-[#284b3b]' },
    { label: 'Compliant', value: '12', icon: ShieldCheck, color: 'text-emerald-600' },
    { label: 'Open actions', value: '5', icon: ListChecks, color: 'text-amber-600' },
    { label: 'Evidence files', value: '18', icon: FileCheck2, color: 'text-[#398263]' },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[690px]">
      <div className="absolute -inset-8 rounded-[40px] bg-[#b9dfce]/50 blur-3xl" />
      <div className="relative rounded-2xl border border-[#dce8e1] bg-white p-2 shadow-[0_30px_90px_-35px_rgba(23,59,45,0.3)] sm:rounded-3xl sm:p-3">
        <div className="overflow-hidden rounded-xl border border-[#edf1ed] bg-white sm:rounded-2xl">
          <div className="flex h-14 items-center justify-between border-b border-[#edf1ed] px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123c32] text-white">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-[#20352d]">ComplianceTracker</p>
                <p className="text-[10px] text-slate-400">Business workspace</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-[#edf7f1] px-3 py-1 text-[10px] font-semibold text-[#267653] sm:inline-flex">
                Workspace overview
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf2ee] text-[10px] font-bold text-[#456457]">
                AC
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[100px_minmax(0,1fr)] sm:grid-cols-[150px_minmax(0,1fr)]">
            <aside className="border-r border-[#edf1ed] bg-[#f8faf8] p-2 sm:p-4">
              <p className="mb-3 px-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Workspace
              </p>
              {[
                { label: 'Overview', icon: ChartNoAxesCombined, active: true },
                { label: 'Register', icon: ClipboardList },
                { label: 'Evidence', icon: FileCheck2 },
                { label: 'Actions', icon: ListChecks },
                { label: 'Reports', icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-2.5 text-[9px] font-medium sm:text-[11px] ${
                      item.active ? 'bg-[#e9f4ed] text-[#216b4c]' : 'text-slate-500'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                );
              })}
              <div className="mt-5 border-t border-[#e8eee9] pt-3">
                <p className="px-2 text-[9px] text-slate-400">MANAGEMENT</p>
                <div className="mt-2 flex items-center gap-2 px-2 py-2 text-[9px] text-slate-500 sm:text-[11px]">
                  <Users className="h-3.5 w-3.5" /> Team
                </div>
              </div>
            </aside>

            <div className="min-w-0 p-3 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold text-[#398263] sm:text-xs">WORKSPACE OVERVIEW</p>
                  <h2 className="mt-1 text-base font-bold tracking-tight text-[#20352d] sm:text-xl">
                    Good morning
                  </h2>
                  <p className="mt-1 text-[9px] text-slate-500 sm:text-[11px]">
                    Here is your compliance position.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#174b3b] px-2.5 py-2 text-[9px] font-semibold text-white sm:px-3 sm:text-[10px]">
                  + Add requirement
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4">
                {metrics.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border border-[#e8eee9] bg-white p-2.5 sm:p-3">
                      <Icon className={`h-4 w-4 ${item.color}`} />
                      <p className={`mt-2 text-xl font-bold ${item.color} sm:text-2xl`}>{item.value}</p>
                      <p className="mt-0.5 text-[9px] text-slate-500 sm:text-[10px]">{item.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#e8eee9] p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-[#34483d] sm:text-xs">Compliance progress</p>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full" style={{ background: 'conic-gradient(#26845f 0% 50%, #dcece2 50% 100%)' }}>
                      <div className="flex h-[57px] w-[57px] items-center justify-center rounded-full bg-white">
                        <span className="text-sm font-bold text-[#284b3b]">50%</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      {[
                        ['Compliant', 'bg-emerald-600', '12'],
                        ['In progress', 'bg-[#8bbba0]', '7'],
                        ['Needs review', 'bg-amber-500', '3'],
                        ['Non-compliant', 'bg-rose-500', '2'],
                      ].map(([label, color, value]) => (
                        <div key={label} className="flex items-center justify-between gap-1 text-[8px] sm:text-[9px]">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
                            {label}
                          </span>
                          <span className="font-semibold text-slate-700">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e8eee9] p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-[#34483d] sm:text-xs">Needs attention</p>
                    <CircleAlert className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {[
                      ['Overdue requirements', '2', 'text-rose-600', 'bg-rose-50'],
                      ['Missing evidence', '3', 'text-amber-600', 'bg-amber-50'],
                      ['Open actions', '5', 'text-[#398263]', 'bg-[#edf7f1]'],
                    ].map(([label, value, color, bg]) => (
                      <div key={label} className="flex items-center justify-between rounded-lg bg-[#f8faf8] px-2.5 py-2">
                        <span className="text-[9px] text-slate-600">{label}</span>
                        <span className={`rounded-md ${bg} px-2 py-1 text-[9px] font-bold ${color}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-[#e8eee9] p-3 sm:mt-4 sm:p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-[#34483d] sm:text-xs">Recent requirements</p>
                  <span className="text-[9px] font-semibold text-[#398263]">View register →</span>
                </div>
                {[
                  ['Review access permissions', 'In progress', 'bg-blue-50 text-blue-700'],
                  ['Maintain security policy', 'Needs review', 'bg-amber-50 text-amber-700'],
                  ['Document staff training', 'Compliant', 'bg-emerald-50 text-emerald-700'],
                ].map(([name, status, style]) => (
                  <div key={name} className="flex items-center justify-between gap-2 border-t border-[#edf1ed] py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-[9px] font-medium text-slate-700 sm:text-[10px]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#6c9d80]" />
                      <span className="truncate">{name}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-semibold ${style}`}>{status}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-[8px] text-slate-400">Illustrative product preview</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-xl border border-[#e4ece5] bg-white p-3 shadow-xl sm:flex lg:-left-8">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf7f1] text-[#398263]">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-bold text-[#263b30]">Everything in view</p>
          <p className="text-[10px] text-slate-500">One organised workspace</p>
        </div>
      </div>
    </div>
  );
}

function RegisterPreview() {
  const rows = [
    ['Review access permissions', 'IT security', 'Alex Morgan', '15 Dec 2026', '2 files', 'In progress', 'bg-blue-50 text-blue-700'],
    ['Maintain staff records', 'HR', 'Jamie Lee', '18 Dec 2026', '1 file', 'Needs review', 'bg-amber-50 text-amber-700'],
    ['Review supplier agreements', 'Operations', 'Taylor Reed', '08 Jan 2027', '3 files', 'Compliant', 'bg-emerald-50 text-emerald-700'],
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e3ebe4] bg-white shadow-[0_20px_60px_-35px_rgba(23,59,45,0.3)]">
      <div className="flex items-center justify-between border-b border-[#edf1ed] px-4 py-4">
        <div>
          <p className="text-xs font-bold text-[#263d30]">Compliance register</p>
          <p className="mt-1 text-[10px] text-slate-400">Requirements and responsibilities</p>
        </div>
        <span className="rounded-lg bg-[#174b3b] px-3 py-2 text-[10px] font-semibold text-white">+ Add</span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3 bg-[#f8faf8] px-4 py-3 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        <span>Requirement details</span><span>Status</span>
      </div>
      {rows.map(([name, area, owner, review, evidence, status, style]) => (
        <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-[#edf1ed] px-4 py-4">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-[#34483d]">{name}</p>
            <p className="mt-1 truncate text-[9px] text-slate-400">{area} · {owner}</p>
            <p className="mt-1 text-[9px] text-slate-400">Review {review} · {evidence}</p>
          </div>
          <span className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[9px] font-semibold ${style}`}>{status}</span>
        </div>
      ))}
      <div className="border-t border-[#edf1ed] bg-[#fbfcfb] px-4 py-3 text-[9px] text-slate-400">
        Illustrative register entries
      </div>
    </div>
  );
}

function EvidencePreview() {
  const files = [
    ['Information security policy.pdf', 'PDF document', 'Information security policy', '12 Nov 2026'],
    ['Staff training record.pdf', 'PDF document', 'Staff training requirements', '10 Nov 2026'],
    ['Supplier assessment.pdf', 'PDF document', 'Supplier review', '06 Nov 2026'],
  ];

  return (
    <div className="rounded-2xl border border-[#e3ebe4] bg-white p-4 shadow-[0_20px_60px_-35px_rgba(23,59,45,0.3)] sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-[#263d30]">Documents &amp; evidence</p>
          <p className="mt-1 text-[10px] text-slate-400">Supporting files in one place</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf6ef] text-[#398263]">
          <FileCheck2 className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {files.map(([name, type, requirement, date]) => (
          <div key={name} className="flex items-center gap-3 rounded-xl border border-[#edf1ed] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f7f2] text-[#398263]">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold text-[#34483d] sm:text-[11px]">{name}</p>
              <p className="mt-1 truncate text-[9px] text-slate-400">{type} · Linked to {requirement}</p>
              <p className="mt-1 text-[9px] text-slate-400">Uploaded {date}</p>
            </div>
            <span className="hidden rounded-full bg-[#edf7f1] px-2.5 py-1.5 text-[9px] font-semibold text-[#398263] sm:inline-flex">
              Linked
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-[#bfd5c5] bg-[#f8fbf8] px-4 py-4 text-center">
        <FileCheck2 className="mx-auto h-5 w-5 text-[#6c9d80]" />
        <p className="mt-2 text-[10px] font-semibold text-[#34483d]">Upload supporting evidence</p>
        <p className="mt-1 text-[9px] text-slate-400">Connect documents to relevant records</p>
      </div>
      <p className="mt-3 text-center text-[9px] text-slate-400">Illustrative evidence list</p>
    </div>
  );
}

function ActionsPreview() {
  const tasks = [
    ['Update access review documentation', 'Alex Morgan', '28 Nov 2026', 'Assigned', 'bg-blue-50 text-blue-700'],
    ['Collect outstanding training records', 'Jamie Lee', '30 Nov 2026', 'In progress', 'bg-amber-50 text-amber-700'],
    ['Review supplier evidence', 'Taylor Reed', '20 Nov 2026', 'Completed', 'bg-emerald-50 text-emerald-700'],
  ];

  return (
    <div className="rounded-2xl border border-[#e3ebe4] bg-white p-4 shadow-[0_20px_60px_-35px_rgba(23,59,45,0.3)] sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-[#263d30]">Corrective actions</p>
          <p className="mt-1 text-[10px] text-slate-400">Follow-up work and ownership</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf6ef] text-[#398263]">
          <ListChecks className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {tasks.map(([task, owner, due, status, style], index) => (
          <div key={task} className="flex items-start gap-3 rounded-xl border border-[#edf1ed] p-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f1f7f2] text-[10px] font-bold text-[#398263]">
              0{index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold leading-5 text-[#34483d] sm:text-[11px]">{task}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${style}`}>{status}</span>
                <span className="text-[9px] text-slate-500">{owner}</span>
                <span className="text-[9px] text-slate-400">Due {due}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[9px] text-slate-400">Illustrative action list</p>
    </div>
  );
}

function ReportsPreview() {
  return (
    <div className="rounded-2xl border border-[#e3ebe4] bg-white p-4 shadow-[0_20px_60px_-35px_rgba(23,59,45,0.3)] sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-[#263d30]">Compliance reports</p>
          <p className="mt-1 text-[10px] text-slate-400">A clearer view of outstanding work</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf6ef] text-[#398263]">
          <ChartNoAxesCombined className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#f5f9f5] p-3">
          <p className="text-[9px] font-medium text-slate-500">Requirements tracked</p>
          <p className="mt-2 text-2xl font-bold text-[#284b3b]">24</p>
        </div>
        <div className="rounded-xl bg-[#f5f9f5] p-3">
          <p className="text-[9px] font-medium text-slate-500">Open actions</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">5</p>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-[#edf1ed] p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-[#34483d]">Status overview</p>
          <span className="text-[9px] text-slate-400">Example data</span>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#edf1ed]">
          <span className="w-1/2 bg-[#398263]" />
          <span className="w-[29%] bg-[#9fc7aa]" />
          <span className="w-[13%] bg-amber-400" />
          <span className="w-[8%] bg-rose-400" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[9px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#398263]" />Compliant <strong className="text-slate-700">12</strong></span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#9fc7aa]" />In progress <strong className="text-slate-700">7</strong></span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Needs review <strong className="text-slate-700">3</strong></span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" />Non-compliant <strong className="text-slate-700">2</strong></span>
        </div>
      </div>
      <p className="mt-3 text-center text-[9px] text-slate-400">Illustrative report preview</p>
    </div>
  );
}

function ProductShowcase({
  eyebrow,
  title,
  description,
  points,
  children,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  children: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
      <div className="min-w-0">{children}</div>
      <div className="max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#398263]">{eyebrow}</p>
        <h3 className="mt-4 text-2xl font-bold tracking-tight text-[#19372b] sm:text-3xl">{title}</h3>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
        <ul className="mt-6 space-y-3">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm leading-6 text-slate-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#398263]" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function HomePage() {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ComplianceTracker',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: 'https://compliancetracker-app.com',
    description:
      'A business compliance tracking workspace for recording requirements, organising supporting evidence, assigning corrective actions and monitoring review dates.',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <main className="home-page min-h-screen overflow-hidden bg-white text-[#20352d]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <header className="sticky top-0 z-50 border-b border-[#edf1ed] bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <Link href="/features" className="text-sm font-medium text-slate-600 transition hover:text-[#258568]">Features</Link>
            <Link href="/how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-[#258568]">How it works</Link>
            <a href="#why-use-a-tracker" className="text-sm font-medium text-slate-600 transition hover:text-[#258568]">Why use a tracker?</a>
            <a href="#faqs" className="text-sm font-medium text-slate-600 transition hover:text-[#258568]">FAQs</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/signin" className="hidden px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-[#258568] sm:inline-flex">Sign in</Link>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-[#174b3b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#103b2e]">
              Get started for free <ArrowRight className="h-4 w-4" />
            </Link>
            <details className="relative md:hidden">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-700">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </summary>
              <div className="absolute right-0 top-full mt-2 flex w-52 flex-col rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <Link href="/features" className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">Features</Link>
                <Link href="/how-it-works" className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">How it works</Link>
                <a href="#why-use-a-tracker" className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">Why use a tracker?</a>
                <a href="#faqs" className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">FAQs</a>
                <Link href="/signin" className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">Sign in</Link>
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate px-5 pb-20 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_38%,rgba(205,232,215,0.72),transparent_48%)]" />
        <div className="pointer-events-none absolute -left-40 top-10 -z-10 h-80 w-80 rounded-full bg-[#f1f7f2] blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dcebe0] bg-[#f1f8f3] px-3.5 py-2 text-xs font-semibold text-[#286b4e]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Business compliance, made clearer
            </div>
            <h1 className="text-[2.65rem] font-bold leading-[1.08] tracking-[-0.055em] text-[#19372b] sm:text-6xl lg:text-[4.1rem]">
              A practical <span className="text-[#398263]">compliance tracker</span> for your business.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-600 sm:text-lg">
              ComplianceTracker helps you organise requirements, assign responsibility, keep supporting evidence together and follow important actions and review dates — all in one workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#174b3b] px-7 text-sm font-semibold text-white shadow-lg shadow-[#174b3b]/15 transition hover:-translate-y-0.5 hover:bg-[#103b2e]">
                Get started for free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/features" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#dce6de] bg-white px-7 text-sm font-semibold text-[#304b3d] transition hover:border-[#a9c9b3] hover:bg-[#f8fbf8]">
                Explore features <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#398263]" /> Clear ownership</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#398263]" /> Organised evidence</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#398263]" /> Visible deadlines</span>
            </div>
            <p className="mt-7 text-xs leading-6 text-slate-400">
              A practical workspace for keeping track of the compliance work your business needs to manage.
            </p>
          </div>
          <DashboardPreview />
        </div>
      </section>

      {/* Benefit strip */}
      <section className="border-y border-[#e8eee9] bg-[#f8faf8] px-5 py-8 sm:px-8 sm:py-9">
        <div className="mx-auto grid max-w-7xl gap-7 sm:grid-cols-3 sm:gap-8">
          {[
            { icon: ClipboardList, title: 'Know what needs attention', text: 'Keep requirements and their current status visible.' },
            { icon: FileCheck2, title: 'Keep evidence organised', text: 'Connect supporting documents to the work they support.' },
            { icon: Clock3, title: 'Keep responsibilities clear', text: 'Track owners, actions and important review dates.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e1ebe3] bg-white text-[#398263] shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#263d30]">{item.title}</h2>
                  <p className="mt-1.5 text-xs leading-6 text-slate-500">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#398263]">ONE CONNECTED WORKSPACE</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#19372b] sm:text-4xl">
              The tools to organise your compliance work.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-500">
              A compliance tracker should do more than list obligations. It should help your team see what needs to be done, who is responsible and where the supporting information belongs.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.number} className="group rounded-2xl border border-[#e6ede7] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#c4d9c9] hover:shadow-xl hover:shadow-[#214c36]/5 sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf6ef] text-[#398263] transition group-hover:bg-[#174b3b] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold tracking-widest text-[#b0c5b5]">{item.number}</span>
                  </div>
                  <h3 className="mt-6 text-base font-bold text-[#263d30]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{item.text}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link href="/features" className="inline-flex items-center gap-2 text-sm font-semibold text-[#287452] transition hover:text-[#174b3b]">
              Explore all features <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Product showcases */}
      <section className="border-y border-[#e8eee9] bg-[#f8faf8] px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center lg:mb-20">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#398263]">SEE HOW IT FITS TOGETHER</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#19372b] sm:text-4xl">
              From requirements to evidence and follow-up.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-500">
              Keep the different parts of business compliance connected, instead of managing every task in a separate place.
            </p>
          </div>

          <div className="space-y-20 lg:space-y-28">
            <ProductShowcase
              eyebrow="01 / COMPLIANCE REGISTER"
              title="Keep every requirement in a structured register."
              description="Build a record for each requirement, with its category, current status, accountable owner and next review date."
              points={[
                'Record requirements and supporting descriptions.',
                'Assign responsibility so ownership is clear.',
                'Review statuses and important dates in one list.',
              ]}
            >
              <RegisterPreview />
            </ProductShowcase>

            <ProductShowcase
              eyebrow="02 / DOCUMENTS & EVIDENCE"
              title="Keep supporting evidence connected to the work."
              description="See which requirement each file supports and when it was added, so policies, records and other evidence are easier to locate during a review."
              points={[
                'Upload supporting documents to your workspace.',
                'Associate evidence with relevant compliance records.',
                'Keep related information easier to locate and review.',
              ]}
              reverse
            >
              <EvidencePreview />
            </ProductShowcase>

            <ProductShowcase
              eyebrow="03 / CORRECTIVE ACTIONS"
              title="Give follow-up work a clear owner."
              description="Turn identified gaps into trackable tasks. Give each action an owner and due date, then monitor its status through to completion."
              points={[
                'Record actions that need to be completed.',
                'Assign responsibility for follow-up.',
                'Monitor action status as work progresses.',
              ]}
            >
              <ActionsPreview />
            </ProductShowcase>

            <ProductShowcase
              eyebrow="04 / REPORTS & PROGRESS"
              title="Understand what is complete and what needs attention."
              description="Review how requirements are distributed across compliance statuses, then identify open actions and records that need attention."
              points={[
                'Review compliance status across recorded requirements.',
                'Identify outstanding work and open actions.',
                'Use a clearer overview to guide your next review.',
              ]}
              reverse
            >
              <ReportsPreview />
            </ProductShowcase>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#398263]">HOW IT WORKS</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#19372b] sm:text-4xl">
              A simple process for keeping compliance on track.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-500">
              Move from recording requirements to reviewing progress in one connected workspace.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { number: '01', icon: ClipboardList, title: 'Record requirements', text: 'Create records for the obligations and internal requirements you monitor.' },
              { number: '02', icon: Users, title: 'Assign ownership', text: 'Make responsibility for each requirement clear.' },
              { number: '03', icon: FileCheck2, title: 'Attach evidence', text: 'Keep supporting documents connected to relevant records.' },
              { number: '04', icon: CalendarDays, title: 'Review progress', text: 'Check statuses, dates and follow-up actions.' },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="rounded-2xl border border-[#e6ede7] bg-white p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf6ef] text-[#398263]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold tracking-widest text-[#b0c5b5]">{step.number}</span>
                  </div>
                  <h3 className="mt-5 text-base font-bold text-[#263d30]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{step.text}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-7 text-center">
            <Link href="/how-it-works" className="inline-flex items-center gap-2 text-sm font-semibold text-[#287452] transition hover:text-[#174b3b]">
              See how ComplianceTracker works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* What a compliance tracker is and who it serves */}
      <section id="why-use-a-tracker" className="bg-[#f8faf8] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#398263]">UNDERSTANDING COMPLIANCE TRACKING</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#19372b] sm:text-4xl">
              What is a compliance tracker?
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
              A compliance tracker is a tool businesses use to record requirements and monitor the work involved in meeting them. It helps organise responsibilities, progress, supporting evidence, review dates and outstanding tasks.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              Instead of keeping this information across separate spreadsheets, folders and email conversations, a dedicated workspace brings related compliance activities together so they are easier to manage and review.
            </p>
            <p className="mt-5 text-sm font-semibold leading-6 text-[#34483d]">
              ComplianceTracker is designed for businesses that want a clearer, more organised way to manage this work.
            </p>
          </div>
          <div className="rounded-2xl border border-[#e4ece5] bg-white p-6 sm:p-8">
            <h3 className="text-lg font-bold text-[#263d30]">Who can use a compliance tracker?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Useful for teams responsible for keeping business requirements organised, including:
            </p>
            <ul className="mt-5 space-y-4">
              {[
                'Small and growing businesses',
                'Operations and administration teams',
                'People responsible for internal policies and reviews',
                'Teams coordinating evidence and corrective actions',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#34483d]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#398263]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Spreadsheet comparison */}
      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#398263]">CHOOSING THE RIGHT APPROACH</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#19372b] sm:text-4xl">
              Compliance tracker vs spreadsheet.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-500">
              Both can help organise information. The difference becomes clearer as requirements, evidence and team responsibilities grow.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#e6ede7] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <FileText className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-[#263d30]">Using a spreadsheet</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Often sufficient for a small, straightforward tracking process.
              </p>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#398263]" /> Flexible lists and columns.</li>
                <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#398263]" /> Familiar and easy to start using.</li>
                <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#398263]" /> May require manual coordination as work grows.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#cfe1d3] bg-[#f7fbf7] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5f2e8] text-[#398263]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-[#263d30]">Using a compliance tracker</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                A more connected approach when several people manage related compliance work.
              </p>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#398263]" /> Requirements, statuses and owners in a register.</li>
                <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#398263]" /> Evidence linked to relevant records.</li>
                <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-[#398263]" /> Actions, reviews and reports in one workspace.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faqs" className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#398263]">COMMON QUESTIONS</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#19372b] sm:text-4xl">
              Compliance tracker FAQs.
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-500 sm:text-base">
              Learn more about compliance tracking, organising evidence and using ComplianceTracker to keep business requirements in view.
            </p>
            <Link href="/faq" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#287452] transition hover:text-[#174b3b]">
              Visit the FAQ page <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <details key={faq.question} className="group rounded-xl border border-[#e6ede7] bg-white p-5 open:border-[#cfe1d3] open:bg-[#fbfdfb] sm:p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold leading-6 text-[#263d30]">
                  <span>{faq.question}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#edf6ef] text-[#398263] transition group-open:rotate-45">
                    <span className="text-lg leading-none">+</span>
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl pr-8 text-sm leading-7 text-slate-500">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#173d31] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a6d3b6]">A MORE ORGANISED APPROACH</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Bring your compliance work into one clear workspace.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#d0e0d5] sm:text-base">
              Keep requirements, supporting evidence, responsibilities and follow-up activities organised with ComplianceTracker.
            </p>
          </div>
          <Link href="/signup" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-[#174b3b] transition hover:-translate-y-0.5 hover:bg-[#edf6ef]">
            Get started for free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e8eee9] bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Brand />
            <p className="text-[11px] text-slate-400">A clearer way to keep business compliance organised.</p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
            <Link href="/features" className="transition hover:text-[#258568]">Features</Link>
            <Link href="/how-it-works" className="transition hover:text-[#258568]">How it works</Link>
            <Link href="/about" className="transition hover:text-[#258568]">About</Link>
            <Link href="/faq" className="transition hover:text-[#258568]">FAQs</Link>
            <Link href="/signin" className="transition hover:text-[#258568]">Sign in</Link>
          </nav>
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} ComplianceTracker. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
