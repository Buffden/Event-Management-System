'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';

interface EventFilters {
  searchTerm: string;
  category: string;
  dateRange: string;
  venue: string;
}

interface EventFiltersProps {
  filters: EventFilters;
  onFilterChange: (key: keyof EventFilters, value: string) => void;
  onClearFilters: () => void;
  categories: string[];
  venues: string[];
}

export function EventFiltersComponent({
  filters,
  onFilterChange,
  onClearFilters,
  categories,
  venues
}: EventFiltersProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filter Events
        </CardTitle>
        <CardDescription>
          Narrow down your search to find the perfect event
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search events..."
                value={filters.searchTerm}
                onChange={(e) => onFilterChange('searchTerm', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={filters.category}
              onChange={(e) => onFilterChange('category', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Venue */}
          <div>
            <Label htmlFor="venue">Venue</Label>
            <select
              id="venue"
              value={filters.venue}
              onChange={(e) => onFilterChange('venue', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">All Venues</option>
              {venues.map(venue => (
                <option key={venue} value={venue}>{venue}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <Label htmlFor="dateRange">When</Label>
            <select
              id="dateRange"
              value={filters.dateRange}
              onChange={(e) => onFilterChange('dateRange', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Any Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <Button onClick={onClearFilters} variant="outline" className="w-full">
              Clear Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

