'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  PageHeader, Toolbar, Button, Badge, Card, TableSkeleton, EmptyState, ErrorState,
  Modal, Input, Textarea, Select, Pagination,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminPromotionsApi, formatPrice } from '@/lib/api/admin-promotions';

const PAGE_SIZE = 20;

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const EMPTY_FORM = {
  name: '', code: '', description: '',
  discount_type: 'percentage', discount_value: '',
  start_date: '', end_date: '',
  is_active: true, usage_limit: '', minimum_order_amount: '0',
};

const statusTone = {
  active: 'green', inactive: 'gray', expired: 'red', scheduled: 'blue', limit_reached: 'amber',
};

const statusLabel = {
  active: 'Actif', inactive: 'Inactif', expired: 'Expiré', scheduled: 'Programmé', limit_reached: 'Limite atteinte',
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = { page, page_size: PAGE_SIZE };
    if (search) params.search = search;
    adminPromotionsApi.list(params)
      .then((data) => {
        if (active) {
          setPromotions(data.results || []);
          setCount(data.count || 0);
        }
      })
      .catch((err) => { if (active) setError(err.message || 'Erreur chargement promotions'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search]);

  useEffect(() => { const cleanup = load(); return cleanup; }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };

  const openEdit = (promo) => {
    setEditing(promo);
    setForm({
      name: promo.name || '',
      code: promo.code || '',
      description: promo.description || '',
      discount_type: promo.discount_type || 'percentage',
      discount_value: promo.discount_value || '',
      start_date: promo.start_date ? promo.start_date.slice(0, 16) : '',
      end_date: promo.end_date ? promo.end_date.slice(0, 16) : '',
      is_active: promo.is_active !== false,
      usage_limit: promo.usage_limit || '',
      minimum_order_amount: promo.minimum_order_amount || '0',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Le nom est requis'); return; }
    if (!form.code.trim()) { toast.error('Le code est requis'); return; }
    if (!form.discount_value) { toast.error('La valeur de remise est requise'); return; }

    const val = parseFloat(form.discount_value);
    if (form.discount_type === 'percentage' && (val <= 0 || val > 100)) {
      toast.error('Le pourcentage doit être entre 1 et 100');
      return;
    }
    if (form.discount_type === 'fixed' && val <= 0) {
      toast.error('La valeur doit être supérieure à 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_active: form.is_active,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        minimum_order_amount: form.minimum_order_amount || '0',
      };
      if (editing) {
        await adminPromotionsApi.update(editing.id, payload);
        toast.success('Promotion modifiée');
      } else {
        await adminPromotionsApi.create(payload);
        toast.success('Promotion créée');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminPromotionsApi.remove(deleteTarget.id);
      toast.success('Promotion supprimée');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Erreur suppression');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (promo) => {
    try {
      await adminPromotionsApi.partialUpdate(promo.id, { is_active: !promo.is_active });
      toast.success(promo.is_active ? 'Désactivée' : 'Activée');
      load();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    }
  };

  return (
    <div>
      <PageHeader
        title="Promotions"
        subtitle={`${count} promotion${count > 1 ? 's' : ''}`}
        breadcrumb={
          <>
            <Link href="/admin" className="hover:text-[color:var(--admin-accent)]">Dashboard</Link>
            <span>/</span>
            <span>Promotions</span>
          </>
        }
        actions={
          <Button onClick={openCreate}>
            <Icon name="plus" size={16} /> Nouvelle promotion
          </Button>
        }
      />

      <Card>
        <div className="px-5 pt-5">
          <Toolbar value={search} onSearch={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Rechercher (nom, code)…">
            {search && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setPage(1); }}>Réinitialiser</Button>}
          </Toolbar>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : promotions.length === 0 ? (
          <EmptyState
            icon={<Icon name="promotions" size={28} />}
            title="Aucune promotion"
            description="Créez votre première promotion pour attirer les clients."
            action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvelle promotion</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Valeur</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Utilisation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {promotions.map((promo) => (
                  <tr key={promo.id} className="transition hover:bg-[color:var(--admin-accent-soft)]/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[color:var(--admin-text)]">{promo.name}</div>
                      <div className="text-xs text-[color:var(--admin-muted)]">{fmtDate(promo.start_date)} — {fmtDate(promo.end_date) || '∞'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-[color:var(--admin-accent-soft)] px-2 py-0.5 text-xs font-bold text-[color:var(--admin-accent)]">
                        {promo.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--admin-text)]">
                      {promo.discount_type === 'percentage' ? 'Pourcentage' : 'Montant fixe'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[color:var(--admin-text)]">
                      {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : formatPrice(promo.discount_value)}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--admin-text)]">
                      {promo.usage_count}{promo.usage_limit ? ` / ${promo.usage_limit}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[promo.status_label] || 'gray'} dot>
                        {statusLabel[promo.status_label] || promo.status_label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title={promo.is_active ? 'Désactiver' : 'Activer'}
                          onClick={() => toggleActive(promo)}
                          className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]"
                        >
                          <Icon name="eye" size={16} />
                        </button>
                        <button title="Modifier" onClick={() => openEdit(promo)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]">
                          <Icon name="settings" size={16} />
                        </button>
                        <button title="Supprimer" onClick={() => setDeleteTarget(promo)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-red-500/10 hover:text-red-600">
                          <Icon name="x" size={16} />
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

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier la promotion' : 'Nouvelle promotion'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '…' : editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">Nom *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Soldes d'été" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">Code *</label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ex: ETE2025" className="font-mono" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Description de la promotion" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">Type *</label>
              <Select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                <option value="percentage">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (DA)</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">
                Valeur * {form.discount_type === 'percentage' ? '(1-100)' : '(DA)'}
              </label>
              <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} placeholder={form.discount_type === 'percentage' ? '10' : '5000'} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">Montant minimum (DA)</label>
              <Input type="number" value={form.minimum_order_amount} onChange={(e) => setForm({ ...form, minimum_order_amount: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">Date début</label>
              <Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">Date fin</label>
              <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">Limite d'utilisation</label>
              <Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="Illimité" />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
              <span className="text-sm font-medium text-[color:var(--admin-text)]">Actif</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer la promotion"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? '…' : 'Supprimer'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[color:var(--admin-muted)]">
          Voulez-vous vraiment supprimer <span className="font-semibold text-[color:var(--admin-text)]">« {deleteTarget?.name} »</span> ({deleteTarget?.code}) ? Cette action est irréversible.
        </p>
      </Modal>
    </div>
  );
}
