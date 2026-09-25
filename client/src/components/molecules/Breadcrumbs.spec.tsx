import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { Breadcrumbs } from './Breadcrumbs';
import { theme } from '../../shared/theme/theme';

function renderAt(path: string): void {
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Breadcrumbs />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('Breadcrumbs', () => {
  it('em /producers/new mostra três níveis e só os dois primeiros são links', () => {
    renderAt('/producers/new');

    const nav = screen.getByRole('navigation', { name: 'Você está em' });
    expect(nav).toHaveTextContent('Visão geral');
    expect(nav).toHaveTextContent('Produtores');
    expect(nav).toHaveTextContent('Novo produtor');

    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'Produtores' })).toHaveAttribute(
      'href',
      '/producers',
    );
    expect(
      screen.queryByRole('link', { name: 'Novo produtor' }),
    ).not.toBeInTheDocument();
  });

  it('na raiz só mostra Visão geral, sem link', () => {
    renderAt('/');
    expect(
      screen.queryByRole('link', { name: 'Visão geral' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Visão geral')).toBeInTheDocument();
  });
});
