import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { useForm } from 'react-hook-form';
import { TextInput } from './TextInput';
import { theme } from '../../shared/theme/theme';
import { wizardStep0Schema } from '../../shared/schemas/producer.schemas';

function ProbeForm({
  onProbe,
}: {
  onProbe: (values: { name?: string; document?: string }) => void;
}): React.JSX.Element {
  const { register, getValues } = useForm({
    defaultValues: { name: '', document: '' },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onProbe(getValues());
      }}
    >
      <TextInput label="Nome do produtor" {...register('name')} />
      <TextInput label="CPF ou CNPJ" {...register('document')} />
      <button type="submit">Continuar</button>
    </form>
  );
}

describe('TextInput + RHF register (PoC)', () => {
  it('sincroniza valores digitados via ref (getValues não fica undefined)', async () => {
    const user = userEvent.setup();
    const onProbe = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <ProbeForm onProbe={onProbe} />
      </ThemeProvider>,
    );

    await user.type(
      screen.getByLabelText('Nome do produtor'),
      'Ramos de Souza Janones',
    );
    await user.type(screen.getByLabelText('CPF ou CNPJ'), '034.729.256-98');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(onProbe).toHaveBeenCalledWith({
      name: 'Ramos de Souza Janones',
      document: '034.729.256-98',
    });

    const parsed = wizardStep0Schema.safeParse(onProbe.mock.calls[0][0]);
    expect(parsed.success).toBe(true);
  });
});
