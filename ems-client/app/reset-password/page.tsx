'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { authAPI } from "@/lib/api/auth.api";

const LOGGER_COMPONENT_NAME = 'ResetPasswordPage';

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const logger = useLogger();

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Invalid or missing reset token.");
        setTokenValid(false);
        setIsVerifyingToken(false);
        return;
      }

      try {
        logger.userAction(LOGGER_COMPONENT_NAME, 'Verifying reset token', { token: token.substring(0, 10) + '...' });
        const result = await authAPI.verifyResetToken({ token });

        if (result.valid) {
          setTokenValid(true);
          logger.userAction(LOGGER_COMPONENT_NAME, 'Reset token verified successfully');
        } else {
          setTokenValid(false);
          setError(result.message);
          logger.warn(LOGGER_COMPONENT_NAME, 'Reset token verification failed', { message: result.message });
        }
      } catch (error: any) {
        setTokenValid(false);
        setError(error.message || "Failed to verify reset token.");
        logger.error(LOGGER_COMPONENT_NAME, 'Token verification error', error);
      } finally {
        setIsVerifyingToken(false);
      }
    };

    verifyToken();
  }, [token, logger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    logger.userAction(LOGGER_COMPONENT_NAME, 'Password reset form submitted');

    // Validation
    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError("Invalid reset token");
      setIsLoading(false);
      return;
    }

    try {
      const result = await authAPI.resetPassword({
        token,
        newPassword: password
      });

      logger.userAction(LOGGER_COMPONENT_NAME, 'Password reset successfully');
      setIsSuccess(true);
    } catch (error: any) {
      logger.warn(LOGGER_COMPONENT_NAME, 'Password reset failed', error);
      setError(error.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while verifying token
  if (isVerifyingToken) {
    return (
      <AuthLayout
        title="Verifying Reset Link"
        description="Please wait while we verify your reset link"
        showBackButton={false}
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Verifying your password reset link...
          </p>
        </div>
      </AuthLayout>
    );
  }

  // Invalid token state
  if (tokenValid === false) {
    return (
      <AuthLayout
        title="Invalid Reset Link"
        description="This password reset link is invalid or has expired"
        showBackButton={true}
        footer={
          <p className="text-slate-600 dark:text-slate-300">
            Need a new reset link?{' '}
            <Link
              href="/forgot-password"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Request another one
            </Link>
          </p>
        }
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Reset Link Invalid
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              {error || "This password reset link is invalid or has expired."}
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>What to do next:</strong>
            </p>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
              <li>• Request a new password reset link</li>
              <li>• Check that you're using the most recent email</li>
              <li>• Reset links expire after 1 hour</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              variant="outline"
              className="flex-1"
            >
              <Link href="/forgot-password">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Request New Link
              </Link>
            </Button>
            <Button
              asChild
              className="flex-1"
            >
              <Link href="/login">
                Back to Login
              </Link>
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <AuthLayout
        title="Password Reset Successful"
        description="Your password has been updated successfully"
        showBackButton={false}
        footer={
          <p className="text-slate-600 dark:text-slate-300">
            Ready to sign in?{' '}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Sign in now
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
              Password Updated Successfully
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Your password has been reset. You can now sign in with your new password.
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Security reminder:</strong>
            </p>
            <ul className="text-sm text-green-700 dark:text-green-300 mt-2 space-y-1">
              <li>• Use a strong, unique password</li>
              <li>• Don't share your password with anyone</li>
              <li>• Consider using a password manager</li>
            </ul>
          </div>

          <Button
            asChild
            className="w-full"
          >
            <Link href="/login">
              Continue to Sign In
            </Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Main reset password form
  return (
    <AuthLayout
      title="Reset Your Password"
      description="Enter your new password below"
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
            <Lock className="h-4 w-4 mr-2" />
            New Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your new password"
              className="pr-10"
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
            <Lock className="h-4 w-4 mr-2" />
            Confirm New Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              className="pr-10"
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              disabled={isLoading}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
            Password Requirements:
          </p>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li className={password.length >= 8 ? "text-green-600 dark:text-green-400" : ""}>
              • At least 8 characters long
            </li>
            <li className={password && confirmPassword && password === confirmPassword ? "text-green-600 dark:text-green-400" : ""}>
              • Passwords must match
            </li>
          </ul>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Reset Password Button */}
        <Button
          type="submit"
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Resetting Password...</span>
            </div>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <AuthLayout
        title="Loading..."
        description="Please wait while we load the reset page"
        showBackButton={false}
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Loading...
          </p>
        </div>
      </AuthLayout>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
