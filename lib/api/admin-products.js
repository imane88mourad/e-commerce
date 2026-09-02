import apiClient from './client';

/** Resolve a relative /media/... or /api/... URL to a full absolute URL. */
export function resolveMediaUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

/** Format a decimal string/number as a localized currency string (DZD / DA). */
export function formatPrice(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${num.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DA`;
}

/**
 * Back-office admin product API.
 *
 * Uses the dedicated /products/admin/* endpoints backed by the
 * ProductAdminViewSet (admin-only, includes inactive products) plus the
 * dedicated media endpoints for image/document management.
 */
export const adminProductsApi = {
  /**
   * Fetch all products (including inactive).
   * params: { search, category, brand, is_active, is_featured, is_new, is_best_seller,
   *           ordering, page, page_size, price_min, price_max, in_stock, best_seller }
   */
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== false) {
        qs.append(key, value);
      }
    });
    const query = qs.toString();
    return apiClient.get(`/products/admin/${query ? `?${query}` : ''}`);
  },

  /** Fetch a single product (including inactive) */
  get: async (id) => apiClient.get(`/products/admin/${id}/`),

  /** Create a product */
  create: async (data) => apiClient.post('/products/admin/', data),

  /** Update a product (full update) */
  update: async (id, data) => apiClient.put(`/products/admin/${id}/`, data),

  /** Partially update a product (used for activate/deactivate toggle) */
  partialUpdate: async (id, data) => apiClient.patch(`/products/admin/${id}/`, data),

  /** Delete a product */
  remove: async (id) => apiClient.delete(`/products/admin/${id}/`),

  /** Upload a product image (multipart: image, alt_text, display_order) */
  uploadImage: async (productId, formData) =>
    apiClient.upload(`/products/admin/${productId}/images/`, formData),

  /** Delete a product image */
  deleteImage: async (imageId) => apiClient.delete(`/products/images/${imageId}/`),

  /** Add a product document ({ name, file }) */
  createDocument: async (productId, data) =>
    apiClient.post(`/products/admin/${productId}/documents/`, data),

  /** Delete a product document */
  deleteDocument: async (documentId) => apiClient.delete(`/products/documents/${documentId}/`),
};

export default adminProductsApi;
