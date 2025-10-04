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
  Archive
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {logger} from "@/lib/logger";

// Mock data for events
const mockEvents = [
  {
    id: '1',
    name: 'Tech Conference 2024',
    description: 'Annual technology conference featuring the latest innovations in software development, AI, and cloud computing.',
    status: 'published',
    venue: 'Convention Center Downtown',
    capacity: 500,
    registered: 342,
    bookingStartDate: '2024-02-15T09:00:00Z',
    bookingEndDate: '2024-02-17T18:00:00Z',
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: '2',
    name: 'Design Workshop',
    description: 'Interactive workshop on modern UI/UX design principles and tools.',
    status: 'draft',
    venue: 'Creative Studio Hub',
    capacity: 50,
    registered: 12,
    bookingStartDate: '2024-02-20T10:00:00Z',
    bookingEndDate: '2024-02-21T16:00:00Z',
    createdAt: '2024-01-15T14:30:00Z',
  },
  {
    id: '3',
    name: 'AI Summit',
    description: 'Exploring the future of artificial intelligence and machine learning applications.',
    status: 'published',
    venue: 'Tech Innovation Center',
    capacity: 200,
    registered: 156,
    bookingStartDate: '2024-03-01T08:00:00Z',
    bookingEndDate: '2024-03-03T17:00:00Z',
    createdAt: '2024-01-05T09:15:00Z',
  },
  {
    id: '4',
    name: 'Startup Pitch Night',
    description: 'Local startups present their innovative ideas to investors and industry experts.',
    status: 'archived',
    venue: 'Innovation Hub',
    capacity: 100,
    registered: 89,
    bookingStartDate: '2024-01-25T18:00:00Z',
    bookingEndDate: '2024-01-25T22:00:00Z',
    createdAt: '2024-01-01T12:00:00Z',
  }
];

const statusColors = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

const COMPONENT_NAME = 'EventManagementPage';

export default function EventManagementPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState('ALL');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Filter events based on search and filters
  const filteredEvents = mockEvents.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.venue.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'ALL' || event.status === selectedStatus;
    
    const now = new Date();
    const eventStart = new Date(event.bookingStartDate);
    const matchesTimeframe = selectedTimeframe === 'ALL' ||
                           (selectedTimeframe === 'UPCOMING' && eventStart > now) ||
                           (selectedTimeframe === 'ONGOING' && eventStart <= now && new Date(event.bookingEndDate) >= now) ||
                           (selectedTimeframe === 'PAST' && new Date(event.bookingEndDate) < now);
    
    return matchesSearch && matchesStatus && matchesTimeframe;
  });

  const handleEventAction = (eventId: string, action: string) => {
    // TODO: Implement event action API calls
    logger.debug(COMPONENT_NAME, `Event ${eventId} action: ${action}`);
  };

  const getRegistrationPercentage = (registered: number, capacity: number) => {
    if (capacity <= 0) {
      return 0;
    }
    return Math.round((registered / capacity) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading event management...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null; // Will redirect
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockEvents.length}</p>
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {mockEvents.filter(e => e.status === 'published').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Pause className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Draft</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {mockEvents.filter(e => e.status === 'draft').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Registrations</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {mockEvents.reduce((sum, event) => sum + event.registered, 0)}
                  </p>
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
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
                <option value="cancelled">Cancelled</option>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {event.name}
                    </CardTitle>
                    <Badge className={statusColors[event.status as keyof typeof statusColors]}>
                      {event.status.toUpperCase()}
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
                    <span>{event.venue}</span>
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
                      {event.registered}/{event.capacity} registered 
                      ({getRegistrationPercentage(event.registered, event.capacity)}%)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${getRegistrationPercentage(event.registered, event.capacity)}%` }}
                  ></div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline">
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
                  
                  {event.status === 'draft' && (
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => handleEventAction(event.id, 'publish')}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Publish
                    </Button>
                  )}
                  
                  {event.status === 'published' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEventAction(event.id, 'archive')}
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      Archive
                    </Button>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleEventAction(event.id, 'delete')}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredEvents.length === 0 && (
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
      </main>
    </div>
  );
}
