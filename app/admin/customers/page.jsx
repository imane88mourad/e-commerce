'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PageHeader, Toolbar, Button, Badge, Card, TableSkeleton, EmptyState, ErrorState, Select, Pagination,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminCustomersApi } from '@/lib/api/admin-customers';
import { formatPrice } from '@/lib/api/admin-billing';
import { useLanguage } from '@/context/LanguageContext';

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function CustomersPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [allOrders, setAllOrders] = useState([]);
  const PAGE_SIZE = 15;

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    adminCustomersApi.list()
      .then((data) => {
        if (active) {
          setAllOrders(data._allOrders || []);
          setCustomers(data.customers || []);
        }
      })
      .catch((err) => { if (active) setError(err.message || t('admin.customers.errorLoading')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => { const cleanup = load(); return cleanup; }, [load]);

  const filtered = customers.filter((c) => {
    if (typeFilter && c.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title={t('admin.customers.title')}
        subtitle={t('admin.customers.subtitle', { count: customers.length })}
        breadcrumb={
          <>
            <Link href="/admin" className="hover:text-[color:var(--admin-accent)]">{t('admin.sidebar.dashboard')}</Link>
            <span>/</span>
            <span>{t('admin.customers.title')}</span>
          </>
        }
      />

      <Card>
        <div className="px-5 pt-5">
          <Toolbar value={search} onSearch={(v) => { setSearch(v); setPage(1); }} searchPlaceholder={t('admin.customers.searchPlaceholder')}>
            <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="md:w-44">
              <option value="">{t('admin.customers.allTypes')}</option>
              <option value="registered">{t('admin.customers.registered')}</option>
              <option value="guest">{t('admin.customers.guest')}</option>
            </Select>
            {(typeFilter || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter(''); setPage(1); }}>{t('admin.customers.reset')}</Button>
            )}
          </Toolbar>
        </div>

        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : paged.length === 0 ? (
          <EmptyState
            icon={<Icon name="clients" size={28} />}
            title={t('admin.customers.noCustomers')}
            description={t('admin.customers.noCustomersDesc')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.customers.customer')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.customers.email')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.customers.phone')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.customers.orders')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.customers.total')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.customers.type')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.customers.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {paged.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer transition hover:bg-[color:var(--admin-accent-soft)]/40"
                    onClick={() => router.push(`/admin/customers/${encodeURIComponent(c.id)}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--admin-accent-soft)] text-xs font-semibold text-[color:var(--admin-accent)]">
                          {c.name?.[0]?.toUpperCase() || '?'}
                        </span>
                        <span className="font-medium text-[color:var(--admin-text)]">{c.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--admin-muted)]">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-[color:var(--admin-muted)]">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-center font-medium text-[color:var(--admin-text)]">{c.orderCount}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[color:var(--admin-text)]">{formatPrice(c.totalSpent)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={c.type === 'registered' ? 'blue' : 'gray'}>{c.type === 'registered' ? t('admin.customers.registered') : t('admin.customers.guest')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button title={t('admin.customers.view')} onClick={(e) => { e.stopPropagation(); router.push(`/admin/customers/${encodeURIComponent(c.id)}`); }} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]">
                          <Icon name="eye" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} count={filtered.length} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
