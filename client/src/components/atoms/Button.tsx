import { forwardRef } from 'react';
import styled, { css } from 'styled-components';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const StyledButton = styled.button<{ $variant: ButtonVariant }>`
  height: 40px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 120ms ease, border-color 120ms ease;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  ${({ theme, $variant }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: ${theme.colors.primary};
          color: #fff;
          &:hover:not(:disabled) {
            background: ${theme.colors.primaryDark};
          }
        `;
      case 'danger':
        return css`
          background: ${theme.colors.danger};
          color: #fff;
        `;
      case 'secondary':
        return css`
          background: ${theme.colors.surface};
          border-color: ${theme.colors.border};
          color: ${theme.colors.text};
          &:hover:not(:disabled) {
            background: ${theme.colors.canvas};
          }
        `;
      default: {
        const _exhaustive: never = $variant;
        return _exhaustive;
      }
    }
  }}
`;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = 'primary', children, ...rest }, ref) {
    return (
      <StyledButton ref={ref} type="button" $variant={variant} {...rest}>
        {children}
      </StyledButton>
    );
  },
);
