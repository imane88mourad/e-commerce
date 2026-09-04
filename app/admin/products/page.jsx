'use client';
import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import {
  PageHeader, Toolbar, Button, Badge, Card, TableSkeleton, EmptyState, ErrorState,
  Modal, Select, Skeleton,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminProductsApi, formatPrice, resolveMediaUrl } from '@/lib/api/admin-products';
import { useLanguage } from '@/context/LanguageContext';

const PAGE_SIZE = 15;

function SortableTh({ label, field, sort, onSort, align = 'left', sortable = true }) {
  const active = sort === field;
  const desc = sort === `-${field}`;
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)] ${align === 'right' ? 'text-right' : 'text-left'} ${sortable ? 'cursor-pointer select-none' : ''}`}
      onClick={sortable ? () => onSort(active ? null : desc ? field : `-${field}`) : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortable && (active || desc) && (
          <Icon name="chevronDown" size={12} className={desc ? 'rotate-180' : ''} />
        )}
      </span>
    </th>
  );
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [categoryMap, setCategoryMap] = useState({});
  const [brandMap, setBrandMap] = useState({});

  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [sort, setSort] = useState('-updated_at');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const buildQuery = useCallback(() => {
    const q = { page, page_size: PAGE_SIZE };
    if (search) q.search = search;
    if (category) q.category = category;
    if (brand) q.brand = brand;
    if (status === 'active') q.is_active = true;
    if (status === 'inactive') q.is_active = false;
    if (status === 'featured') q.is_featured = true;
    if (status === 'new') q.is_new = true;
    if (status === 'best') q.is_best_seller = true;
    if (sort) q.ordering = sort;
    return q;
  }, [page, search, category, brand, status, sort]);

  useEffect(() => {
    let active = true;
    async function fetchMeta() {
      try {
        const catReq = fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/products/categories/?page_size=100`);
        const brandReq = fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/products/brands/?page_size=100`);
        const [catRes, brandRes] = await Promise.all([catReq, brandReq]);
        const cat = await catRes.json();
        const br = await brandRes.json();
        const cl = cat.results || [];
        const bl = br.results || [];
        if (active) {
          setCategories(cl);
          setBrands(bl);
          setCategoryMap(Object.fromEntries(cl.map((c) => [String(c.id), c.name])));
          setBrandMap(Object.fromEntries(bl.map((b) => [String(b.id), b.name])));
        }
      } catch { /* non fatal */ }
    }
    fetchMeta();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    adminProductsApi.list(buildQuery())
      .then((data) => {
        if (!active) return;
        setProducts(data.results || []);
        setCount(data.count || 0);
      })
      .catch((err) => {
        if (active) setError(err.message || t('admin.products.errorLoading'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [buildQuery]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const displayName = (name) => (name && name.length > 40 ? `${name.slice(0, 40)}…` : name || '—');

  const applyFilters = (updates) => {
    setCategory(updates.category ?? category);
    setBrand(updates.brand ?? brand);
    setStatus(updates.status ?? status);
    setPage(1);
  };

  const clearFilters = () => {
    setCategory(''); setBrand(''); setStatus(''); setPage(1);
  };

  const toggleActive = async (p) => {
    setSelected(p.id);
    try {
      const next = !p.is_active;
      await adminProductsApi.partialUpdate(p.id, { is_active: next });
      toast.success(next ? t('admin.products.activated') : t('admin.products.deactivated'));
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: next } : x));
    } catch (err) {
      toast.error(err.message || t('admin.products.errorActivate'));
    } finally {
      setSelected(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminProductsApi.remove(deleteTarget.id);
      toast.success(t('admin.products.deleted'));
      setDeleteTarget(null);
      setProducts((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setCount((c) => Math.max(0, c - 1));
    } catch (err) {
      toast.error(err.message || t('admin.products.errorDelete'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('admin.products.title')}
        subtitle={t('admin.products.subtitle', { count })}
        breadcrumb={
          <>
            <Link href="/admin" className="hover:text-[color:var(--admin-accent)]">{t('admin.sidebar.dashboard')}</Link>
            <span>/</span>
            <span>{t('admin.products.title')}</span>
          </>
        }
        actions={
          <Button onClick={() => router.push('/admin/products/new')}>
            <Icon name="plus" size={16} /> {t('admin.products.newProduct')}
          </Button>
        }
      />

      <Card>
        <div className="px-5 pt-5">
          <Toolbar
            value={search}
            onSearch={setSearch}
            searchPlaceholder={t('admin.products.searchPlaceholder')}
          >
            <Select value={category} onChange={(e) => applyFilters({ category: e.target.value })} className="md:w-44">
              <option value="">{t('admin.products.category')}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={brand} onChange={(e) => applyFilters({ brand: e.target.value })} className="md:w-40">
              <option value="">{t('admin.products.brand')}</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Select value={status} onChange={(e) => applyFilters({ status: e.target.value })} className="md:w-40">
              <option value="">{t('admin.products.allStatuses')}</option>
              <option value="active">{t('admin.products.active')}</option>
              <option value="inactive">{t('admin.products.inactive')}</option>
              <option value="featured">{t('admin.products.featured')}</option>
              <option value="new">{t('admin.products.newLabel')}</option>
              <option value="best">{t('admin.products.bestSeller')}</option>
            </Select>
            {(category || brand || status) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>{t('admin.products.reset')}</Button>
            )}
          </Toolbar>
        </div>

        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setPage((p) => p)} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Icon name="products" size={28} />}
            title={t('admin.products.noProductsFound')}
            description={t('admin.products.noProductsDesc')}
            action={
              <Button onClick={() => router.push('/admin/products/new')}>
                <Icon name="plus" size={16} /> {t('admin.products.newProduct')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]">
                <tr>
                  <SortableTh label={t('admin.products.product')} field="name" sort={sort} onSort={setSort} />
                  <SortableTh label={t('admin.products.category')} field="category" sort={sort} onSort={setSort} />
                  <SortableTh label={t('admin.products.brand')} field="brand" sort={sort} onSort={setSort} />
                  <SortableTh label={t('admin.products.price')} field="price" sort={sort} onSort={setSort} align="right" />
                  <SortableTh label={t('admin.products.stock')} field="stock" sort={sort} onSort={setSort} align="right" />
                  <SortableTh label={t('admin.products.status')} sortable={false} />
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">
                    {t('admin.products.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer transition hover:bg-[color:var(--admin-accent-soft)]/40"
                    onClick={() => router.push(`/admin/products/${p.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[color:var(--admin-accent-soft)]">
                          {p.images && p.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolveMediaUrl(p.images[0].image)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Icon name="box" size={20} className="text-[color:var(--admin-muted)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-[color:var(--admin-text)]">
                            {displayName(p.name)}
                          </div>
                          <div className="truncate text-xs text-[color:var(--admin-muted)]">
                            {p.sku || t('admin.products.noSku')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--admin-text)]">
                      {categoryMap[String(p.category_id)] || '—'}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--admin-text)]">
                      {brandMap[String(p.brand_id)] || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[color:var(--admin-text)]">
                      {formatPrice(p.promotional_price ?? p.price)}
                    </td>
                    <td className={`px-4 py-3 text-right ${p.stock <= (p.low_stock_threshold ?? 5) ? 'text-amber-600 dark:text-amber-400' : 'text-[color:var(--admin-text)]'}`}>
                      {p.stock}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={p.is_active ? 'green' : 'gray'} dot>{p.is_active ? t('admin.products.active') : t('admin.products.inactive')}</Badge>
                        {p.is_featured && <Badge tone="orange">{t('admin.products.featured')}</Badge>}
                        {p.is_new && <Badge tone="blue">{t('admin.products.newLabel')}</Badge>}
                        {p.is_best_seller && <Badge tone="purple">{t('admin.products.bestSeller')}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title={p.is_active ? t('admin.products.deactivate') : t('admin.products.activate')}
                          onClick={(e) => { e.stopPropagation(); toggleActive(p); }}
                          disabled={selected === p.id}
                          className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)] disabled:opacity-50"
                        >
                          {selected === p.id
                            ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            : <Icon name="eye" size={16} />}
                        </button>
                        <button
                          title={t('admin.products.delete')}
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                          className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Icon name="x" size={16} />
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
                  {t('admin.products.pageOf', { page, total: totalPages, count })}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <Icon name="arrowLeft" size={14} /> {t('admin.products.prev')}
                  </Button>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    {t('admin.products.next')} <Icon name="arrowRight" size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('admin.products.deleteTitle')}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>{t('admin.products.cancel')}</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <span className="mr-1 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : t('admin.products.confirmDelete')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[color:var(--admin-muted)]">
          {t('admin.products.deleteConfirm')} <span className="font-semibold text-[color:var(--admin-text)]">« {deleteTarget?.name} »</span> ?
          {t('admin.products.deleteIrreversible')}
        </p>
      </Modal>
    </div>
  );
}

export default function ProductsPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<><PageHeader title={t('admin.products.title')} /><Card><TableSkeleton rows={8} cols={6} /></Card></>}>
      <ProductsContent />
    </Suspense>
  );
}
