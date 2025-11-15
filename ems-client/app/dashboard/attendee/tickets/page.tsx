'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ticketAPI } from '@/lib/api/booking.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { TicketResponse } from '@/lib/api/types/booking.types';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { LoadingSpinner } from '@/components/attendee/LoadingSpinner';
import { EmptyState } from '@/components/attendee/EmptyState';
import { TicketCard } from '@/components/attendee/TicketCard';
import { TicketSectionHeader } from '@/components/attendee/TicketSectionHeader';

const LOGGER_COMPONENT_NAME = 'AttendeeTicketsPage';

export default function AttendeeTicketsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const logger = useLogger();

  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadTickets();
  }, [isAuthenticated, router]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      logger.info(LOGGER_COMPONENT_NAME, 'Loading user tickets');

      const response = await ticketAPI.getUserTickets();
      setTickets(response.data || []);

      logger.info(LOGGER_COMPONENT_NAME, 'Tickets loaded successfully');
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load tickets', error as Error);
    } finally {
      setLoading(false);
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

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Utility function to check if ticket's event is expired/ended
  const isTicketEventExpired = (ticket: TicketResponse) => {
    if (!ticket.event) return false;
    const now = new Date();
    const eventEndDate = new Date(ticket.event.bookingEndDate);
    return eventEndDate < now;
  };

  // Utility function to check if ticket's event is upcoming
  const isTicketEventUpcoming = (ticket: TicketResponse) => {
    if (!ticket.event) return false;
    const now = new Date();
    const eventStartDate = new Date(ticket.event.bookingStartDate);
    return eventStartDate > now;
  };

  // Utility function to check if ticket's event is currently running
  const isTicketEventRunning = (ticket: TicketResponse) => {
    if (!ticket.event) return false;
    const now = new Date();
    const eventStartDate = new Date(ticket.event.bookingStartDate);
    const eventEndDate = new Date(ticket.event.bookingEndDate);
    return eventStartDate <= now && eventEndDate >= now;
  };


  if (loading) {
    return <LoadingSpinner message="Loading tickets..." />;
  }

  const activeTickets = tickets.filter(ticket => !isTicketEventExpired(ticket));
  const expiredTickets = tickets.filter(ticket => isTicketEventExpired(ticket));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <DashboardHeader
        user={user}
        title="My Tickets"
        badge={{
          label: 'Attendee Portal',
          variant: 'secondary',
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        }}
        showBackButton
        backHref="/dashboard/attendee"
      />

      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div></div>
          <div className="space-x-2">
            <Button
              onClick={loadTickets}
              variant="outline"
            >
              Refresh
            </Button>
            <Button
              onClick={() => router.push('/dashboard/attendee/events')}
              variant="outline"
            >
              Browse Events
            </Button>
          </div>
        </div>

      {tickets.length === 0 ? (
        <EmptyState
          message="You don't have any tickets yet."
          actionLabel="Browse Events"
          actionHref="/dashboard/attendee/events"
        />
      ) : (
        <div className="space-y-8">
          {/* Active Tickets */}
          {activeTickets.length > 0 && (
            <div>
              <TicketSectionHeader
                title="Active Tickets"
                count={activeTickets.length}
                color="green"
              />
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activeTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    isExpired={false}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Expired Tickets */}
          {expiredTickets.length > 0 && (
            <div>
              <TicketSectionHeader
                title="Past Event Tickets"
                count={expiredTickets.length}
                color="gray"
              />
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {expiredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    isExpired={true}
                    getStatusBadge={(status) => (
                      <Badge variant="secondary" className="bg-gray-500 text-white">
                        EXPIRED EVENT
                      </Badge>
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
