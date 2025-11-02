'use client';

import {useAuth} from "@/lib/auth-context";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
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
    Mail,
    CheckCircle,
    XCircle
} from "lucide-react";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {useLogger} from "@/lib/logger/LoggerProvider";
import { EventJoinInterface } from '@/components/attendance/EventJoinInterface';

import {eventAPI} from "@/lib/api/event.api";
import {EventResponse, EventStatus, EventFilters} from "@/lib/api/types/event.types";
import {withSpeakerAuth} from "@/components/hoc/withAuth";
import {speakerApiClient, SpeakerInvitation} from "@/lib/api/speaker.api";

const statusColors = {
  [EventStatus.DRAFT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [EventStatus.PENDING_APPROVAL]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [EventStatus.PUBLISHED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [EventStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EventStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EventStatus.COMPLETED]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

const LOGGER_COMPONENT_NAME = 'SpeakerEventManagementPage';

function SpeakerEventManagementPage() {
    const {user, logout} = useAuth();
    const router = useRouter();
    const logger = useLogger();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTimeframe, setSelectedTimeframe] = useState('ALL');
    const [activeTab, setActiveTab] = useState<'my-events' | 'invited-events'>('my-events');

    // API state management
    const [events, setEvents] = useState<EventResponse[]>([]);
    const [invitations, setInvitations] = useState<SpeakerInvitation[]>([]);
    const [invitedEvents, setInvitedEvents] = useState<Map<string, EventResponse>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });

    // Load events from API - Show all published events in "All Events" tab
    const loadEvents = async () => {
        try {
            setLoading(true);
            setError(null);

            const filters: EventFilters = {
                page: pagination.page,
                limit: pagination.limit,
                // Note: Published events API only returns PUBLISHED events, so status filter is not needed
            };

            logger.debug(LOGGER_COMPONENT_NAME, 'Loading all published events with filters', filters);

            // Use getPublishedEvents to show ALL published events, not just speaker's own events
            const response = await eventAPI.getPublishedEvents(filters);

            if (response.success) {
                setEvents(response.data.events);
                setPagination(prev => ({
                    ...prev,
                    total: response.data.total,
                    totalPages: response.data.totalPages
                }));
                logger.debug(LOGGER_COMPONENT_NAME, 'All events loaded successfully', { count: response.data.events.length });
            } else {
                throw new Error('Failed to load events');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load events';
            setError(errorMessage);
            logger.error(LOGGER_COMPONENT_NAME, 'Failed to load events', err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    };

    // Load invitations and their events
    const loadInvitations = async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            const speakerProfile = await speakerApiClient.getSpeakerProfile(user.id);
            const allInvitations = await speakerApiClient.getSpeakerInvitations(speakerProfile.id);
            setInvitations(allInvitations);

            // Load event details for each invitation
            const eventMap = new Map<string, EventResponse>();
            for (const invitation of allInvitations) {
                try {
                    const eventResponse = await eventAPI.getEventById(invitation.eventId);
                    eventMap.set(invitation.eventId, eventResponse.data);
                } catch (err) {
                    logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load event for invitation', { 
                        invitationId: invitation.id, 
                        eventId: invitation.eventId 
                    });
                }
            }
            setInvitedEvents(eventMap);
        } catch (err) {
            logger.error(LOGGER_COMPONENT_NAME, 'Failed to load invitations', err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'my-events') {
            loadEvents();
        } else {
            loadInvitations();
        }
    }, [pagination.page, activeTab]);

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
            logger.debug(LOGGER_COMPONENT_NAME, `Event ${eventId} action: ${action}`);

            let response;
            switch (action) {
                case 'submit':
                    response = await eventAPI.submitEvent(eventId);
                    break;
                case 'delete':
                    response = await eventAPI.deleteEvent(eventId);
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            if (response.success) {
                logger.info(LOGGER_COMPONENT_NAME, `Event ${eventId} ${action} successful`);
                // Reload events to reflect changes
                await loadEvents();
            } else {
                throw new Error(`Failed to ${action} event`);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : `Failed to ${action} event`;
            setError(errorMessage);
            logger.error(LOGGER_COMPONENT_NAME, `Failed to ${action} event ${eventId}`, err instanceof Error ? err : new Error(String(err)));
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

    // Calculate stats from real data (all events shown are published)
    const stats = {
        total: events.length,
        published: events.length, // All events in this tab are published
        draft: 0, // Draft events are not shown in "All Events" tab
        pending: 0, // Pending events are not shown in "All Events" tab
        rejected: 0 // Rejected events are not shown in "All Events" tab
    };

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
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
        <div
            className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Header */}
            <header
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/dashboard/admin')}
                                className="text-slate-600 hover:text-slate-900"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2"/>
                                Back to Dashboard
                            </Button>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Event Management
                            </h1>
                        </div>

                        <div className="flex items-center space-x-4">
                            <Button
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                onClick={() => router.push('/dashboard/speaker/events/create')}
                            >
                                <Plus className="h-4 w-4 mr-2"/>
                                Create Event
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={logout}
                                className="text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                            >
                                <LogOut className="h-4 w-4 mr-2"/>
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
                        Browse all published events, manage your own events, and join invited events.
                    </p>
                </div>

                {/* Tabs */}
                <div className="mb-6 flex space-x-4 border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('my-events')}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === 'my-events'
                                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        All Events
                    </button>
                    <button
                        onClick={() => setActiveTab('invited-events')}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === 'invited-events'
                                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Invited Events
                        {invitations.filter(inv => inv.status === 'PENDING').length > 0 && (
                            <Badge className="ml-2 bg-yellow-500 text-white">
                                {invitations.filter(inv => inv.status === 'PENDING').length}
                            </Badge>
                        )}
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <Calendar className="h-8 w-8 text-blue-600"/>
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
                                <Play className="h-8 w-8 text-green-600"/>
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
                                <Pause className="h-8 w-8 text-yellow-600"/>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Draft</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.draft}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <AlertCircle className="h-8 w-8 text-orange-600"/>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                                <Input
                                    placeholder="Search events..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

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
                        </div>
                    </CardContent>
                </Card>

                {/* Events Grid - My Events */}
                {activeTab === 'my-events' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => (
                        <Card key={event.id}
                              className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle
                                            className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                            {event.name}
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mb-2 p-0 h-auto text-blue-600 hover:text-blue-800"
                                            onClick={() => router.push(`/dashboard/speaker/events/${event.id}`)}
                                        >
                                            View Details →
                                        </Button>
                                        <Badge className={statusColors[event.status]}>
                                            {event.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <Button size="sm" variant="ghost">
                                        <MoreHorizontal className="h-4 w-4"/>
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
                                        <MapPin className="h-4 w-4 mr-2"/>
                                        <span>{event.venue.name}</span>
                                    </div>

                                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                                        <Clock className="h-4 w-4 mr-2"/>
                                        <span>
                      {new Date(event.bookingStartDate).toLocaleDateString()} - {new Date(event.bookingEndDate).toLocaleDateString()}
                    </span>
                                    </div>

                                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                                        <Users className="h-4 w-4 mr-2"/>
                                        <span>
                      {15}/{event.venue.capacity} registered
                      ({getRegistrationPercentage(15, event.venue.capacity)}%)
                    </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{width: `${getRegistrationPercentage(15, event.venue.capacity)}%`}}
                                    ></div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => router.push(`/dashboard/speaker/events/${event.id}`)}
                                    >
                                        <Eye className="h-4 w-4 mr-1"/>
                                        View Details
                                    </Button>

                                    {/* Only show edit/delete/submit actions if speaker is the event creator */}
                                    {event.speakerId === user?.id && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => router.push(`/dashboard/speaker/events/edit/${event.id}`)}
                                                disabled={event.status !== EventStatus.DRAFT && event.status !== EventStatus.REJECTED}
                                            >
                                                <Edit className="h-4 w-4 mr-1"/>
                                                Edit
                                            </Button>

                                            {(event.status === EventStatus.DRAFT || event.status === EventStatus.REJECTED) && (
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => handleEventAction(event.id, 'submit')}
                                                    disabled={actionLoading === event.id}
                                                >
                                                    <Play className="h-4 w-4 mr-1"/>
                                                    Submit for Approval
                                                </Button>
                                            )}

                                            {event.status === EventStatus.DRAFT && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleEventAction(event.id, 'delete')}
                                                    disabled={actionLoading === event.id}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1"/>
                                                    Delete
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>

                            </CardContent>
                        </Card>
                    ))}

                    {filteredEvents.length === 0 && !loading && (
                        <div className="col-span-full">
                            <Card className="border-slate-200 dark:border-slate-700">
                                <CardContent className="text-center py-12">
                                    <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4"/>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                        No Events Found
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                                        No events match your search criteria.
                                    </p>
                                    <Button
                                        onClick={() => router.push('/dashboard/speaker/events/create')}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                    >
                                        <Plus className="h-4 w-4 mr-2"/>
                                        Create Your First Event
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
                )}

                {/* Invited Events Grid */}
                {activeTab === 'invited-events' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {invitations.map((invitation) => {
                        const event = invitedEvents.get(invitation.eventId);
                        if (!event) return null;

                        const getStatusIcon = () => {
                            switch (invitation.status) {
                                case 'PENDING':
                                    return <Mail className="h-5 w-5 text-yellow-500" />;
                                case 'ACCEPTED':
                                    return <CheckCircle className="h-5 w-5 text-green-500" />;
                                case 'DECLINED':
                                    return <XCircle className="h-5 w-5 text-red-500" />;
                                default:
                                    return <AlertCircle className="h-5 w-5 text-gray-500" />;
                            }
                        };

                        return (
                            <Card key={invitation.id} className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {getStatusIcon()}
                                                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                                                    {event.name}
                                                </CardTitle>
                                            </div>
                                            <Badge className={statusColors[event.status]}>
                                                {event.status.replace('_', ' ')}
                                            </Badge>
                                            <Badge className={`ml-2 ${invitation.status === 'PENDING' ? 'bg-yellow-500' : invitation.status === 'ACCEPTED' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                                                {invitation.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                                        {event.description}
                                    </p>

                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                                            <MapPin className="h-4 w-4 mr-2"/>
                                            <span>{event.venue.name}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                                            <Clock className="h-4 w-4 mr-2"/>
                                            <span>
                                                {new Date(event.bookingStartDate).toLocaleDateString()} - {new Date(event.bookingEndDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => router.push(`/dashboard/speaker/events/${event.id}`)}
                                        >
                                            <Eye className="h-4 w-4 mr-1"/>
                                            View Details
                                        </Button>

                                        {invitation.status === 'ACCEPTED' && event.status === EventStatus.PUBLISHED && (
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => router.push(`/dashboard/speaker/events/${event.id}/live`)}
                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                            >
                                                <Play className="h-4 w-4 mr-1"/>
                                                Join Event
                                            </Button>
                                        )}
                                    </div>

                                    {invitation.status === 'ACCEPTED' && event.status === EventStatus.PUBLISHED && (
                                        <div className="mt-4 pt-4 border-t">
                                            <EventJoinInterface
                                                eventId={event.id}
                                                eventTitle={event.name}
                                                eventStartTime={event.bookingStartDate}
                                                eventEndTime={event.bookingEndDate}
                                                eventVenue={event.venue.name}
                                                eventCategory={event.category}
                                                eventStatus={event.status}
                                                eventDescription={event.description}
                                                userRole={user?.role || 'SPEAKER'}
                                                speakerId={user?.id}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}

                    {invitations.length === 0 && !loading && (
                        <div className="col-span-full">
                            <Card className="border-slate-200 dark:border-slate-700">
                                <CardContent className="text-center py-12">
                                    <Mail className="h-12 w-12 text-slate-400 mx-auto mb-4"/>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                        No Invitations
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                                        You haven't received any event invitations yet.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
                )}

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
            </main>
        </div>
    );
}

export default withSpeakerAuth(SpeakerEventManagementPage);
