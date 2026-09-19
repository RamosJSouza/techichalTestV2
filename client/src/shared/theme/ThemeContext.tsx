import type { ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from './theme';

export function AppThemeProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>;
}
