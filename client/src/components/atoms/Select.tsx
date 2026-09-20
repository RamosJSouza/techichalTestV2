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

const SelectElement = styled.select`
  height: 40px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: 0.9375rem;

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

interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, id, children, ...rest }, ref) {
    const autoId = useId();
    const selectId = id ?? `${autoId}-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <Wrapper htmlFor={selectId}>
        {label}
        <SelectElement
          id={selectId}
          ref={ref}
          aria-invalid={Boolean(error)}
          {...rest}
        >
          {children}
        </SelectElement>
        {error ? <Hint role="alert">{error}</Hint> : null}
      </Wrapper>
    );
  },
);
