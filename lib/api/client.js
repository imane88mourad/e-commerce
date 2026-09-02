const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const TIMEOUT_MS = 15000; // 15 seconds

/**
 * Fetch wrapper with timeout, automatic token injection, and token refresh.
 */
async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach Bearer token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config = {
    ...options,
    headers,
  };

  // Timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  config.signal = controller.signal;

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    // If 401, try token refresh once
    if (response.status === 401 && typeof window !== 'undefined') {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Retry the original request with new token
        headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
        const retryResponse = await fetch(url, { ...config, headers });
        if (!retryResponse.ok) {
          const err = await retryResponse.json().catch(() => ({ detail: `HTTP ${retryResponse.status}` }));
          throw new ApiError(retryResponse.status, err.detail || err.message || `HTTP ${retryResponse.status}`);
        }
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
      throw new ApiError(response.status, error.detail || error.message || `HTTP ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) return null;

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out. Please check your connection.');
    }
    if (error instanceof ApiError) throw error;
    // Network errors, etc.
    throw new ApiError(0, error.message || 'Network error. Please try again.');
  }
}

/**
 * Try to refresh the JWT access token using the stored refresh token.
 */
async function tryRefreshToken() {
  if (typeof window === 'undefined') return false;

  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL.replace(/\/api\/?$/, '')}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!res.ok) {
      // Refresh token expired — clear auth
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return false;
    }

    const data = await res.json();
    localStorage.setItem('access_token', data.access);
    // Some implementations rotate refresh tokens
    if (data.refresh) {
      localStorage.setItem('refresh_token', data.refresh);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Custom error class with status code.
 */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const apiClient = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, data) => request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint, data) => request(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (endpoint, data) => request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

  /**
   * Upload files (multipart/form-data). Does not set Content-Type
   * so the browser sets the correct boundary.
   */
  upload: (endpoint, formData) => {
    const headers = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return request(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });
  },
};

export default apiClient;
