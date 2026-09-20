import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { CityAutocomplete } from './CityAutocomplete';
import { theme } from '../../shared/theme/theme';

jest.mock('../../store/api/apiSlice', () => ({
  useLazyListCitiesQuery: () => [
    () => undefined,
    { data: ['Ribeirão Preto', 'São Paulo', 'Campinas'], isFetching: false },
  ],
}));

function renderWithProviders(
  props: Partial<React.ComponentProps<typeof CityAutocomplete>> = {},
) {
  return render(
    <ThemeProvider theme={theme}>
      <CityAutocomplete
        uf="SP"
        value=""
        onChange={() => {}}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('CityAutocomplete', () => {
  it('renderiza o input de cidade', () => {
    renderWithProviders();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renderiza mensagem de erro quando informada', () => {
    renderWithProviders({ error: 'Cidade obrigatória' });
    expect(screen.getByRole('alert')).toHaveTextContent('Cidade obrigatória');
  });

  it('permite digitar texto livre (modo híbrido)', () => {
    const onChange = jest.fn();
    renderWithProviders({ onChange });
    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Cidade Inexistível' } });
    expect(onChange).toHaveBeenCalledWith('Cidade Inexistível');
  });
});
