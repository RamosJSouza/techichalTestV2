import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { ProducersDataTable } from './ProducersDataTable';
import { theme } from '../../shared/theme/theme';
import { mockProducers } from '../../shared/mocks/fixtures';

describe('ProducersDataTable', () => {
  it('exibe documento mascarado e não CPF completo', () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ProducersDataTable
            producers={mockProducers}
            onDelete={() => undefined}
          />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const doc = screen.getByTestId('masked-document');
    expect(doc.textContent).toContain('***');
    expect(doc.textContent).not.toMatch(/^\d{11}$/);
  });
});
