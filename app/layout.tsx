import type { Metadata } from 'next';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { getDataset } from '@/lib/data';
import SampleDataBanner from '@/components/SampleDataBanner';

export const metadata: Metadata = {
  title: {
    default: 'K8s Changelog Explorer — lịch sử Kubernetes, dễ nhìn hơn',
    template: '%s · K8s Changelog Explorer',
  },
  description:
    'Toàn bộ thay đổi của Kubernetes qua từng version, sắp xếp theo bản đồ khái niệm, dòng thời gian và hành trình của từng tính năng.',
};

// Chạy trước khi paint để tránh nháy trắng khi người dùng đang ở dark mode.
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { isSample } = getDataset();

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--surface)] focus:px-4 focus:py-2 focus:shadow-lg"
        >
          Bỏ qua điều hướng
        </a>
        <SiteHeader />
        {isSample && <SampleDataBanner />}
        <main id="main" className="mx-auto w-full max-w-[1180px] px-5 pb-24 pt-8 sm:px-8">
          {children}
        </main>
        <SiteFooter isSample={isSample} />
      </body>
    </html>
  );
}
