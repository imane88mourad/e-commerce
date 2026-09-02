import apiClient from './client';

/**
 * Seller API — uses existing Django product/order endpoints with auth.
 * The backend has no separate seller endpoints; sellers use the same
 * product CRUD endpoints (authenticated).
 */
export const sellerApi = {
  /** Create a new product (seller must be authenticated) */
  createProduct: async (productData) => {
    // productData should be plain JSON with category_id, brand_id, etc.
    return apiClient.post('/products/', productData);
  },

  /** Update a product */
  updateProduct: async (id, productData) => {
    return apiClient.put(`/products/${id}/`, productData);
  },

  /** Delete a product */
  deleteProduct: async (id) => {
    return apiClient.delete(`/products/${id}/`);
  },

  /** Get all products (seller's products — backend filters by user) */
  getProducts: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.ordering) queryParams.append('ordering', params.ordering);
    if (params.page) queryParams.append('page', params.page);
    const qs = queryParams.toString();
    return apiClient.get(`/products/${qs ? `?${qs}` : ''}`);
  },

  /** Upload product image (multipart/form-data) */
  uploadImage: async (productId, formData) => {
    // The Django ProductImage endpoint needs to exist.
    // We'll use the existing product update endpoint with image field.
    return apiClient.upload(`/products/${productId}/`, formData);
  },

  /** Get all orders (for admin/seller) */
  getOrders: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    const qs = queryParams.toString();
    return apiClient.get(`/orders/${qs ? `?${qs}` : ''}`);
  },

  /** Update order status */
  updateOrderStatus: async (orderId, status) => {
    return apiClient.patch(`/orders/${orderId}/`, { status });
  },

  /** Get all categories */
  getCategories: async () => {
    return apiClient.get('/products/categories/');
  },

  /** Get all brands */
  getBrands: async () => {
    return apiClient.get('/products/brands/');
  },

  /** Create category */
  createCategory: async (data) => {
    return apiClient.post('/products/categories/', data);
  },

  /** Create brand */
  createBrand: async (data) => {
    return apiClient.post('/products/brands/', data);
  },
};

export default sellerApi;
