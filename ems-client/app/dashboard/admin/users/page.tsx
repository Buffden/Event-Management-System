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
  Filter,
  MoreHorizontal,
  Shield,
  UserX,
  UserCheck,
  Mail,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { authAPI } from "@/lib/api/auth.api";
import {useLogger} from "@/lib/logger/LoggerProvider";

const COMPONENT_NAME = 'UserManagementPage';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'USER' | 'SPEAKER';
  isActive: boolean;
  emailVerified: string | null;
  image?: string | null;
  createdAt?: string;
}

export default function UserManagementPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const loggerHook = useLogger();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    admins: 0,
    inactive: 0
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(100); // Large limit to get all users for now

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      loggerHook.debug(COMPONENT_NAME, 'Fetching users', { searchTerm, selectedRole, selectedStatus, page });

      const filters: { page?: number; limit?: number; role?: string; isActive?: boolean; search?: string } = {
        page,
        limit
      };

      if (selectedRole !== 'ALL') {
        filters.role = selectedRole;
      }

      if (selectedStatus !== 'ALL') {
        filters.isActive = selectedStatus === 'ACTIVE';
      }

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }

      const response = await authAPI.getAllUsers(filters);

      if (response.success && response.data) {
        setUsers(response.data.users);
        setStats({
          total: response.data.total,
          active: response.data.users.filter(u => u.isActive).length,
          admins: response.data.users.filter(u => u.role === 'ADMIN').length,
          inactive: response.data.users.filter(u => !u.isActive).length
        });
        loggerHook.info(COMPONENT_NAME, 'Users fetched successfully', { count: response.data.users.length });
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      loggerHook.error(COMPONENT_NAME, 'Failed to fetch users', error as Error);
      setUsersError('Failed to load users. Please try again.');
    } finally {
      setUsersLoading(false);
    }
  }, [searchTerm, selectedRole, selectedStatus, page, limit, loggerHook]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    } else if (!authLoading && isAuthenticated && user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [isAuthenticated, authLoading, user, router, fetchUsers]);

  // Debounce search - fetch users when filters change
  useEffect(() => {
    if (authLoading || !isAuthenticated || user?.role !== 'ADMIN') return;

    const timer = setTimeout(() => {
      setPage(1); // Reset to first page on search/filter change
      fetchUsers();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedRole, selectedStatus]);

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      loggerHook.debug(COMPONENT_NAME, `Toggling user ${userId} status from ${currentStatus} to ${!currentStatus}`);

      const response = currentStatus
        ? await authAPI.suspendUser(userId)
        : await authAPI.activateUser(userId);

      if (response.success) {
        loggerHook.info(COMPONENT_NAME, 'User status updated successfully', { userId, newStatus: !currentStatus });
        // Refresh users list
        fetchUsers();
      } else {
        throw new Error('Failed to update user status');
      }
    } catch (error) {
      loggerHook.error(COMPONENT_NAME, 'Failed to update user status', error as Error);
      alert('Failed to update user status. Please try again.');
    }
  };

  if (authLoading || usersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading user management...</p>
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {usersLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.total}
                  </p>
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
                    {usersLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.active}
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
                    {usersLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.admins}
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
                    {usersLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.inactive}
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

              <Button
                variant="outline"
                onClick={() => fetchUsers()}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
                disabled={usersLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Users {usersLoading ? '' : `(${users.length})`}
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersError ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 dark:text-red-400 mb-4">{usersError}</p>
                <Button onClick={fetchUsers} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : usersLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">User</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Email Verified</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Created</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={userItem.image || `https://api.dicebear.com/7.x/initials/svg?seed=${userItem.name || userItem.email}`}
                                alt={userItem.name || userItem.email}
                              />
                              <AvatarFallback className="text-xs">
                                {(userItem.name || userItem.email).split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{userItem.name || 'No name'}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{userItem.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            variant={userItem.role === 'ADMIN' ? 'default' : 'secondary'}
                            className={
                              userItem.role === 'ADMIN' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              userItem.role === 'SPEAKER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }
                          >
                            {userItem.role}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            variant={userItem.isActive ? 'default' : 'secondary'}
                            className={userItem.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}
                          >
                            {userItem.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            variant={userItem.emailVerified ? 'default' : 'secondary'}
                            className={userItem.emailVerified ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}
                          >
                            {userItem.emailVerified ? 'Verified' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-slate-600 dark:text-slate-400">
                            {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant={userItem.isActive ? 'destructive' : 'default'}
                              onClick={() => handleStatusToggle(userItem.id, userItem.isActive)}
                              disabled={usersLoading}
                            >
                              {userItem.isActive ? (
                                <>
                                  <UserX className="h-4 w-4 mr-1" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {users.length === 0 && !usersLoading && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">No users found matching your criteria</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
