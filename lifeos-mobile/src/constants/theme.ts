export const LightColors = {
  brand: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  ink: {
    900: '#0f172a',
    700: '#1e293b',
    500: '#475569',
    400: '#64748b',
    300: '#94a3b8',
    200: '#cbd5e1',
    100: '#e2e8f0',
  },
  surface: {
    white: '#ffffff',
    soft: '#f8fafc',
    border: '#e2e8f0',
  },
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
}

export const DarkColors = {
  brand: {
    50: '#0f172a',    // Very dark slate-blue for card/button backdrops
    100: '#1e293b',   // Medium slate-blue
    200: '#334155',   // Light-medium slate-blue
    300: '#93c5fd',   // Vibrant light blue
    400: '#60a5fa',   // Bright blue
    500: '#3b82f6',   // Primary brand blue
    600: '#60a5fa',   // High-contrast readable blue for texts in dark mode
    700: '#93c5fd',   // Super bright blue
  },
  ink: {
    900: '#f8fafc', // primary text
    700: '#e2e8f0', // secondary text
    500: '#cbd5e1', // text tertiary
    400: '#94a3b8', // muted text / placeholder
    300: '#64748b',
    200: '#334155', // dark border
    100: '#1e293b', // darker border
  },
  surface: {
    white: '#18181b',  // zinc-900 card bg
    soft: '#09090b',   // zinc-950 main page bg
    border: '#27272a', // zinc-800 border
  },
  status: {
    success: '#10b981',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
}

export const Colors = LightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
}

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
}

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
}
