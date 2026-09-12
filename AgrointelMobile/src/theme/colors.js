// Design system color tokens — Modern Clean AgTech SaaS (Dark Theme)
export const colors = {
  // Backgrounds
  bg: {
    primary: '#0F172A',     // Deep slate (main background)
    card: '#1E293B',        // Card surfaces
    input: '#0F172A',       // Input fields
    elevated: '#334155',    // Elevated surfaces
  },

  // Borders
  border: {
    default: '#334155',
    subtle: '#1E293B',
    focus: '#10B981',
  },

  // Brand / Accent
  accent: {
    primary: '#10B981',     // Emerald green (main brand)
    secondary: '#059669',   // Deeper emerald
    bright: '#22C55E',      // Vibrant green
    teal: '#14B8A6',        // Teal accent
    gradient: ['#10B981', '#059669'], // Gradient pair
  },

  // Severity badges
  severity: {
    healthy: '#10B981',
    healthyBg: '#064E3B',
    moderate: '#F59E0B',
    moderateBg: '#78350F',
    severe: '#EF4444',
    severeBg: '#7F1D1D',
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#94A3B8',
    muted: '#64748B',
    accent: '#10B981',
    danger: '#EF4444',
  },

  // Status
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Tab bar
  tab: {
    active: '#10B981',
    inactive: '#64748B',
    background: '#0F172A',
    border: '#1E293B',
  },
};

export default colors;
