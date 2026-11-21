import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
      <div className="w-full max-w-[440px]">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            ComplianceTracker
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_55px_-25px_rgba(15,23,42,0.18)] sm:p-9">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Secure access to your compliance workspace
        </p>
      </div>
    </main>
  );
}
