import apiClient from './client';

/**
 * Auth API — matches Django URLs:
 *   POST /api/auth/token/          → JWT login
 *   POST /api/users/register/      → Register (returns user data, NOT tokens)
 *   GET  /api/users/profile/       → Profile
 *   POST /api/auth/token/refresh/  → Refresh JWT
 */
export const authApi = {
  login: async (email, password) => {
    // SimpleJWT's TokenObtainPairView expects `username` + `password`.
    // Our User model uses `username` field (default from AbstractUser).
    const data = await apiClient.post('/auth/token/', {
      username: email,
      password,
    });
    return data;
  },

  register: async (userData) => {
    // Backend RegisterSerializer expects: email, username, first_name, last_name,
    // phone_number, password, password2
    // Note: Backend returns user data, NOT tokens.
    // We auto-login after registration.
    const nameParts = (userData.full_name || '').trim().split(' ');
    const firstName = nameParts[0] || userData.full_name || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const payload = {
      email: userData.email,
      username: userData.email, // Use email as username
      first_name: firstName,
      last_name: lastName,
      phone_number: userData.phone || '',
      password: userData.password,
      password2: userData.password,
    };
    const data = await apiClient.post('/users/register/', payload);

    // If the backend returned tokens, use them.
    // Otherwise, auto-login after successful registration.
    if (data.access) {
      return data;
    }

    // Auto-login: call the login endpoint with the just-registered credentials
    const loginData = await apiClient.post('/auth/token/', {
      username: userData.email,
      password: userData.password,
    });
    return loginData;
  },

  getProfile: async (token) => {
    // apiClient already attaches the token, but accept it for backward compat
    const data = await apiClient.get('/users/profile/');
    return data;
  },

  refreshToken: async (refresh) => {
    const data = await apiClient.post('/auth/token/refresh/', { refresh });
    return data;
  },
};

export default authApi;
