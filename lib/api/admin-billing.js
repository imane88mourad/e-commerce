import apiClient from './client';

/**
 * Admin billing API — invoices and quotes.
 *
 * Uses the existing Django billing endpoints at /api/invoices/ and /api/quotes/.
 */
export const adminInvoicesApi = {
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const query = qs.toString();
    return apiClient.get(`/invoices/${query ? `?${query}` : ''}`);
  },

  get: async (id) => apiClient.get(`/invoices/${id}/`),
  update: async (id, data) => apiClient.put(`/invoices/${id}/`, data),
  partialUpdate: async (id, data) => apiClient.patch(`/invoices/${id}/`, data),
  remove: async (id) => apiClient.delete(`/invoices/${id}/`),
  generateFromOrder: async (orderId) => apiClient.post(`/invoices/generate-from-order/${orderId}/`),
};

export const adminQuotesApi = {
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const query = qs.toString();
    return apiClient.get(`/quotes/${query ? `?${query}` : ''}`);
  },

  get: async (id) => apiClient.get(`/quotes/${id}/`),
  update: async (id, data) => apiClient.put(`/quotes/${id}/`, data),
  partialUpdate: async (id, data) => apiClient.patch(`/quotes/${id}/`, data),
  remove: async (id) => apiClient.delete(`/quotes/${id}/`),
};

/** Format a number as localized currency (DZD / DA). */
export function formatPrice(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${num.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DA`;
}

export default { adminInvoicesApi, adminQuotesApi, formatPrice };
