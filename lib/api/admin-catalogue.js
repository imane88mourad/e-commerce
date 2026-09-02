import apiClient from './client';

/**
 * Admin categories API (CategoryViewSet — full CRUD).
 */
export const adminCategoriesApi = {
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const query = qs.toString();
    return apiClient.get(`/products/categories/${query ? `?${query}` : ''}`);
  },

  get: async (id) => apiClient.get(`/products/categories/${id}/`),
  create: async (data) => apiClient.post('/products/categories/', data),
  update: async (id, data) => apiClient.put(`/products/categories/${id}/`, data),
  partialUpdate: async (id, data) => apiClient.patch(`/products/categories/${id}/`, data),
  remove: async (id) => apiClient.delete(`/products/categories/${id}/`),
};

/**
 * Admin brands API (BrandViewSet — full CRUD).
 */
export const adminBrandsApi = {
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const query = qs.toString();
    return apiClient.get(`/products/brands/${query ? `?${query}` : ''}`);
  },

  get: async (id) => apiClient.get(`/products/brands/${id}/`),
  create: async (data) => apiClient.post('/products/brands/', data),
  update: async (id, data) => apiClient.put(`/products/brands/${id}/`, data),
  partialUpdate: async (id, data) => apiClient.patch(`/products/brands/${id}/`, data),
  remove: async (id) => apiClient.delete(`/products/brands/${id}/`),
};

export default { adminCategoriesApi, adminBrandsApi };
