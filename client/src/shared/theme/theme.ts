export const theme = {
  colors: {
    primary: '#2E7D32',
    primaryDark: '#1B5E20',
    secondary: '#8D6E63',
    tertiary: '#F9A825',
    canvas: '#F8F9FA',
    surface: '#FFFFFF',
    softTint: '#E8F5E9',
    border: '#E0E0E0',
    borderSubtle: '#EEEEEE',
    text: '#212529',
    textSecondary: '#616161',
    success: '#2E7D32',
    successBg: '#E8F5E9',
    danger: '#D32F2F',
    dangerBg: '#FFEBEE',
    info: '#1976D2',
    infoBg: '#E3F2FD',
    hoverRow: '#F1F8E9',
  },
  radii: {
    sm: '0.25rem',
    md: '0.5rem',
    full: '9999px',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  layout: {
    sidebarWidth: '260px',
    sidebarCollapsed: '72px',
    headerHeight: '64px',
    canvasMax: '1680px',
  },
  /** DESIGN.md: mobile <768, tablet 768–1279, desktop ≥1280 */
  breakpoints: {
    mobileMax: '767px',
    tabletMax: '1279px',
    desktopMin: '1280px',
  },
  shadows: {
    level0: 'none',
    level1:
      '0 1px 3px rgba(33, 37, 41, 0.04), 0 1px 2px rgba(33, 37, 41, 0.02)',
    level2:
      '0 4px 12px rgba(33, 37, 41, 0.08), 0 2px 4px rgba(33, 37, 41, 0.04)',
    level3:
      '0 8px 24px rgba(33, 37, 41, 0.12), 0 4px 8px rgba(33, 37, 41, 0.06)',
    level4:
      '0 16px 40px rgba(33, 37, 41, 0.16), 0 8px 16px rgba(33, 37, 41, 0.08)',
  },
  typography: {
    fontFamily: "'Inter', system-ui, sans-serif",
  },
} as const;

export type AppTheme = typeof theme;
