'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PageHeader, Button, Badge, Card, CardHeader, Skeleton, ErrorState, Pagination,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminCustomersApi } from '@/lib/api/admin-customers';
import { formatPrice } from '@/lib/api/admin-billing';

const orderTone = {
  pending: 'amber', confirmed: 'blue', processing: 'indigo', shipped: 'purple',
  delivered: 'green', cancelled: 'red', returned: 'orange',
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

function InfoRow({ label, children }) {
  return (
    <div className="flex justify-between gap-3 py-2">
      <span className="shrink-0 text-sm text-[color:var(--admin-muted)]">{label}</span>
      <span className="text-right text-sm font-medium text-[color:var(--admin-text)]">{children}</span>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(params?.id || '');

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminCustomersApi.list();
      const found = data.customers.find((c) => String(c.id) === String(id));
      if (!found) {
        setError('Client non trouvé');
        return;
      }
      setCustomer(found);
      // Get orders for this customer
      const customerOrders = await adminCustomersApi.getOrders(id, data._allOrders);
      setOrders(customerOrders);
    } catch (err) {
      setError(err.message || 'Erreur chargement client');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  if (loading) {
    return (
      <>
        <PageHeader title="Client" breadcrumb={<Link href="/admin/customers" className="hover:text-[color:var(--admin-accent)]">← Clients</Link>} />
        <Card className="p-5"><Skeleton className="h-48" /></Card>
      </>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!customer) return null;

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const pagedOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title={customer.name || 'Client'}
        subtitle={customer.email !== '—' ? customer.email : customer.type === 'guest' ? 'Client invité' : ''}
        breadcrumb={
          <>
            <Link href="/admin" className="hover:text-[color:var(--admin-accent)]">Dashboard</Link>
            <span>/</span>
            <Link href="/admin/customers" className="hover:text-[color:var(--admin-accent)]">Clients</Link>
            <span>/</span>
            <span>{customer.name || id}</span>
          </>
        }
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.push('/admin/customers')}>
            <Icon name="arrowLeft" size={14} /> Retour
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Customer info */}
        <Card>
          <CardHeader title="Informations" />
          <div className="px-5 pb-5 pt-2">
            <InfoRow label="Nom">{customer.name || '—'}</InfoRow>
            <InfoRow label="Email">{customer.email || '—'}</InfoRow>
            <InfoRow label="Téléphone">{customer.phone || '—'}</InfoRow>
            <InfoRow label="Type">
              <Badge tone={customer.type === 'registered' ? 'blue' : 'gray'}>
                {customer.type === 'registered' ? 'Enregistré' : 'Invité'}
              </Badge>
            </InfoRow>
          </div>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader title="Statistiques" />
          <div className="px-5 pb-5 pt-2">
            <InfoRow label="Commandes">{customer.orderCount}</InfoRow>
            <InfoRow label="Total dépensé">{formatPrice(customer.totalSpent)}</InfoRow>
            <InfoRow label="Dernière commande">{fmtDate(customer.lastOrder)}</InfoRow>
            <InfoRow label="Panier moyen">
              {customer.orderCount > 0 ? formatPrice(customer.totalSpent / customer.orderCount) : '—'}
            </InfoRow>
          </div>
        </Card>

        {/* Quick info */}
        <Card>
          <CardHeader title="Résumé" />
          <div className="px-5 pb-5 pt-2">
            <div className="rounded-lg bg-[color:var(--admin-accent-soft)] p-4 text-center">
              <p className="text-3xl font-bold text-[color:var(--admin-accent)]">{customer.orderCount}</p>
              <p className="mt-1 text-sm text-[color:var(--admin-muted)]">commande{customer.orderCount > 1 ? 's' : ''}</p>
            </div>
            <div className="mt-3 rounded-lg bg-[color:var(--admin-accent-soft)]/50 p-4 text-center">
              <p className="text-3xl font-bold text-[color:var(--admin-text)]">{formatPrice(customer.totalSpent)}</p>
              <p className="mt-1 text-sm text-[color:var(--admin-muted)]">total dépensé</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Order history */}
      <Card className="mt-5">
        <CardHeader
          title={`Historique des commandes (${orders.length})`}
          subtitle="Toutes les commandes de ce client"
        />
        {orders.length === 0 ? (
          <div className="px-5 pb-5 pt-2">
            <p className="text-sm text-[color:var(--admin-muted)]">Aucune commande trouvée pour ce client.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">N°</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Paiement</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {pagedOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer transition hover:bg-[color:var(--admin-accent-soft)]/40"
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[color:var(--admin-accent)]">#{o.id}</span>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--admin-muted)]">{fmtDate(o.date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[color:var(--admin-text)]">{formatPrice(o.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={orderTone[o.status] || 'gray'} dot>{o.status_label || o.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[color:var(--admin-muted)]">{o.payment?.method_label || o.payment_method_label || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button title="Voir" onClick={(e) => { e.stopPropagation(); router.push(`/admin/orders/${o.id}`); }} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]">
                          <Icon name="eye" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} count={orders.length} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
