import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor (for adding auth tokens or logging)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token != null) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    return Promise.reject(errorInstance);
  },
);

// Response interceptor (for global error handling)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const errorData: unknown = error.response?.data;
      let errorMessage: string;
      if (errorData != null) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (typeof errorData === 'object') {
          errorMessage = JSON.stringify(errorData);
        } else if (
          typeof errorData === 'number' ||
          typeof errorData === 'boolean'
        ) {
          errorMessage = String(errorData);
        } else {
          errorMessage = 'Unknown error';
        }
      } else {
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }
      console.error('API Error:', errorMessage);
      if (error.response?.status === 401) {
        // handle unauthorized
      }
    } else {
      console.error(
        'API Error:',
        error instanceof Error ? error.message : String(error),
      );
    }
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    return Promise.reject(errorInstance);
  },
);