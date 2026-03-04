import axios from 'axios';

export const http = axios.create({
  baseURL: 'http://127.0.0.1:3001',
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('pw_token') || sessionStorage.getItem('pw_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pw_token');
      sessionStorage.removeItem('pw_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
