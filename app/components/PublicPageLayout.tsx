import Link from 'next/link';
import { ArrowRight, Menu, ShieldCheck } from 'lucide-react';
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
    'text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-emerald-800';

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f8fbf9] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-emerald-950/[0.07] bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex min-w-0 shrink-0 items-center gap-2.5"
            aria-label="ComplianceTracker home"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-white shadow-sm shadow-emerald-950/15">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="whitespace-nowrap text-[16px] font-bold tracking-tight text-slate-950 sm:text-[18px]">
              Compliance<span className="text-emerald-700">Tracker</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
            <Link className={link} href="/features">Features</Link>
            <Link className={link} href="/how-it-works">How it works</Link>
            <Link className={link} href="/about">About</Link>
            <Link className={link} href="/faq">FAQs</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link
              href="/signin"
              className="hidden px-2 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-emerald-800 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-emerald-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-800 sm:px-4 sm:text-sm"
            >
              Get started <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
            <details className="relative md:hidden">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-700">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </summary>
              <div className="absolute right-0 top-full mt-2 flex w-48 flex-col rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <Link className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50" href="/features">Features</Link>
                <Link className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50" href="/how-it-works">How it works</Link>
                <Link className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50" href="/about">About</Link>
                <Link className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50" href="/faq">FAQs</Link>
                <Link className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50" href="/signin">Sign in</Link>
              </div>
            </details>
          </div>
        </div>

      </header>

      <section className="relative isolate overflow-hidden border-b border-emerald-950/[0.06] bg-gradient-to-br from-[#edf7f0] via-[#f7fbf8] to-white px-5 py-16 sm:px-8 sm:py-24">
        <div className="pointer-events-none absolute -right-28 -top-36 -z-10 h-[27rem] w-[27rem] rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 left-[12%] -z-10 h-80 w-80 rounded-full bg-lime-100/40 blur-3xl" />

        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-800/10 bg-white/75 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800 shadow-sm shadow-emerald-950/[0.03] sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              {eyebrow}
            </p>
            <h1 className="mt-6 max-w-4xl text-[2.35rem] font-semibold leading-[1.1] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.65rem]">
              {title}
            </h1>
            <p className="mt-6 max-w-3xl text-[15px] leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {description}
            </p>
            <div className="mt-8 h-1 w-16 rounded-full bg-gradient-to-r from-emerald-700 to-emerald-300" />
          </div>
        </div>
      </section>

      <div className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
        {children}
      </div>

      <section className="relative isolate overflow-hidden bg-emerald-950 px-5 py-16 text-white sm:px-8 sm:py-20">
        <div className="pointer-events-none absolute -right-24 -top-36 -z-10 h-96 w-96 rounded-full border border-emerald-400/10" />
        <div className="pointer-events-none absolute -right-10 -top-20 -z-10 h-72 w-72 rounded-full border border-emerald-400/10" />
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-300">
              Take the next step
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
              Bring your compliance work into one place.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-100/80 sm:text-base">
              Organise requirements, evidence and follow-up actions in a shared workspace.
            </p>
          </div>
          <Link
            href="/signup"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 bg-white px-5 py-9 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 font-bold tracking-tight text-slate-950">
              <ShieldCheck className="h-5 w-5 text-emerald-800" />
              <span>Compliance<span className="text-emerald-700">Tracker</span></span>
            </Link>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              A clearer way to organise business compliance work.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500" aria-label="Footer navigation">
            <Link className="transition-colors hover:text-emerald-800" href="/features">Features</Link>
            <Link className="transition-colors hover:text-emerald-800" href="/how-it-works">How it works</Link>
            <Link className="transition-colors hover:text-emerald-800" href="/about">About</Link>
            <Link className="transition-colors hover:text-emerald-800" href="/faq">FAQs</Link>
            <Link className="transition-colors hover:text-emerald-800" href="/signin">Sign in</Link>
          </nav>

          <span className="text-xs text-slate-400">
            © {new Date().getFullYear()} ComplianceTracker
          </span>
        </div>
      </footer>
    </main>
  );
}
