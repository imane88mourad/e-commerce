'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PageHeader, Toolbar, Button, Badge, Card, TableSkeleton, EmptyState, ErrorState, Select, Pagination,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminInvoicesApi, formatPrice } from '@/lib/api/admin-billing';

const PAGE_SIZE = 15;

const INVOICE_STATUSES = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'issued', label: 'Émise' },
  { value: 'void', label: 'Annulée' },
];

const statusTone = { draft: 'amber', issued: 'green', void: 'red' };

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = { page, page_size: PAGE_SIZE };
    if (status) params.status = status;
    adminInvoicesApi.list(params)
      .then((data) => {
        if (active) {
          setInvoices(data.results || []);
          setCount(data.count || 0);
        }
      })
      .catch((err) => { if (active) setError(err.message || 'Erreur chargement factures'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, status]);

  useEffect(() => { const cleanup = load(); return cleanup; }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const filteredInvoices = search
    ? invoices.filter((inv) =>
        inv.number?.toLowerCase().includes(search.toLowerCase()) ||
        inv.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.client_email?.toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  return (
    <div>
      <PageHeader
        title="Factures"
        subtitle={`${count} facture${count > 1 ? 's' : ''}`}
        breadcrumb={
          <>
            <Link href="/admin" className="hover:text-[color:var(--admin-accent)]">Dashboard</Link>
            <span>/</span>
            <span>Factures</span>
          </>
        }
      />

      <Card>
        <div className="px-5 pt-5">
          <Toolbar value={search} onSearch={setSearch} searchPlaceholder="Rechercher (numéro, client)…">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="md:w-40">
              <option value="">Tous statuts</option>
              {INVOICE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
            {(status || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setStatus(''); setSearch(''); setPage(1); }}>Réinitialiser</Button>
            )}
          </Toolbar>
        </div>

        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            icon={<Icon name="invoices" size={28} />}
            title="Aucune facture"
            description="Les factures seront créées à partir des commandes ou manuellement."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Numéro</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Commande</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="cursor-pointer transition hover:bg-[color:var(--admin-accent-soft)]/40"
                    onClick={() => router.push(`/admin/invoices/${inv.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[color:var(--admin-accent)]">{inv.number || `#${inv.id}`}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[color:var(--admin-text)]">{inv.client_name || '—'}</div>
                      <div className="text-xs text-[color:var(--admin-muted)]">{inv.client_email || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--admin-text)]">
                      {inv.order_id ? <Link href={`/admin/orders/${inv.order_id}`} className="hover:text-[color:var(--admin-accent)]" onClick={(e) => e.stopPropagation()}>#{inv.order_id}</Link> : '—'}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--admin-muted)]">{fmtDate(inv.issue_date || inv.created_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[color:var(--admin-text)]">{formatPrice(inv.total)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[inv.status] || 'gray'} dot>{INVOICE_STATUSES.find((s) => s.value === inv.status)?.label || inv.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button title="Voir" onClick={(e) => { e.stopPropagation(); router.push(`/admin/invoices/${inv.id}`); }} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]">
                          <Icon name="eye" size={16} />
                        </button>
                      </div>
                    </td>
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
