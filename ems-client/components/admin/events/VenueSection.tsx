'use client';

import { MapPin } from 'lucide-react';
import { Select } from './FormField';
import { VenueResponse } from '@/lib/api/types/event.types';

interface VenueSectionProps {
  venueId: number;
  venues: VenueResponse[];
  isLoadingVenues: boolean;
  error?: string;
  onVenueChange: (value: number) => void;
}

export function VenueSection({
  venueId,
  venues,
  isLoadingVenues,
  error,
  onVenueChange
}: VenueSectionProps) {
  const venueOptions = venues.map((venue) => ({
    value: venue.id,
    label: `${venue.name} - ${venue.address} (Capacity: ${venue.capacity})`
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
        <MapPin className="h-5 w-5 mr-2" />
        Venue Selection
      </h3>

      <Select
        id="venueId"
        label="Select Venue"
        value={venueId}
        onChange={onVenueChange}
        options={venueOptions}
        placeholder="Select a venue"
        required
        error={error}
        isLoading={isLoadingVenues}
        loadingText="Loading venues..."
      />
    </div>
  );
}

