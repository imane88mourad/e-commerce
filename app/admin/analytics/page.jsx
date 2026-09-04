'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PageHeader, Card, CardHeader, StatCard, Badge, Skeleton, EmptyState, ErrorState,
} from '@/components/admin/ui/primitives';
import { Icon } from '@/components/admin/ui/icons';
import { formatPrice } from '@/lib/api/admin-billing';
import { adminAnalyticsApi } from '@/lib/api/admin-analytics';
import { BarChart, HorizontalBarChart, DonutChart, PeriodFilter } from '@/components/admin/ui/charts';
import { useLanguage } from '@/context/LanguageContext';

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState('30d');
  const [overview, setOverview] = useState(null);
  const [sales, setSales] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [statusDist, setStatusDist] = useState({});
  const [customerStats, setCustomerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.allSettled([
      adminAnalyticsApi.getOverview(period),
      adminAnalyticsApi.getSales(period),
      adminAnalyticsApi.getTopProducts(period, 10),
      adminAnalyticsApi.getTopCategories(period, 10),
      adminAnalyticsApi.getStatusDistribution(period),
      adminAnalyticsApi.getCustomerStats(period),
    ]).then((results) => {
      if (!active) return;
      const [ov, sl, tp, tc, sd, cs] = results;
      setOverview(ov.status === 'fulfilled' ? ov.value : null);
      setSales(sl.status === 'fulfilled' ? sl.value : []);
      setTopProducts(tp.status === 'fulfilled' ? tp.value : []);
      setTopCategories(tc.status === 'fulfilled' ? tc.value : []);
      setStatusDist(sd.status === 'fulfilled' ? sd.value : {});
      setCustomerStats(cs.status === 'fulfilled' ? cs.value : null);
    }).catch(() => { if (active) setError(t('admin.analytics.errorLoading')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period]);

  if (loading) {
    return (
      <div>
        <PageHeader title={t('admin.analytics.title')} subtitle={t('admin.analytics.subtitle')} actions={<PeriodFilter value={period} onChange={() => {}} />} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-20 w-full" /></Card>)}</div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  const ov = overview || {};
  const cs = customerStats || {};

  return (
    <div>
      <PageHeader title={t('admin.analytics.title')} subtitle={t('admin.analytics.subtitleFull')}
        breadcrumb={<><Link href="/admin" className="hover:text-[color:var(--admin-accent)]">{t('admin.sidebar.dashboard')}</Link><span>/</span><span>{t('admin.analytics.title')}</span></>}
        actions={<PeriodFilter value={period} onChange={setPeriod} />}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('admin.analytics.revenue')} value={formatPrice(ov.total_revenue)} delta={ov.revenue_delta} icon={<Icon name="analytics" size={18} />} accent={0} />
        <StatCard label={t('admin.analytics.orders')} value={ov.order_count?.toLocaleString() || '0'} delta={ov.orders_delta} icon={<Icon name="orders" size={18} />} accent={1} />
        <StatCard label={t('admin.analytics.avgOrder')} value={formatPrice(ov.avg_order)} icon={<Icon name="box" size={18} />} accent={4} />
        <StatCard label={t('admin.analytics.customers')} value={ov.customer_count?.toLocaleString() || '0'} icon={<Icon name="clients" size={18} />} accent={2} hint={`${cs.registered || 0} ${t('admin.dashboard.registered')} · ${cs.guest || 0} ${t('admin.customers.guest')}`} />
      </div>
      <Card className="mt-6">
        <CardHeader title={t('admin.analytics.salesEvolution')} subtitle={`${t('admin.analytics.dailyRevenue')} — ${period}`} />
        <div className="p-5">
          {sales.length === 0 ? <EmptyState title={t('admin.analytics.noSalesData')} description={t('admin.analytics.noSalesDesc')} /> : (
            <>
              <BarChart data={sales} height={260} />
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[color:var(--admin-border)] pt-4 sm:grid-cols-4">
                <div className="text-center"><p className="text-xs text-[color:var(--admin-muted)]">{t('admin.analytics.totalRevenue')}</p><p className="text-lg font-bold text-[color:var(--admin-text)]">{formatPrice(sales.reduce((s, d) => s + d.revenue, 0))}</p></div>
                <div className="text-center"><p className="text-xs text-[color:var(--admin-muted)]">{t('admin.analytics.totalOrders')}</p><p className="text-lg font-bold text-[color:var(--admin-text)]">{sales.reduce((s, d) => s + d.orders, 0)}</p></div>
                <div className="text-center"><p className="text-xs text-[color:var(--admin-muted)]">{t('admin.analytics.activeDays')}</p><p className="text-lg font-bold text-[color:var(--admin-text)]">{sales.length}</p></div>
                <div className="text-center"><p className="text-xs text-[color:var(--admin-muted)]">{t('admin.analytics.avgDailyRevenue')}</p><p className="text-lg font-bold text-[color:var(--admin-text)]">{formatPrice(sales.reduce((s, d) => s + d.revenue, 0) / Math.max(sales.length, 1))}</p></div>
              </div>
            </>
          )}
        </div>
      </Card>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('admin.analytics.topProducts')} subtitle={t('admin.analytics.topProductsSub')} />
          <div className="p-5">
            {topProducts.length === 0 ? <EmptyState title={t('admin.analytics.noSales')} description={t('admin.analytics.noSalesDesc')} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[color:var(--admin-border)]"><tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-[color:var(--admin-muted)]">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-[color:var(--admin-muted)]">{t('admin.reviews.product')}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-[color:var(--admin-muted)]">{t('admin.analytics.totalOrders')}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-[color:var(--admin-muted)]">CA</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[color:var(--admin-border)]">
                    {topProducts.map((p, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--admin-accent-soft)] text-xs font-bold text-[color:var(--admin-accent)]">{i + 1}</span></td>
                        <td className="px-3 py-2 font-medium text-[color:var(--admin-text)]">{p.name}</td>
                        <td className="px-3 py-2 text-right text-[color:var(--admin-text)]">{p.quantity}</td>
                        <td className="px-3 py-2 text-right font-semibold text-[color:var(--admin-text)]">{formatPrice(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title={t('admin.analytics.topCategories')} subtitle={t('admin.dashboard.byRevenue')} />
          <div className="p-5">
            {topCategories.length === 0 ? <EmptyState title={t('admin.dashboard.noData')} /> : (
              <>
                <HorizontalBarChart data={topCategories} valueKey="revenue" labelKey="name" />
                <div className="mt-4 space-y-2 border-t border-[color:var(--admin-border)] pt-4">
                  {topCategories.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-[color:var(--admin-text)]">{c.name}</span>
                      <div className="flex items-center gap-3"><span className="text-xs text-[color:var(--admin-muted)]">{c.quantity} {t('admin.dashboard.sold')}</span><span className="font-medium text-[color:var(--admin-text)]">{formatPrice(c.revenue)}</span></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('admin.analytics.orderDistribution')} subtitle={t('admin.dashboard.byStatus')} />
          <div className="p-5">
            {Object.keys(statusDist).length === 0 ? <EmptyState title={t('admin.dashboard.noOrders')} /> : <DonutChart data={statusDist} size={180} />}
          </div>
        </Card>
        <Card>
          <CardHeader title={t('admin.analytics.customerStats')} subtitle={t('admin.analytics.registeredVsGuests')} />
          <div className="p-5">
            {!cs.total ? <EmptyState title={t('admin.analytics.noCustomers')} description={t('admin.analytics.noCustomersDesc')} /> : (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-[color:var(--admin-accent-soft)] p-4 text-center"><p className="text-2xl font-bold text-[color:var(--admin-accent)]">{cs.total || 0}</p><p className="mt-1 text-xs text-[color:var(--admin-muted)]">{t('admin.analytics.total')}</p></div>
                  <div className="rounded-lg bg-blue-500/10 p-4 text-center"><p className="text-2xl font-bold text-blue-600">{cs.registered || 0}</p><p className="mt-1 text-xs text-[color:var(--admin-muted)]">{t('admin.analytics.registeredLabel')}</p></div>
                  <div className="rounded-lg bg-gray-500/10 p-4 text-center"><p className="text-2xl font-bold text-gray-600">{cs.guest || 0}</p><p className="mt-1 text-xs text-[color:var(--admin-muted)]">{t('admin.analytics.guestLabel')}</p></div>
                </div>
                {cs.total > 0 && (
                  <div>
                    <div className="mb-2 flex h-3 overflow-hidden rounded-full">
                      <div className="bg-blue-500 transition-all duration-500" style={{ width: `${((cs.registered || 0) / cs.total) * 100}%` }} />
                      <div className="bg-gray-400 transition-all duration-500" style={{ width: `${((cs.guest || 0) / cs.total) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-[color:var(--admin-muted)]">
                      <span>{t('admin.analytics.registeredLabel')} {Math.round(((cs.registered || 0) / cs.total) * 100)}%</span>
                      <span>{t('admin.analytics.guestLabel')} {Math.round(((cs.guest || 0) / cs.total) * 100)}%</span>
                    </div>
                  </div>
                )}
                <div className="rounded-lg bg-[color:var(--admin-accent-soft)]/50 p-4">
                  <p className="text-sm font-medium text-[color:var(--admin-text)]">{t('admin.analytics.insight')}</p>
                  <p className="mt-1 text-sm text-[color:var(--admin-muted)]">{(cs.guest || 0) > (cs.registered || 0) ? t('admin.analytics.insightGuests') : t('admin.analytics.insightRegistered')}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
