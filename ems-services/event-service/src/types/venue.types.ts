// Venue-related types
export interface CreateVenueRequest {
  name: string;
  address: string;
  capacity: number;
  openingTime: string; // HH:mm format
  closingTime: string; // HH:mm format
}

export interface UpdateVenueRequest {
  name?: string;
  address?: string;
  capacity?: number;
  openingTime?: string; // HH:mm format
  closingTime?: string; // HH:mm format
}

export interface VenueResponse {
  id: number;
  name: string;
  address: string;
  capacity: number;
  openingTime: string;
  closingTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface VenueListResponse {
  venues: VenueResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VenueFilters {
  name?: string;
  capacity?: number;
  page?: number;
  limit?: number;
}
