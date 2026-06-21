import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SAJ Technologies - Payment Follow-up Management',
  description: 'SaaS Payment Collection & Follow-up Management System for Digital Surveying Services',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </body>
    </html>
  );
}
