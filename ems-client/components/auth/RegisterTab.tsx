// --- Register Tab Component ---
"use client";

import {useState} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {CardFooter} from "@/components/ui/card";
import {Lock, User} from "lucide-react";
import {GoogleIcon} from "@/components/svg/GoogleIcon";
import {Mail} from "lucide-react";

export default function RegisterTab() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Handle standard registration
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Replace with your actual backend API endpoint
        const API_URL = 'http://localhost:5000/api/auth/register';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            console.log('Registration successful:', data);
            // Maybe switch to the login tab or show a success message
            alert('Registration successful! Please log in.');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Registration error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Google OAuth registration
    const handleGoogleRegister = () => {
        // This typically redirects to the same endpoint as login
        window.location.href = 'http://localhost:5000/api/auth/google';
    };

    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Create an Account</CardTitle>
                <CardDescription>
                    Enter your details below to get started.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="register-username"
                            placeholder="Username"
                            className="pl-10"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="register-email"
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
                            id="register-password"
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
                        {isLoading ? 'Creating Account...' : 'Create Account'}
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
                    <Button variant="outline" className="w-full" type="button" onClick={handleGoogleRegister}>
                        <GoogleIcon className="mr-2 h-5 w-5" />
                        Google
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}