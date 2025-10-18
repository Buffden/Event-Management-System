'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { adminTicketAPI } from '@/lib/api/booking.api';
import { eventAPI } from '@/lib/api/event.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useLogger } from '@/lib/logger/LoggerProvider';
// Note: Using basic HTML elements since table and select components are not available
import { Search, Filter, Download, RefreshCw } from 'lucide-react';

const LOGGER_COMPONENT_NAME = 'AdminTicketsPage';

import { EventResponse } from '@/lib/api/types/event.types';

interface Event extends EventResponse {}

interface TicketStats {
  eventId: string;
  totalTickets: number;
  issuedTickets: number;
  scannedTickets: number;
  expiredTickets: number;
  revokedTickets: number;
  attendanceRate: number;
}

interface Ticket {
  id: string;
  bookingId: string;
  userId: string;
  eventId: string;
  status: 'ISSUED' | 'SCANNED' | 'REVOKED' | 'EXPIRED';
  issuedAt: string;
  scannedAt?: string;
  expiresAt: string;
  qrCode?: {
    id: string;
    data: string;
    format: string;
    scanCount: number;
  };
  attendanceRecords?: Array<{
    id: string;
    scanTime: string;
    scanLocation?: string;
    scannedBy?: string;
    scanMethod?: string;
  }>;
}

interface TicketFilters {
  status: string;
  searchTerm: string;
  dateRange: string;
}

export default function AdminTicketsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const logger = useLogger();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [revokeStatus, setRevokeStatus] = useState<{ [ticketId: string]: 'loading' | 'success' | 'error' | 'idle' }>({});
  const [filters, setFilters] = useState<TicketFilters>({
    status: '',
    searchTerm: '',
    dateRange: ''
  });

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    loadEvents();
  }, [isAuthenticated, isAdmin, router]);

  useEffect(() => {
    if (selectedEventId) {
      loadEventTicketStats();
      loadEventTickets();
    }
  }, [selectedEventId]);

  // Filter tickets when filters or tickets change
  useEffect(() => {
    let filtered = [...tickets];

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(ticket => ticket.status === filters.status);
    }

    // Filter by search term (user ID)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.userId.toLowerCase().includes(searchLower) ||
        ticket.id.toLowerCase().includes(searchLower)
      );
    }

    // Filter by date range
    if (filters.dateRange) {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(ticket => new Date(ticket.issuedAt) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(ticket => new Date(ticket.issuedAt) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(ticket => new Date(ticket.issuedAt) >= filterDate);
          break;
      }
    }

    setFilteredTickets(filtered);
  }, [tickets, filters]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      logger.info(LOGGER_COMPONENT_NAME, 'Loading events for admin');
      
      const response = await eventAPI.getAllEvents();
      setEvents(response.data?.events || []);
      
      logger.info(LOGGER_COMPONENT_NAME, 'Events loaded successfully');
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load events', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const loadEventTicketStats = async () => {
    if (!selectedEventId) return;

    try {
      logger.info(LOGGER_COMPONENT_NAME, 'Loading ticket stats for event');
      
      const stats = await adminTicketAPI.getEventTicketStats(selectedEventId);
      setTicketStats(stats);
      
      logger.info(LOGGER_COMPONENT_NAME, 'Ticket stats loaded successfully');
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load ticket stats', error as Error);
    }
  };

  const loadEventTickets = async () => {
    if (!selectedEventId) return;

    try {
      setTicketsLoading(true);
      logger.info(LOGGER_COMPONENT_NAME, 'Loading tickets for event');
      
      const response = await adminTicketAPI.getEventTickets(selectedEventId, {
        page: 1,
        limit: 100
      });
      
      // Fix: Backend returns data.tickets, not response.tickets
      const ticketsData = response.data?.tickets || [];
      setTickets(ticketsData);
      setFilteredTickets(ticketsData);
      
      logger.info(LOGGER_COMPONENT_NAME, 'Event tickets loaded successfully', { count: ticketsData.length });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load event tickets', error as Error);
      setTickets([]);
      setFilteredTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleRevokeTicket = async (ticketId: string) => {
    try {
      setRevokeStatus(prev => ({ ...prev, [ticketId]: 'loading' }));
      logger.info(LOGGER_COMPONENT_NAME, 'Revoking ticket');

      const result = await adminTicketAPI.revokeTicket(ticketId);
      
      if (result.success) {
        setRevokeStatus(prev => ({ ...prev, [ticketId]: 'success' }));
        logger.info(LOGGER_COMPONENT_NAME, 'Ticket revoked successfully');
        
        // Refresh the tickets list
        loadEventTickets();
        loadEventTicketStats();
      } else {
        setRevokeStatus(prev => ({ ...prev, [ticketId]: 'error' }));
      }

    } catch (error) {
      setRevokeStatus(prev => ({ ...prev, [ticketId]: 'error' }));
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to revoke ticket', error as Error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'ISSUED': 'default',
      'SCANNED': 'secondary',
      'REVOKED': 'destructive',
      'EXPIRED': 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const handleFilterChange = (key: keyof TicketFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      searchTerm: '',
      dateRange: ''
    });
  };

  const selectedEvent = events.find(event => event.id === selectedEventId);

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Ticket Management</h1>
        <Button
          onClick={() => {
            if (selectedEventId) {
              loadEventTickets();
              loadEventTicketStats();
            }
          }}
          variant="outline"
          size="sm"
          disabled={!selectedEventId || ticketsLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${ticketsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Event Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
          <CardDescription>
            Choose an event to view and manage its tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="eventSelect">Event</Label>
              <select
                id="eventSelect"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select an event...</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} - {new Date(event.bookingStartDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedEventId && selectedEvent && (
        <>
          {/* Event Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{selectedEvent.name}</CardTitle>
              <CardDescription>
                {new Date(selectedEvent.bookingStartDate).toLocaleDateString()} - {new Date(selectedEvent.bookingEndDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">{selectedEvent.description}</p>
              <p className="text-sm">
                <span className="font-medium">Location:</span> {selectedEvent.venue.name}
              </p>
            </CardContent>
          </Card>

          {/* Ticket Statistics */}
          {ticketStats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ticketStats.totalTickets}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Issued</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{ticketStats.issuedTickets}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Scanned</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{ticketStats.scannedTickets}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Expired</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{ticketStats.expiredTickets}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Revoked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{ticketStats.revokedTickets}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filters
              </CardTitle>
              <CardDescription>
                Filter tickets by status, user, or date range
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="statusFilter">Status</Label>
                  <select
                    id="statusFilter"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">All statuses</option>
                    <option value="ISSUED">Issued</option>
                    <option value="SCANNED">Scanned</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="REVOKED">Revoked</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="searchFilter">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="searchFilter"
                      placeholder="Search by user ID or ticket ID..."
                      value={filters.searchTerm}
                      onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="dateFilter">Date Range</Label>
                  <select
                    id="dateFilter"
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">All dates</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 days</option>
                    <option value="month">Last 30 days</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button onClick={clearFilters} variant="outline" className="w-full">
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets Table */}
          <Card>
            <CardHeader>
              <CardTitle>Event Tickets</CardTitle>
              <CardDescription>
                {filteredTickets.length} of {tickets.length} tickets
                {filters.status || filters.searchTerm || filters.dateRange ? ' (filtered)' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500">Loading tickets...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {tickets.length === 0 ? 'No tickets found for this event' : 'No tickets match the current filters'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Ticket ID</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">User ID</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Issued</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Expires</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Scanned</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">QR Scans</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                            {ticket.id.substring(0, 8)}...
                          </td>
                          <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                            {ticket.userId.substring(0, 8)}...
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {getStatusBadge(ticket.status)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {new Date(ticket.issuedAt).toLocaleDateString()}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {new Date(ticket.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {ticket.scannedAt ? new Date(ticket.scannedAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {ticket.qrCode?.scanCount || 0}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {ticket.status === 'ISSUED' && (
                              <Button
                                onClick={() => handleRevokeTicket(ticket.id)}
                                disabled={revokeStatus[ticket.id] === 'loading' || revokeStatus[ticket.id] === 'success'}
                                variant="destructive"
                                size="sm"
                              >
                                {revokeStatus[ticket.id] === 'loading' ? 'Revoking...' :
                                 revokeStatus[ticket.id] === 'success' ? 'Revoked ✓' :
                                 revokeStatus[ticket.id] === 'error' ? 'Error' :
                                 'Revoke'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}