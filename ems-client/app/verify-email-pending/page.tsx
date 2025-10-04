'use client';

import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { CheckCircle, Mail, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {logger} from "@/lib/logger";

const LOGGER_COMPONENT_NAME = 'VerifyEmailPending';

export default function VerifyEmailPendingPage() {
  const [isChecking, setIsChecking] = useState(false);
  const { checkAuth, retryAuth, isLoading } = useAuth();
  const router = useRouter();

  const handleCheckVerification = async () => {
    setIsChecking(true);
    try {
      await checkAuth();
      // If verification is complete, redirect to dashboard
      router.push('/dashboard');
    } catch {
      logger.info(LOGGER_COMPONENT_NAME, 'Still not verified');
    } finally {
      setIsChecking(false);
    }
  };

  const handleRetryAuth = async () => {
    setIsChecking(true);
    try {
      await retryAuth();
      // If authentication is successful, redirect to dashboard
      router.push('/dashboard');
    } catch {
      logger.info(LOGGER_COMPONENT_NAME, 'Authentication retry failed');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <AuthLayout
      title="Check Your Email"
      description="We&apos;ve sent you a verification link"
      showBackButton={false}
      footer={
        <div className="text-center space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Didn&apos;t receive the email?{' '}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Try registering again
            </Link>
          </p>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Success Animation */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Outer glow effect */}
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl scale-150 animate-pulse"></div>

            {/* Main circle */}
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
              <CheckCircle className="w-12 h-12 text-white animate-bounce" />
            </div>

            {/* Floating particles */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full px-4 py-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Registration Successful!
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Verify Your Email Address
          </h2>

          <div className="space-y-3 text-slate-600 dark:text-slate-300">
            <p className="text-lg">
              We&apos;ve sent a verification link to your email address.
            </p>
            <p>
              Please check your inbox and click the verification link to activate your account.
            </p>
          </div>
        </div>

        {/* Email Icon with Animation */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-12 hover:rotate-0 transition-transform duration-300">
              <Mail className="w-8 h-8 text-white" />
            </div>
            {/* Envelope flap animation */}
            <div className="absolute top-0 left-0 w-16 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-t-xl transform -rotate-12 animate-pulse"></div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span>Check your email inbox</span>
          </h3>
          <p className="text-slate-600 dark:text-slate-300 ml-8">
            Look for an email from <span className="font-medium text-blue-600 dark:text-blue-400">EVENTO</span> with the subject &quot;Verify Your Email Address&quot;
          </p>

          <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span>Click the verification link</span>
          </h3>
          <p className="text-slate-600 dark:text-slate-300 ml-8">
            The link will automatically verify your account and log you in
          </p>

          <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span>Access your dashboard</span>
          </h3>
          <p className="text-slate-600 dark:text-slate-300 ml-8">
            Once verified, you&apos;ll be redirected to your personalized dashboard
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={handleCheckVerification}
            disabled={isChecking || isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking Verification...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                I&apos;ve Verified My Email
              </>
            )}
          </Button>

          <Button
            variant="outline"
            asChild
            className="w-full border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Link href="/login">
              <ArrowRight className="w-4 h-4 mr-2" />
              Already Verified? Sign In
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Can&apos;t find the email? Check your spam folder or{' '}
            <button
              onClick={handleCheckVerification}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline"
            >
              click here to check verification status
            </button>
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Having trouble?{' '}
            <button
              onClick={handleRetryAuth}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline"
            >
              Retry authentication
            </button>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
