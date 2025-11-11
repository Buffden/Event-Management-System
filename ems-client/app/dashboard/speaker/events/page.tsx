'use client';

import {useAuth} from "@/lib/auth-context";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {
    LogOut,
    Calendar,
    Search,
    Eye,
    Users,
    Clock,
    MapPin,
    ArrowLeft,
    Play,
    AlertCircle,
    Mail,
    CheckCircle,
    XCircle,
    MessageSquare
} from "lucide-react";
import {useRouter} from "next/navigation";
import {useEffect, useState, useRef, useCallback} from "react";
import {useLogger} from "@/lib/logger/LoggerProvider";
import { EventJoinInterface } from '@/components/attendance/EventJoinInterface';

import {eventAPI} from "@/lib/api/event.api";
import {EventResponse, EventStatus, EventFilters} from "@/lib/api/types/event.types";
import {withSpeakerAuth} from "@/components/hoc/withAuth";
import {speakerApiClient, SpeakerInvitation} from "@/lib/api/speaker.api";
import {speakerBookingAPI} from "@/lib/api/booking.api";
import {feedbackAPI, FeedbackFormResponse} from "@/lib/api/feedback.api";

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
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedTimeframe, setSelectedTimeframe] = useState('ALL');
    const [selectedInvitationStatus, setSelectedInvitationStatus] = useState('ALL');
    const [activeTab, setActiveTab] = useState<'my-events' | 'invited-events'>('my-events');

    // API state management
    const [events, setEvents] = useState<EventResponse[]>([]);
    const [invitations, setInvitations] = useState<SpeakerInvitation[]>([]);
    const [invitedEvents, setInvitedEvents] = useState<Map<string, EventResponse>>(new Map());
    const [eventRegistrationCounts, setEventRegistrationCounts] = useState<Map<string, number>>(new Map());
    // Map eventId to feedback form
    const [eventFeedbackForms, setEventFeedbackForms] = useState<Map<string, FeedbackFormResponse>>(new Map());
    // Map eventId to invitation status for "All Events" tab
    const [eventInvitationMap, setEventInvitationMap] = useState<Map<string, SpeakerInvitation>>(new Map());
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [eventsPagination, setEventsPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [invitationsPagination, setInvitationsPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
    });

    // Ref to maintain focus on search input
    const searchInputRef = useRef<HTMLInputElement>(null);
    const isSearchingRef = useRef(false);

    // Debounce search term
    useEffect(() => {
        if (searchTerm) {
            isSearchingRef.current = true;
        }
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            if (activeTab === 'my-events') {
                setEventsPagination(prev => ({ ...prev, page: 1 }));
            } else {
                setInvitationsPagination(prev => ({ ...prev, page: 1 }));
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, activeTab]);

    // Load events from API - Show all published events in "All Events" tab
    const loadEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const filters: EventFilters = {
                search: debouncedSearch || undefined,
                timeframe: selectedTimeframe !== 'ALL' ? selectedTimeframe : undefined,
                page: eventsPagination.page,
                limit: eventsPagination.limit,
            };

            logger.debug(LOGGER_COMPONENT_NAME, 'Loading all published events with filters', filters);

            const response = await eventAPI.getPublishedEvents(filters);

            if (response.success) {
                setEvents(response.data.events);
                setEventsPagination(prev => ({
                    ...prev,
                    total: response.data.total,
                    totalPages: response.data.totalPages
                }));
                logger.debug(LOGGER_COMPONENT_NAME, 'All events loaded successfully', { count: response.data.events.length });

                // Load speaker's invitations FIRST to check which events they're invited to
                const invitationMap = new Map<string, SpeakerInvitation>();
                if (user?.id) {
                    try {
                        const speakerProfile = await speakerApiClient.getSpeakerProfile(user.id);
                        const invitationResult = await speakerApiClient.getSpeakerInvitations(speakerProfile.id, {
                            page: 1,
                            limit: 1000 // Get all invitations to map them
                        });

                        invitationResult.invitations.forEach(invitation => {
                            invitationMap.set(invitation.eventId, invitation);
                        });
                        setEventInvitationMap(invitationMap);
                        logger.debug(LOGGER_COMPONENT_NAME, 'Invitations loaded', { count: invitationMap.size });
                    } catch (err) {
                        logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load invitations for event mapping', err instanceof Error ? err : new Error(String(err)));
                    }
                }

                // Fetch registration counts ONLY for events where speaker is invited
                const countsMap = new Map<string, number>();
                const invitedEvents = response.data.events.filter(event => invitationMap.has(event.id));
                await Promise.all(
                    invitedEvents.map(async (event) => {
                        try {
                            const registrationData = await speakerBookingAPI.getEventRegistrationCount(event.id);
                            countsMap.set(event.id, registrationData.totalUsers);
                        } catch (err) {
                            // Silently handle errors - token issues or missing permissions
                            // Don't log as error since this is expected for some scenarios
                            logger.debug(LOGGER_COMPONENT_NAME, 'Failed to load registration count for event', {
                                eventId: event.id,
                                error: err instanceof Error ? err.message : String(err)
                            });
                            countsMap.set(event.id, 0); // Default to 0 if fetch fails
                        }
                    })
                );
                setEventRegistrationCounts(countsMap);

                // Fetch feedback forms ONLY for events where speaker is invited
                const feedbackFormsMap = new Map<string, FeedbackFormResponse>();
                logger.debug(LOGGER_COMPONENT_NAME, 'Fetching feedback forms for invited events only', {
                    totalEvents: response.data.events.length,
                    invitedEventsCount: invitedEvents.length,
                    invitedEventIds: invitedEvents.map(e => e.id)
                });
                await Promise.all(
                    invitedEvents.map(async (event) => {
                        try {
                            logger.debug(LOGGER_COMPONENT_NAME, 'Fetching feedback form for invited event', { eventId: event.id });
                            const feedbackForm = await feedbackAPI.getFeedbackFormByEventId(event.id);
                            if (feedbackForm && feedbackForm.status === 'PUBLISHED') {
                                feedbackFormsMap.set(event.id, feedbackForm);
                                logger.debug(LOGGER_COMPONENT_NAME, 'Found published feedback form', { eventId: event.id });
                            } else {
                                logger.debug(LOGGER_COMPONENT_NAME, 'No published feedback form for event', { eventId: event.id });
                            }
                        } catch (err) {
                            // Silently fail - not all events have feedback forms
                            // 404 is expected when no feedback form exists
                            logger.debug(LOGGER_COMPONENT_NAME, 'No feedback form found for event (expected if form does not exist)', {
                                eventId: event.id,
                                error: err instanceof Error ? err.message : String(err)
                            });
                        }
                    })
                );
                setEventFeedbackForms(feedbackFormsMap);
                logger.debug(LOGGER_COMPONENT_NAME, 'Feedback forms fetch complete', {
                    foundForms: feedbackFormsMap.size,
                    checkedEvents: invitedEvents.length
                });
            } else {
                throw new Error('Failed to load events');
            }

            // Mark initial load as complete
            if (initialLoad) {
                setInitialLoad(false);
            }

            // Restore focus to search input after loading if user was searching
            if (isSearchingRef.current && searchInputRef.current) {
                requestAnimationFrame(() => {
                    if (searchInputRef.current) {
                        searchInputRef.current.focus();
                    }
                });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load events';
            setError(errorMessage);
            logger.error(LOGGER_COMPONENT_NAME, 'Failed to load events', err instanceof Error ? err : new Error(String(err)));
            if (initialLoad) {
                setInitialLoad(false);
            }
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, selectedTimeframe, eventsPagination.page, eventsPagination.limit, initialLoad, user?.id]);

    // Load invitations and their events
    const loadInvitations = useCallback(async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            setError(null);
            const speakerProfile = await speakerApiClient.getSpeakerProfile(user.id);
            const result = await speakerApiClient.getSpeakerInvitations(speakerProfile.id, {
                search: debouncedSearch || undefined,
                status: selectedInvitationStatus !== 'ALL' ? selectedInvitationStatus : undefined,
                page: invitationsPagination.page,
                limit: invitationsPagination.limit
            });

            setInvitations(result.invitations);
            setInvitationsPagination(result.pagination);

            // Load event details for each invitation
            const eventMap = new Map<string, EventResponse>();
            for (const invitation of result.invitations) {
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

            // Mark initial load as complete
            if (initialLoad) {
                setInitialLoad(false);
            }

            // Restore focus to search input after loading if user was searching
            if (isSearchingRef.current && searchInputRef.current) {
                requestAnimationFrame(() => {
                    if (searchInputRef.current) {
                        searchInputRef.current.focus();
                    }
                });
            }
        } catch (err) {
            logger.error(LOGGER_COMPONENT_NAME, 'Failed to load invitations', err instanceof Error ? err : new Error(String(err)));
            if (initialLoad) {
                setInitialLoad(false);
            }
        } finally {
            setLoading(false);
        }
    }, [user?.id, debouncedSearch, selectedInvitationStatus, invitationsPagination.page, invitationsPagination.limit, initialLoad]);

    useEffect(() => {
        if (activeTab === 'my-events') {
            loadEvents();
        } else {
            loadInvitations();
        }
    }, [activeTab, loadEvents, loadInvitations]);

    // Update when filters change
    useEffect(() => {
        if (activeTab === 'my-events') {
            loadEvents();
        }
    }, [debouncedSearch, selectedTimeframe, eventsPagination.page, loadEvents]);

    useEffect(() => {
        if (activeTab === 'invited-events') {
            loadInvitations();
        }
    }, [debouncedSearch, selectedInvitationStatus, invitationsPagination.page, loadInvitations]);

    const getRegistrationPercentage = (registered: number, capacity: number) => {
        if (capacity <= 0) {
            return 0;
        }
        return Math.round((registered / capacity) * 100);
    };

    // Calculate stats from invitations data
    const [invitationStats, setInvitationStats] = useState({
        total: 0,
        pending: 0,
        accepted: 0,
        upcoming: 0
    });

    // Load invitation stats
    useEffect(() => {
        const loadInvitationStats = async () => {
            if (!user?.id) return;

            try {
                const speakerProfile = await speakerApiClient.getSpeakerProfile(user.id);
                const stats = await speakerApiClient.getInvitationStats(speakerProfile.id);

                // Count upcoming accepted events
                let upcomingCount = 0;
                const now = new Date();
                for (const invitation of invitations) {
                    if (invitation.status === 'ACCEPTED') {
                        const event = invitedEvents.get(invitation.eventId);
                        if (event && new Date(event.bookingStartDate) > now) {
                            upcomingCount++;
                        }
                    }
                }

                setInvitationStats({
                    total: stats.total,
                    pending: stats.pending,
                    accepted: stats.accepted,
                    upcoming: upcomingCount
                });
            } catch (err) {
                logger.error(LOGGER_COMPONENT_NAME, 'Failed to load invitation stats', err instanceof Error ? err : new Error(String(err)));
            }
        };

        if (user?.id) {
            loadInvitationStats();
        }
    }, [user?.id, invitations, invitedEvents]);

    if (initialLoad && loading) {
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
                                onClick={() => router.push('/dashboard/speaker')}
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
                        Browse all published events and manage your event invitations.
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
                                <Mail className="h-8 w-8 text-blue-600"/>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Invitations</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{invitationStats.total}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <AlertCircle className="h-8 w-8 text-yellow-600"/>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{invitationStats.pending}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <CheckCircle className="h-8 w-8 text-green-600"/>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Accepted</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{invitationStats.accepted}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <Calendar className="h-8 w-8 text-purple-600"/>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Upcoming</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{invitationStats.upcoming}</p>
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
                                    ref={searchInputRef}
                                    placeholder={activeTab === 'my-events' ? "Search events..." : "Search invitations..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {activeTab === 'my-events' ? (
                                <select
                                    value={selectedTimeframe}
                                    onChange={(e) => {
                                        setSelectedTimeframe(e.target.value);
                                        setEventsPagination(prev => ({ ...prev, page: 1 }));
                                    }}
                                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    <option value="ALL">All Time</option>
                                    <option value="UPCOMING">Upcoming</option>
                                    <option value="ONGOING">Ongoing</option>
                                    <option value="PAST">Past</option>
                                </select>
                            ) : (
                                <select
                                    value={selectedInvitationStatus}
                                    onChange={(e) => {
                                        setSelectedInvitationStatus(e.target.value);
                                        setInvitationsPagination(prev => ({ ...prev, page: 1 }));
                                    }}
                                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="ACCEPTED">Accepted</option>
                                    <option value="DECLINED">Declined</option>
                                </select>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Events Grid - My Events */}
                {activeTab === 'my-events' && (
                <div className="relative">
                    {loading && !initialLoad && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center rounded-lg">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                    )}
                    <div className="space-y-8">
                        {/* Available Events */}
                        {events.filter(event => {
                            const now = new Date();
                            const eventEndDate = new Date(event.bookingEndDate);
                            return now <= eventEndDate;
                        }).length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                    Available Events ({events.filter(event => {
                                        const now = new Date();
                                        const eventEndDate = new Date(event.bookingEndDate);
                                        return now <= eventEndDate;
                                    }).length})
                                </h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {events.filter(event => {
                                        const now = new Date();
                                        const eventEndDate = new Date(event.bookingEndDate);
                                        return now <= eventEndDate;
                                    }).map((event) => {
                        const invitation = eventInvitationMap.get(event.id);
                        const isAccepted = invitation?.status === 'ACCEPTED';
                        const now = new Date();
                        const eventEndDate = new Date(event.bookingEndDate);
                        const isEventEnded = now > eventEndDate;

                        return (
                        <Card key={event.id}
                              className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {isAccepted && <CheckCircle className="h-5 w-5 text-green-500" />}
                                            <CardTitle
                                                className="text-lg font-semibold text-slate-900 dark:text-white">
                                                {event.name}
                                            </CardTitle>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            <Badge className={statusColors[event.status]}>
                                                {event.status.replace('_', ' ')}
                                            </Badge>
                                            {invitation && (
                                                <Badge className={`${invitation.status === 'PENDING' ? 'bg-yellow-500' : invitation.status === 'ACCEPTED' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                                                    {invitation.status}
                                                </Badge>
                                            )}
                                            {isEventEnded && (
                                                <Badge className="bg-gray-500 text-white dark:bg-gray-600 dark:text-gray-100">
                                                    ENDED
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
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
                      {eventRegistrationCounts.get(event.id) ?? 0}/{event.venue.capacity} registered
                      ({getRegistrationPercentage(eventRegistrationCounts.get(event.id) ?? 0, event.venue.capacity)}%)
                    </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{width: `${getRegistrationPercentage(eventRegistrationCounts.get(event.id) ?? 0, event.venue.capacity)}%`}}
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

                                    {isAccepted && event.status === EventStatus.PUBLISHED && (
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => router.push(`/dashboard/speaker/events/${event.id}/live`)}
                                            disabled={isEventEnded}
                                            className={isEventEnded
                                                ? "bg-gray-400 cursor-not-allowed"
                                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                            }
                                        >
                                            <Play className="h-4 w-4 mr-1"/>
                                            {isEventEnded ? 'Event Ended' : 'Join Event'}
                                        </Button>
                                    )}

                                    {eventFeedbackForms.has(event.id) && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => router.push(`/dashboard/speaker/events/${event.id}/feedback`)}
                                        >
                                            <MessageSquare className="h-4 w-4 mr-1"/>
                                            View Feedback
                                        </Button>
                                    )}
                                </div>

                                {isAccepted && event.status === EventStatus.PUBLISHED && !isEventEnded && (
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
                                </div>
                            </div>
                        )}

                        {/* Past Events */}
                        {events.filter(event => {
                            const now = new Date();
                            const eventEndDate = new Date(event.bookingEndDate);
                            return now > eventEndDate;
                        }).length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-gray-500" />
                                    Past Events ({events.filter(event => {
                                        const now = new Date();
                                        const eventEndDate = new Date(event.bookingEndDate);
                                        return now > eventEndDate;
                                    }).length})
                                </h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {events.filter(event => {
                                        const now = new Date();
                                        const eventEndDate = new Date(event.bookingEndDate);
                                        return now > eventEndDate;
                                    }).map((event) => {
                                        const invitation = eventInvitationMap.get(event.id);
                                        const isAccepted = invitation?.status === 'ACCEPTED';
                                        const now = new Date();
                                        const eventEndDate = new Date(event.bookingEndDate);
                                        const isEventEnded = now > eventEndDate;

                                        return (
                                        <Card key={event.id}
                                              className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow opacity-75">
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            {isAccepted && <CheckCircle className="h-5 w-5 text-green-500" />}
                                                            <CardTitle
                                                                className="text-lg font-semibold text-slate-900 dark:text-white">
                                                                {event.name}
                                                            </CardTitle>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            <Badge className={statusColors[event.status]}>
                                                                {event.status.replace('_', ' ')}
                                                            </Badge>
                                                            {invitation && (
                                                                <Badge className={`${invitation.status === 'PENDING' ? 'bg-yellow-500' : invitation.status === 'ACCEPTED' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                                                                    {invitation.status}
                                                                </Badge>
                                                            )}
                                                            <Badge className="bg-gray-500 text-white dark:bg-gray-600 dark:text-gray-100">
                                                                ENDED
                                                            </Badge>
                                                        </div>
                                                    </div>
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
                                          {eventRegistrationCounts.get(event.id) ?? 0}/{event.venue.capacity} registered
                                          ({getRegistrationPercentage(eventRegistrationCounts.get(event.id) ?? 0, event.venue.capacity)}%)
                                        </span>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                                                    <div
                                                        className="bg-blue-600 h-2 rounded-full"
                                                        style={{width: `${getRegistrationPercentage(eventRegistrationCounts.get(event.id) ?? 0, event.venue.capacity)}%`}}
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
                                                </div>
                                            </CardContent>
                                        </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    {events.length === 0 && !loading && (
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
                                    <p className="text-slate-600 dark:text-slate-400">
                                        Check the "Invited Events" tab to see your invitations.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    </div>
                </div>
                )}

                {/* Invited Events Grid */}
                {activeTab === 'invited-events' && (
                <div className="relative">
                    {loading && !initialLoad && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center rounded-lg">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                    )}
                    <div className="space-y-8">
                        {/* Available Invitations */}
                        {invitations.filter(invitation => {
                            const event = invitedEvents.get(invitation.eventId);
                            if (!event) return false;
                            const now = new Date();
                            const eventEndDate = new Date(event.bookingEndDate);
                            return now <= eventEndDate;
                        }).length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                    Available Events ({invitations.filter(invitation => {
                                        const event = invitedEvents.get(invitation.eventId);
                                        if (!event) return false;
                                        const now = new Date();
                                        const eventEndDate = new Date(event.bookingEndDate);
                                        return now <= eventEndDate;
                                    }).length})
                                </h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {invitations.filter(invitation => {
                                        const event = invitedEvents.get(invitation.eventId);
                                        if (!event) return false;
                                        const now = new Date();
                                        const eventEndDate = new Date(event.bookingEndDate);
                                        return now <= eventEndDate;
                                    }).map((invitation) => {
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
                                            <div className="flex flex-wrap gap-2">
                                                <Badge className={statusColors[event.status]}>
                                                    {event.status.replace('_', ' ')}
                                                </Badge>
                                                <Badge className={`${invitation.status === 'PENDING' ? 'bg-yellow-500' : invitation.status === 'ACCEPTED' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                                                    {invitation.status}
                                                </Badge>
                                                {(() => {
                                                    const now = new Date();
                                                    const eventEndDate = new Date(event.bookingEndDate);
                                                    const isEventEnded = now > eventEndDate;
                                                    return isEventEnded ? (
                                                        <Badge className="bg-gray-500 text-white dark:bg-gray-600 dark:text-gray-100">
                                                            ENDED
                                                        </Badge>
                                                    ) : null;
                                                })()}
                                            </div>
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

                                        {invitation.status === 'ACCEPTED' && event.status === EventStatus.PUBLISHED && (() => {
                                            const now = new Date();
                                            const eventEndDate = new Date(event.bookingEndDate);
                                            const isEventEnded = now > eventEndDate;

                                            return (
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => router.push(`/dashboard/speaker/events/${event.id}/live`)}
                                                    disabled={isEventEnded}
                                                    className={isEventEnded
                                                        ? "bg-gray-400 cursor-not-allowed"
                                                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                                    }
                                                >
                                                    <Play className="h-4 w-4 mr-1"/>
                                                    {isEventEnded ? 'Event Ended' : 'Join Event'}
                                                </Button>
                                            );
                                        })()}
                                    </div>

                                    {invitation.status === 'ACCEPTED' && event.status === EventStatus.PUBLISHED && (() => {
                                        const now = new Date();
                                        const eventEndDate = new Date(event.bookingEndDate);
                                        const isEventEnded = now > eventEndDate;

                                        if (!isEventEnded) {
                                            return (
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
                                            );
                                        }

                                        return null;
                                    })()}
                                </CardContent>
                            </Card>
                        );
                                    })}
                                </div>
                            </div>
                        )}

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
                </div>
                )}

                {/* Pagination */}
                {activeTab === 'my-events' && eventsPagination.total > 0 && (
                    <div className="mt-8 flex justify-center">
                        <Card className="border-slate-200 dark:border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEventsPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={eventsPagination.page === 1 || loading || eventsPagination.totalPages <= 1}
                                    >
                                        Previous
                                    </Button>

                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        Page {eventsPagination.page} of {Math.max(1, eventsPagination.totalPages)}
                                    </span>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEventsPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={eventsPagination.page >= eventsPagination.totalPages || loading || eventsPagination.totalPages <= 1}
                                    >
                                        Next
                                    </Button>
                                </div>

                                <div className="mt-2 text-center">
                                    <span className="text-xs text-slate-500 dark:text-slate-500">
                                        Showing {events.length} of {eventsPagination.total} events
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'invited-events' && invitationsPagination.total > 0 && (
                    <div className="mt-8 flex justify-center">
                        <Card className="border-slate-200 dark:border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setInvitationsPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={invitationsPagination.page === 1 || loading || invitationsPagination.totalPages <= 1}
                                    >
                                        Previous
                                    </Button>

                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        Page {invitationsPagination.page} of {Math.max(1, invitationsPagination.totalPages)}
                                    </span>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setInvitationsPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={invitationsPagination.page >= invitationsPagination.totalPages || loading || invitationsPagination.totalPages <= 1}
                                    >
                                        Next
                                    </Button>
                                </div>

                                <div className="mt-2 text-center">
                                    <span className="text-xs text-slate-500 dark:text-slate-500">
                                        Showing {invitations.length} of {invitationsPagination.total} invitations
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
