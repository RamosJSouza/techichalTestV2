import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { ProducerFormPage } from './ProducerFormPage';
import { producerReducer } from '../store/slices/producerSlice';
import { uiReducer } from '../store/slices/uiSlice';
import { theme } from '../shared/theme/theme';

const validateUnwrap = jest.fn();
const createUnwrap = jest.fn();
const updateProducerUnwrap = jest.fn();
const updateFarmUnwrap = jest.fn();
const deleteFarmUnwrap = jest.fn();
const createTrigger = jest.fn(() => ({ unwrap: createUnwrap }));
const updateProducerTrigger = jest.fn(() => ({ unwrap: updateProducerUnwrap }));
const updateFarmTrigger = jest.fn(() => ({ unwrap: updateFarmUnwrap }));
const deleteFarmTrigger = jest.fn(() => ({ unwrap: deleteFarmUnwrap }));
const navigateMock = jest.fn();

jest.mock('../store/store', () => ({
  useAppDispatch: () => useDispatch(),
  useAppSelector: (selector: (s: unknown) => unknown) => useSelector(selector),
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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
const mockCreate = useCreateProducerMutation as jest.Mock;
const mockUpdateProducer = useUpdateProducerMutation as jest.Mock;
const mockUpdateFarm = useUpdateFarmMutation as jest.Mock;
const mockDeleteFarm = useDeleteFarmMutation as jest.Mock;

function idleMutation(
  unwrap: jest.Mock = jest.fn(),
): [jest.Mock, { isLoading: boolean }] {
  return [jest.fn(() => ({ unwrap })), { isLoading: false }];
}

function createStore() {
  return configureStore({
    reducer: { producer: producerReducer, ui: uiReducer },
  });
}

function renderAt(route: string) {
  const store = createStore();
  render(
    <Provider store={store}>
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
  return store;
}

const sampleProducer = {
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
};

async function fillFarmStep(): Promise<void> {
  fireEvent.change(screen.getByLabelText(/Nome da fazenda/i), {
    target: { value: 'Fazenda Alfa' },
  });
  fireEvent.change(screen.getByLabelText(/^UF$/i), {
    target: { value: 'SP' },
  });
  fireEvent.change(screen.getByLabelText(/Cidade/i), {
    target: { value: 'Campinas' },
  });
  fireEvent.change(screen.getByLabelText(/Área total/i), {
    target: { value: '100' },
  });
  fireEvent.change(screen.getByLabelText(/Área agricultável/i), {
    target: { value: '60' },
  });
  fireEvent.change(screen.getByLabelText(/Área de vegetação/i), {
    target: { value: '20' },
  });
  fireEvent.change(screen.getByLabelText(/Ano da safra/i), {
    target: { value: '2025/2026' },
  });
}

describe('ProducerFormPage — CRUD, CAR e erro HTTP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createUnwrap.mockResolvedValue({ id: 'new-1' });
    updateProducerUnwrap.mockResolvedValue({});
    updateFarmUnwrap.mockResolvedValue({});
    deleteFarmUnwrap.mockResolvedValue({});
    validateUnwrap.mockResolvedValue({ status: 'ACTIVE' });

    mockCreate.mockReturnValue([createTrigger, { isLoading: false }]);
    mockUpdateProducer.mockReturnValue([
      updateProducerTrigger,
      { isLoading: false },
    ]);
    mockUpdateFarm.mockReturnValue([updateFarmTrigger, { isLoading: false }]);
    (useCreateFarmMutation as jest.Mock).mockReturnValue(idleMutation());
    mockDeleteFarm.mockReturnValue([deleteFarmTrigger, { isLoading: false }]);
    (useLazyListCitiesQuery as jest.Mock).mockReturnValue([
      jest.fn(),
      { data: ['Campinas', 'Ribeirão Preto'], isFetching: false },
    ]);
    mockValidate.mockReturnValue([
      () => ({ unwrap: validateUnwrap }),
      { isLoading: false },
    ]);
  });

  it('mostra título de edição e dispara Validar CAR', async () => {
    mockGet.mockReturnValue({
      data: sampleProducer,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
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

  it('Validar CAR em erro não quebra a tela (unwrap rejeita)', async () => {
    validateUnwrap.mockRejectedValueOnce({ status: 502 });
    mockGet.mockReturnValue({
      data: sampleProducer,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    renderAt('/producers/prod-1/edit');
    fireEvent.click(await screen.findByRole('button', { name: /Continuar/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Validar CAR/i }));

    await waitFor(() => {
      expect(validateUnwrap).toHaveBeenCalled();
    });
    expect(
      screen.getByRole('heading', { name: /Editar produtor/i }),
    ).toBeInTheDocument();
  });

  it('modo criação não exibe Validar CAR sem fazenda salva', () => {
    mockGet.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    renderAt('/producers/new');

    expect(
      screen.getByRole('heading', { name: /Novo produtor/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Validar CAR/i }),
    ).not.toBeInTheDocument();
  });

  it('erro HTTP ao carregar produtor exibe retry', async () => {
    const refetch = jest.fn();
    mockGet.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 503 },
      refetch,
    });

    renderAt('/producers/prod-1/edit');

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Falha ao carregar produtor/i,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/HTTP 503/);
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('create producer chama mutation e navega', async () => {
    mockGet.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const store = renderAt('/producers/new');

    fireEvent.change(screen.getByLabelText(/Nome do produtor/i), {
      target: { value: 'Produtor Novo' },
    });
    fireEvent.change(screen.getByLabelText(/CPF ou CNPJ/i), {
      target: { value: '11222333000181' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

    await fillFarmStep();

    fireEvent.click(screen.getByRole('button', { name: /Salvar tudo/i }));

    await waitFor(() => {
      expect(createTrigger).toHaveBeenCalled();
    });
    expect(navigateMock).toHaveBeenCalledWith('/producers');
    expect(store.getState().ui.toast?.message).toMatch(/Salvo com sucesso/i);
  });

  it('edit salva updateProducer + updateFarm', async () => {
    mockGet.mockReturnValue({
      data: sampleProducer,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    renderAt('/producers/prod-1/edit');
    fireEvent.click(await screen.findByRole('button', { name: /Continuar/i }));

    fireEvent.change(await screen.findByLabelText(/Nome da fazenda/i), {
      target: { value: 'Sítio Norte Atualizado' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Salvar fazenda/i }));

    await waitFor(() => {
      expect(updateProducerTrigger).toHaveBeenCalled();
      expect(updateFarmTrigger).toHaveBeenCalled();
    });
    expect(navigateMock).toHaveBeenCalledWith('/producers');
  });

  it('excluir fazenda confirma e chama deleteFarm', async () => {
    mockGet.mockReturnValue({
      data: sampleProducer,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const store = renderAt('/producers/prod-1/edit');
    fireEvent.click(await screen.findByRole('button', { name: /Continuar/i }));

    fireEvent.click(await screen.findByRole('button', { name: /^Excluir$/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /^Excluir$/i }));

    await waitFor(() => {
      expect(deleteFarmTrigger).toHaveBeenCalledWith('farm-1');
    });
    expect(store.getState().ui.toast?.message).toMatch(/Fazenda removida/i);
  });
});
