'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  PageHeader, Button, Badge, Card, CardHeader, Skeleton, ErrorState, Select, Input,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { resolveMediaUrl } from '@/lib/api/admin-products';
import {
  adminOrdersApi, formatPrice, ORDER_STATUSES, PAYMENT_STATUSES,
} from '@/lib/api/admin-orders';

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

function InfoRow({ label, children }) {
  return (
    <div className="flex justify-between gap-3 py-2">
      <span className="shrink-0 text-sm text-[color:var(--admin-muted)]">{label}</span>
      <span className="text-right text-sm font-medium text-[color:var(--admin-text)]">{children}</span>
    </div>
  );
}

function OrderDetail() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Order status manager
  const [draftStatus, setDraftStatus] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  // Bank transfer payment action
  const [txRef, setTxRef] = useState('');
  const [payBusy, setPayBusy] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminOrdersApi.get(id)
      .then((data) => { setOrder(data); setDraftStatus(data.status); setTxRef(data.payment?.transaction_id || ''); })
      .catch((err) => setError(err.message || 'Erreur chargement commande'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const saveStatus = async () => {
    if (draftStatus === order.status) return;
    setSavingStatus(true);
    try {
      const updated = await adminOrdersApi.updateStatus(order.id, draftStatus);
      toast.success(`Statut de commande mis à jour → ${updated.status_label}`);
      setOrder(updated);
      // Payment may have transitioned as a backend side-effect (COD delivered -> paid,
      // cancelled -> cancelled). Backend is the source of truth.
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSavingStatus(false);
    }
  };

  const paymentAction = async (action, label) => {
    setPayBusy(action);
    try {
      const updated = await adminOrdersApi.paymentAction(order.id, action, action === 'mark-paid' ? { transaction_id: txRef } : {});
      toast.success(`Paiement → ${updated.status_label}`);
      setOrder((prev) => ({ ...prev, payment: updated }));
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setPayBusy('');
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Commande" breadcrumb={<Link href="/admin/orders" className="hover:text-[color:var(--admin-accent)]">← Commandes</Link>} />
        <Card className="p-5"><Skeleton className="h-40" /></Card>
      </>
    );
  }
  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }
  if (!order) return null;

  const pay = order.payment || {};
  const payStatus = pay.status || '—';
  const isCod = order.payment_method === 'cod';
  const isVirement = order.payment_method === 'bank_transfer';

  return (
    <div>
      <PageHeader
        title={`Commande #${order.id}`}
        subtitle={`Créée le ${fmtDate(order.date)}`}
        breadcrumb={
          <>
            <Link href="/admin" className="hover:text-[color:var(--admin-accent)]">Dashboard</Link>
            <span>/</span>
            <Link href="/admin/orders" className="hover:text-[color:var(--admin-accent)]">Commandes</Link>
            <span>/</span>
            <span>#{order.id}</span>
          </>
        }
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.push('/admin/orders')}>
            <Icon name="arrowLeft" size={14} /> Retour
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Customer information */}
        <Card>
          <CardHeader title="Client" />
          <div className="px-5 pb-5 pt-2">
            <InfoRow label="Nom">{order.customer_name || '—'}</InfoRow>
            <InfoRow label="Email">{order.customer_email || '—'}</InfoRow>
            <InfoRow label="Téléphone">{order.guest_phone || (order.user?.phone_number) || '—'}</InfoRow>
            <InfoRow label="Type">{order.user ? 'Compte client' : 'Invité'}</InfoRow>
          </div>
        </Card>

        {/* Shipping information */}
        <Card>
          <CardHeader title="Livraison" />
          <div className="px-5 pb-5 pt-2">
            <InfoRow label="Adresse">{order.guest_address || '—'}</InfoRow>
            <InfoRow label="Ville">{order.guest_city || '—'}</InfoRow>
            <InfoRow label="Wilaya">{order.guest_state || '—'}</InfoRow>
            <InfoRow label="Code postal">{order.guest_pincode || '—'}</InfoRow>
            {order.guest_shipping_info && (
              <div className="pt-2">
                <span className="text-sm text-[color:var(--admin-muted)]">Infos livraison</span>
                <p className="mt-1 text-sm text-[color:var(--admin-text)]">{order.guest_shipping_info}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader title="Paiement" />
          <div className="px-5 pb-5 pt-2">
            <InfoRow label="Méthode">{order.payment?.method_label || order.payment_method_label}</InfoRow>
            <InfoRow label="Référence">{pay.transaction_id || '—'}</InfoRow>
            <InfoRow label="Payé le">{pay.paid_at ? fmtDate(pay.paid_at) : '—'}</InfoRow>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[color:var(--admin-muted)]">Statut paiement</span>
              <Badge tone={paymentTone[payStatus] || 'gray'} dot>
                {PAYMENT_STATUSES.find((s) => s.value === payStatus)?.label || payStatus}
              </Badge>
            </div>

            {isCod && payStatus === 'pending' && (
              <p className="mt-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                Paiement à la livraison. Il passera à <b>Payé</b> automatiquement quand la commande sera marquée <b>Livrée</b>.
              </p>
            )}
            {(isCod || isVirement) && payStatus === 'paid' && (
              <Button variant="secondary" size="sm" className="mt-3 w-full" disabled={payBusy === 'mark-refunded'} onClick={() => paymentAction('mark-refunded', 'Rembourser')}>
                {payBusy === 'mark-refunded' ? '…' : 'Rembourser'}
              </Button>
            )}
            {isVirement && payStatus === 'pending' && (
              <div className="mt-3 space-y-2">
                <Input placeholder="Référence du virement" value={txRef} onChange={(e) => setTxRef(e.target.value)} />
                <Button className="w-full" disabled={payBusy === 'mark-paid'} onClick={() => paymentAction('mark-paid', 'Marquer payé')}>
                  {payBusy === 'mark-paid' ? '…' : 'Marquer payé (dépôt reçu)'}
                </Button>
                <Button variant="danger" size="sm" className="w-full" disabled={payBusy === 'mark-failed'} onClick={() => paymentAction('mark-failed', 'Échec')}>
                  {payBusy === 'mark-failed' ? '…' : 'Marquer en échec'}
                </Button>
              </div>
            )}
            {order.payment_method === 'online_card' && (
              <div className="mt-2">
                {payStatus === 'pending' && (
                  <div className="space-y-2">
                    <p className="rounded-lg bg-blue-500/10 p-2.5 text-xs text-blue-600 dark:text-blue-400">
                      Paiement en ligne en attente. Le webhook du provider confirmera automatiquement.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1" disabled={payBusy === 'mark-paid'} onClick={() => paymentAction('mark-paid', 'Marquer payé')}>
                        {payBusy === 'mark-paid' ? '…' : 'Marquer payé (manuel)'}
                      </Button>
                      <Button variant="danger" size="sm" className="flex-1" disabled={payBusy === 'mark-failed'} onClick={() => paymentAction('mark-failed', 'Échec')}>
                        {payBusy === 'mark-failed' ? '…' : 'Marquer échoué'}
                      </Button>
                    </div>
                  </div>
                )}
                {payStatus === 'paid' && (
                  <Button variant="secondary" size="sm" className="mt-2 w-full" disabled={payBusy === 'mark-refunded'} onClick={() => paymentAction('mark-refunded', 'Rembourser')}>
                    {payBusy === 'mark-refunded' ? '…' : 'Rembourser'}
                  </Button>
                )}
                <InfoRow label="Provider">{pay.provider || '—'}</InfoRow>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Order status manager */}
        <Card>
          <CardHeader title="Statut de commande" subtitle="Le statut de paiement est géré séparément." />
          <div className="px-5 pb-5 pt-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-[color:var(--admin-muted)]">Statut actuel</span>
              <Badge tone={orderTone[order.status] || 'gray'} dot>{order.status_label || order.status}</Badge>
            </div>
            <Select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}>
              {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
            <Button className="mt-3 w-full" disabled={savingStatus || draftStatus === order.status} onClick={saveStatus}>
              {savingStatus ? '…' : 'Mettre à jour le statut'}
            </Button>
          </div>
        </Card>

        {/* Items */}
        <Card className="lg:col-span-2">
          <CardHeader title={`Articles (${order.items?.length || 0})`} subtitle={`Total : ${formatPrice(order.amount)}`} />
          <div className="px-5 pb-5 pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[color:var(--admin-border)]">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase text-[color:var(--admin-muted)]">Produit</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase text-[color:var(--admin-muted)]">Qté</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase text-[color:var(--admin-muted)]">Prix</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase text-[color:var(--admin-muted)]">Sous-total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--admin-border)]">
                  {(order.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          {it.product?.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolveMediaUrl(it.product.image)} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                          )}
                          <span className="text-[color:var(--admin-text)]">{it.product?.name || 'Produit'}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right text-[color:var(--admin-text)]">{it.quantity}</td>
                      <td className="px-2 py-2 text-right text-[color:var(--admin-text)]">{formatPrice(it.price)}</td>
                      <td className="px-2 py-2 text-right font-medium text-[color:var(--admin-text)]">{formatPrice(it.price * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return <OrderDetail />;
}
