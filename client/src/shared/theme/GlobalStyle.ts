import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { margin: 0; padding: 0; min-height: 100%; }
  body {
    font-family: ${({ theme }) => theme.typography.fontFamily};
    background: ${({ theme }) => theme.colors.canvas};
    color: ${({ theme }) => theme.colors.text};
    -webkit-font-smoothing: antialiased;
  }
  button, input, select, textarea { font: inherit; }
  a { color: inherit; text-decoration: none; }
`;
