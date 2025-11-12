'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

interface EmptyEventsStateProps {
  totalEvents: number;
  onClearFilters: () => void;
}

export function EmptyEventsState({ totalEvents, onClearFilters }: EmptyEventsStateProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="flex flex-col items-center">
          <Calendar className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {totalEvents === 0 ? 'No Events Available' : 'No Events Match Your Filters'}
          </h3>
          <p className="text-gray-500 mb-4">
            {totalEvents === 0
              ? 'Check back later for new events!'
              : 'Try adjusting your filters to see more events.'
            }
          </p>
          {totalEvents > 0 && (
            <Button onClick={onClearFilters} variant="outline">
              Clear All Filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

