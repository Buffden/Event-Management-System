import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { speakerApiClient, SpeakerProfile, SpeakerInvitation, Message, PresentationMaterial, MessageThread, CreateSpeakerProfileRequest, UpdateSpeakerProfileRequest } from '@/lib/api/speaker.api';
import { useLogger } from '@/lib/logger/LoggerProvider';

const LOGGER_COMPONENT_NAME = 'useSpeakerData';

export interface SpeakerStats {
  totalInvitations: number;
  pendingInvitations: number;
  acceptedInvitations: number;
  totalMaterials: number;
  totalSize: number;
  unreadMessages: number;
}

export interface SpeakerDashboardData {
  profile: SpeakerProfile | null;
  stats: SpeakerStats | null;
  allInvitations: SpeakerInvitation[];
  recentMessages: Message[];
  recentMaterials: PresentationMaterial[];
  loading: boolean;
  error: string | null;
  needsProfileSetup: boolean;
}

export function useSpeakerData() {
  const { user } = useAuth();
  const logger = useLogger();
  
  const [data, setData] = useState<SpeakerDashboardData>({
    profile: null,
    stats: null,
    allInvitations: [],
    recentMessages: [],
    recentMaterials: [],
    loading: true,
    error: null,
    needsProfileSetup: false,
  });

  const [refreshing, setRefreshing] = useState(false);

  const loadSpeakerProfile = useCallback(async (userId: string) => {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading speaker profile', { userId });
      const profile = await speakerApiClient.getSpeakerProfile(userId);
      return profile;
    } catch (error) {
      // If speaker profile doesn't exist, indicate that profile setup is needed
      if (error instanceof Error && error.message.includes('Speaker profile not found')) {
        logger.info(LOGGER_COMPONENT_NAME, 'Speaker profile not found, profile setup required', { userId });
        throw new Error('PROFILE_SETUP_REQUIRED');
      }
      
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load speaker profile', error as Error, { userId });
      throw error;
    }
  }, [logger]);

  const loadSpeakerStats = useCallback(async (speakerId: string) => {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading speaker stats', { speakerId });
      const [invitationStats, materialStats, unreadCount] = await Promise.all([
        speakerApiClient.getInvitationStats(speakerId),
        speakerApiClient.getMaterialStats(speakerId),
        speakerApiClient.getUnreadMessageCount(user?.id || ''),
      ]);

      return {
        totalInvitations: invitationStats.total,
        pendingInvitations: invitationStats.pending,
        acceptedInvitations: invitationStats.accepted,
        totalMaterials: materialStats.totalMaterials,
        totalSize: materialStats.totalSize,
        unreadMessages: unreadCount.count,
      };
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load speaker stats', error as Error, { speakerId });
      throw error;
    }
  }, [logger, user?.id]);

  const loadAllInvitations = useCallback(async (speakerId: string) => {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading all invitations', { speakerId });
      const invitations = await speakerApiClient.getSpeakerInvitations(speakerId);
      return invitations;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load all invitations', error as Error, { speakerId });
      throw error;
    }
  }, [logger]);

  const loadRecentMessages = useCallback(async (userId: string) => {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading recent messages', { userId });
      const messages = await speakerApiClient.getUserMessages(userId, 5, 0);
      return messages;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load recent messages', error as Error, { userId });
      throw error;
    }
  }, [logger]);

  const loadRecentMaterials = useCallback(async (speakerId: string) => {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading materials', { speakerId });
      const materials = await speakerApiClient.getSpeakerMaterials(speakerId);
      // Return all materials, sorted by upload date (newest first)
      return materials.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load materials', error as Error, { speakerId });
      throw error;
    }
  }, [logger]);

  const loadAllData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Try to load speaker profile first
      let profile: SpeakerProfile;
      try {
        profile = await loadSpeakerProfile(user.id);
      } catch (error) {
        if (error instanceof Error && error.message === 'PROFILE_SETUP_REQUIRED') {
          // Profile doesn't exist, set needsProfileSetup flag
          setData(prev => ({
            ...prev,
            profile: null,
            stats: null,
            allInvitations: [],
            recentMessages: [],
            recentMaterials: [],
            loading: false,
            error: null,
            needsProfileSetup: true,
          }));
          return;
        }
        throw error;
      }

          // Load other data in parallel only if profile exists
          const [allInvitations, recentMessages, recentMaterials] = await Promise.all([
            loadAllInvitations(profile.id),
            loadRecentMessages(user.id),
            loadRecentMaterials(profile.id),
          ]);

      // Load stats after we have the profile
      const stats = await loadSpeakerStats(profile.id);

      setData({
        profile,
        stats,
        allInvitations,
        recentMessages,
        recentMaterials,
        loading: false,
        error: null,
        needsProfileSetup: false,
      });

      logger.info(LOGGER_COMPONENT_NAME, 'Speaker data loaded successfully', {
        profileId: profile.id,
        allInvitations: allInvitations.length,
        recentMessages: recentMessages.length,
        recentMaterials: recentMaterials.length,
      });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load speaker data', error as Error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load speaker data',
        needsProfileSetup: false,
      }));
    }
  }, [user?.id, loadSpeakerProfile, loadSpeakerStats, loadAllInvitations, loadRecentMessages, loadRecentMaterials, logger]);

  const refresh = useCallback(async () => {
    if (!user?.id) return;

    setRefreshing(true);
    try {
      await loadAllData();
    } finally {
      setRefreshing(false);
    }
  }, [loadAllData, user?.id]);

  const respondToInvitation = useCallback(async (invitationId: string, status: 'ACCEPTED' | 'DECLINED', message?: string) => {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Responding to invitation', { invitationId, status });
      await speakerApiClient.respondToInvitation(invitationId, { status, message });
      
      // Refresh the data to get updated invitations
      await refresh();
      
      logger.info(LOGGER_COMPONENT_NAME, 'Invitation response recorded', { invitationId, status });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to respond to invitation', error as Error, { invitationId, status });
      throw error;
    }
  }, [refresh, logger]);

  const uploadMaterial = useCallback(async (file: File, eventId?: string) => {
    if (!data.profile) throw new Error('Speaker profile not loaded');

    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Uploading material', { 
        fileName: file.name, 
        fileSize: file.size,
        speakerId: data.profile.id 
      });
      
      const material = await speakerApiClient.uploadMaterial(file, data.profile.id, eventId);
      
      // Refresh the data to get updated materials
      await refresh();
      
      logger.info(LOGGER_COMPONENT_NAME, 'Material uploaded successfully', { 
        materialId: material.id,
        fileName: file.name 
      });
      
      return material;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to upload material', error as Error, { fileName: file.name });
      throw error;
    }
  }, [data.profile, refresh, logger]);

  const markMessageAsRead = useCallback(async (messageId: string) => {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Marking message as read', { messageId });
      await speakerApiClient.markMessageAsRead(messageId);
      
      // Refresh the data to get updated message status
      await refresh();
      
      logger.info(LOGGER_COMPONENT_NAME, 'Message marked as read', { messageId });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to mark message as read', error as Error, { messageId });
      throw error;
    }
  }, [refresh, logger]);

  const createSpeakerProfile = useCallback(async (profileData: CreateSpeakerProfileRequest) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Creating speaker profile', { userId: user.id });
      
      const profile = await speakerApiClient.createSpeakerProfile({
        ...profileData,
        userId: user.id,
        email: user.email || '', // Include the user's email from auth context
      });
      
      // Refresh the data to load the new profile and all related data
      await refresh();
      
      logger.info(LOGGER_COMPONENT_NAME, 'Speaker profile created successfully', { 
        profileId: profile.id,
        userId: user.id 
      });
      
      return profile;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to create speaker profile', error as Error, { userId: user.id });
      throw error;
    }
  }, [user?.id, refresh, logger]);

  const updateSpeakerProfile = useCallback(async (profileData: UpdateSpeakerProfileRequest) => {
    if (!data.profile) {
      logger.error(LOGGER_COMPONENT_NAME, 'Cannot update profile: profile not loaded', new Error('Profile not loaded'), { profile: data.profile });
      throw new Error('Speaker profile not loaded');
    }

    if (!data.profile.id) {
      logger.error(LOGGER_COMPONENT_NAME, 'Cannot update profile: profile ID is missing', new Error('Profile ID missing'), { 
        profile: data.profile,
        profileId: data.profile.id 
      });
      throw new Error('Speaker profile ID is missing');
    }

    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Updating speaker profile', { 
        speakerId: data.profile.id,
        changes: profileData 
      });
      
      const updatedProfile = await speakerApiClient.updateSpeakerProfile(data.profile.id, profileData);
      
      // Update the profile data immediately with the response from the API
      setData(prev => ({
        ...prev,
        profile: updatedProfile
      }));
      
      // Also refresh other data that might be affected by profile changes
      await refresh();
      
      logger.info(LOGGER_COMPONENT_NAME, 'Speaker profile updated successfully', { 
        speakerId: data.profile.id,
        changes: profileData 
      });
      
      return updatedProfile;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to update speaker profile', error as Error, { 
        speakerId: data.profile?.id,
        changes: profileData 
      });
      throw error;
    }
  }, [data.profile, refresh, logger]);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    ...data,
    refreshing,
    refresh,
    respondToInvitation,
    uploadMaterial,
    markMessageAsRead,
    createSpeakerProfile,
    updateSpeakerProfile,
  };
}
