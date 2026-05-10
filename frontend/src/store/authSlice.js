import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../api/client.js';
import { disconnectSocket } from '../api/socket.js';

const saved = JSON.parse(localStorage.getItem('teamflow_auth') || 'null');

export const login = createAsyncThunk('auth/login', async (payload) => {
  const { data } = await api.post('/auth/login', payload);
  return data;
});

export const signup = createAsyncThunk('auth/signup', async (payload) => {
  const { data } = await api.post('/auth/signup', payload);
  return data;
});

export const loadMe = createAsyncThunk('auth/me', async () => {
  const { data } = await api.get('/auth/me');
  return data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: saved?.user || null,
    token: saved?.token || null,
    status: 'idle'
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('teamflow_auth');
      disconnectSocket();
    },
    setUser(state, action) {
      state.user = action.payload;
      localStorage.setItem('teamflow_auth', JSON.stringify({ user: action.payload, token: state.token }));
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'idle';
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem('teamflow_auth', JSON.stringify(action.payload));
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem('teamflow_auth', JSON.stringify(action.payload));
      })
      .addCase(loadMe.fulfilled, (state, action) => {
        state.user = action.payload;
        localStorage.setItem('teamflow_auth', JSON.stringify({ user: action.payload, token: state.token }));
      });
  }
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;
