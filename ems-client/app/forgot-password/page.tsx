'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { authAPI } from "@/lib/api/auth.api";

const LOGGER_COMPONENT_NAME = 'ForgotPasswordPage';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const logger = useLogger();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    logger.userAction(LOGGER_COMPONENT_NAME, 'Forgot password form submitted', { email });

    if (!email) {
      logger.warn(LOGGER_COMPONENT_NAME, 'Forgot password form validation failed - missing email');
      setError("Please enter your email address");
      setIsLoading(false);
      return;
    }

    try {
      const result = await authAPI.forgotPassword({ email });
      logger.userAction(LOGGER_COMPONENT_NAME, 'Password reset email sent successfully', { email });
      setIsSuccess(true);
    } catch (error: any) {
      logger.warn(LOGGER_COMPONENT_NAME, 'Password reset request failed', { error: error.message });
      setError(error.message || "Failed to send password reset email");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout
        title="Check Your Email"
        description="We've sent you a password reset link"
        showBackButton={true}
        footer={
          <p className="text-slate-600 dark:text-slate-300">
            Remember your password?{' '}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        }
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Email Sent Successfully
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              If an account with <strong>{email}</strong> exists, we've sent you a password reset link.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Next steps:</strong>
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
              <li>• Check your email inbox (and spam folder)</li>
              <li>• Click the reset link in the email</li>
              <li>• Create a new password</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setIsSuccess(false);
                setEmail("");
              }}
            >
              Send Another Email
            </Button>
            <Link href="/login" className="flex-1">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot Password"
      description="Enter your email address and we'll send you a link to reset your password"
      showBackButton={true}
      footer={
        <p className="text-slate-600 dark:text-slate-300">
          Remember your password?{' '}
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
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 border-slate-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500 placeholder:text-slate-500 dark:placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Sending...</span>
            </div>
          ) : (
            "Send Reset Link"
          )}
        </Button>

        {/* Help Text */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>Need help?</strong> If you don't receive an email within a few minutes, check your spam folder or contact support.
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
