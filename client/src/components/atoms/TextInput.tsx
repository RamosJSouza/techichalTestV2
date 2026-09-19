import { forwardRef, useId } from 'react';
import styled from 'styled-components';

const Wrapper = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const Input = styled.input`
  height: 40px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.15);
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const Hint = styled.span`
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.75rem;
`;

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Precisa de forwardRef: React Hook Form `register()` passa `ref` para
 * sincronizar o DOM. Sem isso, o input mostra texto mas getValues() fica
 * undefined → Zod "Nome/Documento obrigatório".
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ label, error, id, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? `${autoId}-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <Wrapper htmlFor={inputId}>
        {label}
        <Input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          {...rest}
        />
        {error ? <Hint role="alert">{error}</Hint> : null}
      </Wrapper>
    );
  },
);
