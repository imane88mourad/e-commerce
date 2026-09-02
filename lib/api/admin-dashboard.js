import apiClient from './client';

/**
 * Admin dashboard API — aggregates data from analytics endpoints.
 */
export const adminDashboardApi = {
  /**
   * Fetch all dashboard data in parallel.
   */
  getOverview: async (period = '30d') => {
    const [overview, sales, topProducts, topCategories, statusDist] = await Promise.allSettled([
      apiClient.get(`/orders/admin/analytics/overview/?period=${period}`),
      apiClient.get(`/orders/admin/analytics/sales/?period=${period}`),
      apiClient.get(`/orders/admin/analytics/products/?period=${period}&limit=8`),
      apiClient.get(`/orders/admin/analytics/categories/?period=${period}&limit=5`),
      apiClient.get(`/orders/admin/analytics/status/?period=${period}`),
    ]);

    const recentOrdersRes = await apiClient.get(`/orders/admin/?page_size=10&ordering=-date`).catch(() => ({ results: [] }));

    return {
      overview: overview.status === 'fulfilled' ? overview.value : null,
      sales: sales.status === 'fulfilled' ? sales.value : [],
      topProducts: topProducts.status === 'fulfilled' ? topProducts.value : [],
      topCategories: topCategories.status === 'fulfilled' ? topCategories.value : [],
      statusDistribution: statusDist.status === 'fulfilled' ? statusDist.value : {},
      recentOrders: recentOrdersRes.results || [],
      period,
    };
  },
};

export default adminDashboardApi;
