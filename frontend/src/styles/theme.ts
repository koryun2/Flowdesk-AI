export interface AppTheme {
  fontHeading: string
  fontBody: string
  bg: string
  surface: string
  surfaceSubtle: string
  surfaceRaised: string
  text: string
  textSecondary: string
  textTertiary: string
  border: string
  borderStrong: string
  primary: string
  primaryHover: string
  primarySoft: string
  cyan: string
  cyanSoft: string
  emerald: string
  emeraldSoft: string
  amber: string
  amberSoft: string
  red: string
  redSoft: string
  violet: string
  violetSoft: string
  shadowXs: string
  shadowSm: string
  shadowMd: string
  radiusSm: string
  radiusMd: string
  radiusLg: string
  sidebarWidth: string
  sidebarCollapsed: string
  topbarHeight: string
}

export const theme: AppTheme = {
  fontHeading: "'Manrope', 'DM Sans', sans-serif",
  fontBody:
    "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  bg: '#f6f7fb',
  surface: '#ffffff',
  surfaceSubtle: '#fafbfc',
  surfaceRaised: '#ffffff',
  text: '#202337',
  textSecondary: '#626a7d',
  textTertiary: '#9399a9',
  border: '#e6e8ef',
  borderStrong: '#d9dce7',
  primary: '#4f46e5',
  primaryHover: '#4338ca',
  primarySoft: '#eeedff',
  cyan: '#0891b2',
  cyanSoft: '#e7f8fc',
  emerald: '#07866f',
  emeraldSoft: '#e9f8f3',
  amber: '#c46b0a',
  amberSoft: '#fff6df',
  red: '#dc3545',
  redSoft: '#fff0f1',
  violet: '#7c3aed',
  violetSoft: '#f3edff',
  shadowXs: '0 1px 2px rgba(31, 35, 55, 0.04)',
  shadowSm: '0 4px 14px rgba(31, 35, 55, 0.06)',
  shadowMd: '0 14px 40px rgba(31, 35, 55, 0.12)',
  radiusSm: '7px',
  radiusMd: '10px',
  radiusLg: '14px',
  sidebarWidth: '252px',
  sidebarCollapsed: '76px',
  topbarHeight: '68px',
}

export const media = {
  laptop: '@media (max-width: 1180px)',
  tablet: '@media (max-width: 960px)',
  phone: '@media (max-width: 720px)',
  small: '@media (max-width: 480px)',
} as const
