import { createSlice } from '@reduxjs/toolkit';

const saved = localStorage.getItem('teamflow_theme') || 'light';
document.documentElement.classList.toggle('dark', saved === 'dark');

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: saved },
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
      localStorage.setItem('teamflow_theme', state.mode);
      document.documentElement.classList.toggle('dark', state.mode === 'dark');
    }
  }
});

export const { toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
