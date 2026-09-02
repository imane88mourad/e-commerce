'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  PageHeader, Button, Badge, Card, CardHeader, Skeleton, ErrorState, Select,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminInvoicesApi, formatPrice } from '@/lib/api/admin-billing';
import { billingPdfApi } from '@/lib/api/admin-billing-pdf';

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

function InfoRow({ label, children }) {
  return (
    <div className="flex justify-between gap-3 py-2">
      <span className="shrink-0 text-sm text-[color:var(--admin-muted)]">{label}</span>
      <span className="text-right text-sm font-medium text-[color:var(--admin-text)]">{children}</span>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminInvoicesApi.get(id)
      .then((data) => { setInvoice(data); setDraftStatus(data.status); })
      .catch((err) => setError(err.message || 'Erreur chargement facture'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const saveStatus = async () => {
    if (draftStatus === invoice.status) return;
    setSaving(true);
    try {
      const updated = await adminInvoicesApi.partialUpdate(invoice.id, { status: draftStatus });
      toast.success(`Facture mise à jour → ${INVOICE_STATUSES.find((s) => s.value === updated.status)?.label || updated.status}`);
      setInvoice(updated);
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Facture" breadcrumb={<Link href="/admin/invoices" className="hover:text-[color:var(--admin-accent)]">← Factures</Link>} />
        <Card className="p-5"><Skeleton className="h-48" /></Card>
      </>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!invoice) return null;

  return (
    <div>
      <PageHeader
        title={`Facture ${invoice.number || `#${invoice.id}`}`}
        subtitle={`Émise le ${fmtDate(invoice.issue_date || invoice.created_at)}`}
        breadcrumb={
          <>
            <Link href="/admin" className="hover:text-[color:var(--admin-accent)]">Dashboard</Link>
            <span>/</span>
            <Link href="/admin/invoices" className="hover:text-[color:var(--admin-accent)]">Factures</Link>
            <span>/</span>
            <span>{invoice.number || `#${invoice.id}`}</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => billingPdfApi.downloadInvoicePdf(invoice.id)}>
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
                  await billingPdfApi.emailInvoicePdf(invoice.id);
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
            <Button variant="secondary" size="sm" onClick={() => router.push('/admin/invoices')}>
              <Icon name="arrowLeft" size={14} /> Retour
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Invoice info */}
        <Card>
          <CardHeader title="Informations" />
          <div className="px-5 pb-5 pt-2">
            <InfoRow label="Numéro">{invoice.number || '—'}</InfoRow>
            <InfoRow label="Client">{invoice.client_name || '—'}</InfoRow>
            <InfoRow label="Email">{invoice.client_email || '—'}</InfoRow>
            <InfoRow label="Téléphone">{invoice.client_phone || '—'}</InfoRow>
            <InfoRow label="Adresse">{invoice.client_address || '—'}</InfoRow>
            {invoice.order_id && (
              <InfoRow label="Commande">
                <Link href={`/admin/orders/${invoice.order_id}`} className="text-[color:var(--admin-accent)] hover:underline">#{invoice.order_id}</Link>
              </InfoRow>
            )}
          </div>
        </Card>

        {/* Status manager */}
        <Card>
          <CardHeader title="Statut" />
          <div className="px-5 pb-5 pt-2">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-[color:var(--admin-muted)]">Statut actuel</span>
              <Badge tone={statusTone[invoice.status] || 'gray'} dot>
                {INVOICE_STATUSES.find((s) => s.value === invoice.status)?.label || invoice.status}
              </Badge>
            </div>
            <Select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}>
              {INVOICE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
            <Button className="mt-3 w-full" disabled={saving || draftStatus === invoice.status} onClick={saveStatus}>
              {saving ? '…' : 'Mettre à jour'}
            </Button>
          </div>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader title="Totaux" />
          <div className="px-5 pb-5 pt-2">
            <InfoRow label="Sous-total">{formatPrice(invoice.subtotal)}</InfoRow>
            <InfoRow label="TVA">{formatPrice(invoice.vat_total)}</InfoRow>
            <div className="my-2 border-t border-[color:var(--admin-border)]" />
            <div className="flex justify-between gap-3 py-2">
              <span className="text-base font-semibold text-[color:var(--admin-text)]">Total</span>
              <span className="text-lg font-bold text-[color:var(--admin-accent)]">{formatPrice(invoice.total)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Lines */}
      <Card className="mt-5">
        <CardHeader title={`Lignes (${invoice.lines?.length || 0})`} />
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
                {(invoice.lines || []).map((line) => (
                  <tr key={line.id}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {line.product?.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={line.product.image} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                        )}
                        <span className="text-[color:var(--admin-text)]">{line.product?.name || 'Produit'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-[color:var(--admin-text)]">{line.quantity}</td>
                    <td className="px-3 py-2 text-right text-[color:var(--admin-text)]">{formatPrice(line.unit_price)}</td>
                    <td className="px-3 py-2 text-right text-[color:var(--admin-muted)]">{line.vat_rate}%</td>
                    <td className="px-3 py-2 text-right font-medium text-[color:var(--admin-text)]">{formatPrice(line.line_total)}</td>
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
