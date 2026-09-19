import styled from 'styled-components';

export const FooterWrapper = styled.footer`
  width: 100%;
  background: ${({ theme }) => theme.colors.canvas};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobileMax}) {
    padding: ${({ theme }) => theme.spacing.md};
    font-size: 0.75rem;
    line-height: 1.4;
  }
`;

export const FooterLink = styled.a`
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`;
