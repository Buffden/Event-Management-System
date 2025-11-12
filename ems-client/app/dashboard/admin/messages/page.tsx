'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare,
  Send,
  Mail,
  MailOpen,
  Clock,
  User,
  Search,
  Filter,
  ArrowLeft,
  Calendar,
  FileText,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { withAdminAuth } from '@/components/hoc/withAuth';
import { adminApiClient, Message, MessageThread, SpeakerInvitation } from '@/lib/api/admin.api';
import { eventAPI } from '@/lib/api/event.api';
import { speakerApiClient } from '@/lib/api/speaker.api';
import { useThemeColors } from '@/hooks/useThemeColors';

const LOGGER_COMPONENT_NAME = 'AdminMessagingCenter';

function AdminMessagingCenter() {
  const { user } = useAuth();
  const router = useRouter();
  const logger = useLogger();
  const colors = useThemeColors();

  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [viewMode, setViewMode] = useState<'messages' | 'threads' | 'by-speaker' | 'by-event'>('messages');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Compose message state
  const [showCompose, setShowCompose] = useState(false);
  const [isReply, setIsReply] = useState(false);
  const [composeData, setComposeData] = useState({
    toUserId: '',
    subject: '',
    content: '',
    eventId: ''
  });
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [allRecipients, setAllRecipients] = useState<Array<{ id: string; name: string; email: string; type: 'user' | 'speaker' }>>([]);
  const [filteredRecipients, setFilteredRecipients] = useState<Array<{ id: string; name: string; email: string; type: 'user' | 'speaker' }>>([]);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    logger.debug(LOGGER_COMPONENT_NAME, 'Admin messaging center loaded', { userRole: user?.role });
    loadMessages();
    loadUnreadCount();

    // Poll for unread count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user, logger]);

  useEffect(() => {
    filterMessages();
  }, [searchQuery, messages, selectedSpeakerId, selectedEventId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      logger.info(LOGGER_COMPONENT_NAME, 'Loading all speaker messages');
      const allMessages = await adminApiClient.getAllSpeakerMessages(100, 0);
      setMessages(allMessages);
      setFilteredMessages(allMessages);
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load messages', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await adminApiClient.getUnreadSpeakerMessageCount();
      setUnreadCount(count);
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load unread count', error as Error);
    }
  };

  const filterMessages = () => {
    let filtered = [...messages];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.subject.toLowerCase().includes(query) ||
        m.content.toLowerCase().includes(query)
      );
    }

    if (selectedSpeakerId) {
      filtered = filtered.filter(m => m.fromUserId === selectedSpeakerId);
    }

    if (selectedEventId) {
      filtered = filtered.filter(m => m.eventId === selectedEventId);
    }

    setFilteredMessages(filtered);
  };

  const handleMessageClick = async (message: Message) => {
    setSelectedMessage(message);

    // Mark as read if unread
    if (!message.readAt) {
      try {
        await adminApiClient.markMessageAsRead(message.id);
        // Update local state
        setMessages(prev => prev.map(m =>
          m.id === message.id ? { ...m, readAt: new Date().toISOString(), status: 'READ' } : m
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        logger.error(LOGGER_COMPONENT_NAME, 'Failed to mark message as read', error as Error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!composeData.toUserId || !composeData.subject || !composeData.content) {
      return;
    }

    try {
      setSending(true);
      logger.info(LOGGER_COMPONENT_NAME, 'Sending message', { toUserId: composeData.toUserId });

      const newMessage = await adminApiClient.sendMessage(
        composeData.toUserId,
        composeData.subject,
        composeData.content,
        selectedMessage?.threadId || undefined,
        composeData.eventId || undefined
      );

      // Refresh messages
      await loadMessages();

      // Reset compose form
      setComposeData({ toUserId: '', subject: '', content: '', eventId: '' });
      setRecipientSearchQuery('');
      setShowCompose(false);
      setIsReply(false);
      setSelectedMessage(null);

      logger.info(LOGGER_COMPONENT_NAME, 'Message sent successfully', { messageId: newMessage.id });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to send message', error as Error);
    } finally {
      setSending(false);
    }
  };

  const handleReply = (message: Message) => {
    setComposeData({
      toUserId: message.fromUserId,
      subject: `Re: ${message.subject}`,
      content: '',
      eventId: '' // Don't require event for replies
    });
    setIsReply(true);
    setShowCompose(true);
    setSelectedMessage(message);
    setRecipientSearchQuery('');
    // Load all recipients for reply
    loadAllRecipients();
  };

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      logger.info(LOGGER_COMPONENT_NAME, 'Loading events for message composition');
      const response = await adminApiClient.getAllEvents({ limit: 100 });
      const eventsList = response.data.events.map((event: any) => ({
        id: event.id,
        name: event.name
      }));
      setEvents(eventsList);
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load events', error as Error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadAllRecipients = async () => {
    try {
      setLoadingRecipients(true);
      logger.info(LOGGER_COMPONENT_NAME, 'Loading all recipients (users and speakers)');

      // Load all users
      const usersResponse = await adminApiClient.getAllUsers({ limit: 1000 });
      const users = usersResponse.data.map(user => ({
        id: user.id,
        name: user.name || user.email,
        email: user.email,
        type: 'user' as const
      }));

      // Load all speakers
      const speakers = await speakerApiClient.searchSpeakers({ query: '', limit: 1000 });
      const speakersList = speakers.map(speaker => ({
        id: speaker.userId,
        name: speaker.name,
        email: speaker.email,
        type: 'speaker' as const
      }));

      // Combine and remove duplicates (speakers are also users)
      const allRecipientsList = [
        ...users,
        ...speakersList.filter(s => !users.find(u => u.id === s.id))
      ];

      setAllRecipients(allRecipientsList);
      setFilteredRecipients(allRecipientsList);

      logger.info(LOGGER_COMPONENT_NAME, 'All recipients loaded', {
        usersCount: users.length,
        speakersCount: speakers.length,
        totalCount: allRecipientsList.length
      });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load recipients', error as Error);
      setAllRecipients([]);
      setFilteredRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  };

  // Filter recipients by search query
  useEffect(() => {
    if (!recipientSearchQuery.trim()) {
      setFilteredRecipients(allRecipients);
      return;
    }

    const query = recipientSearchQuery.toLowerCase().trim();
    const filtered = allRecipients.filter(recipient => {
      const nameMatch = recipient.name?.toLowerCase().includes(query);
      const emailMatch = recipient.email?.toLowerCase().includes(query);
      const idMatch = recipient.id.toLowerCase().includes(query);
      return nameMatch || emailMatch || idMatch;
    });

    setFilteredRecipients(filtered);
  }, [recipientSearchQuery, allRecipients]);

  const handleEventSelect = (eventId: string) => {
    setComposeData({ ...composeData, eventId });
  };

  const handleRecipientSelect = (userId: string) => {
    setComposeData({ ...composeData, toUserId: userId });
  };

  const handleOpenCompose = () => {
    setShowCompose(true);
    setIsReply(false);
    setComposeData({ toUserId: '', subject: '', content: '', eventId: '' });
    setRecipientSearchQuery('');
    loadEvents();
    loadAllRecipients();
  };

  // Get unique speakers from messages
  const uniqueSpeakers = Array.from(new Set(messages.map(m => m.fromUserId)));

  // Get unique events from messages
  const uniqueEvents = Array.from(new Set(messages.filter(m => m.eventId).map(m => m.eventId!)));

  if (loading && messages.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading messages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/admin')}
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-8 w-8" />
              Messaging Center
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage all speaker communications
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {unreadCount} unread
            </Badge>
          )}
          <Button onClick={handleOpenCompose}>
            <Send className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedSpeakerId || ''}
              onChange={(e) => setSelectedSpeakerId(e.target.value || null)}
              className="px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All Speakers</option>
              {uniqueSpeakers.map(speakerId => (
                <option key={speakerId} value={speakerId}>
                  Speaker {speakerId.substring(0, 8)}
                </option>
              ))}
            </select>
            <select
              value={selectedEventId || ''}
              onChange={(e) => setSelectedEventId(e.target.value || null)}
              className="px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">All Events</option>
              {uniqueEvents.map(eventId => (
                <option key={eventId} value={eventId}>
                  Event {eventId.substring(0, 8)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Messages ({filteredMessages.length})</CardTitle>
              <CardDescription>
                {unreadCount > 0 && `${unreadCount} unread messages`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {filteredMessages.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages found</p>
                  </div>
                ) : (
                  filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => handleMessageClick(message)}
                      className={`p-4 border-b cursor-pointer transition-colors ${
                        selectedMessage?.id === message.id
                          ? 'bg-blue-50 dark:bg-blue-950'
                          : !message.readAt
                          ? 'bg-yellow-50 dark:bg-yellow-950 hover:bg-yellow-100 dark:hover:bg-yellow-900'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {!message.readAt ? (
                            <Circle className="h-3 w-3 text-blue-600 fill-blue-600" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-gray-400" />
                          )}
                          <span className="font-semibold text-sm">
                            {message.subject}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(message.sentAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {message.content}
                      </p>
                      {message.eventId && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>Event: {message.eventId.substring(0, 8)}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedMessage.subject}</CardTitle>
                    <CardDescription className="mt-2">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          From: Speaker {selectedMessage.fromUserId.substring(0, 8)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(selectedMessage.sentAt).toLocaleString()}
                        </span>
                        {selectedMessage.eventId && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Event: {selectedMessage.eventId.substring(0, 8)}
                          </span>
                        )}
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedMessage.status === 'READ' ? 'default' : 'secondary'}>
                      {selectedMessage.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReply(selectedMessage)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
                {selectedMessage.attachmentUrl && (
                  <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{selectedMessage.attachmentName}</p>
                        <a
                          href={selectedMessage.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Download attachment
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Select a message to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl m-4">
            <CardHeader>
              <CardTitle>{isReply ? 'Reply to Message' : 'Compose Message'}</CardTitle>
              <CardDescription>{isReply ? 'Reply to this message' : 'Send a message to any user or speaker'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Event selection - only show for new messages, not replies */}
              {!isReply && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Event (Optional)
                  </label>
                  {loadingEvents ? (
                    <div className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                      <span className="text-sm text-gray-500">Loading events...</span>
                    </div>
                  ) : (
                    <select
                      value={composeData.eventId}
                      onChange={(e) => handleEventSelect(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                    >
                      <option value="">No event (optional)</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Recipient selection with search */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  To (User or Speaker) <span className="text-red-500">*</span>
                </label>
                {loadingRecipients ? (
                  <div className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                    <span className="text-sm text-gray-500">Loading recipients...</span>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by name, email, or ID..."
                        value={recipientSearchQuery}
                        onChange={(e) => setRecipientSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {isReply && composeData.toUserId && !allRecipients.find(r => r.id === composeData.toUserId) ? (
                      <div className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Recipient: {composeData.toUserId}
                        </span>
                      </div>
                    ) : (
                      <select
                        value={composeData.toUserId}
                        onChange={(e) => handleRecipientSelect(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                        required
                      >
                        <option value="">Select a recipient</option>
                        {filteredRecipients.map((recipient) => (
                          <option key={recipient.id} value={recipient.id}>
                            {recipient.name} ({recipient.email}) - {recipient.type === 'speaker' ? 'Speaker' : 'User'}
                          </option>
                        ))}
                      </select>
                    )}
                    {recipientSearchQuery && filteredRecipients.length === 0 && (
                      <p className="text-sm text-gray-500 mt-1">No recipients found matching "{recipientSearchQuery}"</p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <Input
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  placeholder="Enter subject"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={composeData.content}
                  onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                  placeholder="Enter your message..."
                  rows={6}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCompose(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendMessage} disabled={sending}>
                  {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default withAdminAuth(AdminMessagingCenter);

