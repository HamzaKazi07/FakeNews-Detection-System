import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL;
const apiClient = axios.create({ baseURL, timeout: 15000 });

export const unwrapApiData = (response) => response.data?.data ?? response.data;

export const getApiErrorMessage = (error, fallback) => {
  const responseError = error?.response?.data?.error;
  if (typeof responseError === 'string') return responseError;
  if (responseError?.message) return responseError.message;
  return fallback;
};

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiClient;
