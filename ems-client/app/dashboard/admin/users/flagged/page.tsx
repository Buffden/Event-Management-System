'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  LogOut, 
  ArrowLeft,
  AlertTriangle,
  UserX,
  UserCheck,
  Mail,
  Calendar,
  Flag,
  Shield,
  Trash2,
  Eye,
  Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Mock data for flagged users
const mockFlaggedUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    reason: 'Spam registrations',
    description: 'User has registered for 10+ events and immediately cancelled all of them',
    flaggedAt: '2024-01-15T10:30:00Z',
    flaggedBy: 'system',
    severity: 'high',
    status: 'pending',
    evidence: [
      { type: 'registration', description: 'Registered for 12 events in 1 day' },
      { type: 'cancellation', description: 'Cancelled all registrations within 2 hours' },
      { type: 'pattern', description: 'Similar behavior across multiple events' }
    ]
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    reason: 'Inappropriate behavior',
    description: 'User posted inappropriate comments during event Q&A sessions',
    flaggedAt: '2024-01-20T14:15:00Z',
    flaggedBy: 'admin@example.com',
    severity: 'medium',
    status: 'reviewed',
    evidence: [
      { type: 'comment', description: 'Inappropriate comment in Tech Conference Q&A' },
      { type: 'report', description: 'Reported by 3 other attendees' }
    ]
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    reason: 'Suspicious activity',
    description: 'Multiple failed login attempts and unusual access patterns',
    flaggedAt: '2024-01-18T09:45:00Z',
    flaggedBy: 'system',
    severity: 'high',
    status: 'pending',
    evidence: [
      { type: 'security', description: '15 failed login attempts in 30 minutes' },
      { type: 'ip', description: 'Access from 5 different IP addresses' },
      { type: 'pattern', description: 'Automated behavior detected' }
    ]
  }
];

const severityColors = {
  low: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  medium: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  dismissed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

export default function FlaggedUsersPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  const handleReview = (userId: string, action: 'approve' | 'dismiss' | 'suspend') => {
    // TODO: Implement review action API call
    console.log(`Review user ${userId} with action: ${action}`);
  };

  const handleSuspend = (userId: string) => {
    // TODO: Implement suspend user API call
    console.log(`Suspend user ${userId}`);
  };

  const handleDelete = (userId: string) => {
    // TODO: Implement delete user API call
    console.log(`Delete user ${userId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading flagged users...</p>
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
                onClick={() => router.push('/dashboard/admin/users')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Flagged Users
              </h1>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Flagged Users Review
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Review and take action on users flagged for suspicious or inappropriate behavior.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Flag className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Flagged</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockFlaggedUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending Review</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {mockFlaggedUsers.filter(u => u.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">High Severity</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {mockFlaggedUsers.filter(u => u.severity === 'high').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserX className="h-8 w-8 text-gray-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Resolved</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {mockFlaggedUsers.filter(u => u.status === 'resolved' || u.status === 'dismissed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flagged Users List */}
        <div className="space-y-6">
          {mockFlaggedUsers.map((flaggedUser) => (
            <Card key={flaggedUser.id} className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${flaggedUser.name}`} 
                        alt={flaggedUser.name} 
                      />
                      <AvatarFallback>
                        {flaggedUser.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {flaggedUser.name}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">{flaggedUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={severityColors[flaggedUser.severity as keyof typeof severityColors]}>
                      {flaggedUser.severity.toUpperCase()} SEVERITY
                    </Badge>
                    <Badge className={statusColors[flaggedUser.status as keyof typeof statusColors]}>
                      {flaggedUser.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Flag Details */}
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Flag Details</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Reason:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{flaggedUser.reason}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Description:</span>
                        <p className="ml-2 text-slate-900 dark:text-white">{flaggedUser.description}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Flagged At:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">
                          {new Date(flaggedUser.flaggedAt).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Flagged By:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{flaggedUser.flaggedBy}</span>
                      </div>
                    </div>
                  </div>

                  {/* Evidence */}
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Evidence</h4>
                    <div className="space-y-2">
                      {flaggedUser.evidence.map((item, index) => (
                        <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {item.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-900 dark:text-white mt-1">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex flex-wrap gap-2">
                    {flaggedUser.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(flaggedUser.id, 'approve')}
                          className="border-green-200 text-green-600 hover:bg-green-50"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Approve User
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(flaggedUser.id, 'dismiss')}
                          className="border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Dismiss Flag
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleSuspend(flaggedUser.id)}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Suspend User
                        </Button>
                      </>
                    )}
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(flaggedUser.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete User
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {mockFlaggedUsers.length === 0 && (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="text-center py-12">
                <Flag className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No Flagged Users
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  All users are in good standing. Great job! 🎉
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
