'use client';

interface EmptyChartStateProps {
  message?: string;
}

export function EmptyChartState({ message = "No data available" }: EmptyChartStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  );
}

