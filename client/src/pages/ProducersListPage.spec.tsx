import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { ProducersListPage } from './ProducersListPage';
import { producerReducer } from '../store/slices/producerSlice';
import { uiReducer } from '../store/slices/uiSlice';
import { theme } from '../shared/theme/theme';

const refetch = jest.fn();
const deleteUnwrap = jest.fn();

jest.mock('../store/store', () => ({
  useAppDispatch: () => useDispatch(),
  useAppSelector: (selector: (s: unknown) => unknown) => useSelector(selector),
}));

jest.mock('../store/api/apiSlice', () => ({
  useListProducersQuery: jest.fn(),
  useDeleteProducerMutation: jest.fn(),
  useLazySearchProducerQuery: jest.fn(),
}));

import {
  useDeleteProducerMutation,
  useLazySearchProducerQuery,
  useListProducersQuery,
} from '../store/api/apiSlice';

const mockList = useListProducersQuery as jest.Mock;
const mockDelete = useDeleteProducerMutation as jest.Mock;
const mockSearch = useLazySearchProducerQuery as jest.Mock;

function createStore() {
  return configureStore({
    reducer: { producer: producerReducer, ui: uiReducer },
  });
}

function renderPage(): void {
  render(
    <Provider store={createStore()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/producers']}>
          <ProducersListPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

describe('ProducersListPage — erro, retry e exclusão', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockReturnValue([jest.fn(), { isFetching: false }]);
    mockDelete.mockReturnValue([
      () => ({ unwrap: deleteUnwrap }),
      { isLoading: false },
    ]);
  });

  it('exibe erro HTTP e permite retry', async () => {
    mockList.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 500 },
      isFetching: false,
      refetch,
    });

    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Falha ao carregar produtores/i,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/HTTP 500/);

    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it('confirma exclusão e chama deleteProducer', async () => {
    deleteUnwrap.mockResolvedValue(undefined);
    mockList.mockReturnValue({
      data: {
        items: [
          {
            id: 'p1',
            name: 'João Silva',
            document: '***.***.***-**',
            esgStatus: 'APPROVED',
            esgCheckedAt: null,
            documentValidationStatus: 'VALIDATED',
            documentValidationPendingAt: null,
            documentValidationPendingReason: null,
            farmsCount: 1,
            farmStates: ['SP'],
            totalAreaHa: 100,
            arableAreaHa: 60,
            vegetationAreaHa: 20,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch,
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Excluir João Silva/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(deleteUnwrap).toHaveBeenCalled();
    });
  });
});
