'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, User, Github, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [error, setError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const { register, isLoading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to the terms and conditions");
      return;
    }

    const result = await register(name, email, password, role);
    
    if (result.success) {
      // Redirect to dashboard on successful registration
      router.push('/verify-email-pending');
    } else {
      setError(result.error || "Registration failed");
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      description="Join EventManager to start managing your events"
      showBackButton={true}
      footer={
        <p className="text-slate-600 dark:text-slate-300">
          Already have an account?{' '}
          <Link 
            href="/login" 
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
            Full name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 h-12 border-slate-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500 placeholder:text-slate-500 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
            Email address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 border-slate-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500 placeholder:text-slate-500 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          <Label className="text-slate-700 dark:text-slate-300">
            Account Type
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <label className={`relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
              role === 'USER' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
            }`}>
              <input
                type="radio"
                name="role"
                value="USER"
                checked={role === 'USER'}
                onChange={(e) => setRole(e.target.value)}
                className="sr-only"
                disabled={isLoading}
              />
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">User</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Event Attendee</div>
              </div>
            </label>
            
            <label className={`relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
              role === 'SPEAKER' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
            }`}>
              <input
                type="radio"
                name="role"
                value="SPEAKER"
                checked={role === 'SPEAKER'}
                onChange={(e) => setRole(e.target.value)}
                className="sr-only"
                disabled={isLoading}
              />
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Speaker</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Event Presenter</div>
              </div>
            </label>
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-12 border-slate-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500 placeholder:text-slate-500 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Must be at least 8 characters with letters and numbers
          </p>
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">
            Confirm password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 pr-10 h-12 border-slate-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500 placeholder:text-slate-500 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              disabled={isLoading}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="flex items-start space-x-2">
          <input
            id="terms"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mt-1"
            required
            disabled={isLoading}
          />
          <Label htmlFor="terms" className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            I agree to the{' '}
            <Link href="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
              Privacy Policy
            </Link>
          </Label>
        </div>

        {/* Register Button */}
        <Button 
          type="submit" 
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating account...</span>
            </div>
          ) : (
            "Create Account"
          )}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-800 px-2 text-slate-700 dark:text-slate-400 font-medium">
              Or continue with
            </span>
          </div>
        </div>

        {/* Social Registration */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-12 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
            type="button"
          >
            <Github className="w-4 h-4 mr-2" />
            GitHub
          </Button>
          <Button 
            variant="outline" 
            className="h-12 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
            type="button"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
