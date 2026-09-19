import 'styled-components';
import type { AppTheme } from './shared/theme/theme';

declare module 'styled-components' {
  export interface DefaultTheme extends AppTheme {}
}

interface ImportMetaEnv {
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
