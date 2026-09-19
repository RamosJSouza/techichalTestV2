import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { KpiCard } from './KpiCard';
import { theme } from '../../shared/theme/theme';

describe('KpiCard', () => {
  it('exibe label, valor e unidade', () => {
    render(
      <ThemeProvider theme={theme}>
        <KpiCard label="Área Total" value="1.250" unit="ha" />
      </ThemeProvider>,
    );
    expect(screen.getByText('Área Total')).toBeInTheDocument();
    expect(screen.getByText('1.250')).toBeInTheDocument();
    expect(screen.getByText('ha')).toBeInTheDocument();
  });
});
