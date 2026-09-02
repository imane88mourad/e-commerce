import apiClient from './client';

/** Format a decimal string/number as a localized currency string (DZD / DA). */
export function formatPrice(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${num.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DA`;
}

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
];

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

/** Admin-only order API (staff). */
export const adminOrdersApi = {
  /** List all orders (guests + registered). params: { search, status, payment_status, ordering, page, page_size } */
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== false) {
        qs.append(key, value);
      }
    });
    const query = qs.toString();
    return apiClient.get(`/orders/admin/${query ? `?${query}` : ''}`);
  },

  /** Fetch a single order (with items + payment). */
  get: async (id) => apiClient.get(`/orders/admin/${id}/`),

  /** Change the order status (backend applies payment side-effects). */
  updateStatus: async (id, status) => apiClient.patch(`/orders/admin/${id}/`, { status }),

  /** Admin payment action: mark-paid | mark-failed | mark-refunded */
  paymentAction: async (id, action, data = {}) =>
    apiClient.post(`/orders/admin/${id}/payment/${action}/`, data),
};

export default adminOrdersApi;
