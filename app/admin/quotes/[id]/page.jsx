'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  PageHeader, Button, Badge, Card, CardHeader, Skeleton, ErrorState, Select,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminQuotesApi, formatPrice } from '@/lib/api/admin-billing';
import { billingPdfApi } from '@/lib/api/admin-billing-pdf';

const QUOTE_STATUSES = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyé' },
  { value: 'accepted', label: 'Accepté' },
  { value: 'declined', label: 'Refusé' },
  { value: 'expired', label: 'Expiré' },
  { value: 'converted', label: 'Converti' },
];

const statusTone = {
  draft: 'amber', sent: 'blue', accepted: 'green', declined: 'red', expired: 'gray', converted: 'purple',
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

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminQuotesApi.get(id)
      .then((data) => { setQuote(data); setDraftStatus(data.status); })
      .catch((err) => setError(err.message || 'Erreur chargement devis'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const saveStatus = async () => {
    if (draftStatus === quote.status) return;
    setSaving(true);
    try {
      const updated = await adminQuotesApi.partialUpdate(quote.id, { status: draftStatus });
      toast.success(`Devis mis à jour → ${QUOTE_STATUSES.find((s) => s.value === updated.status)?.label || updated.status}`);
      setQuote(updated);
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Devis" breadcrumb={<Link href="/admin/quotes" className="hover:text-[color:var(--admin-accent)]">← Devis</Link>} />
        <Card className="p-5"><Skeleton className="h-48" /></Card>
      </>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!quote) return null;

  return (
    <div>
      <PageHeader
        title={`Devis #${quote.id}`}
        subtitle={`Créé le ${fmtDate(quote.created_at)}`}
        breadcrumb={
          <>
            <Link href="/admin" className="hover:text-[color:var(--admin-accent)]">Dashboard</Link>
            <span>/</span>
            <Link href="/admin/quotes" className="hover:text-[color:var(--admin-accent)]">Devis</Link>
            <span>/</span>
            <span>#{quote.id}</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => billingPdfApi.downloadQuotePdf(quote.id)}>
              <Icon name="download" size={14} /> PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Icon name="printer" size={14} /> Imprimer
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={emailing}
              onClick={async () => {
                setEmailing(true);
                try {
                  await billingPdfApi.emailQuotePdf(quote.id);
                  toast.success('Email envoyé avec succès');
                } catch (err) {
                  toast.error(err.message || "Erreur lors de l'envoi");
                } finally {
                  setEmailing(false);
                }
              }}
            >
              <Icon name="mail" size={14} /> {emailing ? '…' : 'Email'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push('/admin/quotes')}>
              <Icon name="arrowLeft" size={14} /> Retour
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Client info */}
        <Card>
          <CardHeader title="Client" />
          <div className="px-5 pb-5 pt-2">
            <InfoRow label="Nom">{quote.client_name || '—'}</InfoRow>
            <InfoRow label="Email">{quote.client_email || '—'}</InfoRow>
            <InfoRow label="Téléphone">{quote.client_phone || '—'}</InfoRow>
            {quote.notes && (
              <div className="pt-2">
                <span className="text-sm text-[color:var(--admin-muted)]">Notes</span>
                <p className="mt-1 text-sm text-[color:var(--admin-text)]">{quote.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader title="Statut" />
          <div className="px-5 pb-5 pt-2">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-[color:var(--admin-muted)]">Statut actuel</span>
              <Badge tone={statusTone[quote.status] || 'gray'} dot>
                {QUOTE_STATUSES.find((s) => s.value === quote.status)?.label || quote.status}
              </Badge>
            </div>
            <Select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}>
              {QUOTE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
            <Button className="mt-3 w-full" disabled={saving || draftStatus === quote.status} onClick={saveStatus}>
              {saving ? '…' : 'Mettre à jour'}
            </Button>
          </div>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader title="Totaux" />
          <div className="px-5 pb-5 pt-2">
            <InfoRow label="Sous-total">{formatPrice(quote.subtotal)}</InfoRow>
            <InfoRow label="TVA">{formatPrice(quote.vat_total)}</InfoRow>
            <div className="my-2 border-t border-[color:var(--admin-border)]" />
            <div className="flex justify-between gap-3 py-2">
              <span className="text-base font-semibold text-[color:var(--admin-text)]">Total</span>
              <span className="text-lg font-bold text-[color:var(--admin-accent)]">{formatPrice(quote.total)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Items */}
      <Card className="mt-5">
        <CardHeader title={`Articles (${quote.items?.length || 0})`} />
        <div className="px-5 pb-5 pt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-[color:var(--admin-muted)]">Produit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-[color:var(--admin-muted)]">Qté</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-[color:var(--admin-muted)]">Prix unitaire</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-[color:var(--admin-muted)]">TVA</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-[color:var(--admin-muted)]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {(quote.items || []).map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {item.product?.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.product.image} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                        )}
                        <span className="text-[color:var(--admin-text)]">{item.product?.name || 'Produit'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-[color:var(--admin-text)]">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-[color:var(--admin-text)]">{formatPrice(item.unit_price)}</td>
                    <td className="px-3 py-2 text-right text-[color:var(--admin-muted)]">{item.vat_rate}%</td>
                    <td className="px-3 py-2 text-right font-medium text-[color:var(--admin-text)]">{formatPrice(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
