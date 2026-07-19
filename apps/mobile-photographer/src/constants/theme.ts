export const Colors = {
  light: {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    background: '#070a12', // bg.canvas
    surface: '#0f172a', // bg.surface
    elevated: '#1e293b', // bg.elevated
    tint: '#06b6d4', // accent.primary
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    // Compatibility aliases
    backgroundElement: '#1e293b',
    backgroundSelected: '#0f4c75',
  },
  dark: {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    background: '#070a12',
    surface: '#0f172a',
    elevated: '#1e293b',
    tint: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    // Compatibility aliases
    backgroundElement: '#1e293b',
    backgroundSelected: '#0f4c75',
  },
};

export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
  eight: 64,
};

export const BottomTabInset = 60;
export const MaxContentWidth = 600;

export const Typography = {
  fontMono: 'monospace',
  fontSans: 'sans-serif',
};

export type ThemeColor = keyof typeof Colors.light;
