'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Send,
  Mail,
  MailOpen,
  Clock,
  User,
  Reply,
  AlertCircle
} from 'lucide-react';
import { Message, MessageThread } from '@/lib/api/speaker.api';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { tokenManager } from '@/lib/api/auth.api';
import { useAuth } from '@/lib/auth-context';

const LOGGER_COMPONENT_NAME = 'MessageCenter';

interface MessageCenterProps {
  messages: Message[];
  threads: MessageThread[];
  unreadCount: number;
  onMarkAsRead: (messageId: string) => Promise<void>;
  onSendMessage: (message: { toUserId: string; subject: string; content: string }) => Promise<void>;
  loading?: boolean;
}

export function MessageCenter({
  messages,
  threads,
  unreadCount,
  onMarkAsRead,
  onSendMessage,
  loading = false
}: MessageCenterProps) {
  const logger = useLogger();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'messages' | 'threads'>('messages');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    toUserId: '',
    subject: '',
    content: '',
  });
  const [adminUsers, setAdminUsers] = useState<Array<{id: string, name: string, email: string}>>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [sending, setSending] = useState(false);

  // Load admin users for the dropdown
  const loadAdmins = async () => {
    try {
      setLoadingAdmins(true);
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading admin users for messaging');

      // Fetch admin users from the API endpoint accessible to speakers
      try {
        const token = tokenManager.getToken();
        if (!token) {
          logger.warn(LOGGER_COMPONENT_NAME, 'No authentication token found');
          setAdminUsers([]);
          return;
        }

        const response = await fetch('/api/auth/admins?limit=100', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          const admins = (result.data || []).map((user: any) => ({
            id: user.id,
            name: user.name || user.email,
            email: user.email,
          }));
          setAdminUsers(admins);
          logger.info(LOGGER_COMPONENT_NAME, 'Admin users loaded for messaging', { count: admins.length });
        } else {
          // If we can't fetch admins, use empty list
          logger.warn(LOGGER_COMPONENT_NAME, 'Could not fetch admin users, using empty list');
          setAdminUsers([]);
        }
      } catch (fetchError) {
        // If fetch fails, use empty list
        logger.warn(LOGGER_COMPONENT_NAME, 'Failed to fetch admin users, using empty list', fetchError as Error);
        setAdminUsers([]);
      }
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load admin users', error as Error);
      setAdminUsers([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  // Load admins when component mounts
  useEffect(() => {
    loadAdmins();
  }, []);

  const handleMarkAsRead = async (messageId: string) => {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Marking message as read', { messageId });
      await onMarkAsRead(messageId);
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to mark message as read', error as Error, { messageId });
    }
  };

  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async () => {
    if (!composeData.toUserId || !composeData.subject || !composeData.content) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSending(true);
      setError(null);
      logger.debug(LOGGER_COMPONENT_NAME, 'Sending message', { toUserId: composeData.toUserId });

      await onSendMessage(composeData);

      setComposeData({ toUserId: '', subject: '', content: '' });
      setShowCompose(false);

      logger.info(LOGGER_COMPONENT_NAME, 'Message sent successfully', { toUserId: composeData.toUserId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setError(errorMessage);
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to send message', error as Error, { toUserId: composeData.toUserId });
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUnreadBadge = (message: Message) => {
    if (!message.readAt) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">New</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Message Center</CardTitle>
          <CardDescription>Loading your messages...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message Center
                {unreadCount > 0 && (
                  <Badge variant="destructive">{unreadCount} unread</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Communicate with event organizers and administrators
              </CardDescription>
            </div>
            <Button onClick={() => setShowCompose(true)}>
              <Send className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Compose Message */}
      {showCompose && (
        <Card>
          <CardHeader>
            <CardTitle>Compose Message</CardTitle>
            <CardDescription>Send a message to an administrator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                To Administrator
              </label>
              {adminUsers.length > 0 ? (
                <select
                  value={composeData.toUserId}
                  onChange={(e) => setComposeData(prev => ({ ...prev, toUserId: e.target.value }))}
                  disabled={loadingAdmins}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select an administrator...</option>
                  {adminUsers.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name} ({admin.email})
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder="Enter admin user ID"
                  value={composeData.toUserId}
                  onChange={(e) => setComposeData(prev => ({ ...prev, toUserId: e.target.value }))}
                  disabled={loadingAdmins}
                />
              )}
              {loadingAdmins && (
                <p className="text-sm text-gray-500 mt-1">Loading administrators...</p>
              )}
              {!loadingAdmins && adminUsers.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Could not load admin list. Please enter an admin user ID manually.
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subject
              </label>
              <Input
                placeholder="Message subject"
                value={composeData.subject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Message
              </label>
              <Textarea
                placeholder="Type your message here..."
                value={composeData.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendMessage} disabled={sending}>
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
              <Button variant="outline" onClick={() => setShowCompose(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <Button
          variant={activeTab === 'messages' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('messages')}
          className="flex-1"
        >
          <Mail className="h-4 w-4 mr-2" />
          Messages ({messages.length})
        </Button>
        <Button
          variant={activeTab === 'threads' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('threads')}
          className="flex-1"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Conversations ({threads.length})
        </Button>
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
            <CardDescription>
              Your latest messages (sent and received)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {messages.length > 0 ? (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    !message.readAt
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => {
                    setSelectedMessage(message);
                    if (!message.readAt) {
                      handleMarkAsRead(message.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-gray-500" />
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {message.subject}
                        </h3>
                        {getUnreadBadge(message)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {message.content}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {user && message.fromUserId === user.id ? (
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            To: {message.toUserId.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            From: {message.fromUserId.slice(0, 8)}...
                          </span>
                        )}
                        <span>{formatDate(message.sentAt)}</span>
                        {message.readAt && (
                          <span className="flex items-center gap-1">
                            <MailOpen className="h-3 w-3" />
                            Read {formatDate(message.readAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You don't have any messages yet.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Threads Tab */}
      {activeTab === 'threads' && (
        <Card>
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>
              Your ongoing conversations with administrators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {threads.length > 0 ? (
              threads.map((thread) => (
                <div
                  key={thread.threadId}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => {
                    // You could implement a detailed thread view here
                    console.log('Thread clicked:', thread.threadId);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-4 w-4 text-gray-500" />
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          Conversation with {thread.participants.length} participant{thread.participants.length > 1 ? 's' : ''}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {thread.messages.length} message{thread.messages.length > 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>Participants: {thread.participants.join(', ')}</span>
                        <span>Last message: {formatDate(thread.lastMessageAt)}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Reply className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You don't have any ongoing conversations yet.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedMessage.subject}</CardTitle>
                <CardDescription>
                  From: {selectedMessage.fromUserId} • {formatDate(selectedMessage.sentAt)}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
