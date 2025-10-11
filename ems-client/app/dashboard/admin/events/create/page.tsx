'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Save, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const COMPONENT_NAME = 'CreateEventPage';

export default function CreateEventPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
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
                onClick={() => router.push('/dashboard/admin/events')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Create New Event
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              Event Creation Form
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              This form will be implemented in Phase 3 with full backend integration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Plus className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Event Creation Form Coming Soon
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                This page will contain a comprehensive form for creating events with:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-900 dark:text-white">Basic Information</h4>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>• Event title and description</li>
                    <li>• Venue and location details</li>
                    <li>• Date and time selection</li>
                    <li>• Capacity limits</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-900 dark:text-white">Advanced Features</h4>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    <li>• Session management</li>
                    <li>• Speaker assignments</li>
                    <li>• Registration settings</li>
                    <li>• Pricing and ticketing</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center space-x-4">
                <Button 
                  variant="outline"
                  onClick={() => router.push('/dashboard/admin/events')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Events
                </Button>
                
                <Button 
                  disabled
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Event (Coming Soon)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
