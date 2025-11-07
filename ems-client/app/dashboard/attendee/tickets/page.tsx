'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ticketAPI } from '@/lib/api/booking.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { TicketResponse } from '@/lib/api/types/booking.types';
import { QRCodeSVG } from 'qrcode.react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft } from 'lucide-react';

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
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">My Tickets</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/attendee')}
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                My Tickets
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || user?.email}`}
                    alt={user?.name || user?.email}
                  />
                  <AvatarFallback className="text-xs">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('') : user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {user?.name || user?.email}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

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
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 mb-4">You don't have any tickets yet.</p>
            <Button onClick={() => router.push('/dashboard/attendee/events')}>
              Browse Events
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Active Tickets (Upcoming and Running Events) */}
          {tickets.filter(ticket => !isTicketEventExpired(ticket)).length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="h-5 w-5 bg-green-500 rounded-full"></div>
                Active Tickets ({tickets.filter(ticket => !isTicketEventExpired(ticket)).length})
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tickets.filter(ticket => !isTicketEventExpired(ticket)).map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {ticket.event?.name || 'Event Ticket'}
                  {getStatusBadge(ticket.status)}
                </CardTitle>
                <CardDescription>
                  {ticket.event?.category && (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">
                      {ticket.event.category}
                    </span>
                  )}
                  Ticket ID: {ticket.id.substring(0, 8)}...
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* QR Code Display */}
                <div className="mb-4">
                  {ticket.qrCode ? (
                    <div className="text-center">
                      <div className="mx-auto mb-2 border rounded p-2 bg-white" style={{ width: '200px', height: '200px' }}>
                        <QRCodeSVG
                          value={ticket.qrCode.data}
                          size={184}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                      <p className="text-xs text-gray-500">Scan this QR code at the event</p>
                    </div>
                  ) : (
                    <div className="h-48 bg-gray-100 rounded flex items-center justify-center">
                      <p className="text-gray-500">QR Code not available</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  {ticket.event && (
                    <>
                      <p className="text-sm">
                        <span className="font-medium">Event:</span> {ticket.event.name}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Venue:</span> {ticket.event.venue.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {ticket.event.venue.address}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Event Date:</span> {
                          ticket.event.bookingStartDate ?
                            new Date(ticket.event.bookingStartDate).toLocaleDateString() :
                            'Date not available'
                        }
                      </p>
                    </>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Issued:</span> {new Date(ticket.issuedAt).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Expires:</span> {new Date(ticket.expiresAt).toLocaleString()}
                  </p>
                  {ticket.scannedAt && (
                    <p className="text-sm">
                      <span className="font-medium">Scanned:</span> {new Date(ticket.scannedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Warning for expired tickets */}
                {isExpired(ticket.expiresAt) && (
                  <div className="mb-4 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                    ⚠️ This ticket has expired
                  </div>
                )}

              </CardContent>
            </Card>
          ))}
              </div>
            </div>
          )}

          {/* Expired Tickets */}
          {tickets.filter(ticket => isTicketEventExpired(ticket)).length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="h-5 w-5 bg-gray-500 rounded-full"></div>
                Past Event Tickets ({tickets.filter(ticket => isTicketEventExpired(ticket)).length})
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tickets.filter(ticket => isTicketEventExpired(ticket)).map((ticket) => (
                  <Card key={ticket.id} className="opacity-75 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {ticket.event?.name || 'Event Ticket'}
                        <Badge variant="secondary" className="bg-gray-500 text-white">
                          EXPIRED EVENT
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {ticket.event?.category && (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full mr-2">
                            {ticket.event.category}
                          </span>
                        )}
                        Ticket ID: {ticket.id.substring(0, 8)}...
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* QR Code Display - Disabled for expired events */}
                      <div className="mb-4">
                        <div className="h-48 bg-gray-100 rounded flex items-center justify-center opacity-50">
                          <p className="text-gray-500">QR Code no longer valid</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {ticket.event && (
                          <>
                            <p className="text-sm">
                              <span className="font-medium">Event:</span> {ticket.event.name}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Venue:</span> {ticket.event.venue.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {ticket.event.venue.address}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Event Date:</span> {
                                ticket.event.bookingStartDate ?
                                  new Date(ticket.event.bookingStartDate).toLocaleDateString() :
                                  'Date not available'
                              }
                            </p>
                          </>
                        )}
                        <p className="text-sm">
                          <span className="font-medium">Issued:</span> {new Date(ticket.issuedAt).toLocaleString()}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Expires:</span> {new Date(ticket.expiresAt).toLocaleString()}
                        </p>
                        {ticket.scannedAt && (
                          <p className="text-sm">
                            <span className="font-medium">Scanned:</span> {new Date(ticket.scannedAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* Event Ended Notice */}
                      <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded text-gray-700 text-sm">
                        📅 This event has ended
                      </div>
                    </CardContent>
                  </Card>
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
