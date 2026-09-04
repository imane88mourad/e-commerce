'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  PageHeader, Toolbar, Button, Badge, Card, TableSkeleton, EmptyState, ErrorState,
  Modal, Input, Textarea, Select, Pagination,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminBrandsApi } from '@/lib/api/admin-catalogue';
import { useLanguage } from '@/context/LanguageContext';

const PAGE_SIZE = 20;
const fmtDate = (iso) => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); };
const EMPTY_FORM = { name: '', slug: '', description: '', logo: '', is_active: true };

export default function BrandsPage() {
  const { t } = useLanguage();
  const [brands, setBrands] = useState([]);
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
    adminBrandsApi.list(params).then((data) => { if (active) { setBrands(data.results || []); setCount(data.count || 0); } })
      .catch((err) => { if (active) setError(err.message || t('admin.brands.errorLoading')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search]);

  useEffect(() => { const cleanup = load(); return cleanup; }, [load]);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (brand) => { setEditing(brand); setForm({ name: brand.name || '', slug: brand.slug || '', description: brand.description || '', logo: brand.logo || '', is_active: brand.is_active !== false }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(t('admin.brands.nameRequired')); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/\s+/g, '-'), description: form.description.trim(), logo: form.logo.trim() || null, is_active: form.is_active };
      if (editing) { await adminBrandsApi.update(editing.id, payload); toast.success(t('admin.brands.updated_ok')); }
      else { await adminBrandsApi.create(payload); toast.success(t('admin.brands.created_ok')); }
      setModalOpen(false); load();
    } catch (err) { toast.error(err.message || t('admin.brands.errorSave')); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await adminBrandsApi.remove(deleteTarget.id); toast.success(t('admin.brands.deleted_ok')); setDeleteTarget(null); load(); }
    catch (err) { toast.error(err.message || t('admin.brands.errorDelete')); } finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title={t('admin.brands.title')} subtitle={t('admin.brands.subtitle', { count })}
        breadcrumb={<><Link href="/admin" className="hover:text-[color:var(--admin-accent)]">{t('admin.sidebar.dashboard')}</Link><span>/</span><span>{t('admin.brands.title')}</span></>}
        actions={<Button onClick={openCreate}><Icon name="plus" size={16} /> {t('admin.brands.newBrand')}</Button>}
      />
      <Card>
        <div className="px-5 pt-5">
          <Toolbar value={search} onSearch={(v) => { setSearch(v); setPage(1); }} searchPlaceholder={t('admin.brands.searchPlaceholder')}>
            {search && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setPage(1); }}>{t('admin.brands.reset')}</Button>}
          </Toolbar>
        </div>
        {loading ? <TableSkeleton rows={6} cols={5} /> : error ? <ErrorState message={error} onRetry={load} /> : brands.length === 0 ? (
          <EmptyState icon={<Icon name="brands" size={28} />} title={t('admin.brands.noBrands')} description={t('admin.brands.noBrandsDesc')} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> {t('admin.brands.newBrand')}</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]"><tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.brands.brand')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.brands.slug')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.brands.logo')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.brands.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.brands.created')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.brands.actions')}</th>
              </tr></thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {brands.map((brand) => (
                  <tr key={brand.id} className="transition hover:bg-[color:var(--admin-accent-soft)]/40">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[color:var(--admin-accent-soft)]">{brand.logo ? <img src={brand.logo} alt="" className="h-full w-full object-contain" /> : <Icon name="brands" size={16} className="text-[color:var(--admin-muted)]" />}</div><span className="font-medium text-[color:var(--admin-text)]">{brand.name}</span></div></td>
                    <td className="px-4 py-3 text-[color:var(--admin-muted)]">{brand.slug}</td>
                    <td className="px-4 py-3">{brand.logo ? <Badge tone="green">Logo</Badge> : <Badge tone="gray">{t('admin.brands.none')}</Badge>}</td>
                    <td className="px-4 py-3"><Badge tone={brand.is_active ? 'green' : 'gray'} dot>{brand.is_active ? t('admin.products.active') : t('admin.products.inactive')}</Badge></td>
                    <td className="px-4 py-3 text-[color:var(--admin-muted)]">{fmtDate(brand.created_at)}</td>
                    <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                      <button title={t('admin.brands.edit')} onClick={() => openEdit(brand)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]"><Icon name="eye" size={16} /></button>
                      <button title={t('admin.brands.delete')} onClick={() => setDeleteTarget(brand)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-red-500/10 hover:text-red-600"><Icon name="x" size={16} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
          </div>
        )}
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.brands.createEditTitle') : t('admin.brands.createNewTitle')} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>{t('admin.brands.cancel')}</Button><Button onClick={handleSave} disabled={saving}>{saving ? '…' : editing ? t('admin.brands.save') : t('admin.brands.create')}</Button></div>}>
        <div className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.brands.nameLabel')}</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('admin.brands.namePlaceholder')} /></div>
          <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.brands.slugLabel')}</label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={t('admin.brands.slugPlaceholder')} /></div>
          <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.brands.descriptionLabel')}</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder={t('admin.brands.descriptionPlaceholder')} /></div>
          <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.brands.logoLabel')}</label><Input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="https://..." /></div>
          <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.brands.statusLabel')}</label><Select value={form.is_active ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}><option value="active">{t('admin.products.active')}</option><option value="inactive">{t('admin.products.inactive')}</option></Select></div>
        </div>
      </Modal>
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('admin.brands.deleteTitle')} size="sm" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>{t('admin.brands.cancel')}</Button><Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? '…' : t('admin.brands.confirmDelete')}</Button></div>}>
        <p className="text-sm text-[color:var(--admin-muted)]">{t('admin.brands.deleteConfirm')} <span className="font-semibold text-[color:var(--admin-text)]">« {deleteTarget?.name} »</span> ? {t('admin.brands.deleteIrreversible')}</p>
      </Modal>
    </div>
  );
}
