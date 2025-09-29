"use client"

import * as React from "react"
import {ThemeProvider as NextThemesProvider} from "next-themes"
import { ThemeProvider as EMSThemeProvider } from "@/contexts/ThemeContext"

// Enhanced ThemeProvider that combines next-themes with our custom theme context
export function ThemeProvider({
    children,
    defaultTheme = "system",
    enableSystem = true,
    attribute = "class",
    disableTransitionOnChange = false,
    ...props
}: {
    children: React.ReactNode;
    defaultTheme?: string;
    enableSystem?: boolean;
    attribute?: "class" | "data-theme";
    disableTransitionOnChange?: boolean;
    [key: string]: any;
}) {
    return (
        <NextThemesProvider
            attribute={attribute}
            defaultTheme={defaultTheme}
            enableSystem={enableSystem}
            disableTransitionOnChange={disableTransitionOnChange}
            {...props}
        >
            <EMSThemeProvider
                defaultTheme={defaultTheme}
                enableSystem={enableSystem}
                attribute={attribute}
                disableTransitionOnChange={disableTransitionOnChange}
            >
                {children}
            </EMSThemeProvider>
        </NextThemesProvider>
    )
}