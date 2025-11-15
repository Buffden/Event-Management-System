'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
  title: string;
  description: string;
  backHref?: string;
}

export function PageHeader({ title, description, backHref = '/dashboard/attendee' }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="mb-6">
      <Button
        variant="ghost"
        onClick={() => router.push(backHref)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{title}</h1>
      <p className="text-slate-600 dark:text-slate-400 mt-2">{description}</p>
    </div>
  );
}

