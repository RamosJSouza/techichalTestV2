import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { Button } from './Button';
import { theme } from '../../shared/theme/theme';

describe('Button', () => {
  it('renderiza variante primary', () => {
    render(
      <ThemeProvider theme={theme}>
        <Button>Salvar</Button>
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('respeita disabled', () => {
    render(
      <ThemeProvider theme={theme}>
        <Button disabled>Salvar</Button>
      </ThemeProvider>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
