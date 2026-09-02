'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, CardHeader, Badge, Button, StatCard, Skeleton, EmptyState, ErrorState } from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { formatPrice } from '@/lib/api/admin-billing';
import { adminDashboardApi } from '@/lib/api/admin-dashboard';
import { BarChart, HorizontalBarChart, DonutChart, PeriodFilter } from '@/components/admin/ui/charts';

const orderTone = {
  pending: 'amber', confirmed: 'blue', processing: 'indigo', shipped: 'purple',
  delivered: 'green', cancelled: 'red', returned: 'orange',
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    adminDashboardApi.getOverview(period)
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(err.message || 'Erreur chargement dashboard'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period]);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          subtitle="Vue d'ensemble"
          actions={<PeriodFilter value={period} onChange={() => {}} />}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-7 w-20 mb-2" />
              <Skeleton className="h-3 w-16" />
            </Card>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-5"><Skeleton className="h-64 w-full rounded-lg" /></Card>
          <Card className="p-5">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </Card>
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!data) return null;

  const ov = data.overview || {};
  const sales = data.sales || [];
  const topProducts = data.topProducts || [];
  const topCategories = data.topCategories || [];
  const statusDist = data.statusDistribution || {};
  const recentOrders = data.recentOrders || [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Vue d'ensemble de votre boutique e-commerce"
        actions={
          <div className="flex items-center gap-3">
            <PeriodFilter value={period} onChange={setPeriod} />
            <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] px-4 py-2 text-sm font-medium text-[color:var(--admin-text)] transition hover:bg-[color:var(--admin-accent-soft)]">
              <Icon name="eye" size={16} /> Boutique
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Chiffre d'affaires"
          value={formatPrice(ov.total_revenue)}
          delta={ov.revenue_delta}
          icon={<Icon name="analytics" size={18} />}
          accent={0}
        />
        <StatCard
          label="Commandes"
          value={ov.order_count?.toLocaleString() || '0'}
          delta={ov.orders_delta}
          icon={<Icon name="orders" size={18} />}
          accent={1}
        />
        <StatCard
          label="Panier moyen"
          value={formatPrice(ov.avg_order)}
          icon={<Icon name="box" size={18} />}
          accent={4}
        />
        <StatCard
          label="Clients"
          value={ov.customer_count?.toLocaleString() || '0'}
          icon={<Icon name="clients" size={18} />}
          accent={2}
          hint={`${ov.registered_count || 0} enregistrés`}
        />
        <StatCard
          label="Produits"
          value={ov.product_count?.toLocaleString() || '0'}
          icon={<Icon name="products" size={18} />}
          accent={3}
        />
      </div>

      {/* Sales Chart + Order Status */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Évolution des ventes" subtitle={`Revenus journaliers — ${period}`} />
          <div className="p-5">
            {sales.length === 0 ? (
              <EmptyState title="Aucune donnée de ventes" description="Les ventes apparaîtront ici après les premières commandes." />
            ) : (
              <BarChart data={sales} height={220} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Répartition des commandes" subtitle="Par statut" />
          <div className="p-5">
            {Object.keys(statusDist).length === 0 ? (
              <EmptyState title="Aucune commande" />
            ) : (
              <DonutChart data={statusDist} size={160} />
            )}
          </div>
        </Card>
      </div>

      {/* Top Products + Top Categories + Recent Orders */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Products */}
        <Card>
          <CardHeader
            title="Produits populaires"
            subtitle="Top ventes par chiffre d'affaires"
            action={
              <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--admin-accent)] hover:underline">
                Tout <Icon name="arrowRight" size={14} />
              </Link>
            }
          />
          <div className="p-5">
            {topProducts.length === 0 ? (
              <EmptyState title="Aucune vente" />
            ) : (
              <div className="space-y-3">
                {topProducts.slice(0, 6).map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--admin-accent-soft)] text-xs font-bold text-[color:var(--admin-accent)]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[color:var(--admin-text)]">{p.name}</p>
                      <p className="text-xs text-[color:var(--admin-muted)]">{p.quantity} vendus</p>
                    </div>
                    <span className="text-sm font-semibold text-[color:var(--admin-text)]">{formatPrice(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader title="Top catégories" subtitle="Par chiffre d'affaires" />
          <div className="p-5">
            {topCategories.length === 0 ? (
              <EmptyState title="Aucune donnée" />
            ) : (
              <HorizontalBarChart data={topCategories} valueKey="revenue" labelKey="name" />
            )}
          </div>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader
            title="Commandes récentes"
            subtitle="Les dernières commandes"
            action={
              <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--admin-accent)] hover:underline">
                Tout voir <Icon name="arrowRight" size={14} />
              </Link>
            }
          />
          {recentOrders.length === 0 ? (
            <EmptyState title="Aucune commande" />
          ) : (
            <div className="divide-y divide-[color:var(--admin-border)]">
              {recentOrders.slice(0, 6).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer transition hover:bg-[color:var(--admin-accent-soft)]/40"
                  onClick={() => router.push(`/admin/orders/${o.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[color:var(--admin-accent)]">#{o.id}</span>
                      <Badge tone={orderTone[o.status] || 'gray'}>{o.status_label || o.status}</Badge>
                    </div>
                    <p className="truncate text-xs text-[color:var(--admin-muted)]">{o.customer_name || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[color:var(--admin-text)]">{formatPrice(o.amount)}</p>
                    <p className="text-[10px] text-[color:var(--admin-muted)]">{fmtDate(o.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
