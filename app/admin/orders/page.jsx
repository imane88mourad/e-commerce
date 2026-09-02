'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  PageHeader, Toolbar, Button, Badge, Card, TableSkeleton, EmptyState, ErrorState, Select,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import {
  adminOrdersApi, formatPrice, ORDER_STATUSES, PAYMENT_STATUSES,
} from '@/lib/api/admin-orders';

const PAGE_SIZE = 15;

const orderTone = {
  pending: 'amber', confirmed: 'blue', processing: 'indigo', shipped: 'purple',
  delivered: 'green', cancelled: 'red', returned: 'orange',
};
const paymentTone = { pending: 'gray', paid: 'green', failed: 'red', cancelled: 'gray', refunded: 'blue' };

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

function OrdersContent() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  const [updatingId, setUpdatingId] = useState(null);

  const buildQuery = useCallback(() => {
    const q = { page, page_size: PAGE_SIZE };
    if (search) q.search = search;
    if (status) q.status = status;
    if (paymentStatus) q.payment_status = paymentStatus;
    return q;
  }, [page, search, status, paymentStatus]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    adminOrdersApi.list(buildQuery())
      .then((data) => { if (active) { setOrders(data.results || []); setCount(data.count || 0); } })
      .catch((err) => { if (active) setError(err.message || 'Erreur chargement commandes'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [buildQuery]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const clearFilters = () => { setStatus(''); setPaymentStatus(''); setSearch(''); setPage(1); };

  const changeStatus = async (order, newStatus) => {
    if (newStatus === order.status) return;
    setUpdatingId(order.id);
    try {
      const updated = await adminOrdersApi.updateStatus(order.id, newStatus);
      toast.success(`Commande #${order.id} → ${updated.status}`);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    } catch (err) {
      toast.error(err.message || 'Erreur mise à jour statut');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Commandes"
        subtitle={`${count} commande${count > 1 ? 's' : ''}`}
        breadcrumb={
          <>
            <Link href="/admin" className="hover:text-[color:var(--admin-accent)]">Dashboard</Link>
            <span>/</span>
            <span>Commandes</span>
          </>
        }
      />

      <Card>
        <div className="px-5 pt-5">
          <Toolbar
            value={search}
            onSearch={setSearch}
            searchPlaceholder="Rechercher (n°, email, nom)…"
          >
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="md:w-44">
              <option value="">Tous statuts</option>
              {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
            <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="md:w-48">
              <option value="">Tous paiements</option>
              {PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
            {(status || paymentStatus || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>Réinitialiser</Button>
            )}
          </Toolbar>
        </div>

        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setPage((p) => p)} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Icon name="orders" size={28} />}
            title="Aucune commande"
            description="Aucune commande ne correspond à vos critères."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">N°</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Paiement</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer transition hover:bg-[color:var(--admin-accent-soft)]/40"
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[color:var(--admin-accent)]">#{o.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[color:var(--admin-text)]">{o.customer_name || '—'}</div>
                      <div className="text-xs text-[color:var(--admin-muted)]">{o.customer_email || ''}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[color:var(--admin-text)]">{fmtDate(o.date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[color:var(--admin-text)]">{formatPrice(o.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-[color:var(--admin-muted)]">{o.payment?.method_label || o.payment_method_label}</span>
                        <Badge tone={paymentTone[o.payment?.status] || 'gray'} dot>
                          {PAYMENT_STATUSES.find((s) => s.value === o.payment?.status)?.label || o.payment?.status || '—'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Select
                          value={o.status}
                          disabled={updatingId === o.id}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => changeStatus(o, e.target.value)}
                          className="w-36 !py-1 text-xs"
                        >
                          {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </Select>
                        <Badge tone={orderTone[o.status] || 'gray'} dot>{o.status_label || o.status}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Voir la commande"
                          onClick={(e) => { e.stopPropagation(); router.push(`/admin/orders/${o.id}`); }}
                          className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]"
                        >
                          <Icon name="eye" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[color:var(--admin-border)] px-5 py-3 text-sm">
                <span className="text-[color:var(--admin-muted)]">
                  Page {page} sur {totalPages} — {count} résultat{count > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <Icon name="arrowLeft" size={14} /> Précédent
                  </Button>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Suivant <Icon name="arrowRight" size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function OrdersPage() {
  return <OrdersContent />;
}
