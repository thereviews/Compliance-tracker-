import type { Metadata } from 'next';

import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  metadataBase: new URL('https://compliancetracker-app.com'),
  title: 'Compliance Tracker Software for Businesses | ComplianceTracker',
  description: 'Track business compliance requirements, organise evidence, assign responsibility, manage corrective actions and monitor deadlines with ComplianceTracker.',
  applicationName: 'ComplianceTracker',
  keywords: ['compliance tracker', 'compliance tracking software', 'business compliance tracker', 'compliance register', 'compliance evidence management', 'compliance action tracking'],
  openGraph: {
    type: 'website',
    siteName: 'ComplianceTracker',
    locale: 'en_GB',
  },
  twitter: { card: 'summary' },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

