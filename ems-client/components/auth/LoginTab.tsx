// --- Login Tab Component ---
"use client";

import {useState} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {CardFooter} from "@/components/ui/card";
import {Lock} from "lucide-react";
import {GoogleIcon} from "@/components/svg/GoogleIcon";
import {Mail} from "lucide-react";

export default function LoginTab() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Handle standard email/password login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Replace with your actual backend API endpoint
        const API_URL = 'http://localhost:5000/api/auth/login';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            // Handle successful login: save token, redirect, etc.
            console.log('Login successful:', data);
            // Example: localStorage.setItem('token', data.token);
            // window.location.href = '/dashboard';
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Login error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Google OAuth login
    const handleGoogleLogin = () => {
        // Redirect to your backend's Google OAuth endpoint
        window.location.href = 'http://localhost:5000/api/auth/google';
    };

    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome Back!</CardTitle>
                <CardDescription>
                    Sign in to your account to continue.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="login-email"
                            type="email"
                            placeholder="Email"
                            className="pl-10"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="login-password"
                            type="password"
                            placeholder="Password"
                            className="pl-10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="text-sm text-destructive text-center">{error}</p>}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>
                    <div className="relative w-full flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" type="button" onClick={handleGoogleLogin}>
                        <GoogleIcon className="mr-2 h-5 w-5" />
                        Google
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}