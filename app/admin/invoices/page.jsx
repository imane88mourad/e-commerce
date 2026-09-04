'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PageHeader, Toolbar, Button, Badge, Card, TableSkeleton, EmptyState, ErrorState, Select, Pagination,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminInvoicesApi, formatPrice } from '@/lib/api/admin-billing';
import { useLanguage } from '@/context/LanguageContext';

const PAGE_SIZE = 15;
const statusTone = { draft: 'amber', issued: 'green', void: 'red' };
const fmtDate = (iso) => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); };

export default function InvoicesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    let active = true;
    setLoading(true); setError('');
    const params = { page, page_size: PAGE_SIZE };
    if (status) params.status = status;
    adminInvoicesApi.list(params).then((data) => { if (active) { setInvoices(data.results || []); setCount(data.count || 0); } })
      .catch((err) => { if (active) setError(err.message || t('admin.invoices.errorLoading')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, status]);

  useEffect(() => { const cleanup = load(); return cleanup; }, [load]);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const filteredInvoices = search ? invoices.filter((inv) => inv.number?.toLowerCase().includes(search.toLowerCase()) || inv.client_name?.toLowerCase().includes(search.toLowerCase()) || inv.client_email?.toLowerCase().includes(search.toLowerCase())) : invoices;

  const invoiceStatusLabels = { draft: t('admin.invoices.draft'), issued: t('admin.invoices.issued'), void: t('admin.invoices.void') };

  return (
    <div>
      <PageHeader title={t('admin.invoices.title')} subtitle={t('admin.invoices.subtitle', { count })}
        breadcrumb={<><Link href="/admin" className="hover:text-[color:var(--admin-accent)]">{t('admin.sidebar.dashboard')}</Link><span>/</span><span>{t('admin.invoices.title')}</span></>}
      />
      <Card>
        <div className="px-5 pt-5">
          <Toolbar value={search} onSearch={setSearch} searchPlaceholder={t('admin.invoices.searchPlaceholder')}>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="md:w-40">
              <option value="">{t('admin.invoices.allStatuses')}</option>
              <option value="draft">{t('admin.invoices.draft')}</option>
              <option value="issued">{t('admin.invoices.issued')}</option>
              <option value="void">{t('admin.invoices.void')}</option>
            </Select>
            {(status || search) && <Button variant="ghost" size="sm" onClick={() => { setStatus(''); setSearch(''); setPage(1); }}>{t('admin.orders.reset')}</Button>}
          </Toolbar>
        </div>
        {loading ? <TableSkeleton rows={8} cols={6} /> : error ? <ErrorState message={error} onRetry={load} /> : filteredInvoices.length === 0 ? (
          <EmptyState icon={<Icon name="invoices" size={28} />} title={t('admin.invoices.noInvoices')} description={t('admin.invoices.noInvoicesDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]"><tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.invoices.number')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.invoices.client')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.invoices.order')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.invoices.date')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.invoices.amount')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.invoices.status')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.invoices.actions')}</th>
              </tr></thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="cursor-pointer transition hover:bg-[color:var(--admin-accent-soft)]/40" onClick={() => router.push(`/admin/invoices/${inv.id}`)}>
                    <td className="px-4 py-3"><span className="font-semibold text-[color:var(--admin-accent)]">{inv.number || `#${inv.id}`}</span></td>
                    <td className="px-4 py-3"><div className="font-medium text-[color:var(--admin-text)]">{inv.client_name || '—'}</div><div className="text-xs text-[color:var(--admin-muted)]">{inv.client_email || ''}</div></td>
                    <td className="px-4 py-3">{inv.order_id ? <Link href={`/admin/orders/${inv.order_id}`} className="text-[color:var(--admin-accent)] hover:underline" onClick={(e) => e.stopPropagation()}>#{inv.order_id}</Link> : '—'}</td>
                    <td className="px-4 py-3 text-[color:var(--admin-muted)]">{fmtDate(inv.issue_date || inv.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[color:var(--admin-text)]">{formatPrice(inv.total)}</td>
                    <td className="px-4 py-3"><Badge tone={statusTone[inv.status] || 'gray'} dot>{invoiceStatusLabels[inv.status] || inv.status}</Badge></td>
                    <td className="px-4 py-3"><div className="flex items-center justify-end"><button title={t('admin.reviews.view')} onClick={(e) => { e.stopPropagation(); router.push(`/admin/invoices/${inv.id}`); }} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]"><Icon name="eye" size={16} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
