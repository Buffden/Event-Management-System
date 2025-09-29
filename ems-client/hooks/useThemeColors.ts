"use client";

import { useEMSTheme } from '@/contexts/ThemeContext';
import { ThemePalette } from '@/contexts/ThemeContext';

// Hook to get specific theme colors
export function useThemeColors() {
  const { palette, isDark, isLight } = useEMSTheme();

  return {
    // Core colors
    background: palette.background,
    foreground: palette.foreground,
    card: palette.card,
    cardForeground: palette.cardForeground,
    popover: palette.popover,
    popoverForeground: palette.popoverForeground,

    // Primary colors
    primary: palette.primary,
    primaryForeground: palette.primaryForeground,

    // Secondary colors
    secondary: palette.secondary,
    secondaryForeground: palette.secondaryForeground,

    // Muted colors
    muted: palette.muted,
    mutedForeground: palette.mutedForeground,

    // Accent colors
    accent: palette.accent,
    accentForeground: palette.accentForeground,

    // Status colors
    destructive: palette.destructive,
    destructiveForeground: palette.destructiveForeground,

    // UI colors
    border: palette.border,
    input: palette.input,
    ring: palette.ring,

    // Chart colors
    chart1: palette.chart1,
    chart2: palette.chart2,
    chart3: palette.chart3,
    chart4: palette.chart4,
    chart5: palette.chart5,

    // Sidebar colors
    sidebar: palette.sidebar,
    sidebarForeground: palette.sidebarForeground,
    sidebarPrimary: palette.sidebarPrimary,
    sidebarPrimaryForeground: palette.sidebarPrimaryForeground,
    sidebarAccent: palette.sidebarAccent,
    sidebarAccentForeground: palette.sidebarAccentForeground,
    sidebarBorder: palette.sidebarBorder,
    sidebarRing: palette.sidebarRing,

    // Theme state
    isDark,
    isLight,
  };
}

// Hook to get a specific color by key
export function useThemeColor(colorKey: keyof ThemePalette) {
  const { palette } = useEMSTheme();
  return palette[colorKey];
}

// Hook to get color with opacity
export function useThemeColorWithOpacity(colorKey: keyof ThemePalette, opacity: number = 1) {
  const color = useThemeColor(colorKey);

  // Handle OKLCH colors with opacity
  if (color.startsWith('oklch(')) {
    return color.replace('oklch(', `oklch(${opacity} `);
  }

  // Handle other color formats
  return color;
}

// Hook to get semantic color combinations
export function useSemanticColors() {
  const colors = useThemeColors();

  return {
    // Text colors
    text: {
      primary: colors.foreground,
      secondary: colors.mutedForeground,
      disabled: colors.mutedForeground,
      inverse: colors.background,
    },

    // Background colors
    background: {
      primary: colors.background,
      secondary: colors.card,
      tertiary: colors.muted,
      inverse: colors.foreground,
    },

    // Interactive colors
    interactive: {
      primary: colors.primary,
      primaryHover: colors.primary, // You might want to add hover variants
      secondary: colors.secondary,
      secondaryHover: colors.secondary,
      destructive: colors.destructive,
      destructiveHover: colors.destructive,
    },

    // Border colors
    border: {
      primary: colors.border,
      secondary: colors.muted,
      focus: colors.ring,
      error: colors.destructive,
    },

    // Status colors
    status: {
      success: colors.chart2, // Using chart2 as success
      warning: colors.chart4, // Using chart4 as warning
      error: colors.destructive,
      info: colors.chart3, // Using chart3 as info
    },
  };
}
