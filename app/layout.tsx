import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Number Battle',
  description: 'A strategic two-player number game',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
