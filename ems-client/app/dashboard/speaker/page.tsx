'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut,
  Calendar,
  Users,
  Star,
  Clock,
  Plus,
  Eye,
  MessageSquare,
  Settings,
  TrendingUp,
  Award,
  Mic,
  Upload,
  Mail,
  FileText,
  Download,
  Presentation
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {useLogger} from "@/lib/logger/LoggerProvider";
import {withSpeakerAuth} from "@/components/hoc/withAuth";
import { useSpeakerData } from "@/hooks/useSpeakerData";
import { MaterialUpload } from "@/components/speaker/MaterialUpload";
import { InvitationManagement } from "@/components/speaker/InvitationManagement";
import { MessageCenter } from "@/components/speaker/MessageCenter";
import { ProfileManagement } from "@/components/speaker/ProfileManagement";
import { speakerApiClient } from "@/lib/api/speaker.api";
import { useState } from "react";

// Dashboard sections
type DashboardSection = 'overview' | 'profile' | 'materials' | 'invitations' | 'messages';

const LOGGER_COMPONENT_NAME = 'SpeakerDashboard';

function SpeakerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const logger = useLogger();
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  
  const {
    profile,
    stats,
    allInvitations,
    recentMessages,
    recentMaterials,
    loading,
    error,
    needsProfileSetup,
    refreshing,
    refresh,
    respondToInvitation,
    uploadMaterial,
    markMessageAsRead,
    createSpeakerProfile,
    updateSpeakerProfile,
  } = useSpeakerData();

  // Set active section from URL query params
  useEffect(() => {
    const section = searchParams.get('section') as DashboardSection | null;
    if (section && ['overview', 'profile', 'materials', 'invitations', 'messages'].includes(section)) {
      setActiveSection(section);
    }
  }, [searchParams]);

  useEffect(() => {
    logger.debug(LOGGER_COMPONENT_NAME, 'Speaker dashboard loaded', { userRole: user?.role });
  }, [user, logger]);

  const handleProfileUpdate = async (data: any) => {
    try {
      await updateSpeakerProfile(data);
      logger.info(LOGGER_COMPONENT_NAME, 'Speaker profile updated successfully');
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to update speaker profile', error as Error);
      throw error;
    }
  };

  const handleProfileSetup = async (profileData: any) => {
    try {
      await createSpeakerProfile(profileData);
      logger.info(LOGGER_COMPONENT_NAME, 'Speaker profile created successfully');
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to create speaker profile', error as Error);
      throw error;
    }
  };

  const handleSendMessage = async (message: { toUserId: string; subject: string; content: string }) => {
    if (!user?.id) return;
    // This would be implemented in the useSpeakerData hook
    await refresh();
  };

  // Loading and auth checks are handled by the HOC

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                EventManager
              </h1>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                Speaker Panel
              </Badge>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || user?.email}`}
                    alt={user?.name || user?.email}
                  />
                  <AvatarFallback className="text-xs">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('') : user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {user?.name}
                </span>
              </div>

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
          
          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-4">
            <Button
              variant={activeSection === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSection('overview')}
              className="flex-1"
            >
              <Mic className="h-4 w-4 mr-2" />
              Overview
            </Button>
            <Button
              variant={activeSection === 'profile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSection('profile')}
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button
              variant={activeSection === 'materials' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSection('materials')}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Materials
            </Button>
            <Button
              variant={activeSection === 'invitations' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSection('invitations')}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Invitations
              {allInvitations.filter(inv => inv.status === 'PENDING').length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {allInvitations.filter(inv => inv.status === 'PENDING').length}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeSection === 'messages' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSection('messages')}
              className="flex-1"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
              {stats?.unreadMessages && stats.unreadMessages > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {stats.unreadMessages}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Setup Required */}
        {needsProfileSetup && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome to EventManager! 🎤
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Let's set up your speaker profile to get started.
              </p>
            </div>
            
            <ProfileManagement 
              profile={null}
              onUpdate={handleProfileSetup}
              loading={loading}
              isSetup={true}
            />
          </div>
        )}

        {/* Error State */}
        {error && !needsProfileSetup && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refresh}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Dashboard Content - Only show when profile is set up */}
        {!needsProfileSetup && (
          <>
            {/* Overview Section */}
            {activeSection === 'overview' && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome back, {profile?.name || user?.name}! 🎤
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Manage your speaking engagements and track your impact.
              </p>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Total Invitations
                    </CardTitle>
                    <Mail className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalInvitations}</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {stats.pendingInvitations} pending
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Accepted Events
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.acceptedInvitations}</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Speaking engagements
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Materials Uploaded
                    </CardTitle>
                    <FileText className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalMaterials}</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {(stats.totalSize / (1024 * 1024)).toFixed(1)} MB total
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Unread Messages
                    </CardTitle>
                    <MessageSquare className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.unreadMessages}</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      From administrators
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Quick Actions Card */}
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Manage your speaking profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Button
                      className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      onClick={() => router.push('/dashboard/speaker/events')}
                    >
                      <Calendar className="h-5 w-5" />
                      <span className="text-sm">Manage Events</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                      onClick={() => setActiveSection('materials')}
                    >
                      <Upload className="h-5 w-5" />
                      <span className="text-sm">Upload Materials</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                      onClick={() => setActiveSection('profile')}
                    >
                      <Settings className="h-5 w-5" />
                      <span className="text-sm">Update Profile</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                      onClick={() => setActiveSection('invitations')}
                    >
                      <Mail className="h-5 w-5" />
                      <span className="text-sm">View Invitations</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                      onClick={() => setActiveSection('messages')}
                    >
                      <MessageSquare className="h-5 w-5" />
                      <span className="text-sm">Messages</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity Card */}
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Your latest interactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allInvitations.filter(inv => inv.status === 'PENDING').length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 dark:text-white">Pending Invitations</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            You have {allInvitations.filter(inv => inv.status === 'PENDING').length} pending invitation{allInvitations.filter(inv => inv.status === 'PENDING').length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => setActiveSection('invitations')}>
                          View
                        </Button>
                      </div>
                    )}
                    
                    {recentMessages.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 dark:text-white">New Messages</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {recentMessages.length} recent message{recentMessages.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => setActiveSection('messages')}>
                          View
                        </Button>
                      </div>
                    )}
                    
                    {recentMaterials.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 dark:text-white">Recent Materials</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {recentMaterials.length} uploaded file{recentMaterials.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => setActiveSection('materials')}>
                          View
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Profile Section */}
        {activeSection === 'profile' && (
          <ProfileManagement 
            profile={profile}
            onUpdate={handleProfileUpdate}
            loading={loading}
          />
        )}

        {/* Materials Section */}
        {activeSection === 'materials' && (
          <div className="space-y-6">
            <MaterialUpload 
              onUpload={async (file, eventId) => {
                await uploadMaterial(file, eventId);
              }}
              disabled={loading}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>My Materials</CardTitle>
                <CardDescription>
                  {recentMaterials.length > 0 
                    ? `You have ${recentMaterials.length} uploaded material${recentMaterials.length > 1 ? 's' : ''}`
                    : 'No materials uploaded yet'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentMaterials.length > 0 ? (
                  <div className="space-y-3">
                    {recentMaterials.map((material) => (
                      <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-4">
                          {material.mimeType === 'application/pdf' ? (
                            <FileText className="h-8 w-8 text-red-500" />
                          ) : material.mimeType?.includes('presentation') ? (
                            <Presentation className="h-8 w-8 text-blue-500" />
                          ) : (
                            <FileText className="h-8 w-8 text-gray-500" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {material.fileName}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <span>{(material.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                              <span>•</span>
                              <span>{new Date(material.uploadDate).toLocaleDateString()}</span>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {material.mimeType === 'application/pdf' ? 'PDF' : 
                                 material.mimeType?.includes('presentation') ? 'Presentation' : 'File'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              // Open material in new tab for preview
                              const previewUrl = `/api/materials/${material.id}/download`;
                              window.open(previewUrl, '_blank');
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={async () => {
                              try {
                                const blob = await speakerApiClient.downloadMaterial(material.id);
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = material.fileName;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                console.error('Download failed:', error);
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No materials uploaded yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Upload your first presentation material using the form above
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invitations Section */}
        {activeSection === 'invitations' && (
          <InvitationManagement 
            invitations={allInvitations}
            onRespond={respondToInvitation}
            loading={loading}
          />
        )}

        {/* Messages Section */}
        {activeSection === 'messages' && (
          <MessageCenter 
            messages={recentMessages}
            threads={[]} // TODO: Implement threads
            unreadCount={stats?.unreadMessages || 0}
            onMarkAsRead={markMessageAsRead}
            onSendMessage={handleSendMessage}
            loading={loading}
          />
        )}
          </>
        )}
      </main>
    </div>
  );
}

export default withSpeakerAuth(SpeakerDashboard);
