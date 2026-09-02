import apiClient from './client';

/**
 * Orders API — matches Django URLs:
 *   GET  /api/orders/                → List user orders (auth)
 *   POST /api/orders/create/         → Create order (auth, uses Cart)
 *   GET  /api/orders/{id}/           → Order detail (auth)
 *   POST /api/orders/guest/          → Create guest order (no auth)
 *   GET  /api/orders/guest/{id}/     → Guest order detail (by email)
 */
export const ordersApi = {
  /** List orders for authenticated user */
  getAll: async () => {
    return apiClient.get('/orders/');
  },

  /** Get single order by ID (authenticated) */
  getById: async (id) => {
    return apiClient.get(`/orders/${id}/`);
  },

  /** Create order from authenticated user's cart */
  create: async (data) => {
    return apiClient.post('/orders/create/', data);
  },

  /** Create guest order (no auth required) */
  createGuest: async (data) => {
    // Guest order endpoint doesn't need auth headers
    const { default: client } = await import('./client');
    const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');
    const res = await fetch(`${API_URL}/api/orders/guest/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      throw new Error(err.detail || err.error || JSON.stringify(err));
    }
    return res.json();
  },

  /** Get guest order by ID + email */
  getGuestById: async (id, email) => {
    const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');
    const res = await fetch(`${API_URL}/api/orders/guest/${id}/?email=${encodeURIComponent(email)}`);
    if (!res.ok) {
      throw new Error('Order not found');
    }
    return res.json();
  },
};

export default ordersApi;
