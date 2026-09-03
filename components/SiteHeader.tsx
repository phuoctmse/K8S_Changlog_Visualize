'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

// `short` dùng cho màn hình hẹp — nhãn đầy đủ làm header xuống dòng ở ~390px.
const NAV = [
  { href: '/', label: 'Tổng quan', short: 'Tổng quan' },
  { href: '/timeline', label: 'Timeline', short: 'Timeline' },
  { href: '/journeys', label: 'Feature Journey', short: 'Journey' },
];

export default function SiteHeader() {
  const pathname = usePathname() ?? '/';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-3 px-5 sm:px-8">
        <Link
          href="/"
          className="flex flex-none items-center gap-2.5 font-semibold tracking-tight"
          aria-label="K8s Changelog Explorer — trang tổng quan"
        >
          <Logo className="h-7 w-7 flex-none" />
          <span className="hidden lg:inline">K8s Changelog Explorer</span>
          <span className="hidden sm:inline lg:hidden">K8s Changelog</span>
        </Link>

        <nav className="ml-auto flex items-center gap-0.5 sm:gap-1" aria-label="Điều hướng chính">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`whitespace-nowrap rounded-xl px-2.5 py-2 text-[13px] font-medium transition sm:px-3 sm:text-sm ${
                isActive(item.href)
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
              }`}
            >
              <span className="sm:hidden">{item.short}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="ml-1 flex-none">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
