import apiClient from './client';

/**
 * Admin analytics API.
 *
 * All data is computed server-side in PostgreSQL via Django ORM aggregations.
 */
export const adminAnalyticsApi = {
  /** Dashboard overview KPIs */
  getOverview: async (period = '30d') => {
    const data = await apiClient.get(`/orders/admin/analytics/overview/?period=${period}`);
    return data;
  },

  /** Sales over time (daily revenue + order count) */
  getSales: async (period = '30d') => {
    const data = await apiClient.get(`/orders/admin/analytics/sales/?period=${period}`);
    return data;
  },

  /** Top selling products */
  getTopProducts: async (period = '30d', limit = 10) => {
    const data = await apiClient.get(`/orders/admin/analytics/products/?period=${period}&limit=${limit}`);
    return data;
  },

  /** Top categories by revenue */
  getTopCategories: async (period = '30d', limit = 10) => {
    const data = await apiClient.get(`/orders/admin/analytics/categories/?period=${period}&limit=${limit}`);
    return data;
  },

  /** Order status distribution */
  getStatusDistribution: async (period = '30d') => {
    const data = await apiClient.get(`/orders/admin/analytics/status/?period=${period}`);
    return data;
  },

  /** Customer stats (registered vs guest) */
  getCustomerStats: async (period = '30d') => {
    const data = await apiClient.get(`/orders/admin/analytics/customers/?period=${period}`);
    return data;
  },
};

export default adminAnalyticsApi;
