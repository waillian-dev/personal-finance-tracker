import axios from 'axios';
import { getItem, deleteItem } from '../utils/storage';

// Live Production Vercel API Base URL
const VERCEL_API_URL = 'https://personal-finance-tracker-silk-rho.vercel.app/api';

// Get target URL depending on environment or fallback to live Vercel API
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    const customUrl = process.env.EXPO_PUBLIC_API_URL;
    return customUrl.endsWith('/api') ? customUrl : `${customUrl}/api`;
  }
  
  // Default to live Vercel production API URL
  return VERCEL_API_URL;
};

const API_URL = getBaseUrl();
console.log('API Base URL configured to:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
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

// Response Interceptor: Handle 401 Unauthorized cleanly without refresh function
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized request (401). Clearing stored auth tokens.');
      await deleteItem('userToken');
      await deleteItem('refreshToken');
    }
    return Promise.reject(error);
  }
);

export default api;
