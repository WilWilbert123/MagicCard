import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Enterprise ID Card Management & Self-Service KIOSK',
  description: 'Enterprise Employee ID Card Designer, Fleet KIOSK Management, and MagicCard Trust ID Hardware Printing Platform',
};

import { ToastContainer } from '@/components/ui/Toast';
import { ThemeProvider } from '@/components/ThemeProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased selection:bg-red-600 selection:text-white">
        <ThemeProvider>
          <ToastContainer />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
