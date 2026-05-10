import { configureStore } from '@reduxjs/toolkit';
import { attachInterceptors } from '../api/client.js';
import authReducer from './authSlice.js';
import notificationReducer from './notificationSlice.js';
import themeReducer from './themeSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationReducer,
    theme: themeReducer
  }
});

attachInterceptors(store);
