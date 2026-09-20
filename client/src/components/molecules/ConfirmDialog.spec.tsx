import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';
import { theme } from '../../shared/theme/theme';

function renderDialog(
  props: Partial<ConfirmDialogProps> = {},
): {
  onConfirm: jest.Mock;
  onCancel: jest.Mock;
} {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <ThemeProvider theme={theme}>
      <ConfirmDialog
        open
        title="Confirmar exclusão"
        message="Remover o item?"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />
    </ThemeProvider>,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('não renderiza quando open=false', () => {
    render(
      <ThemeProvider theme={theme}>
        <ConfirmDialog
          open={false}
          title="Título"
          message="Mensagem"
          onConfirm={() => undefined}
          onCancel={() => undefined}
        />
      </ThemeProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza título e mensagem quando aberto', () => {
    renderDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Confirmar exclusão' })).toBeInTheDocument();
    expect(screen.getByText('Remover o item?')).toBeInTheDocument();
  });

  it('Cancelar dispara onCancel', () => {
    const { onCancel } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('clique no overlay dispara onCancel', () => {
    const { onCancel } = renderDialog();
    fireEvent.click(screen.getByTestId('confirm-dialog-overlay'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Escape dispara onCancel', () => {
    const { onCancel } = renderDialog();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Confirmar dispara onConfirm', () => {
    const { onConfirm } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('busy desabilita botões e bloqueia Escape/overlay', () => {
    const { onCancel, onConfirm } = renderDialog({ busy: true });
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('confirm-dialog-overlay'));
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('foca o botão Cancelar ao abrir', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });
});
