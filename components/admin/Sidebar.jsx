'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './ui/icons';

const NAV = [
  {
    group: 'Principal',
    items: [{ name: 'Dashboard', path: '/admin', icon: 'dashboard' }],
  },
  {
    group: 'Ventes',
    items: [
      { name: 'Commandes', path: '/admin/orders', icon: 'orders' },
      { name: 'Clients', path: '/admin/customers', icon: 'clients' },
      { name: 'Devis', path: '/admin/quotes', icon: 'quotes' },
      { name: 'Factures', path: '/admin/invoices', icon: 'invoices' },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { name: 'Produits', path: '/admin/products', icon: 'products' },
      { name: 'Catégories', path: '/admin/categories', icon: 'categories' },
      { name: 'Marques', path: '/admin/brands', icon: 'brands' },
    ],
  },
  {
    group: 'Marketing',
    items: [
      { name: 'Promotions', path: '/admin/promotions', icon: 'promotions' },
      { name: 'Avis', path: '/admin/reviews', icon: 'reviews' },
    ],
  },
  {
    group: 'Analyse',
    items: [
      { name: 'Analytics', path: '/admin/analytics', icon: 'analytics' },
    ],
  },
  {
    group: 'Système',
    items: [
      { name: 'Utilisateurs', path: '/admin/users', icon: 'users' },
      { name: 'Paramètres', path: '/admin/settings', icon: 'settings' },
    ],
  },
];

export const ADMIN_NAV = NAV;

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();

  const isActive = (path) => {
    if (path === '/admin') return pathname === '/admin' || pathname === '/admin/';
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile overlay */}
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
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[color:var(--admin-border)] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--admin-accent)] text-sm font-bold text-white shadow-sm">
            Q
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold text-[color:var(--admin-text)]">QuickCart</span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-[color:var(--admin-muted)]">Back Office</span>
          </div>
        </div>

        {/* Navigation */}
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

        {/* Footer */}
        <div className="shrink-0 border-t border-[color:var(--admin-border)] p-3">
          <div className="flex items-center gap-2 rounded-lg bg-[color:var(--admin-accent-soft)] px-3 py-2.5">
            <Icon name="box" size={16} className="text-[color:var(--admin-accent)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[color:var(--admin-text)]">Besoin d'aide ?</p>
              <p className="truncate text-[10px] text-[color:var(--admin-muted)]">Documentation & support</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
