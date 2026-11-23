import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ClipboardList,
  FolderOpen,
  Users,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import PublicPageLayout from '../components/PublicPageLayout';

export const metadata: Metadata = {
  title: 'About ComplianceTracker | Business Compliance Software',
  description:
    'Discover ComplianceTracker, a practical workspace that helps businesses organise compliance requirements, supporting evidence, corrective actions and review dates.',
  alternates: { canonical: '/about' },
  keywords: [
    'about ComplianceTracker',
    'business compliance software',
    'compliance tracking tool',
  ],
  openGraph: {
    title: 'About ComplianceTracker | Business Compliance Software',
    description:
      'Learn about the purpose and practical approach behind ComplianceTracker.',
    url: '/about',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'About ComplianceTracker | Business Compliance Software',
    description: 'Learn about a practical workspace for organising business compliance work.',
  },
};

const principles = [
  {
    icon: ClipboardList,
    title: 'Know what needs attention',
    description:
      'Keep business requirements in a structured register with their status, ownership and review dates.',
  },
  {
    icon: FolderOpen,
    title: 'Keep records connected',
    description:
      'Organise supporting documents alongside the compliance records they relate to.',
  },
  {
    icon: Users,
    title: 'Make responsibilities clearer',
    description:
      'Give team members a shared workspace to coordinate requirements and follow-up actions.',
  },
];

export default function AboutPage() {
  return (
    <PublicPageLayout
      eyebrow="About ComplianceTracker"
      title="Making compliance work easier to organise."
      description="A practical software workspace for businesses that want a clearer way to manage requirements, supporting records and follow-up work."
    >
      <section className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            Why ComplianceTracker exists
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-3xl">
            Compliance information should be easier to find, understand and act on.
          </h2>
          <div className="mt-5 space-y-4 text-[15px] leading-8 text-slate-600">
            <p>
              Compliance work can become difficult to coordinate when requirements live in spreadsheets, evidence is stored in separate folders and follow-up actions are tracked in different places.
            </p>
            <p>
              It can be hard to see who is responsible, what has been completed and what needs attention next. ComplianceTracker is designed to bring these connected activities into one organised workspace.
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/70 p-6 shadow-[0_16px_45px_rgba(16,80,52,0.07)] sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950 text-white shadow-lg shadow-emerald-950/15">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            The purpose
          </p>
          <p className="mt-3 text-xl font-semibold leading-8 tracking-tight text-slate-950">
            One shared place to organise requirements, evidence and the work that follows.
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            A structured approach to tracking business compliance activities, without losing sight of the people and records involved.
          </p>
        </div>
      </section>

      <section className="mt-16 border-t border-slate-100 pt-12">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-emerald-800">
            A practical approach
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Built around the everyday work of compliance tracking.
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-slate-600">
            ComplianceTracker brings the essential parts of the process together so teams can organise their records and follow progress more clearly.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {principles.map((principle, index) => {
            const Icon = principle.icon;

            return (
              <article
                key={principle.title}
                className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_5px_22px_rgba(15,45,32,0.035)] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_14px_32px_rgba(15,75,45,0.08)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 transition-colors group-hover:bg-emerald-900 group-hover:text-white">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <p className="mt-5 text-xs font-semibold tracking-wider text-emerald-800">
                  0{index + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                  {principle.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {principle.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-16 grid gap-8 border-t border-slate-200/80 pt-12 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            Who it is for
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Businesses and teams managing ongoing requirements.
          </h2>
          <p className="mt-4 text-[15px] leading-8 text-slate-600">
            ComplianceTracker is intended for businesses and teams that want a more structured way to manage compliance tracking, organise supporting records and coordinate responsibilities.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm sm:p-7">
          <h3 className="text-base font-semibold text-slate-950">
            Clear responsibilities matter
          </h3>
          <ul className="mt-5 space-y-4">
            {[
              'Businesses identify the requirements that apply to their activities.',
              'Teams maintain their records and supporting evidence.',
              'Responsible people review progress and address outstanding work.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                <span className="text-sm leading-7 text-slate-600">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-14 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-6 shadow-[0_8px_28px_rgba(120,80,20,0.045)] sm:p-8">
        <h2 className="text-base font-semibold text-slate-950">
          An important distinction
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          ComplianceTracker is an organisation and tracking tool. It does not provide legal advice, determine which requirements apply to a business, certify compliance or guarantee that a business meets every applicable requirement. It does not replace qualified legal, regulatory or compliance advice, independent audits or certification.
        </p>
      </section>

      <section className="relative mt-14 flex flex-col gap-6 overflow-hidden rounded-3xl border border-emerald-900 bg-gradient-to-br from-emerald-950 via-slate-950 to-[#102b22] p-7 text-white shadow-[0_18px_45px_rgba(10,45,30,0.16)] sm:flex-row sm:items-center sm:justify-between sm:p-9">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Bring your compliance work into one place.
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Explore a more organised way to manage requirements, evidence and follow-up.
          </p>
        </div>
        <Link
          href="/signup"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-950 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-50"
        >
          Get started <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </PublicPageLayout>
  );
}
