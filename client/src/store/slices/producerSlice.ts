import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ProducerFilter = 'all' | 'cpf' | 'cnpj' | 'large';

interface ProducerUiState {
  filter: ProducerFilter;
}

const initialState: ProducerUiState = {
  filter: 'all',
};

const producerSlice = createSlice({
  name: 'producer',
  initialState,
  reducers: {
    setFilter(state, action: PayloadAction<ProducerFilter>) {
      state.filter = action.payload;
    },
  },
});

export const { setFilter } = producerSlice.actions;
export const producerReducer = producerSlice.reducer;
