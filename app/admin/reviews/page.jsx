'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  PageHeader, Toolbar, Button, Badge, Card, TableSkeleton, EmptyState, ErrorState,
  Modal, Select, Pagination,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminReviewsApi } from '@/lib/api/reviews';
import { useLanguage } from '@/context/LanguageContext';

const PAGE_SIZE = 20;

const STATUS_MAP = {
  pending: { tone: 'yellow' },
  approved: { tone: 'green' },
  rejected: { tone: 'red' },
};

const STATUS_KEYS = { pending: 'pending', approved: 'approved', rejected: 'rejected' };

const STARS = [1, 2, 3, 4, 5];

function StarRating({ rating, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {STARS.map((s) => (
        <svg key={s} width={size} height={size} viewBox="0 0 20 20" fill={s <= rating ? '#f59e0b' : 'none'} stroke={s <= rating ? '#f59e0b' : '#d1d5db'} strokeWidth="1.5">
          <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.26l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [detailReview, setDetailReview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    let active = true;
    setLoading(true); setError('');
    const params = { page, page_size: PAGE_SIZE };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (ratingFilter) params.rating = ratingFilter;
    adminReviewsApi.list(params).then((data) => { if (active) { setReviews(data.results || []); setCount(data.count || 0); } })
      .catch((err) => { if (active) setError(err.message || t('admin.reviews.errorLoading')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search, statusFilter, ratingFilter]);

  useEffect(() => { const cleanup = load(); return cleanup; }, [load]);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const handleModerate = async (id, newStatus) => {
    setActing(true);
    try { await adminReviewsApi.moderate(id, newStatus); toast.success(newStatus === 'approved' ? t('admin.reviews.approved_ok') : t('admin.reviews.rejected_ok')); setDetailReview(null); load(); }
    catch (err) { toast.error(err.message || t('admin.reviews.errorModerate')); } finally { setActing(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setActing(true);
    try { await adminReviewsApi.remove(deleteTarget.id); toast.success(t('admin.reviews.deleted_ok')); setDeleteTarget(null); load(); }
    catch (err) { toast.error(err.message || t('admin.reviews.errorDelete')); } finally { setActing(false); }
  };

  return (
    <div>
      <PageHeader title={t('admin.reviews.title')} subtitle={t('admin.reviews.subtitle', { count })}
        breadcrumb={<><Link href="/admin" className="hover:text-[color:var(--admin-accent)]">{t('admin.sidebar.dashboard')}</Link><span>/</span><span>{t('admin.reviews.title')}</span></>}
      />
      <Card>
        <div className="px-5 pt-5">
          <Toolbar value={search} onSearch={(v) => { setSearch(v); setPage(1); }} searchPlaceholder={t('admin.reviews.searchPlaceholder')}>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-36">
              <option value="">{t('admin.reviews.allStatuses')}</option>
              <option value="pending">{t('admin.reviews.pending')}</option>
              <option value="approved">{t('admin.reviews.approved')}</option>
              <option value="rejected">{t('admin.reviews.rejected')}</option>
            </Select>
            <Select value={ratingFilter} onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }} className="w-32">
              <option value="">{t('admin.reviews.allRatings')}</option>
              {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} {r > 1 ? t('admin.reviews.stars') : t('admin.reviews.star')}</option>)}
            </Select>
            {(search || statusFilter || ratingFilter) && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); setRatingFilter(''); setPage(1); }}>{t('admin.reviews.reset')}</Button>}
          </Toolbar>
        </div>
        {loading ? <TableSkeleton rows={6} cols={6} /> : error ? <ErrorState message={error} onRetry={load} /> : reviews.length === 0 ? (
          <EmptyState icon={<Icon name="reviews" size={28} />} title={t('admin.reviews.noReviews')} description={t('admin.reviews.noReviewsDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]"><tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.reviews.product')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.reviews.customer')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.reviews.rating')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.reviews.titleCol')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.reviews.date')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.reviews.status')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{t('admin.reviews.actions')}</th>
              </tr></thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {reviews.map((r) => {
                  const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
                  return (
                    <tr key={r.id} className="transition hover:bg-[color:var(--admin-accent-soft)]/40">
                      <td className="px-4 py-3 font-medium text-[color:var(--admin-text)] max-w-[200px] truncate">{r.product_name}</td>
                      <td className="px-4 py-3 text-[color:var(--admin-muted)]">{r.user_name || r.user_email}</td>
                      <td className="px-4 py-3"><StarRating rating={r.rating} /></td>
                      <td className="px-4 py-3 text-[color:var(--admin-text)] max-w-[150px] truncate">{r.title || '—'}</td>
                      <td className="px-4 py-3 text-[color:var(--admin-muted)] text-xs">{new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-3"><Badge tone={st.tone} dot>{t(`admin.reviews.${STATUS_KEYS[r.status] || 'pending'}`)}</Badge></td>
                      <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                        <button title={t('admin.reviews.view')} onClick={() => setDetailReview(r)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]"><Icon name="eye" size={16} /></button>
                        {r.status === 'pending' && <>
                          <button title={t('admin.reviews.approve')} onClick={() => handleModerate(r.id, 'approved')} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-green-500/10 hover:text-green-600" disabled={acting}><Icon name="check" size={16} /></button>
                          <button title={t('admin.reviews.reject')} onClick={() => handleModerate(r.id, 'rejected')} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-amber-500/10 hover:text-amber-600" disabled={acting}><Icon name="x" size={16} /></button>
                        </>}
                        <button title={t('admin.reviews.delete')} onClick={() => setDeleteTarget(r)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-red-500/10 hover:text-red-600"><Icon name="trash" size={16} /></button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
          </div>
        )}
      </Card>
      <Modal open={!!detailReview} onClose={() => setDetailReview(null)} title={t('admin.reviews.detailTitle')}
        footer={<div className="flex justify-end gap-2">
          {detailReview?.status !== 'approved' && <Button variant="primary" onClick={() => handleModerate(detailReview.id, 'approved')} disabled={acting}>{t('admin.reviews.approve')}</Button>}
          {detailReview?.status !== 'rejected' && <Button variant="secondary" onClick={() => handleModerate(detailReview.id, 'rejected')} disabled={acting}>{t('admin.reviews.reject')}</Button>}
          <Button variant="ghost" onClick={() => setDetailReview(null)}>{t('admin.reviews.close')}</Button>
        </div>}
      >
        {detailReview && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div><p className="text-sm font-medium text-[color:var(--admin-text)]">{detailReview.product_name}</p><p className="text-xs text-[color:var(--admin-muted)]">{t('admin.reviews.by')} {detailReview.user_name || detailReview.user_email}</p></div>
              <div className="ml-auto"><Badge tone={STATUS_MAP[detailReview.status]?.tone || 'gray'} dot>{t(`admin.reviews.${STATUS_KEYS[detailReview.status] || 'pending'}`)}</Badge></div>
            </div>
            <div className="flex items-center gap-3"><StarRating rating={detailReview.rating} size={18} /><span className="text-sm font-medium text-[color:var(--admin-text)]">{detailReview.rating}/5</span></div>
            {detailReview.title && <div><p className="text-xs font-medium text-[color:var(--admin-muted)] uppercase mb-1">{t('admin.reviews.titleLabel')}</p><p className="text-sm text-[color:var(--admin-text)]">{detailReview.title}</p></div>}
            <div><p className="text-xs font-medium text-[color:var(--admin-muted)] uppercase mb-1">{t('admin.reviews.commentLabel')}</p><p className="text-sm text-[color:var(--admin-text)] whitespace-pre-wrap">{detailReview.comment}</p></div>
            <div><p className="text-xs text-[color:var(--admin-muted)]">{t('admin.reviews.publishedOn')} {new Date(detailReview.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div>
          </div>
        )}
      </Modal>
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('admin.reviews.deleteTitle')} size="sm"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>{t('admin.reviews.close')}</Button><Button variant="danger" onClick={handleDelete} disabled={acting}>{acting ? '…' : t('admin.reviews.confirmDelete')}</Button></div>}>
        <p className="text-sm text-[color:var(--admin-muted)]">{t('admin.reviews.deleteConfirm')} <span className="font-semibold text-[color:var(--admin-text)]">« {deleteTarget?.user_name || deleteTarget?.user_email} »</span> ? {t('admin.reviews.deleteIrreversible')}</p>
      </Modal>
    </div>
  );
}
