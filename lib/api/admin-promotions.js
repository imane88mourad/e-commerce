import apiClient from './client';

/**
 * Admin promotions API.
 */
export const adminPromotionsApi = {
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const query = qs.toString();
    return apiClient.get(`/promotions/${query ? `?${query}` : ''}`);
  },

  get: async (id) => apiClient.get(`/promotions/${id}/`),
  create: async (data) => apiClient.post('/promotions/', data),
  update: async (id, data) => apiClient.put(`/promotions/${id}/`, data),
  partialUpdate: async (id, data) => apiClient.patch(`/promotions/${id}/`, data),
  remove: async (id) => apiClient.delete(`/promotions/${id}/`),
};

/**
 * Public promo validation API.
 * Works for both guests and authenticated users.
 */
export const promoApi = {
  validate: async (code, subtotal) => {
    const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');
    const res = await fetch(`${API_URL}/api/promotions/validate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Code promo invalide');
    }
    return data;
  },
};

/** Format a number as localized currency (DZD / DA). */
export function formatPrice(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${num.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DA`;
}

export default { adminPromotionsApi, promoApi, formatPrice };
