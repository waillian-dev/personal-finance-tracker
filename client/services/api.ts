import axios from 'axios';
import Constants from 'expo-constants';
import { getItem, setItem, deleteItem } from '../utils/storage';

// Get LAN IP for Expo Go, fallback to localhost for simulator
const getBaseUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5001/api`;
  }
  return 'http://127.0.0.1:5001/api';
};

const API_URL = getBaseUrl();
console.log('API Base URL configured to:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Inject JWT token from storage
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token from storage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle auth errors (e.g. token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if unauthorized and has not retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await getItem('refreshToken');
        if (refreshToken) {
          // Attempt to get a new access token
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { token: newToken, refreshToken: newRefreshToken } = response.data.data;
          
          // Save new tokens
          await setItem('userToken', newToken);
          await setItem('refreshToken', newRefreshToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed, logging out...', refreshError);
        // Clear tokens
        await deleteItem('userToken');
        await deleteItem('refreshToken');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
