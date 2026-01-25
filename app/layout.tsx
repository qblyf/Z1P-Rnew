// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { ClientLayout } from './ClientLayout';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
