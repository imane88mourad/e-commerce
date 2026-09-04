'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './ui/icons';
import { useLanguage } from '@/context/LanguageContext';

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const NAV = [
    {
      group: t('admin.sidebar.main'),
      items: [{ name: t('admin.sidebar.dashboard'), path: '/admin', icon: 'dashboard' }],
    },
    {
      group: t('admin.sidebar.sales'),
      items: [
        { name: t('admin.sidebar.orders'), path: '/admin/orders', icon: 'orders' },
        { name: t('admin.sidebar.customers'), path: '/admin/customers', icon: 'clients' },
        { name: t('admin.sidebar.quotes'), path: '/admin/quotes', icon: 'quotes' },
        { name: t('admin.sidebar.invoices'), path: '/admin/invoices', icon: 'invoices' },
      ],
    },
    {
      group: t('admin.sidebar.catalogue'),
      items: [
        { name: t('admin.sidebar.products'), path: '/admin/products', icon: 'products' },
        { name: t('admin.sidebar.categories'), path: '/admin/categories', icon: 'categories' },
        { name: t('admin.sidebar.brands'), path: '/admin/brands', icon: 'brands' },
      ],
    },
    {
      group: t('admin.sidebar.marketing'),
      items: [
        { name: t('admin.sidebar.promotions'), path: '/admin/promotions', icon: 'promotions' },
        { name: t('admin.sidebar.reviews'), path: '/admin/reviews', icon: 'reviews' },
      ],
    },
    {
      group: t('admin.sidebar.analytics'),
      items: [
        { name: t('admin.sidebar.analytics'), path: '/admin/analytics', icon: 'analytics' },
      ],
    },
    {
      group: t('admin.sidebar.system'),
      items: [
        { name: t('admin.sidebar.users'), path: '/admin/users', icon: 'users' },
        { name: t('admin.sidebar.settings'), path: '/admin/settings', icon: 'settings' },
      ],
    },
  ];

  const isActive = (path) => {
    if (path === '/admin') return pathname === '/admin' || pathname === '/admin/';
    return pathname.startsWith(path);
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-[color:var(--admin-surface)] border-[color:var(--admin-border)] transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[color:var(--admin-border)] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--admin-accent)] text-sm font-bold text-white shadow-sm">
            Q
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold text-[color:var(--admin-text)]">QuickCart</span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.sidebar.backOffice')}</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((section) => (
            <div key={section.group} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--admin-muted)]">
                {section.group}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        onClick={onClose}
                        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                          active
                            ? 'bg-[color:var(--admin-accent-soft)] text-[color:var(--admin-accent)]'
                            : 'text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-accent-soft)]/60 hover:text-[color:var(--admin-text)]'
                        }`}
                      >
                        <Icon
                          name={item.icon}
                          size={19}
                          className={active ? 'text-[color:var(--admin-accent)]' : ''}
                        />
                        <span>{item.name}</span>
                        {active && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[color:var(--admin-accent)]" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-[color:var(--admin-border)] p-3">
          <div className="flex items-center gap-2 rounded-lg bg-[color:var(--admin-accent-soft)] px-3 py-2.5">
            <Icon name="box" size={16} className="text-[color:var(--admin-accent)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[color:var(--admin-text)]">{t('admin.sidebar.helpTitle')}</p>
              <p className="truncate text-[10px] text-[color:var(--admin-muted)]">{t('admin.sidebar.helpSubtitle')}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
