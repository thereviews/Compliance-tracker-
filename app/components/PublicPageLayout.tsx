import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

export default function PublicPageLayout({ eyebrow, title, description, children }: {
  eyebrow: string; title: string; description: string; children: ReactNode;
}) {
  const link = 'text-sm font-medium text-slate-600 hover:text-blue-700';
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="ComplianceTracker home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white"><ShieldCheck className="h-5 w-5" /></span>
            <span className="text-[17px] font-bold tracking-tight">Compliance<span className="text-blue-600">Tracker</span></span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
            <Link className={link} href="/features">Features</Link>
            <Link className={link} href="/how-it-works">How it works</Link>
            <Link className={link} href="/about">About</Link>
            <Link className={link} href="/faq">FAQs</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/signin" className="hidden px-2 py-2 text-sm font-semibold text-slate-700 sm:inline-flex">Sign in</Link>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Get started <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>
      <section className="border-b border-slate-100 bg-slate-50/70 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{description}</p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-16">{children}</div>
      <section className="bg-slate-950 px-5 py-14 text-white sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Bring your compliance work into one place.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Organise requirements, evidence and follow-up actions in a shared workspace.</p>
          </div>
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950">Get started <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
      <footer className="border-t border-slate-100 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="font-semibold text-slate-800">ComplianceTracker</Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Footer navigation">
            <Link href="/features">Features</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/about">About</Link>
            <Link href="/faq">FAQs</Link>
            <Link href="/signin">Sign in</Link>
          </nav>
          <span>© {new Date().getFullYear()} ComplianceTracker</span>
        </div>
      </footer>
    </main>
  );
}
