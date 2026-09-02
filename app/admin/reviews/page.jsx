'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import {
  PageHeader, Toolbar, Button, Badge, Card, TableSkeleton, EmptyState, ErrorState,
  Modal, Select, Pagination,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { adminReviewsApi } from '@/lib/api/reviews';

const PAGE_SIZE = 20;

const STATUS_MAP = {
  pending: { label: 'En attente', tone: 'yellow' },
  approved: { label: 'Approuvé', tone: 'green' },
  rejected: { label: 'Rejeté', tone: 'red' },
};

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
    setLoading(true);
    setError('');
    const params = { page, page_size: PAGE_SIZE };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (ratingFilter) params.rating = ratingFilter;
    adminReviewsApi.list(params)
      .then((data) => {
        if (active) {
          setReviews(data.results || []);
          setCount(data.count || 0);
        }
      })
      .catch((err) => { if (active) setError(err.message || 'Erreur chargement avis'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search, statusFilter, ratingFilter]);

  useEffect(() => { const cleanup = load(); return cleanup; }, [load]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const handleModerate = async (id, newStatus) => {
    setActing(true);
    try {
      await adminReviewsApi.moderate(id, newStatus);
      toast.success(newStatus === 'approved' ? 'Avis approuvé' : 'Avis rejeté');
      setDetailReview(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Erreur modération');
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActing(true);
    try {
      await adminReviewsApi.remove(deleteTarget.id);
      toast.success('Avis supprimé');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Erreur suppression');
    } finally {
      setActing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Avis"
        subtitle={`${count} avis au total`}
        breadcrumb={
          <>
            <Link href="/admin" className="hover:text-[color:var(--admin-accent)]">Dashboard</Link>
            <span>/</span>
            <span>Avis</span>
          </>
        }
      />

      <Card>
        <div className="px-5 pt-5">
          <Toolbar
            value={search}
            onSearch={(v) => { setSearch(v); setPage(1); }}
            searchPlaceholder="Rechercher un avis…"
          >
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-36"
            >
              <option value="">Tous statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
            </Select>
            <Select
              value={ratingFilter}
              onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
              className="w-32"
            >
              <option value="">Toutes notes</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{r} étoile{r > 1 ? 's' : ''}</option>
              ))}
            </Select>
            {(search || statusFilter || ratingFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); setRatingFilter(''); setPage(1); }}>
                Réinitialiser
              </Button>
            )}
          </Toolbar>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={<Icon name="reviews" size={28} />}
            title="Aucun avis"
            description="Les avis clients apparaîtront ici une fois publiés."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--admin-border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Produit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Note</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Titre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--admin-border)]">
                {reviews.map((r) => {
                  const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
                  return (
                    <tr key={r.id} className="transition hover:bg-[color:var(--admin-accent-soft)]/40">
                      <td className="px-4 py-3 font-medium text-[color:var(--admin-text)] max-w-[200px] truncate">{r.product_name}</td>
                      <td className="px-4 py-3 text-[color:var(--admin-muted)]">{r.user_name || r.user_email}</td>
                      <td className="px-4 py-3"><StarRating rating={r.rating} /></td>
                      <td className="px-4 py-3 text-[color:var(--admin-text)] max-w-[150px] truncate">{r.title || '—'}</td>
                      <td className="px-4 py-3 text-[color:var(--admin-muted)] text-xs">
                        {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button title="Voir" onClick={() => setDetailReview(r)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]">
                            <Icon name="eye" size={16} />
                          </button>
                          {r.status === 'pending' && (
                            <>
                              <button title="Approuver" onClick={() => handleModerate(r.id, 'approved')} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-green-500/10 hover:text-green-600" disabled={acting}>
                                <Icon name="check" size={16} />
                              </button>
                              <button title="Rejeter" onClick={() => handleModerate(r.id, 'rejected')} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-amber-500/10 hover:text-amber-600" disabled={acting}>
                                <Icon name="x" size={16} />
                              </button>
                            </>
                          )}
                          <button title="Supprimer" onClick={() => setDeleteTarget(r)} className="rounded-lg p-2 text-[color:var(--admin-muted)] transition hover:bg-red-500/10 hover:text-red-600">
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        open={!!detailReview}
        onClose={() => setDetailReview(null)}
        title="Détail de l'avis"
        footer={
          <div className="flex justify-end gap-2">
            {detailReview?.status !== 'approved' && (
              <Button variant="primary" onClick={() => handleModerate(detailReview.id, 'approved')} disabled={acting}>
                Approuver
              </Button>
            )}
            {detailReview?.status !== 'rejected' && (
              <Button variant="secondary" onClick={() => handleModerate(detailReview.id, 'rejected')} disabled={acting}>
                Rejeter
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDetailReview(null)}>Fermer</Button>
          </div>
        }
      >
        {detailReview && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-[color:var(--admin-text)]">{detailReview.product_name}</p>
                <p className="text-xs text-[color:var(--admin-muted)]">Par {detailReview.user_name || detailReview.user_email}</p>
              </div>
              <div className="ml-auto">
                <Badge tone={STATUS_MAP[detailReview.status]?.tone || 'gray'} dot>
                  {STATUS_MAP[detailReview.status]?.label || detailReview.status}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StarRating rating={detailReview.rating} size={18} />
              <span className="text-sm font-medium text-[color:var(--admin-text)]">{detailReview.rating}/5</span>
            </div>
            {detailReview.title && (
              <div>
                <p className="text-xs font-medium text-[color:var(--admin-muted)] uppercase mb-1">Titre</p>
                <p className="text-sm text-[color:var(--admin-text)]">{detailReview.title}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-[color:var(--admin-muted)] uppercase mb-1">Commentaire</p>
              <p className="text-sm text-[color:var(--admin-text)] whitespace-pre-wrap">{detailReview.comment}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[color:var(--admin-muted)]">Publié le {new Date(detailReview.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer l'avis"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="danger" onClick={handleDelete} disabled={acting}>
              {acting ? '…' : 'Supprimer'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[color:var(--admin-muted)]">
          Voulez-vous vraiment supprimer l'avis de <span className="font-semibold text-[color:var(--admin-text)]">« {deleteTarget?.user_name || deleteTarget?.user_email} »</span> ?
          Cette action est irréversible.
        </p>
      </Modal>
    </div>
  );
}
