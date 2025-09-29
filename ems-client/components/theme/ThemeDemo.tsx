"use client";

import { useThemeColors, useSemanticColors } from '@/hooks/useThemeColors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ThemeDemo() {
  const colors = useThemeColors();
  const semanticColors = useSemanticColors();

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme Colors Demo</CardTitle>
          <CardDescription>
            This component demonstrates the current theme colors and how they change with theme switching.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Colors */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Primary Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div
                  className="w-full h-16 rounded border"
                  style={{ backgroundColor: colors.primary }}
                />
                <p className="text-sm text-muted-foreground">Primary</p>
              </div>
              <div className="space-y-2">
                <div
                  className="w-full h-16 rounded border"
                  style={{ backgroundColor: colors.secondary }}
                />
                <p className="text-sm text-muted-foreground">Secondary</p>
              </div>
              <div className="space-y-2">
                <div
                  className="w-full h-16 rounded border"
                  style={{ backgroundColor: colors.accent }}
                />
                <p className="text-sm text-muted-foreground">Accent</p>
              </div>
              <div className="space-y-2">
                <div
                  className="w-full h-16 rounded border"
                  style={{ backgroundColor: colors.muted }}
                />
                <p className="text-sm text-muted-foreground">Muted</p>
              </div>
            </div>
          </div>

          {/* Status Colors */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Status Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div
                  className="w-full h-16 rounded border"
                  style={{ backgroundColor: colors.destructive }}
                />
                <p className="text-sm text-muted-foreground">Destructive</p>
              </div>
              <div className="space-y-2">
                <div
                  className="w-full h-16 rounded border"
                  style={{ backgroundColor: colors.chart2 }}
                />
                <p className="text-sm text-muted-foreground">Success</p>
              </div>
              <div className="space-y-2">
                <div
                  className="w-full h-16 rounded border"
                  style={{ backgroundColor: colors.chart4 }}
                />
                <p className="text-sm text-muted-foreground">Warning</p>
              </div>
              <div className="space-y-2">
                <div
                  className="w-full h-16 rounded border"
                  style={{ backgroundColor: colors.chart3 }}
                />
                <p className="text-sm text-muted-foreground">Info</p>
              </div>
            </div>
          </div>

          {/* Chart Colors */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Chart Colors</h3>
            <div className="grid grid-cols-5 gap-4">
              {[colors.chart1, colors.chart2, colors.chart3, colors.chart4, colors.chart5].map((color, index) => (
                <div key={index} className="space-y-2">
                  <div
                    className="w-full h-16 rounded border"
                    style={{ backgroundColor: color }}
                  />
                  <p className="text-sm text-muted-foreground">Chart {index + 1}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Elements */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Interactive Elements</h3>
            <div className="flex flex-wrap gap-4">
              <Button>Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="destructive">Destructive Button</Button>
              <Button variant="ghost">Ghost Button</Button>
            </div>
          </div>

          {/* Text Examples */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Text Colors</h3>
            <div className="space-y-2">
              <p className="text-foreground">Primary text color</p>
              <p className="text-muted-foreground">Muted text color</p>
              <p className="text-destructive">Destructive text color</p>
            </div>
          </div>

          {/* Background Examples */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Background Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded border bg-background">
                <p className="text-foreground">Background</p>
              </div>
              <div className="p-4 rounded border bg-card">
                <p className="text-card-foreground">Card Background</p>
              </div>
              <div className="p-4 rounded border bg-muted">
                <p className="text-muted-foreground">Muted Background</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
