import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ToastState {
  message: string;
  variant: 'success' | 'error' | 'info';
}

interface UiState {
  sidebarCollapsed: boolean;
  wizardStep: number;
  toast: ToastState | null;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  wizardStep: 0,
  toast: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    setWizardStep(state, action: PayloadAction<number>) {
      state.wizardStep = action.payload;
    },
    showToast(state, action: PayloadAction<ToastState>) {
      state.toast = action.payload;
    },
    clearToast(state) {
      state.toast = null;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setWizardStep,
  showToast,
  clearToast,
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
