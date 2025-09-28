'use client';

import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBackButton?: boolean;
}

export function AuthLayout({ 
  title, 
  description, 
  children, 
  footer,
  showBackButton = true 
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          {showBackButton && (
            <Link href="/landing" className="inline-flex items-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Link>
          )}
          
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              {description}
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="space-y-6 pt-6">
            {children}
          </CardContent>
        </Card>

        {/* Footer */}
        {footer && (
          <div className="mt-6 text-center">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
