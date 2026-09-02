import apiClient from './client';

/**
 * Products API — matches Django URLs:
 *   GET    /api/products/              → List products (filters: category, brand, search, is_featured, etc.)
 *   POST   /api/products/              → Create product (auth)
 *   GET    /api/products/{id}/         → Product detail
 *   PUT    /api/products/{id}/         → Update product
 *   DELETE /api/products/{id}/         → Delete product
 *   GET    /api/products/categories/   → List categories
 *   POST   /api/products/categories/   → Create category
 *   GET    /api/products/brands/       → List brands
 *   POST   /api/products/brands/       → Create brand
 */
export const productsApi = {
  /** Get all products with optional filters */
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.category) queryParams.append('category', params.category);
    if (params.brand) queryParams.append('brand', params.brand);
    if (params.search) queryParams.append('search', params.search);
    if (params.price_min) queryParams.append('price_min', params.price_min);
    if (params.price_max) queryParams.append('price_max', params.price_max);
    if (params.in_stock) queryParams.append('in_stock', 'true');
    if (params.ordering) queryParams.append('ordering', params.ordering);
    if (params.is_featured) queryParams.append('is_featured', 'true');
    if (params.is_new) queryParams.append('is_new', 'true');
    if (params.is_best_seller) queryParams.append('is_best_seller', 'true');
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);

    const queryString = queryParams.toString();
    const endpoint = `/products/${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(endpoint);
  },

  /** Get single product by ID */
  getById: async (id) => {
    return apiClient.get(`/products/${id}/`);
  },

  /** Get single product by slug */
  getBySlug: async (slug) => {
    const data = await apiClient.get(`/products/?slug=${slug}`);
    if (data.results && data.results.length > 0) {
      return data.results[0];
    }
    throw new Error('Product not found');
  },

  /** Get all categories */
  getCategories: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page_size) queryParams.append('page_size', params.page_size);
    const queryString = queryParams.toString();
    return apiClient.get(`/products/categories/${queryString ? `?${queryString}` : ''}`);
  },

  /** Get all brands */
  getBrands: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page_size) queryParams.append('page_size', params.page_size);
    const queryString = queryParams.toString();
    return apiClient.get(`/products/brands/${queryString ? `?${queryString}` : ''}`);
  },

  /** Get featured products */
  getFeatured: async () => {
    return productsApi.getAll({ is_featured: 'true' });
  },

  /** Get new products */
  getNew: async () => {
    return productsApi.getAll({ is_new: 'true' });
  },

  /** Get best sellers */
  getBestSellers: async () => {
    return productsApi.getAll({ is_best_seller: 'true' });
  },

  /** Search products */
  search: async (query) => {
    return productsApi.getAll({ search: query });
  },
};

export default productsApi;
