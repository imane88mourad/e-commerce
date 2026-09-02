import apiClient from './client';

/**
 * Public reviews API — for product pages.
 */
export const reviewsApi = {
  /** List approved reviews for a product */
  listByProduct: async (productId, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const query = qs.toString();
    return apiClient.get(`/reviews/product/${productId}/${query ? `?${query}` : ''}`);
  },

  /** Get review stats (avg, count, distribution) for a product */
  stats: async (productId) => apiClient.get(`/reviews/product/${productId}/stats/`),

  /** Create a review (authenticated, must have purchased) */
  create: async (data) => apiClient.post('/reviews/create/', data),
};

/**
 * Admin reviews API — for /admin/reviews.
 */
export const adminReviewsApi = {
  /** List all reviews (admin, with filters) */
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const query = qs.toString();
    return apiClient.get(`/reviews/admin/${query ? `?${query}` : ''}`);
  },

  /** Moderate a review (approve/reject) */
  moderate: async (id, status) => apiClient.patch(`/reviews/admin/${id}/`, { status }),

  /** Delete a review */
  remove: async (id) => apiClient.delete(`/reviews/admin/${id}/`),
};

/**
 * Wishlist API — for authenticated users.
 */
export const wishlistApi = {
  /** List wishlist items */
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const query = qs.toString();
    return apiClient.get(`/reviews/wishlist/${query ? `?${query}` : ''}`);
  },

  /** Add a product to wishlist */
  add: async (productId) => apiClient.post('/reviews/wishlist/add/', { product_id: productId }),

  /** Remove a product from wishlist */
  remove: async (productId) => apiClient.delete(`/reviews/wishlist/remove/${productId}/`),

  /** Check if a product is in the user's wishlist */
  check: async (productId) => apiClient.get(`/reviews/wishlist/check/${productId}/`),
};
