// ClickFlash Unified Ecosystem Design System Tokens (Mapped for React Native)
export const theme = {
  colors: {
    // Base Obsidian & Slate (matches packages/ui tokens.css .dark)
    canvas: '#0b111f',     // 222.2 84% 4.9% (Ecosystem dark background)
    surface: '#0f172a',    // Tactical slate panels (card background)
    elevated: '#1e293b',   // Raised modals, active pills, borders
    border: '#1e293b',     // Ecosystem dark border
    borderLight: '#334155',
    
    // Brand / Primary & Accent (Vibrant Blue & Electric Purple)
    primary: '#3b82f6',    // Vibrant Blue (217.2 91.2% 59.8%)
    primaryGlow: 'rgba(59, 130, 246, 0.25)',
    secondary: '#2563eb',  // Royal Blue
    accent: '#8b5cf6',     // Electric Purple (263.4 70% 50.4%)
    accentGlow: 'rgba(139, 92, 246, 0.25)',
    
    // Status Colors (Matches tokens.css)
    success: '#10b981',    // Emerald 500
    successGlow: 'rgba(16, 185, 129, 0.25)',
    warning: '#f59e0b',    // Amber 500
    warningGlow: 'rgba(245, 158, 11, 0.25)',
    danger: '#ef4444',     // Red 500
    dangerGlow: 'rgba(239, 68, 68, 0.25)',
    
    // Typography
    textHeader: '#f8fafc', // High contrast white for outdoor sunlight
    textMuted: '#94a3b8',  // Slate 400 secondary text
    textSubtle: '#64748b', // Slate 500
    textTelemetry: '#38bdf8' // Sky 400 numerical readout
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    minTouch: 48,          // Mandatory 48dp minimum touch target height
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    round: 9999,
  }
};
