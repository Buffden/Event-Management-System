'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { TicketResponse } from '@/lib/api/types/booking.types';

interface TicketCardProps {
  ticket: TicketResponse;
  isExpired?: boolean;
  getStatusBadge: (status: string) => React.ReactNode;
}

export function TicketCard({ ticket, isExpired = false, getStatusBadge }: TicketCardProps) {
  return (
    <Card className={`hover:shadow-lg transition-shadow ${isExpired ? 'opacity-75' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {ticket.event?.name || 'Event Ticket'}
          {getStatusBadge(ticket.status)}
        </CardTitle>
        <CardDescription>
          {ticket.event?.category && (
            <span className={`inline-block text-xs px-2 py-1 rounded-full mr-2 ${
              isExpired
                ? 'bg-gray-100 text-gray-600'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {ticket.event.category}
            </span>
          )}
          Ticket ID: {ticket.id.substring(0, 8)}...
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* QR Code Display */}
        <div className="mb-4">
          {isExpired ? (
            <div className="h-48 bg-gray-100 rounded flex items-center justify-center opacity-50">
              <p className="text-gray-500">QR Code no longer valid</p>
            </div>
          ) : ticket.qrCode ? (
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
                  ticket.event.bookingStartDate
                    ? new Date(ticket.event.bookingStartDate).toLocaleDateString()
                    : 'Date not available'
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

        {/* Status Messages */}
        {isExpired && (
          <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded text-gray-700 text-sm">
            📅 This event has ended
          </div>
        )}
        {!isExpired && new Date(ticket.expiresAt) < new Date() && (
          <div className="mb-4 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            ⚠️ This ticket has expired
          </div>
        )}
      </CardContent>
    </Card>
  );
}

