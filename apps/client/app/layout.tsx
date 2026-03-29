import type { Metadata } from 'next';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kharcha (\u0916\u0930\u094D\u091A\u093E) \u2014 Expense Splitting',
  description: 'Split expenses with friends, roommates, and groups',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
