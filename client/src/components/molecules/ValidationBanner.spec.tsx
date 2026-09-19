import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { ValidationBanner } from './ValidationBanner';
import { theme } from '../../shared/theme/theme';

describe('ValidationBanner', () => {
  it('mostra estado válido', () => {
    render(
      <ThemeProvider theme={theme}>
        <ValidationBanner valid message="Áreas ok" />
      </ThemeProvider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Áreas ok');
  });
});
