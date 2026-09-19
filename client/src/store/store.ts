import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { apiSlice } from './api/apiSlice';
import { rtkQueryErrorMiddleware } from './api/rtkQueryErrorMiddleware';
import { producerReducer } from './slices/producerSlice';
import { uiReducer } from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    ui: uiReducer,
    producer: producerReducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(apiSlice.middleware, rtkQueryErrorMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
