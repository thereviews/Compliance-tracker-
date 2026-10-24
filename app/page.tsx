'use client';

import Link from 'next/link';
import {
ShieldCheck,
BriefcaseBusiness,
ArrowRight,
FileCheck2,
Users,
CalendarClock,
LockKeyhole,
} from 'lucide-react';

export default function HomePage() {
return (
<main className="min-h-screen bg-slate-950 text-white">
<header className="border-b border-white/10">
<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
<Link href="/" className="flex items-center gap-3">
<div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-400">
<ShieldCheck className="h-7 w-7" />
</div>
<span className="text-xl font-bold tracking-tight">
ComplianceTracker
</span>
</Link>

      <Link
        href="/login"
        className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
      >
        Business Sign In
      </Link>
    </div>
  </header>

  <section className="mx-auto max-w-7xl px-6 pb-16 pt-20 sm:pb-24 sm:pt-28">
    <div className="mx-auto max-w-3xl text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
        <ShieldCheck className="h-4 w-4" />
        Governance, risk, and compliance in one place.
      </div>

      <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
        Keep your business
        <span className="block text-emerald-400">
          under control.
        </span>
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
        Manage vendor risks, compliance evidence, and contract deadlines
        in one secure workspace.
      </p>
    </div>

    <div className="mx-auto mt-14 grid max-w-3xl gap-6">
      <article className="group flex flex-col rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-emerald-400/[0.09] to-slate-900 p-7 shadow-2xl shadow-black/20 transition hover:border-emerald-400/40 sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
          <BriefcaseBusiness className="h-7 w-7" />
        </div>

        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          For businesses
        </p>

        <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
          Business Compliance
        </h2>

        <p className="mt-4 leading-7 text-slate-400">
          Keep vendor relationships, compliance evidence, security
          assessments, and contract deadlines organized in one workspace.
        </p>

        <ul className="mt-7 space-y-4 text-sm text-slate-300">
          <li className="flex items-center gap-3">
            <Users className="h-5 w-5 shrink-0 text-emerald-400" />
            Vendor and risk management
          </li>
          <li className="flex items-center gap-3">
            <FileCheck2 className="h-5 w-5 shrink-0 text-emerald-400" />
            Compliance reports and evidence
          </li>
          <li className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 shrink-0 text-emerald-400" />
            Contract renewals and reminders
          </li>
        </ul>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Sign In
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/signup"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Create Account
          </Link>
        </div>
      </article>


    </div>

    <div className="mx-auto mt-12 flex max-w-3xl items-center justify-center gap-3 text-center text-sm text-slate-500">
      <LockKeyhole className="h-4 w-4 shrink-0" />
      Keep your compliance obligations and deadlines organized.
    </div>
  </section>

  <footer className="border-t border-white/10">
    <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 text-center text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
      <span>© {new Date().getFullYear()} ComplianceTracker</span>
      <span>Stay organized. Stay prepared.</span>
    </div>
  </footer>
</main>

);
}
