import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Ring = styled.div`
  width: 28px;
  height: 28px;
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export function Spinner(): React.JSX.Element {
  return <Ring role="status" aria-label="Carregando" />;
}
