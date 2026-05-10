import axios from 'axios';
import toast from 'react-hot-toast';
import { logout } from '../store/authSlice.js';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
});

export const attachInterceptors = (store) => {
  api.interceptors.request.use((config) => {
    const token = store.getState().auth.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const message =
        error.response?.data?.message ||
        (error.code === 'ERR_NETWORK'
          ? 'Cannot reach the API server. Make sure the backend is running.'
          : 'Something went wrong');
      if (error.response?.status === 401) store.dispatch(logout());
      if (error.config?.method !== 'get') toast.error(message);
      return Promise.reject(error);
    }
  );
};
