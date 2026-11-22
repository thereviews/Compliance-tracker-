import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

export default function PublicPageLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const link =
    'text-sm font-medium text-slate-600 transition-colors hover:text-emerald-800';

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="relative z-10 border-b border-slate-100 bg-white">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-2.5"
            aria-label="ComplianceTracker home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-[17px] font-bold tracking-tight text-slate-950">
              Compliance<span className="text-emerald-700">Tracker</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
            <Link className={link} href="/features">Features</Link>
            <Link className={link} href="/how-it-works">How it works</Link>
            <Link className={link} href="/about">About</Link>
            <Link className={link} href="/faq">FAQs</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="hidden px-2 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-emerald-800 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <nav
          className="flex items-center justify-center gap-6 border-t border-slate-100 px-5 py-3 md:hidden"
          aria-label="Mobile navigation"
        >
          <Link className={link} href="/features">Features</Link>
          <Link className={link} href="/how-it-works">How it works</Link>
          <Link className={link} href="/about">About</Link>
          <Link className={link} href="/faq">FAQs</Link>
        </nav>
      </header>

      <section className="border-b border-slate-100 bg-gradient-to-b from-emerald-50/70 to-white px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
            {eyebrow}
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.5rem]">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            {description}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        {children}
      </div>

      <section className="bg-emerald-950 px-5 py-16 text-white sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-7 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
              Take the next step
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Bring your compliance work into one place.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-emerald-100/80">
              Organise requirements, evidence and follow-up actions in a shared workspace.
            </p>
          </div>
          <Link
            href="/signup"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-50"
          >
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="font-bold tracking-tight text-slate-900">
            Compliance<span className="text-emerald-700">Tracker</span>
          </Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Footer navigation">
            <Link className="transition-colors hover:text-emerald-800" href="/features">Features</Link>
            <Link className="transition-colors hover:text-emerald-800" href="/how-it-works">How it works</Link>
            <Link className="transition-colors hover:text-emerald-800" href="/about">About</Link>
            <Link className="transition-colors hover:text-emerald-800" href="/faq">FAQs</Link>
            <Link className="transition-colors hover:text-emerald-800" href="/signin">Sign in</Link>
          </nav>
          <span>© {new Date().getFullYear()} ComplianceTracker</span>
        </div>
      </footer>
    </main>
  );
}
