"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

// Define the theme palette structure
export interface ThemePalette {
  // Core colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;

  // Primary colors
  primary: string;
  primaryForeground: string;

  // Secondary colors
  secondary: string;
  secondaryForeground: string;

  // Muted colors
  muted: string;
  mutedForeground: string;

  // Accent colors
  accent: string;
  accentForeground: string;

  // Status colors
  destructive: string;
  destructiveForeground: string;

  // UI colors
  border: string;
  input: string;
  ring: string;

  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;

  // Sidebar colors
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
}

// Custom EMS theme palettes
export const emsLightPalette: ThemePalette = {
  background: 'oklch(1 0 0)',
  foreground: 'oklch(0.129 0.042 264.695)',
  card: 'oklch(1 0 0)',
  cardForeground: 'oklch(0.129 0.042 264.695)',
  popover: 'oklch(1 0 0)',
  popoverForeground: 'oklch(0.129 0.042 264.695)',
  primary: 'oklch(0.208 0.042 265.755)',
  primaryForeground: 'oklch(0.984 0.003 247.858)',
  secondary: 'oklch(0.968 0.007 247.896)',
  secondaryForeground: 'oklch(0.208 0.042 265.755)',
  muted: 'oklch(0.968 0.007 247.896)',
  mutedForeground: 'oklch(0.554 0.046 257.417)',
  accent: 'oklch(0.968 0.007 247.896)',
  accentForeground: 'oklch(0.208 0.042 265.755)',
  destructive: 'oklch(0.577 0.245 27.325)',
  destructiveForeground: 'oklch(0.984 0.003 247.858)',
  border: 'oklch(0.929 0.013 255.508)',
  input: 'oklch(0.929 0.013 255.508)',
  ring: 'oklch(0.704 0.04 256.788)',
  chart1: 'oklch(0.646 0.222 41.116)',
  chart2: 'oklch(0.6 0.118 184.704)',
  chart3: 'oklch(0.398 0.07 227.392)',
  chart4: 'oklch(0.828 0.189 84.429)',
  chart5: 'oklch(0.769 0.188 70.08)',
  sidebar: 'oklch(0.984 0.003 247.858)',
  sidebarForeground: 'oklch(0.129 0.042 264.695)',
  sidebarPrimary: 'oklch(0.208 0.042 265.755)',
  sidebarPrimaryForeground: 'oklch(0.984 0.003 247.858)',
  sidebarAccent: 'oklch(0.968 0.007 247.896)',
  sidebarAccentForeground: 'oklch(0.208 0.042 265.755)',
  sidebarBorder: 'oklch(0.929 0.013 255.508)',
  sidebarRing: 'oklch(0.704 0.04 256.788)',
};

export const emsDarkPalette: ThemePalette = {
  background: 'oklch(0.129 0.042 264.695)',
  foreground: 'oklch(0.984 0.003 247.858)',
  card: 'oklch(0.208 0.042 265.755)',
  cardForeground: 'oklch(0.984 0.003 247.858)',
  popover: 'oklch(0.208 0.042 265.755)',
  popoverForeground: 'oklch(0.984 0.003 247.858)',
  primary: 'oklch(0.929 0.013 255.508)',
  primaryForeground: 'oklch(0.208 0.042 265.755)',
  secondary: 'oklch(0.279 0.041 260.031)',
  secondaryForeground: 'oklch(0.984 0.003 247.858)',
  muted: 'oklch(0.279 0.041 260.031)',
  mutedForeground: 'oklch(0.704 0.04 256.788)',
  accent: 'oklch(0.279 0.041 260.031)',
  accentForeground: 'oklch(0.984 0.003 247.858)',
  destructive: 'oklch(0.704 0.191 22.216)',
  destructiveForeground: 'oklch(0.984 0.003 247.858)',
  border: 'oklch(1 0 0 / 10%)',
  input: 'oklch(1 0 0 / 15%)',
  ring: 'oklch(0.551 0.027 264.364)',
  chart1: 'oklch(0.488 0.243 264.376)',
  chart2: 'oklch(0.696 0.17 162.48)',
  chart3: 'oklch(0.769 0.188 70.08)',
  chart4: 'oklch(0.627 0.265 303.9)',
  chart5: 'oklch(0.645 0.246 16.439)',
  sidebar: 'oklch(0.208 0.042 265.755)',
  sidebarForeground: 'oklch(0.984 0.003 247.858)',
  sidebarPrimary: 'oklch(0.488 0.243 264.376)',
  sidebarPrimaryForeground: 'oklch(0.984 0.003 247.858)',
  sidebarAccent: 'oklch(0.279 0.041 260.031)',
  sidebarAccentForeground: 'oklch(0.984 0.003 247.858)',
  sidebarBorder: 'oklch(1 0 0 / 10%)',
  sidebarRing: 'oklch(0.551 0.027 264.364)',
};

// Theme context interface
interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  palette: ThemePalette;
  isDark: boolean;
  isLight: boolean;
  isSystem: boolean;
}

// Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
  enableSystem?: boolean;
  attribute?: "class" | "data-theme";
  disableTransitionOnChange?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  enableSystem = true,
  attribute = 'class',
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  // Get the current palette based on the resolved theme
  const palette = resolvedTheme === 'dark' ? emsDarkPalette : emsLightPalette;

  // Apply CSS variables to the document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Apply all palette colors as CSS variables
    Object.entries(palette).forEach(([key, value]) => {
      const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVarName, value);
    });

    // Set the theme attribute
    if (attribute === 'class') {
      root.classList.remove('light', 'dark');
      if (resolvedTheme) {
        root.classList.add(resolvedTheme);
      }
    } else if (attribute === 'data-theme') {
      root.setAttribute('data-theme', resolvedTheme || 'light');
    }
  }, [palette, resolvedTheme, attribute, mounted]);

  // Handle mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  const contextValue: ThemeContextType = {
    theme: theme || defaultTheme,
    setTheme,
    palette,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system',
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the EMS theme context
export function useEMSTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return a default context during SSR or when provider is not available
    return {
      theme: 'system',
      setTheme: () => {},
      palette: emsLightPalette,
      isDark: false,
      isLight: true,
      isSystem: true,
    };
  }
  return context;
}

// Utility function to get color value from palette
export function getThemeColor(colorKey: keyof ThemePalette, palette: ThemePalette): string {
  return palette[colorKey];
}

// Utility function to create CSS custom properties
export function createThemeCSS(palette: ThemePalette): Record<string, string> {
  const cssVars: Record<string, string> = {};
  Object.entries(palette).forEach(([key, value]) => {
    const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    cssVars[cssVarName] = value;
  });
  return cssVars;
}
