'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PageHeader, Toolbar, Button, Badge, Card, TableSkeleton, EmptyState, ErrorState, Select, Pagination,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminQuotesApi, formatPrice } from '@/lib/api/admin-billing';
import { useLanguage } from '@/context/LanguageContext';

const PAGE_SIZE = 15;
const statusTone = { draft: 'amber', sent: 'blue', accepted: 'green', declined: 'red', expired: 'gray', converted: 'purple' };
const fmtDate = (iso) => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); };

export default function QuotesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [quotes, setQuotes] = useState([]);
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
    adminQuotesApi.list(params).then((data) => { if (active) { setQuotes(data.results || []); setCount(data.count || 0); } })
      .catch((err) => { if (active) setError(err.message || t('admin.quotes.errorLoading')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, status]);

  useEffect(() => { const cleanup = load(); return cleanup; }, [load]);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const filteredQuotes = search ? quotes.filter((q) => q.client_name?.toLowerCase().includes(search.toLowerCase()) || q.client_email?.toLowerCase().includes(search.toLowerCase())) : quotes;

  const quoteStatusLabels = { draft: t('admin.quotes.draft'), sent: t('admin.quotes.sent'), accepted: t('admin.quotes.accepted'), declined: t('admin.quotes.declined'), expired: t('admin.quotes.expired'), converted: t('admin.quotes.converted') };

  return (
    <div>
      <PageHeader title={t('admin.quotes.title')} subtitle={t('admin.quotes.subtitle', { count })}
        breadcrumb={<><Link href="/admin" className="hover:text-[color:var(--admin-accent)]">{t('admin.sidebar.dashboard')}</Link><span>/</span><span>{t('admin.quotes.title')}</span></>}
      />
      <Card>
        <div className="px-5 pt-5">
          <Toolbar value={search} onSearch={setSearch} searchPlaceholder={t('admin.quotes.searchPlaceholder')}>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="md:w-44">
              <option value="">{t('admin.quotes.allStatuses')}</option>
              <option value="draft">{t('admin.quotes.draft')}</option>
              <option value="sent">{t('admin.quotes.sent')}</option>
              <option value="accepted">{t('admin.quotes.accepted')}</option>
              <option value="declined">{t('admin.quotes.declined')}</option>
              <option value="expired">{t('admin.quotes.expired')}</option>
              <option value="converted">{t('admin.quotes.converted')}</option>
            </Select>
            {(status || search) && <Button variant="ghost" size="sm" onClick={() => { setStatus(''); setSearch(''); setPage(1); }}>{t('admin.orders.reset')}</Button>}
          </Toolbar>
        </div>
        {loading ? <TableSkeleton rows={8} cols={6} /> : error ? <ErrorState message={error} onRetry={load} /> : filteredQuotes.length === 0 ? (
          <EmptyState icon={<Icon name="quotes" size={28} />} title={t('admin.quotes.noQuotes')} description={t('admin.quotes.noQuotesDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]"><tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.quotes.quote')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.quotes.client')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.quotes.date')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.quotes.amount')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.quotes.status')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.quotes.actions')}</th>
              </tr></thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {filteredQuotes.map((q) => (
                  <tr key={q.id} className="cursor-pointer transition hover:bg-[color:var(--admin-accent-soft)]/40" onClick={() => router.push(`/admin/quotes/${q.id}`)}>
                    <td className="px-4 py-3"><span className="font-semibold text-[color:var(--admin-accent)]">#{q.id}</span></td>
                    <td className="px-4 py-3"><div className="font-medium text-[color:var(--admin-text)]">{q.client_name || '—'}</div><div className="text-xs text-[color:var(--admin-muted)]">{q.client_email || ''}</div></td>
                    <td className="px-4 py-3 text-[color:var(--admin-muted)]">{fmtDate(q.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[color:var(--admin-text)]">{formatPrice(q.total)}</td>
                    <td className="px-4 py-3"><Badge tone={statusTone[q.status] || 'gray'} dot>{quoteStatusLabels[q.status] || q.status}</Badge></td>
                    <td className="px-4 py-3"><div className="flex items-center justify-end"><button title={t('admin.quotes.view')} onClick={(e) => { e.stopPropagation(); router.push(`/admin/quotes/${q.id}`); }} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]"><Icon name="eye" size={16} /></button></div></td>
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
