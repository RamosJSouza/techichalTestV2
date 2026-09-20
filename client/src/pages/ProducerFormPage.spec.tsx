import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { ProducerFormPage } from './ProducerFormPage';
import { producerReducer } from '../store/slices/producerSlice';
import { uiReducer } from '../store/slices/uiSlice';
import { theme } from '../shared/theme/theme';

const validateUnwrap = jest.fn();

jest.mock('../store/store', () => ({
  useAppDispatch: () => useDispatch(),
  useAppSelector: (selector: (s: unknown) => unknown) => useSelector(selector),
}));

jest.mock('../store/api/apiSlice', () => ({
  useGetProducerQuery: jest.fn(),
  useCreateProducerMutation: jest.fn(),
  useUpdateProducerMutation: jest.fn(),
  useUpdateFarmMutation: jest.fn(),
  useCreateFarmMutation: jest.fn(),
  useDeleteFarmMutation: jest.fn(),
  useValidateFarmCarMutation: jest.fn(),
  useLazyListCitiesQuery: jest.fn(),
}));

import {
  useCreateFarmMutation,
  useCreateProducerMutation,
  useDeleteFarmMutation,
  useGetProducerQuery,
  useLazyListCitiesQuery,
  useUpdateFarmMutation,
  useUpdateProducerMutation,
  useValidateFarmCarMutation,
} from '../store/api/apiSlice';

const mockGet = useGetProducerQuery as jest.Mock;
const mockValidate = useValidateFarmCarMutation as jest.Mock;

function idleMutation(): [jest.Mock, { isLoading: boolean }] {
  return [jest.fn(() => ({ unwrap: jest.fn() })), { isLoading: false }];
}

function createStore() {
  return configureStore({
    reducer: { producer: producerReducer, ui: uiReducer },
  });
}

function renderAt(route: string): void {
  render(
    <Provider store={createStore()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/producers/new" element={<ProducerFormPage />} />
            <Route path="/producers/:id/edit" element={<ProducerFormPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

describe('ProducerFormPage — edição e validação CAR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCreateProducerMutation as jest.Mock).mockReturnValue(idleMutation());
    (useUpdateProducerMutation as jest.Mock).mockReturnValue(idleMutation());
    (useUpdateFarmMutation as jest.Mock).mockReturnValue(idleMutation());
    (useCreateFarmMutation as jest.Mock).mockReturnValue(idleMutation());
    (useDeleteFarmMutation as jest.Mock).mockReturnValue(idleMutation());
    (useLazyListCitiesQuery as jest.Mock).mockReturnValue([
      jest.fn(),
      { data: [], isFetching: false },
    ]);
    validateUnwrap.mockResolvedValue({ status: 'ACTIVE' });
    mockValidate.mockReturnValue([
      () => ({ unwrap: validateUnwrap }),
      { isLoading: false },
    ]);
  });

  it('mostra título de edição e dispara Validar CAR', async () => {
    mockGet.mockReturnValue({
      data: {
        id: 'prod-1',
        name: 'Fazenda Teste Ltda',
        document: '12.345.678/0001-90',
        documentType: 'CNPJ',
        farms: [
          {
            id: 'farm-1',
            name: 'Sítio Norte',
            city: 'Ribeirão Preto',
            state: 'SP',
            totalArea: 100,
            arableArea: 60,
            vegetationArea: 20,
            carNumber: 'SP-1234567-ABCDEF',
            carStatus: null,
            harvests: [{ year: '2025/2026', crops: ['Soja'] }],
          },
        ],
      },
      isLoading: false,
    });

    renderAt('/producers/prod-1/edit');

    expect(
      await screen.findByRole('heading', { name: /Editar produtor/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

    const carBtn = await screen.findByRole('button', { name: /Validar CAR/i });
    fireEvent.click(carBtn);

    await waitFor(() => {
      expect(validateUnwrap).toHaveBeenCalled();
    });
  });

  it('modo criação não exibe Validar CAR sem fazenda salva', () => {
    mockGet.mockReturnValue({ data: undefined, isLoading: false });

    renderAt('/producers/new');

    expect(
      screen.getByRole('heading', { name: /Novo produtor/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Validar CAR/i }),
    ).not.toBeInTheDocument();
  });
});
