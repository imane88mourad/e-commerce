'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  PageHeader, Toolbar, Button, Badge, Card, TableSkeleton, EmptyState, ErrorState,
  Modal, Input, Textarea, Select, Pagination,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminCategoriesApi } from '@/lib/api/admin-catalogue';
import { useLanguage } from '@/context/LanguageContext';

const PAGE_SIZE = 20;

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const EMPTY_FORM = { name: '', slug: '', description: '', image: '', is_active: true, display_order: 0 };

export default function CategoriesPage() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
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
    adminCategoriesApi.list(params)
      .then((data) => { if (active) { setCategories(data.results || []); setCount(data.count || 0); } })
      .catch((err) => { if (active) setError(err.message || t('admin.categories.errorLoading')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search]);

  useEffect(() => { const cleanup = load(); return cleanup; }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name || '', slug: cat.slug || '', description: cat.description || '', image: cat.image || '', is_active: cat.is_active !== false, display_order: cat.display_order || 0 });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(t('admin.categories.nameRequired')); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/\s+/g, '-'),
        description: form.description.trim(),
        image: form.image.trim() || null,
        is_active: form.is_active,
        display_order: Number(form.display_order) || 0,
      };
      if (editing) {
        await adminCategoriesApi.update(editing.id, payload);
        toast.success(t('admin.categories.updated_ok'));
      } else {
        await adminCategoriesApi.create(payload);
        toast.success(t('admin.categories.created_ok'));
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || t('admin.categories.errorSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminCategoriesApi.remove(deleteTarget.id);
      toast.success(t('admin.categories.deleted_ok'));
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || t('admin.categories.errorDelete'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('admin.categories.title')}
        subtitle={t('admin.categories.subtitle', { count })}
        breadcrumb={
          <>
            <Link href="/admin" className="hover:text-[color:var(--admin-accent)]">{t('admin.sidebar.dashboard')}</Link>
            <span>/</span>
            <span>{t('admin.categories.title')}</span>
          </>
        }
        actions={<Button onClick={openCreate}><Icon name="plus" size={16} /> {t('admin.categories.newCategory')}</Button>}
      />

      <Card>
        <div className="px-5 pt-5">
          <Toolbar value={search} onSearch={(v) => { setSearch(v); setPage(1); }} searchPlaceholder={t('admin.categories.searchPlaceholder')}>
            {search && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setPage(1); }}>{t('admin.categories.reset')}</Button>}
          </Toolbar>
        </div>

        {loading ? <TableSkeleton rows={6} cols={5} /> : error ? <ErrorState message={error} onRetry={load} /> : categories.length === 0 ? (
          <EmptyState icon={<Icon name="categories" size={28} />} title={t('admin.categories.noCategories')} description={t('admin.categories.noCategoriesDesc')} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> {t('admin.categories.newCategory')}</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.categories.name')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.categories.slug')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.categories.subcategories')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.categories.status')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.categories.created')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.categories.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {categories.map((cat) => (
                  <tr key={cat.id} className="transition hover:bg-[color:var(--admin-accent-soft)]/40">
                    <td className="px-4 py-3 font-medium text-[color:var(--admin-text)]">{cat.name}</td>
                    <td className="px-4 py-3 text-[color:var(--admin-muted)]">{cat.slug}</td>
                    <td className="px-4 py-3 text-[color:var(--admin-text)]">{cat.children?.length || 0}</td>
                    <td className="px-4 py-3"><Badge tone={cat.is_active ? 'green' : 'gray'} dot>{cat.is_active ? t('admin.products.active') : t('admin.products.inactive')}</Badge></td>
                    <td className="px-4 py-3 text-[color:var(--admin-muted)]">{fmtDate(cat.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button title={t('admin.categories.edit')} onClick={() => openEdit(cat)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]"><Icon name="eye" size={16} /></button>
                        <button title={t('admin.categories.delete')} onClick={() => setDeleteTarget(cat)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-red-500/10 hover:text-red-600"><Icon name="x" size={16} /></button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.categories.createEditTitle') : t('admin.categories.createNewTitle')} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>{t('admin.categories.cancel')}</Button><Button onClick={handleSave} disabled={saving}>{saving ? '…' : editing ? t('admin.categories.save') : t('admin.categories.create')}</Button></div>}>
        <div className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.categories.nameLabel')}</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('admin.categories.namePlaceholder')} /></div>
          <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.categories.slugLabel')}</label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={t('admin.categories.slugPlaceholder')} /></div>
          <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.categories.descriptionLabel')}</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder={t('admin.categories.descriptionPlaceholder')} /></div>
          <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.categories.imageLabel')}</label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.categories.displayOrderLabel')}</label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></div>
            <div><label className="mb-1 block text-sm font-medium text-[color:var(--admin-text)]">{t('admin.categories.statusLabel')}</label><Select value={form.is_active ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}><option value="active">{t('admin.products.active')}</option><option value="inactive">{t('admin.products.inactive')}</option></Select></div>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('admin.categories.deleteTitle')} size="sm" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>{t('admin.categories.cancel')}</Button><Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? '…' : t('admin.categories.confirmDelete')}</Button></div>}>
        <p className="text-sm text-[color:var(--admin-muted)]">{t('admin.categories.deleteConfirm')} <span className="font-semibold text-[color:var(--admin-text)]">« {deleteTarget?.name} »</span> ? {t('admin.categories.deleteIrreversible')}</p>
      </Modal>
    </div>
  );
}
