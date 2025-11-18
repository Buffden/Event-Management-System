'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  User,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  X,
  Filter,
  Users,
  Award,
  MapPin
} from 'lucide-react';
import { adminApiClient, AdminSpeakerSearchFilters } from '@/lib/api/admin.api';
import { SpeakerProfile } from '@/lib/api/speaker.api';
import { useLogger } from '@/lib/logger/LoggerProvider';

const LOGGER_COMPONENT_NAME = 'SpeakerSearchModal';

interface SpeakerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSpeaker: (speakerId: string, message: string) => Promise<void>;
  eventId: string;
  eventName: string;
  currentSpeakerId?: string; // Legacy: If event already has a speaker assigned (deprecated)
  invitedSpeakerIds?: string[]; // List of speaker IDs already invited to this event
}

export function SpeakerSearchModal({
  isOpen,
  onClose,
  onInviteSpeaker,
  eventId,
  eventName,
  currentSpeakerId,
  invitedSpeakerIds = []
}: SpeakerSearchModalProps) {
  const logger = useLogger();
  const [searchTerm, setSearchTerm] = useState('');
  const [expertiseFilter, setExpertiseFilter] = useState<string[]>([]);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerProfile | null>(null);
  const [invitationMessage, setInvitationMessage] = useState('');
  const [inviting, setInviting] = useState(false);

  // Common expertise areas
  const commonExpertise = [
    'Technology',
    'Business',
    'Marketing',
    'Design',
    'Data Science',
    'AI/ML',
    'Web Development',
    'Mobile Development',
    'DevOps',
    'Cybersecurity',
    'Product Management',
    'Sales',
    'Finance',
    'Healthcare',
    'Education',
    'Leadership',
    'Innovation',
    'Sustainability'
  ];

  // Search speakers
  const searchSpeakers = useCallback(async () => {
    if (!searchTerm.trim() && expertiseFilter.length === 0) {
      setSpeakers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const filters: AdminSpeakerSearchFilters = {
        query: searchTerm.trim() || undefined,
        expertise: expertiseFilter.length > 0 ? expertiseFilter : undefined,
        isAvailable: availableOnly ? true : undefined,
        limit: 20,
        offset: 0
      };

      logger.debug(LOGGER_COMPONENT_NAME, 'Searching speakers', filters);

      const results = await adminApiClient.searchSpeakers(filters);
      setSpeakers(results);

      logger.info(LOGGER_COMPONENT_NAME, 'Speaker search completed', {
        query: searchTerm,
        expertiseFilter,
        resultsCount: results.length
      });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Speaker search failed', error as Error);
      setError(error instanceof Error ? error.message : 'Failed to search speakers');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, expertiseFilter, availableOnly, logger]);

  // Handle search on enter or button click
  const handleSearch = () => {
    searchSpeakers();
  };

  // Handle expertise filter toggle
  const toggleExpertise = (expertise: string) => {
    setExpertiseFilter(prev =>
      prev.includes(expertise)
        ? prev.filter(e => e !== expertise)
        : [...prev, expertise]
    );
  };

  // Handle speaker selection
  const handleSelectSpeaker = (speaker: SpeakerProfile) => {
    setSelectedSpeaker(speaker);
    setInvitationMessage(`Hi ${speaker.name},\n\nI would like to invite you to speak at our event "${eventName}". Please let me know if you're interested!\n\nBest regards,`);
  };

  // Handle invitation sending
  const handleSendInvitation = async () => {
    if (!selectedSpeaker) return;

    try {
      setInviting(true);
      logger.debug(LOGGER_COMPONENT_NAME, 'Sending invitation', {
        speakerId: selectedSpeaker.id,
        eventId,
        eventName
      });

      await onInviteSpeaker(selectedSpeaker.id, invitationMessage);

      logger.info(LOGGER_COMPONENT_NAME, 'Invitation sent successfully', {
        speakerId: selectedSpeaker.id,
        eventId
      });

      // Close modal on success
      onClose();
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to send invitation', error as Error);
      setError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setExpertiseFilter([]);
      setAvailableOnly(true);
      setSpeakers([]);
      setError(null);
      setSelectedSpeaker(null);
      setInvitationMessage('');
    }
  }, [isOpen]);

  // Auto-search when filters change
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        searchSpeakers();
      }, 500); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, expertiseFilter, availableOnly, isOpen, searchSpeakers]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite Speaker to "{eventName}"
          </DialogTitle>
          <DialogDescription>
            Search for speakers and send them an invitation to present at your event.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Search Speakers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or expertise..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {/* Expertise Filters */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Filter by Expertise</Label>
                <div className="flex flex-wrap gap-2">
                  {commonExpertise.map((expertise) => (
                    <Badge
                      key={expertise}
                      variant={expertiseFilter.includes(expertise) ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => toggleExpertise(expertise)}
                    >
                      {expertise}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Availability Filter */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="availableOnly"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="availableOnly" className="text-sm">
                  Show only available speakers
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search Results */}
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Search Results ({speakers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-64">
              {speakers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {loading ? 'Searching...' : 'No speakers found. Try adjusting your search criteria.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {speakers.map((speaker) => (
                    <div
                      key={speaker.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedSpeaker?.id === speaker.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      } ${(currentSpeakerId === speaker.id || invitedSpeakerIds.includes(speaker.id)) ? 'opacity-50' : ''}`}
                      onClick={() => currentSpeakerId !== speaker.id && !invitedSpeakerIds.includes(speaker.id) && handleSelectSpeaker(speaker)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              {speaker.name}
                            </h3>
                            {speaker.isAvailable ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Available
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Busy</Badge>
                            )}
                            {currentSpeakerId === speaker.id && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                Current Speaker
                              </Badge>
                            )}
                            {invitedSpeakerIds.includes(speaker.id) && currentSpeakerId !== speaker.id && (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                Already Invited
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {speaker.email}
                            </div>
                          </div>

                          {speaker.bio && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                              {speaker.bio}
                            </p>
                          )}

                          {speaker.expertise.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {speaker.expertise.slice(0, 3).map((exp) => (
                                <Badge key={exp} variant="outline" className="text-xs">
                                  {exp}
                                </Badge>
                              ))}
                              {speaker.expertise.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{speaker.expertise.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {currentSpeakerId !== speaker.id && !invitedSpeakerIds.includes(speaker.id) && (
                          <Button
                            size="sm"
                            variant={selectedSpeaker?.id === speaker.id ? 'default' : 'outline'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectSpeaker(speaker);
                            }}
                          >
                            {selectedSpeaker?.id === speaker.id ? 'Selected' : 'Select'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invitation Message */}
          {selectedSpeaker && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Invitation Message</CardTitle>
                <CardDescription>
                  Customize the invitation message for {selectedSpeaker.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={invitationMessage}
                  onChange={(e) => setInvitationMessage(e.target.value)}
                  placeholder="Enter your invitation message..."
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {selectedSpeaker && (
            <Button
              onClick={handleSendInvitation}
              disabled={inviting || !invitationMessage.trim()}
            >
              {inviting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
