'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, BarChart3, Shield, Zap, Globe } from "lucide-react";
import Link from "next/link";
import {ThemeToggle} from "@/components/theme/ThemeToggle";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Navigation */}
            <nav className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white">EventManager</h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Professional Events</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href="/login">
                                <Button variant="ghost" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                                    Get Started
                                </Button>
                            </Link>
                            <div>
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center">
                    {/* Badge */}
                    <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        ✨ Now with AI-powered insights
                    </Badge>

                    {/* Main Headline */}
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                        Manage Events
                        <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Effortlessly
            </span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-xl text-slate-600 dark:text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                        The all-in-one platform for creating, managing, and tracking events.
                        From planning to execution, we&apos;ve got you covered with powerful tools and insights.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
                        <Link href="/register">
                            <Button size="lg" className="w-full sm:w-auto px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200">
                                <Zap className="w-5 h-5 mr-2" />
                                Start Free Trial
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-4 text-lg border-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200">
                                Sign In to Account
                            </Button>
                        </Link>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid md:grid-cols-3 gap-8 mt-16">
                        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                            <CardHeader className="text-center pb-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                                    Easy Event Creation
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-slate-600 dark:text-slate-300 text-center">
                                    Create and customize events in minutes with our intuitive drag-and-drop interface and smart templates.
                                </CardDescription>
                            </CardContent>
                        </Card>

                        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                            <CardHeader className="text-center pb-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                                    Attendee Management
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-slate-600 dark:text-slate-300 text-center">
                                    Track registrations, send automated notifications, and manage your attendees with powerful CRM tools.
                                </CardDescription>
                            </CardContent>
                        </Card>

                        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                            <CardHeader className="text-center pb-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <BarChart3 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                </div>
                                <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                                    Analytics & Reports
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-slate-600 dark:text-slate-300 text-center">
                                    Get deep insights into your events with real-time analytics, custom reports, and AI-powered recommendations.
                                </CardDescription>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Trust Indicators */}
                    <div className="mt-20 pt-16 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col items-center space-y-8">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                    Trusted by 10,000+ Event Organizers
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300">
                                    Join industry leaders who trust EventManager for their events
                                </p>
                            </div>

                            <div className="flex items-center space-x-8 text-slate-400 dark:text-slate-500">
                                <div className="flex items-center space-x-2">
                                    <Shield className="w-5 h-5" />
                                    <span className="text-sm font-medium">Secure Platform</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Globe className="w-5 h-5" />
                                    <span className="text-sm font-medium">99.9% Uptime</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Zap className="w-5 h-5" />
                                    <span className="text-sm font-medium">Lightning Fast</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center text-slate-600 dark:text-slate-400">
                        <p>Built with ❤️ for event organizers</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

