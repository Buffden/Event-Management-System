'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LogOut,
  Calendar,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Users,
  Clock,
  MapPin,
  ArrowLeft,
  MoreHorizontal,
  Play,
  Pause,
  Archive,
  AlertCircle,
  MessageSquare,
  Settings
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { eventAPI } from "@/lib/api/event.api";
import { EventResponse, EventStatus, EventFilters } from "@/lib/api/types/event.types";
import { withAdminAuth } from "@/components/hoc/withAuth";
import { RejectionModal } from "@/components/admin/RejectionModal";
import { feedbackAPI, FeedbackFormResponse } from "@/lib/api/feedback.api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const statusColors = {
  [EventStatus.DRAFT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [EventStatus.PENDING_APPROVAL]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [EventStatus.PUBLISHED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [EventStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EventStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EventStatus.COMPLETED]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

const COMPONENT_NAME = 'EventManagementPage';

function EventManagementPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const logger = useLogger();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<EventStatus | 'ALL'>('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState('ALL');

  // Rejection modal state
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [eventToReject, setEventToReject] = useState<{ id: string; name: string } | null>(null);

  // Feedback form state
  const [feedbackForms, setFeedbackForms] = useState<Record<string, FeedbackFormResponse | null>>({});
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedEventForFeedback, setSelectedEventForFeedback] = useState<EventResponse | null>(null);
  const [feedbackFormTitle, setFeedbackFormTitle] = useState('');
  const [feedbackFormDescription, setFeedbackFormDescription] = useState('');
  const [isCreatingFeedback, setIsCreatingFeedback] = useState(false);

  // API state management
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Load events from API
  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: EventFilters = {
        page: pagination.page,
        limit: pagination.limit,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined
      };

      logger.debug(COMPONENT_NAME, 'Loading events with filters', filters);

      const response = await eventAPI.getAllEvents(filters);

      if (response.success) {
        setEvents(response.data.events);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          totalPages: response.data.totalPages
        }));
        logger.debug(COMPONENT_NAME, 'Events loaded successfully', { count: response.data.events.length });
      } else {
        throw new Error('Failed to load events');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load events';
      setError(errorMessage);
      logger.error(COMPONENT_NAME, 'Failed to load events', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [selectedStatus, pagination.page]);

  // Load feedback forms for all events
  useEffect(() => {
    const loadFeedbackForms = async () => {
      const forms: Record<string, FeedbackFormResponse | null> = {};
      for (const event of events) {
        try {
          const form = await feedbackAPI.getFeedbackFormByEventId(event.id);
          forms[event.id] = form;
        } catch (error) {
          logger.error(COMPONENT_NAME, `Failed to load feedback form for event ${event.id}`, error as Error);
          forms[event.id] = null;
        }
      }
      setFeedbackForms(forms);
    };

    if (events.length > 0) {
      loadFeedbackForms();
    }
  }, [events]);

  // Filter events based on search and timeframe (status filtering is done server-side)
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.venue.name.toLowerCase().includes(searchTerm.toLowerCase());

    const now = new Date();
    const eventStart = new Date(event.bookingStartDate);
    const matchesTimeframe = selectedTimeframe === 'ALL' ||
                           (selectedTimeframe === 'UPCOMING' && eventStart > now) ||
                           (selectedTimeframe === 'ONGOING' && eventStart <= now && new Date(event.bookingEndDate) >= now) ||
                           (selectedTimeframe === 'PAST' && new Date(event.bookingEndDate) < now);

    return matchesSearch && matchesTimeframe;
  });

  const handleEventAction = async (eventId: string, action: string) => {
    try {
      setActionLoading(eventId);
      logger.debug(COMPONENT_NAME, `Event ${eventId} action: ${action}`);

      let response;
      switch (action) {
        case 'approve':
          response = await eventAPI.approveEvent(eventId);
          break;
        case 'cancel':
          response = await eventAPI.cancelEvent(eventId);
          break;
        case 'delete':
          response = await eventAPI.deleteEvent(eventId);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      if (response.success) {
        logger.info(COMPONENT_NAME, `Event ${eventId} ${action} successful`);
        // Reload events to reflect changes
        await loadEvents();
      } else {
        throw new Error(`Failed to ${action} event`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} event`;
      setError(errorMessage);
      logger.error(COMPONENT_NAME, `Failed to ${action} event ${eventId}`, err instanceof Error ? err : new Error(String(err)));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (event: EventResponse) => {
    setEventToReject({ id: event.id, name: event.name });
    setIsRejectionModalOpen(true);
  };

  const handleRejectConfirm = async (rejectionReason: string) => {
    if (!eventToReject) return;

    try {
      setActionLoading(eventToReject.id);
      logger.debug(COMPONENT_NAME, `Rejecting event ${eventToReject.id} with reason: ${rejectionReason}`);

      const response = await eventAPI.rejectEvent(eventToReject.id, { rejectionReason });

      if (response.success) {
        logger.info(COMPONENT_NAME, `Event ${eventToReject.id} rejected successfully`);
        setIsRejectionModalOpen(false);
        setEventToReject(null);
        // Reload events to reflect changes
        await loadEvents();
      } else {
        throw new Error('Failed to reject event');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject event';
      setError(errorMessage);
      logger.error(COMPONENT_NAME, `Failed to reject event ${eventToReject.id}`, err instanceof Error ? err : new Error(String(err)));
      throw err; // Re-throw to let modal handle the error
    } finally {
      setActionLoading(null);
    }
  };

  const getRegistrationPercentage = (registered: number, capacity: number) => {
    if (capacity <= 0) {
      return 0;
    }
    return Math.round((registered / capacity) * 100);
  };

  const handleCreateFeedbackForm = (event: EventResponse) => {
    setSelectedEventForFeedback(event);
    setFeedbackFormTitle(`Feedback for ${event.name}`);
    setFeedbackFormDescription('');
    setIsFeedbackModalOpen(true);
  };

  const handleManageFeedbackForm = (event: EventResponse) => {
    router.push(`/dashboard/admin/events/${event.id}/feedback`);
  };

  const handleSubmitFeedbackForm = async () => {
    if (!selectedEventForFeedback) return;

    try {
      setIsCreatingFeedback(true);
      await feedbackAPI.createFeedbackForm({
        eventId: selectedEventForFeedback.id,
        title: feedbackFormTitle,
        description: feedbackFormDescription || undefined,
      });

      logger.info(COMPONENT_NAME, 'Feedback form created successfully', { eventId: selectedEventForFeedback.id });

      // Reload feedback forms
      const form = await feedbackAPI.getFeedbackFormByEventId(selectedEventForFeedback.id);
      setFeedbackForms(prev => ({ ...prev, [selectedEventForFeedback.id]: form }));

      setIsFeedbackModalOpen(false);
      setSelectedEventForFeedback(null);
      setFeedbackFormTitle('');
      setFeedbackFormDescription('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create feedback form';
      setError(errorMessage);
      logger.error(COMPONENT_NAME, 'Failed to create feedback form', error as Error);
    } finally {
      setIsCreatingFeedback(false);
    }
  };

  // Calculate stats from real data
  const stats = {
    total: events.length,
    published: events.filter(e => e.status === EventStatus.PUBLISHED).length,
    draft: events.filter(e => e.status === EventStatus.DRAFT).length,
    pending: events.filter(e => e.status === EventStatus.PENDING_APPROVAL).length,
    totalRegistrations: events.reduce((sum, event) => sum + event.venue.capacity, 0) // Using capacity as placeholder
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading event management...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Error Loading Events
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {error}
            </p>
            <Button
              onClick={loadEvents}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
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
                onClick={() => router.push('/dashboard/admin')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Event Management
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                onClick={() => router.push('/dashboard/admin/events/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Event Management
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Create, manage, and monitor all events across the platform.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Events</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Play className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Published</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.published}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Pause className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Capacity</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalRegistrations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-slate-200 dark:border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Search & Filter Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as EventStatus | 'ALL')}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Status</option>
                <option value={EventStatus.DRAFT}>Draft</option>
                <option value={EventStatus.PENDING_APPROVAL}>Pending Approval</option>
                <option value={EventStatus.PUBLISHED}>Published</option>
                <option value={EventStatus.REJECTED}>Rejected</option>
                <option value={EventStatus.CANCELLED}>Cancelled</option>
                <option value={EventStatus.COMPLETED}>Completed</option>
              </select>

              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Time</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="PAST">Past</option>
              </select>

              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/admin/events/pending')}
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Pending Reviews
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid */}
        <div className="space-y-8">
          {/* Available Events */}
          {filteredEvents.filter(event => {
            const now = new Date();
            const eventEndDate = new Date(event.bookingEndDate);
            return eventEndDate >= now && event.status !== EventStatus.CANCELLED && event.status !== EventStatus.COMPLETED;
          }).length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Available Events ({filteredEvents.filter(event => {
                  const now = new Date();
                  const eventEndDate = new Date(event.bookingEndDate);
                  return eventEndDate >= now && event.status !== EventStatus.CANCELLED && event.status !== EventStatus.COMPLETED;
                }).length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredEvents.filter(event => {
                  const now = new Date();
                  const eventEndDate = new Date(event.bookingEndDate);
                  return eventEndDate >= now && event.status !== EventStatus.CANCELLED && event.status !== EventStatus.COMPLETED;
                }).map((event) => (
            <Card key={event.id} className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {event.name}
                    </CardTitle>
                    <Badge className={statusColors[event.status]}>
                      {event.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                  {event.description}
                </p>

                {/* Event Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{event.venue.name}</span>
                  </div>

                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>
                      {new Date(event.bookingStartDate).toLocaleDateString()} - {new Date(event.bookingEndDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                    <Users className="h-4 w-4 mr-2" />
                    <span>
                      Capacity: {event.venue.capacity}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/admin/events/${event.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/admin/events/modify/${event.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>

                  {event.status === EventStatus.DRAFT && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleEventAction(event.id, 'approve')}
                      disabled={actionLoading === event.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Publish
                    </Button>
                  )}

                  {event.status === EventStatus.PENDING_APPROVAL && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleEventAction(event.id, 'approve')}
                        disabled={actionLoading === event.id}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectClick(event)}
                        disabled={actionLoading === event.id}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}

                  {event.status === EventStatus.PUBLISHED && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEventAction(event.id, 'cancel')}
                      disabled={actionLoading === event.id}
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleEventAction(event.id, 'delete')}
                    disabled={actionLoading === event.id}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>

                  {/* Feedback Form Button */}
                  {feedbackForms[event.id] ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManageFeedbackForm(event)}
                      className="border-purple-200 text-purple-600 hover:bg-purple-50"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Manage Feedback
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateFeedbackForm(event)}
                      className="border-purple-200 text-purple-600 hover:bg-purple-50"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Create Feedback
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
              </div>
            </div>
          )}

          {/* Past Events */}
          {filteredEvents.filter(event => {
            const now = new Date();
            const eventEndDate = new Date(event.bookingEndDate);
            return eventEndDate < now || event.status === EventStatus.CANCELLED || event.status === EventStatus.COMPLETED;
          }).length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gray-500" />
                Past Events ({filteredEvents.filter(event => {
                  const now = new Date();
                  const eventEndDate = new Date(event.bookingEndDate);
                  return eventEndDate < now || event.status === EventStatus.CANCELLED || event.status === EventStatus.COMPLETED;
                }).length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredEvents.filter(event => {
                  const now = new Date();
                  const eventEndDate = new Date(event.bookingEndDate);
                  return eventEndDate < now || event.status === EventStatus.CANCELLED || event.status === EventStatus.COMPLETED;
                }).map((event) => (
                  <Card key={event.id} className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow opacity-75">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            {event.name}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mb-2 p-0 h-auto text-blue-600 hover:text-blue-800"
                            onClick={() => router.push(`/dashboard/admin/events/${event.id}`)}
                          >
                            View Details →
                          </Button>
                          <Badge className={statusColors[event.status]}>
                            {event.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <Button size="sm" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                        {event.description}
                      </p>

                      {/* Event Details */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{event.venue.name}</span>
                        </div>

                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>
                            {new Date(event.bookingStartDate).toLocaleDateString()} - {new Date(event.bookingEndDate).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                          <Users className="h-4 w-4 mr-2" />
                          <span>
                            Capacity: {event.venue.capacity}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/admin/events/${event.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/admin/events/modify/${event.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleEventAction(event.id, 'delete')}
                          disabled={actionLoading === event.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>

                        {/* Feedback Form Button */}
                        {feedbackForms[event.id] ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleManageFeedbackForm(event)}
                            className="border-purple-200 text-purple-600 hover:bg-purple-50"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Manage Feedback
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateFeedbackForm(event)}
                            className="border-purple-200 text-purple-600 hover:bg-purple-50"
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Create Feedback
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {filteredEvents.length === 0 && !loading && (
            <div className="col-span-full">
              <Card className="border-slate-200 dark:border-slate-700">
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    No Events Found
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    No events match your search criteria.
                  </p>
                  <Button
                    onClick={() => router.push('/dashboard/admin/events/create')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Event
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1 || loading}
                  >
                    Previous
                  </Button>

                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages || loading}
                  >
                    Next
                  </Button>
                </div>

                <div className="mt-2 text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-500">
                    Showing {events.length} of {pagination.total} events
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Rejection Modal */}
        <RejectionModal
          isOpen={isRejectionModalOpen}
          onClose={() => {
            setIsRejectionModalOpen(false);
            setEventToReject(null);
          }}
          onConfirm={handleRejectConfirm}
          eventName={eventToReject?.name}
          isLoading={!!eventToReject && actionLoading === eventToReject.id}
        />

        {/* Create Feedback Form Modal */}
        <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Feedback Form</DialogTitle>
              <DialogDescription>
                Create a feedback form for {selectedEventForFeedback?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={feedbackFormTitle}
                  onChange={(e) => setFeedbackFormTitle(e.target.value)}
                  placeholder="Feedback form title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={feedbackFormDescription}
                  onChange={(e) => setFeedbackFormDescription(e.target.value)}
                  placeholder="Feedback form description"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsFeedbackModalOpen(false);
                  setSelectedEventForFeedback(null);
                  setFeedbackFormTitle('');
                  setFeedbackFormDescription('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitFeedbackForm}
                disabled={!feedbackFormTitle.trim() || isCreatingFeedback}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isCreatingFeedback ? 'Creating...' : 'Create Form'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export default withAdminAuth(EventManagementPage);
