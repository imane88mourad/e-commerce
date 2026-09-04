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
import { useLanguage } from '@/context/LanguageContext';

const PAGE_SIZE = 20;
const fmtDate = (iso) => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); };
const EMPTY_FORM = { name: '', code: '', description: '', discount_type: 'percentage', discount_value: '', start_date: '', end_date: '', is_active: true, usage_limit: '', minimum_order_amount: '0' };
const statusTone = { active: 'green', inactive: 'gray', expired: 'red', scheduled: 'blue', limit_reached: 'amber' };
const statusLabelMap = { active: 'active', inactive: 'inactive', expired: 'expired', scheduled: 'scheduled', limit_reached: 'limitReached' };

export default function PromotionsPage() {
  const { t } = useLanguage();
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
    setLoading(true); setError('');
    const params = { page, page_size: PAGE_SIZE };
    if (search) params.search = search;
    adminPromotionsApi.list(params).then((data) => { if (active) { setPromotions(data.results || []); setCount(data.count || 0); } })
      .catch((err) => { if (active) setError(err.message || t('admin.promotions.errorLoading')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search]);

  useEffect(() => { const cleanup = load(); return cleanup; }, [load]);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (promo) => { setEditing(promo); setForm({ name: promo.name || '', code: promo.code || '', description: promo.description || '', discount_type: promo.discount_type || 'percentage', discount_value: promo.discount_value || '', start_date: promo.start_date ? promo.start_date.slice(0, 16) : '', end_date: promo.end_date ? promo.end_date.slice(0, 16) : '', is_active: promo.is_active !== false, usage_limit: promo.usage_limit || '', minimum_order_amount: promo.minimum_order_amount || '0' }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(t('admin.promotions.nameRequired')); return; }
    if (!form.code.trim()) { toast.error(t('admin.promotions.codeRequired')); return; }
    if (!form.discount_value) { toast.error(t('admin.promotions.valueRequired')); return; }
    const val = parseFloat(form.discount_value);
    if (form.discount_type === 'percentage' && (val <= 0 || val > 100)) { toast.error(t('admin.promotions.percentError')); return; }
    if (form.discount_type === 'fixed' && val <= 0) { toast.error(t('admin.promotions.fixedError')); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase(), description: form.description.trim(), discount_type: form.discount_type, discount_value: form.discount_value, start_date: form.start_date || null, end_date: form.end_date || null, is_active: form.is_active, usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null, minimum_order_amount: form.minimum_order_amount || '0' };
      if (editing) { await adminPromotionsApi.update(editing.id, payload); toast.success(t('admin.promotions.updated_ok')); }
      else { await adminPromotionsApi.create(payload); toast.success(t('admin.promotions.created_ok')); }
      setModalOpen(false); load();
    } catch (err) { toast.error(err.message || t('admin.promotions.errorSave')); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await adminPromotionsApi.remove(deleteTarget.id); toast.success(t('admin.promotions.deleted_ok')); setDeleteTarget(null); load(); }
    catch (err) { toast.error(err.message || t('admin.promotions.errorDelete')); } finally { setDeleting(false); }
  };

  const toggleActive = async (promo) => {
    try { await adminPromotionsApi.partialUpdate(promo.id, { is_active: !promo.is_active }); toast.success(promo.is_active ? t('admin.promotions.deactivated_ok') : t('admin.promotions.activated_ok')); load(); }
    catch (err) { toast.error(err.message || t('admin.promotions.errorSave')); }
  };

  return (
    <div>
      <PageHeader title={t('admin.promotions.title')} subtitle={t('admin.promotions.subtitle', { count })}
        breadcrumb={<><Link href="/admin" className="hover:text-[color:var(--admin-accent)]">{t('admin.sidebar.dashboard')}</Link><span>/</span><span>{t('admin.promotions.title')}</span></>}
        actions={<Button onClick={openCreate}><Icon name="plus" size={16} /> {t('admin.promotions.newPromotion')}</Button>}
      />
      <Card>
        <div className="px-5 pt-5">
          <Toolbar value={search} onSearch={(v) => { setSearch(v); setPage(1); }} searchPlaceholder={t('admin.promotions.searchPlaceholder')}>
            {search && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setPage(1); }}>{t('admin.promotions.reset')}</Button>}
          </Toolbar>
        </div>
        {loading ? <TableSkeleton rows={6} cols={7} /> : error ? <ErrorState message={error} onRetry={load} /> : promotions.length === 0 ? (
          <EmptyState icon={<Icon name="promotions" size={28} />} title={t('admin.promotions.noPromotions')} description={t('admin.promotions.noPromotionsDesc')} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> {t('admin.promotions.newPromotion')}</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]"><tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.promotions.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.promotions.code')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.promotions.type')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.promotions.value')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.promotions.usage')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.promotions.status')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.promotions.actions')}</th>
              </tr></thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {promotions.map((promo) => (
                  <tr key={promo.id} className="transition hover:bg-[color:var(--admin-accent-soft)]/40">
                    <td className="px-4 py-3"><div className="font-medium text-[color:var(--admin-text)]">{promo.name}</div><div className="text-xs text-[color:var(--admin-muted)]">{fmtDate(promo.start_date)} — {fmtDate(promo.end_date) || '∞'}</div></td>
                    <td className="px-4 py-3"><code className="rounded bg-[color:var(--admin-accent-soft)] px-2 py-0.5 text-xs font-bold text-[color:var(--admin-accent)]">{promo.code}</code></td>
                    <td className="px-4 py-3 text-[color:var(--admin-text)]">{promo.discount_type === 'percentage' ? t('admin.promotions.percentage') : t('admin.promotions.fixedAmount')}</td>
                    <td className="px-4 py-3 text-right font-medium text-[color:var(--admin-text)]">{promo.discount_type === 'percentage' ? `${promo.discount_value}%` : formatPrice(promo.discount_value)}</td>
                    <td className="px-4 py-3 text-[color:var(--admin-text)]">{promo.usage_count}{promo.usage_limit ? ` / ${promo.usage_limit}` : ''}</td>
                    <td className="px-4 py-3"><Badge tone={statusTone[promo.status_label] || 'gray'} dot>{t(`admin.promotions.${statusLabelMap[promo.status_label] || 'inactive'}`) || promo.status_label}</Badge></td>
                    <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                      <button title={promo.is_active ? t('admin.promotions.deactivate') : t('admin.promotions.activate')} onClick={() => toggleActive(promo)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]"><Icon name="eye" size={16} /></button>
                      <button title={t('admin.promotions.edit')} onClick={() => openEdit(promo)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]"><Icon name="settings" size={16} /></button>
                      <button title={t('admin.promotions.delete')} onClick={() => setDeleteTarget(promo)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-red-500/10 hover:text-red-600"><Icon name="x" size={16} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
          </div>
        )}
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.promotions.createEditTitle') : t('admin.promotions.createNewTitle')} size="lg" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>{t('admin.promotions.cancel')}</Button><Button onClick={handleSave} disabled={saving}>{saving ? '…' : editing ? t('admin.promotions.save') : t('admin.promotions.create')}</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.promotions.nameLabel')}</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('admin.promotions.namePlaceholder')} /></div>
            <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.promotions.codeLabel')}</label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder={t('admin.promotions.codePlaceholder')} className="font-mono" /></div>
          </div>
          <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.promotions.descriptionLabel')}</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder={t('admin.promotions.descriptionPlaceholder')} /></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.promotions.typeLabel')}</label><Select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}><option value="percentage">{t('admin.promotions.percentageOption')}</option><option value="fixed">{t('admin.promotions.fixedOption')}</option></Select></div>
            <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.promotions.valueLabel')} {form.discount_type === 'percentage' ? '(1-100)' : '(DA)'}</label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} placeholder={form.discount_type === 'percentage' ? '10' : '5000'} /></div>
            <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.promotions.minOrderLabel')}</label><Input type="number" value={form.minimum_order_amount} onChange={(e) => setForm({ ...form, minimum_order_amount: e.target.value })} placeholder="0" /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.promotions.startDate')}</label><Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.promotions.endDate')}</label><Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.promotions.usageLimit')}</label><Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder={t('admin.promotions.unlimited')} /></div>
          </div>
          <div><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" /><span className="text-sm font-medium text-[color:var(--admin-text)]">{t('admin.promotions.activeLabel')}</span></label></div>
        </div>
      </Modal>
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('admin.promotions.deleteTitle')} size="sm" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>{t('admin.promotions.cancel')}</Button><Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? '…' : t('admin.promotions.confirmDelete')}</Button></div>}>
        <p className="text-sm text-[color:var(--admin-muted)]">{t('admin.promotions.deleteConfirm')} <span className="font-semibold text-[color:var(--admin-text)]">« {deleteTarget?.name} »</span> ({deleteTarget?.code}) ? {t('admin.promotions.deleteIrreversible')}</p>
      </Modal>
    </div>
  );
}
