# EMS Theme System

This document describes the custom theme system implemented for the EMS client application.

## Overview

The EMS theme system provides a comprehensive solution for managing themes and colors throughout the application. It replaces the default shadcn/ui theme with a custom OKLCH-based color palette that offers better color consistency and accessibility.

## Key Features

- **Custom OKLCH Color Palette**: Uses OKLCH color space for better color consistency
- **Dynamic Theme Switching**: Supports light, dark, and system themes
- **Type-Safe Theme Context**: Full TypeScript support with proper type definitions
- **Semantic Color System**: Provides semantic color names for consistent usage
- **CSS Variable Integration**: Automatically applies theme colors as CSS custom properties

## Architecture

### Core Components

1. **ThemeContext** (`contexts/ThemeContext.tsx`)
   - Main theme context provider
   - Manages theme state and color palette
   - Applies CSS variables dynamically

2. **Theme Hooks** (`hooks/useThemeColors.ts`)
   - `useThemeColors()`: Access to all theme colors
   - `useThemeColor()`: Get specific color by key
   - `useSemanticColors()`: Get semantic color combinations

3. **Enhanced ThemeProvider** (`providers/ThemeProvider.tsx`)
   - Combines next-themes with custom theme context
   - Provides seamless integration with existing components

## Color Palette

### Light Theme
- **Background**: Pure white with subtle blue undertones
- **Primary**: Deep blue for main actions
- **Secondary**: Light gray-blue for secondary elements
- **Accent**: Matching secondary for highlights
- **Destructive**: Red for error states

### Dark Theme
- **Background**: Dark blue-gray
- **Primary**: Light blue for main actions
- **Secondary**: Medium blue-gray for secondary elements
- **Accent**: Matching secondary for highlights
- **Destructive**: Light red for error states

### Chart Colors
The system includes 5 distinct chart colors that work well in both light and dark themes:
- Chart 1: Orange
- Chart 2: Teal (also used as success color)
- Chart 3: Blue (also used as info color)
- Chart 4: Green (also used as warning color)
- Chart 5: Yellow

## Usage

> **Note**: We use `useEMSTheme` instead of `useTheme` to avoid conflicts with the `useTheme` hook from `next-themes`. The `useEMSTheme` hook provides access to our custom theme context with the OKLCH color palette.

### Basic Theme Usage

```tsx
import { useEMSTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, setTheme, isDark, isLight } = useEMSTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme('dark')}>
        Switch to Dark
      </button>
    </div>
  );
}
```

### Using Theme Colors

```tsx
import { useThemeColors } from '@/hooks/useThemeColors';

function ColoredComponent() {
  const colors = useThemeColors();

  return (
    <div style={{ backgroundColor: colors.primary }}>
      <p style={{ color: colors.primaryForeground }}>
        Primary colored content
      </p>
    </div>
  );
}
```

### Using Semantic Colors

```tsx
import { useSemanticColors } from '@/hooks/useThemeColors';

function StatusComponent() {
  const { status, text, background } = useSemanticColors();

  return (
    <div className={background.primary}>
      <p className={text.primary}>Primary text</p>
      <p className={text.secondary}>Secondary text</p>
      <div className={status.success}>Success message</div>
    </div>
  );
}
```

### CSS Classes

The theme system automatically provides CSS custom properties that can be used in Tailwind classes:

```tsx
// These classes will automatically use the current theme colors
<div className="bg-background text-foreground">
  <div className="bg-primary text-primary-foreground">
    Primary content
  </div>
  <div className="bg-secondary text-secondary-foreground">
    Secondary content
  </div>
</div>
```

## Available CSS Variables

The following CSS variables are automatically set by the theme system:

### Core Colors
- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--popover`
- `--popover-foreground`

### Primary Colors
- `--primary`
- `--primary-foreground`

### Secondary Colors
- `--secondary`
- `--secondary-foreground`

### Muted Colors
- `--muted`
- `--muted-foreground`

### Accent Colors
- `--accent`
- `--accent-foreground`

### Status Colors
- `--destructive`
- `--destructive-foreground`

### UI Colors
- `--border`
- `--input`
- `--ring`

### Chart Colors
- `--chart-1` through `--chart-5`

### Sidebar Colors
- `--sidebar`
- `--sidebar-foreground`
- `--sidebar-primary`
- `--sidebar-primary-foreground`
- `--sidebar-accent`
- `--sidebar-accent-foreground`
- `--sidebar-border`
- `--sidebar-ring`

## Migration from Hardcoded Colors

### Before (Hardcoded)
```tsx
<div className="bg-gray-50 dark:bg-gray-900">
  <p className="text-gray-400">Muted text</p>
  <button className="bg-blue-500 text-white">Button</button>
</div>
```

### After (Theme-based)
```tsx
<div className="bg-background">
  <p className="text-muted-foreground">Muted text</p>
  <button className="bg-primary text-primary-foreground">Button</button>
</div>
```

## Theme Toggle Component

The `ThemeToggle` component provides a dropdown menu for switching between themes:

```tsx
import { ThemeToggle } from '@/components/theme/ThemeToggle';

function Header() {
  return (
    <header>
      <h1>My App</h1>
      <ThemeToggle />
    </header>
  );
}
```

## Best Practices

1. **Use Semantic Colors**: Prefer semantic color names over specific color values
2. **Consistent Usage**: Use the same color for the same purpose throughout the app
3. **Accessibility**: The OKLCH color space ensures better accessibility
4. **Testing**: Test components in both light and dark themes
5. **CSS Variables**: Use CSS custom properties for dynamic styling

## Extending the Theme

To add new colors to the theme system:

1. Add the color to the `ThemePalette` interface
2. Add the color to both light and dark palette objects
3. Update the CSS variable application in `ThemeContext`
4. Add the color to the theme hooks if needed

Example:

```tsx
// In ThemeContext.tsx
export interface ThemePalette {
  // ... existing colors
  brand: string;
  brandForeground: string;
}

export const emsLightPalette: ThemePalette = {
  // ... existing colors
  brand: 'oklch(0.5 0.2 200)',
  brandForeground: 'oklch(0.95 0.02 200)',
};

export const emsDarkPalette: ThemePalette = {
  // ... existing colors
  brand: 'oklch(0.6 0.2 200)',
  brandForeground: 'oklch(0.1 0.02 200)',
};
```

## Troubleshooting

### Colors Not Updating
- Ensure the component is wrapped in the `ThemeProvider`
- Check that CSS variables are being applied to the document root
- Verify that the theme context is properly mounted

### TypeScript Errors
- Make sure to import types from the correct paths
- Check that the `ThemePalette` interface includes all required colors

### Styling Issues
- Use the provided CSS classes instead of hardcoded colors
- Ensure Tailwind is configured to use the CSS custom properties
- Check that the theme context is applying variables correctly

## Demo

Visit the main page (`/`) to see the `ThemeDemo` component that showcases all available colors and their usage.
