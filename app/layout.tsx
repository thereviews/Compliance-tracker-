import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'ComplianceTracker',
  description: 'Vendor & Contract Compliance Tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

