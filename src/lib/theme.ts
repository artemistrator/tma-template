/**
 * Converts a hex color string to HSL components.
 * Returns the Tailwind/shadcn CSS variable format: "H S% L%"
 */
function hexToHslString(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Returns "0 0% 98%" (white-ish) or "0 0% 9%" (dark) depending on
 * the perceived lightness of the given hex color.
 */
function contrastForeground(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 98%';
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  // Perceived luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '0 0% 9%' : '0 0% 98%';
}

// ── Style presets ────────────────────────────────────────────────────────

export type StyleTone = 'premium' | 'friendly' | 'bold' | 'minimal';
export type StyleDensity = 'airy' | 'balanced' | 'compact';
export type StyleVisual = 'soft' | 'sharp' | 'layered';

export interface StylePreset {
  tone: StyleTone;
  density: StyleDensity;
  visual: StyleVisual;
}

/** Default style if none specified */
export const DEFAULT_STYLE: StylePreset = { tone: 'friendly', density: 'balanced', visual: 'soft' };

const TONE_VARS: Record<StyleTone, Record<string, string>> = {
  premium: {
    '--font-weight-heading': '300',
    '--letter-spacing': '0.02em',
    '--font-weight-body': '300',
  },
  friendly: {
    '--font-weight-heading': '600',
    '--letter-spacing': '0',
    '--font-weight-body': '400',
  },
  bold: {
    '--font-weight-heading': '800',
    '--letter-spacing': '-0.01em',
    '--font-weight-body': '500',
  },
  minimal: {
    '--font-weight-heading': '400',
    '--letter-spacing': '0',
    '--font-weight-body': '400',
  },
};

const DENSITY_VARS: Record<StyleDensity, Record<string, string>> = {
  airy: {
    '--spacing-section': '32px',
    '--spacing-card': '20px',
    '--spacing-inline': '16px',
  },
  balanced: {
    '--spacing-section': '24px',
    '--spacing-card': '16px',
    '--spacing-inline': '12px',
  },
  compact: {
    '--spacing-section': '16px',
    '--spacing-card': '12px',
    '--spacing-inline': '8px',
  },
};

const VISUAL_VARS: Record<StyleVisual, Record<string, string>> = {
  soft: {
    '--radius': '16px',
    '--radius-sm': '12px',
    '--radius-lg': '24px',
    '--shadow-card': '0 4px 24px rgba(0,0,0,0.06)',
    '--shadow-button': '0 2px 8px rgba(0,0,0,0.08)',
    '--border-width': '1px',
  },
  sharp: {
    '--radius': '4px',
    '--radius-sm': '2px',
    '--radius-lg': '6px',
    '--shadow-card': 'none',
    '--shadow-button': 'none',
    '--border-width': '2px',
  },
  layered: {
    '--radius': '12px',
    '--radius-sm': '8px',
    '--radius-lg': '20px',
    '--shadow-card': '0 8px 32px rgba(0,0,0,0.10)',
    '--shadow-button': '0 4px 16px rgba(0,0,0,0.12)',
    '--border-width': '1px',
  },
};

const STYLE_VAR_KEYS = [
  '--font-weight-heading', '--letter-spacing', '--font-weight-body',
  '--spacing-section', '--spacing-card', '--spacing-inline',
  '--radius', '--radius-sm', '--radius-lg',
  '--shadow-card', '--shadow-button', '--border-width',
];

/**
 * Applies tenant theme colors and style preset to the document root as CSS variables.
 * Called after config is loaded from the API.
 *
 * Maps:
 *   config.meta.theme.primaryColor   → --primary, --primary-foreground, --ring
 *   config.meta.theme.secondaryColor → --accent, --accent-foreground
 *   config.meta.style                → --radius, --spacing-*, --font-weight-*, --shadow-*, etc.
 */
export function applyTheme(theme?: { primaryColor?: string; secondaryColor?: string }, style?: StylePreset) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (theme?.primaryColor) {
    const hsl = hexToHslString(theme.primaryColor);
    if (hsl) {
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--ring', hsl);
      root.style.setProperty('--primary-foreground', contrastForeground(theme.primaryColor));
    }
  }

  if (theme?.secondaryColor) {
    const hsl = hexToHslString(theme.secondaryColor);
    if (hsl) {
      root.style.setProperty('--accent', hsl);
      root.style.setProperty('--accent-foreground', contrastForeground(theme.secondaryColor));
    }
  }

  // Apply style preset CSS variables
  if (style) {
    const toneVars = TONE_VARS[style.tone] || TONE_VARS.friendly;
    const densityVars = DENSITY_VARS[style.density] || DENSITY_VARS.balanced;
    const visualVars = VISUAL_VARS[style.visual] || VISUAL_VARS.soft;
    const allVars = { ...toneVars, ...densityVars, ...visualVars };
    for (const [key, val] of Object.entries(allVars)) {
      root.style.setProperty(key, val);
    }
  }
}

/**
 * Resets theme CSS variables to the default shadcn values.
 * Called when tenant changes to avoid color bleed.
 */
export function resetTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-foreground');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--accent-foreground');
  for (const key of STYLE_VAR_KEYS) {
    root.style.removeProperty(key);
  }
}
