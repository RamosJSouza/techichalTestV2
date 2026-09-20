import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { Select } from './Select';
import { theme } from '../../shared/theme/theme';

function renderSelect(props: Partial<React.ComponentProps<typeof Select>> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <Select label="UF" data-testid="uf" {...props}>
        <option value="">Selecione</option>
        <option value="SP">SP</option>
      </Select>
    </ThemeProvider>,
  );
}

describe('Select', () => {
  it('renderiza o label e o select', () => {
    renderSelect();
    expect(screen.getByText('UF')).toBeInTheDocument();
    expect(screen.getByTestId('uf')).toBeInTheDocument();
  });

  it('renderiza mensagem de erro quando informada', () => {
    renderSelect({ error: 'UF obrigatória' });
    expect(screen.getByRole('alert')).toHaveTextContent('UF obrigatória');
  });

  it('gera id estável para o select', () => {
    renderSelect();
    const select = screen.getByTestId('uf');
    expect(select.id).toBeTruthy();
  });
});
