'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  LogOut, 
  Users, 
  Search,
  ArrowLeft,
  UserCheck,
  Shield,
  AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {useLogger} from "@/lib/logger/LoggerProvider";
import { adminApiClient } from "@/lib/api/admin.api";

const COMPONENT_NAME = 'UserManagementPage';

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: 'ADMIN' | 'USER' | 'SPEAKER';
  isActive: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
  eventsRegistered?: number;
}

export default function UserManagementPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const logger = useLogger();
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<{
    total: number;
    active: number;
    inactive: number;
    admins: number;
    users: number;
    speakers: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Fetch user statistics (total counts - always unfiltered)
  const loadUserStats = useCallback(async () => {
    try {
      logger.debug(COMPONENT_NAME, 'Loading user statistics');
      const stats = await adminApiClient.getUserStats();
      setUserStats(stats);
      logger.info(COMPONENT_NAME, 'User statistics loaded successfully', stats);
    } catch (err) {
      logger.warn(COMPONENT_NAME, 'Failed to load user statistics', err as Error);
      // Don't set error for stats failure, continue with loading users
    }
  }, [logger]);

  // Fetch users and registration counts
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      logger.debug(COMPONENT_NAME, 'Loading users');

      // Build filter options
      const filters: {
        role?: 'ADMIN' | 'USER' | 'SPEAKER';
        isActive?: boolean;
        search?: string;
      } = {};

      if (selectedRole !== 'ALL') {
        filters.role = selectedRole as 'ADMIN' | 'USER' | 'SPEAKER';
      }

      if (selectedStatus !== 'ALL') {
        filters.isActive = selectedStatus === 'ACTIVE';
      }

      if (searchTerm) {
        filters.search = searchTerm;
      }

      // Fetch users from auth-service
      const usersData = await adminApiClient.getUsers({
        limit: 1000, // Get all users (max 1000)
        ...filters
      });

      // Fetch registration counts from booking-service
      const userIds = usersData.users.map((u: User) => u.id);
      let registrationCounts: Record<string, number> = {};

      if (userIds.length > 0) {
        try {
          const response = await fetch('/api/booking/admin/users/registration-counts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${adminApiClient.getToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userIds })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              registrationCounts = result.data;
            }
          }
        } catch (err) {
          logger.warn(COMPONENT_NAME, 'Failed to fetch registration counts', err as Error);
          // Continue without counts
        }
      }

      // Combine user data with registration counts
      const usersWithCounts = usersData.users.map((user: User) => ({
        ...user,
        eventsRegistered: registrationCounts[user.id] || 0
      }));

      setUsers(usersWithCounts);
      logger.info(COMPONENT_NAME, 'Users loaded successfully', { count: usersWithCounts.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
      logger.error(COMPONENT_NAME, 'Failed to load users', err as Error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedRole, selectedStatus, logger]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    } else if (isAuthenticated && user?.role === 'ADMIN') {
      loadUserStats(); // Load stats once on mount
      loadUsers();
    }
  }, [isAuthenticated, isLoading, user, router, loadUsers, loadUserStats]);

  // Filter users based on search and filters (client-side for better UX)
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
                         (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = selectedRole === 'ALL' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'ALL' || 
                         (selectedStatus === 'ACTIVE' && user.isActive) ||
                         (selectedStatus === 'INACTIVE' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });


  if (isLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading user management...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium mb-4">Error: {error}</p>
          <Button onClick={() => loadUsers()}>Retry</Button>
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
                User Management
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
            User Management
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Manage user accounts, roles, and permissions across the platform.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Users</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{userStats?.total ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCheck className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Users</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {userStats?.active ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Admins</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {userStats?.admins ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Inactive Users</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {userStats?.inactive ?? 0}
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
              Search & Filter Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="SPEAKER">Speaker</option>
                <option value="USER">User</option>
              </select>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Users ({filteredUsers.length})
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">User</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Email Verified</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Events Attended</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    // Determine profile route based on user role
                    const getProfileRoute = (userRole: string, userId: string) => {
                      switch (userRole) {
                        case 'USER':
                          return `/dashboard/attendee/profile?userId=${userId}`;
                        case 'SPEAKER':
                          return `/dashboard/speaker?section=profile&userId=${userId}`;
                        case 'ADMIN':
                          return `/dashboard/admin/profile?userId=${userId}`;
                        default:
                          return `/dashboard/admin/users`;
                      }
                    };

                    return (
                      <tr 
                        key={user.id} 
                        className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        onClick={() => router.push(getProfileRoute(user.role, user.id))}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage 
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name || user.email}`} 
                                alt={user.name || user.email} 
                              />
                              <AvatarFallback className="text-xs">
                                {user.name?.split(' ').map((n: string) => n[0]).join('') || user.email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge 
                            variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                            className={
                              user.role === 'ADMIN' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              user.role === 'SPEAKER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <Badge 
                            variant={user.isActive ? 'default' : 'secondary'}
                            className={user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <Badge 
                            variant={user.emailVerified ? 'default' : 'secondary'}
                            className={user.emailVerified ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}
                          >
                            {user.emailVerified ? 'Verified' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-slate-900 dark:text-white">{user.eventsRegistered ?? 0}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No users found matching your criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
