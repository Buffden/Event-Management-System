'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, children, className = "" }: ChartCardProps) {
  return (
    <Card className={`border-slate-200 dark:border-slate-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-slate-600 dark:text-slate-400">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

