'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { bookingAPI } from '@/lib/api/booking.api';
import { eventAPI } from '@/lib/api/event.api';
import { useRouter } from 'next/navigation';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { PageHeader } from '@/components/attendee/PageHeader';
import { LoadingSpinner } from '@/components/attendee/LoadingSpinner';
import { ErrorMessage } from '@/components/attendee/ErrorMessage';
import { DateRangePicker } from '@/components/attendee/DateRangePicker';
import { GanttChart, ScheduleItem } from '@/components/attendee/GanttChart';
import { PageLayout } from '@/components/attendee/PageLayout';

const LOGGER_COMPONENT_NAME = 'AttendeeSchedulePage';

export default function AttendeeSchedulePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const logger = useLogger();

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to 7 days ago
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Default to 30 days ahead
    date.setHours(23, 59, 59, 999);
    return date;
  });

  useEffect(() => {
    // Wait for auth check to complete before redirecting
    if (isLoading) {
      return;
    }

    // Only redirect if auth check is complete and user is not authenticated
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Wait for auth check to complete before loading schedule
    if (isLoading) {
      return;
    }

    if (isAuthenticated) {
      loadSchedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, isAuthenticated, isLoading]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.info(LOGGER_COMPONENT_NAME, 'Loading schedule');

      // Fetch user bookings
      const bookingsResponse = await bookingAPI.getUserBookings();
      const userBookings = bookingsResponse.data?.bookings || [];

      // Filter bookings by date range and status
      const dateRangeStart = new Date(startDate);
      dateRangeStart.setHours(0, 0, 0, 0);
      const dateRangeEnd = new Date(endDate);
      dateRangeEnd.setHours(23, 59, 59, 999);

      logger.info(LOGGER_COMPONENT_NAME, 'Date range', {
        start: dateRangeStart.toISOString(),
        end: dateRangeEnd.toISOString(),
        bookingsCount: userBookings.length
      });

      const filteredBookings = userBookings.filter((booking) => {
        if (booking.status === 'CANCELLED') return false;
        if (!booking.event) return false;

        // Check if event has sessions that fall within date range
        // For now, we'll fetch event details to get sessions
        return true;
      });

      // Fetch event details with sessions for each booking
      const items: ScheduleItem[] = [];
      for (const booking of filteredBookings) {
        try {
          if (!booking.eventId) {
            logger.warn(LOGGER_COMPONENT_NAME, `Booking ${booking.id} has no eventId`);
            continue;
          }

          logger.debug(LOGGER_COMPONENT_NAME, `Fetching event details for booking ${booking.id}`, {
            eventId: booking.eventId
          });

          const eventResponse = await eventAPI.getPublishedEventById(booking.eventId);
          const event = eventResponse.data;

          if (!event) {
            logger.warn(LOGGER_COMPONENT_NAME, `Event ${booking.eventId} not found or not published`);
            continue;
          }

          logger.debug(LOGGER_COMPONENT_NAME, `Event ${booking.eventId} fetched`, {
            eventName: event.name,
            hasSessions: !!event.sessions,
            sessionsCount: event.sessions?.length || 0,
            bookingStartDate: event.bookingStartDate,
            bookingEndDate: event.bookingEndDate
          });

          // If event has sessions, process them
          if (event.sessions && event.sessions.length > 0) {
            // Process each session
            for (const session of event.sessions) {
              const sessionStart = new Date(session.startsAt);
              const sessionEnd = new Date(session.endsAt);

              // Check if session overlaps with date range
              if (sessionStart <= dateRangeEnd && sessionEnd >= dateRangeStart) {
                items.push({
                  id: `${booking.id}-${session.id}`,
                  eventId: booking.eventId,
                  eventName: event.name,
                  venue: event.venue?.name || 'TBA',
                  startTime: sessionStart,
                  endTime: sessionEnd,
                  status: booking.status,
                  sessions: [session]
                });
              }
            }
          } else {
            // If no sessions, use event booking dates as fallback
            if (!event.bookingStartDate || !event.bookingEndDate) {
              logger.warn(LOGGER_COMPONENT_NAME, `Event ${booking.eventId} has no sessions and no booking dates`);
              continue;
            }

            const bookingStart = new Date(event.bookingStartDate);
            bookingStart.setHours(0, 0, 0, 0);
            const bookingEnd = new Date(event.bookingEndDate);
            bookingEnd.setHours(23, 59, 59, 999);

            // Check if booking overlaps with date range
            if (bookingStart <= dateRangeEnd && bookingEnd >= dateRangeStart) {
              items.push({
                id: booking.id,
                eventId: booking.eventId,
                eventName: event.name || 'Unknown Event',
                venue: event.venue?.name || 'TBA',
                startTime: bookingStart,
                endTime: bookingEnd,
                status: booking.status,
                sessions: undefined
              });
            }
          }
        } catch (err: any) {
          logger.error(LOGGER_COMPONENT_NAME, `Failed to fetch event ${booking.eventId}`, err);
        }
      }

      // Sort by start time
      items.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      setScheduleItems(items);

      logger.info(LOGGER_COMPONENT_NAME, 'Schedule loaded successfully', {
        itemsCount: items.length,
        filteredBookingsCount: filteredBookings.length,
        totalBookingsCount: userBookings.length,
        items: items.map(item => ({
          eventName: item.eventName,
          startTime: item.startTime.toISOString(),
          endTime: item.endTime.toISOString()
        }))
      });
    } catch (err: any) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load schedule', err);
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  // Calculate date range for Gantt chart
  const dateRange = useMemo(() => {
    const rangeStart = new Date(startDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59, 999);

    // If we have items, ensure the range covers them
    if (scheduleItems.length > 0) {
      const allDates = scheduleItems.flatMap(item => [item.startTime, item.endTime]);
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

      const actualStart = minDate < rangeStart ? minDate : rangeStart;
      const actualEnd = maxDate > rangeEnd ? maxDate : rangeEnd;

      const days = Math.ceil((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24));

      return { start: actualStart, end: actualEnd, days };
    }

    const days = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    return { start: rangeStart, end: rangeEnd, days };
  }, [scheduleItems, startDate, endDate]);

  // Show loading spinner while auth is being checked or schedule is loading
  if (isLoading || loading) {
    return <LoadingSpinner message={isLoading ? "Checking authentication..." : "Loading schedule..."} />;
  }

  return (
    <PageLayout maxWidth="7xl">
        <PageHeader
          title="My Schedule"
          description="View your event bookings in a timeline view"
        />

        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

        {error && <ErrorMessage message={error} />}

        <GanttChart items={scheduleItems} dateRange={dateRange} />
    </PageLayout>
  );
}

