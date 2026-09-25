import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { AppSidebar } from './AppSidebar';
import { uiReducer } from '../../store/slices/uiSlice';
import { theme } from '../../shared/theme/theme';

jest.mock('../../store/store', () => ({
  useAppDispatch: () => useDispatch(),
  useAppSelector: (selector: (state: unknown) => unknown) => useSelector(selector),
}));

describe('AppSidebar', () => {
  it('mostra os três destinos com o mesmo nome acessível do rótulo', () => {
    const store = configureStore({ reducer: { ui: uiReducer } });
    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <AppSidebar />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    );

    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'Produtores' })).toHaveAttribute(
      'href',
      '/producers',
    );
    expect(screen.getByRole('link', { name: 'Novo produtor' })).toHaveAttribute(
      'href',
      '/producers/new',
    );
  });
});
