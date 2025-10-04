'use client';

import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {useAuth} from "@/lib/auth-context";
import {authAPI, authApiClient} from "@/lib/api/auth.api";
import { logger } from "@/lib/logger";

const LOGGER_COMPONENT_NAME = 'EmailVerificationCallback';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'invalid';

function VerifyEmailContent() {
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [error, setError] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  const searchParams = useSearchParams();
  const router = useRouter();
  const accessToken = searchParams.get('accessToken');
  const { verifyEmail } = useAuth();

  useEffect(() => {
    const verifyEmailHelper = async () => {
      logger.info(LOGGER_COMPONENT_NAME, 'Email verification callback - accessToken:', accessToken);
      if (!accessToken) {
        setStatus('invalid');
        setError('Invalid verification link');
        return;
      }

      // Check if already verified by checking localStorage
      const existingToken = authApiClient.getToken();
      if (existingToken) {
        // Check if user is already authenticated
        try {
          const isValid = await authAPI.verifyToken(existingToken);
          if (isValid) {
            setStatus('success');
            setUserEmail('Already verified');
            setTimeout(() => {
              router.push('/dashboard');
            }, 1000);
            return;
          }
        } catch (error) {
          // Token is invalid, continue with verification
        }
      }

      try {
        setStatus('verifying');
        logger.info(LOGGER_COMPONENT_NAME, 'Calling verifyEmail with token:', accessToken);

        // Call the verification endpoint
        const result = await verifyEmail(accessToken);
        logger.info(LOGGER_COMPONENT_NAME, 'Verification result:', result);

        if (result.error) {
            setStatus('error');
            setError(result.error);
            return;
        }

        if (result.success && result.response?.token && result.response?.user) {
          setStatus('success');
          setUserEmail(result.response.user.email);

          // Store the accessToken and user data
          localStorage.setItem('auth_token', result.response.token);

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
        } else {
          setStatus('error');
          setError('Verification failed - invalid response');
        }
      } catch (error: unknown) {
        setStatus('error');
        setError(error instanceof Error ? error.message : 'Verification failed');
      }
    };

      verifyEmailHelper();
  }, [accessToken, router]);

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />;
      case 'success':
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl scale-150 animate-pulse"></div>
            <CheckCircle className="relative w-12 h-12 text-green-500 animate-bounce" />
          </div>
        );
      case 'error':
      case 'invalid':
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl scale-150"></div>
            <XCircle className="relative w-12 h-12 text-red-500" />
          </div>
        );
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'verifying':
        return {
          title: 'Verifying Your Email',
          description: 'Please wait while we verify your email address...'
        };
      case 'success':
        return {
          title: 'Email Verified Successfully!',
          description: `Your email ${userEmail} has been verified. You're now logged in and will be redirected to your dashboard.`
        };
      case 'error':
        return {
          title: 'Verification Failed',
          description: error || 'Something went wrong during verification. Please try again.'
        };
      case 'invalid':
        return {
          title: 'Invalid Verification Link',
          description: 'This verification link is invalid or has expired. Please request a new one.'
        };
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <AuthLayout
      title={statusMessage.title}
      description={statusMessage.description}
      showBackButton={false}
    >
      <div className="space-y-8">
        {/* Status Icon */}
        <div className="flex justify-center">
          {getStatusIcon()}
        </div>

        {/* Status Message */}
        <div className="text-center space-y-4">
          {status === 'success' && (
            <div className="inline-flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full px-4 py-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Verification Complete!
              </span>
            </div>
          )}

          {status === 'error' && (
            <div className="inline-flex items-center space-x-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full px-4 py-2">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                Verification Failed
              </span>
            </div>
          )}
        </div>

        {/* Success State */}
        {status === 'success' && (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                🎉 Welcome to EventManager!
              </h3>
              <p className="text-green-700 dark:text-green-300">
                Your account is now active and you&apos;re ready to start managing events.
              </p>
            </div>

            <div className="text-center">
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                Redirecting to your dashboard in a few seconds...
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
              >
                <Link href="/dashboard">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Go to Dashboard Now
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {(status === 'error' || status === 'invalid') && (
          <div className="space-y-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                Verification Failed
              </h3>
              <p className="text-red-700 dark:text-red-300">
                {statusMessage.description}
              </p>
            </div>

            <div className="space-y-4">
              <Button
                asChild
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <Link href="/register">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Register Again
                </Link>
              </Button>

              <Button
                variant="outline"
                asChild
                className="w-full border-slate-200 dark:border-slate-600"
              >
                <Link href="/login">
                  Try Signing In
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="text-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Processing Verification
              </h3>
              <p className="text-blue-700 dark:text-blue-300">
                Please wait while we verify your email address...
              </p>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <AuthLayout
        title="Loading..."
        description="Please wait while we load the verification page"
        showBackButton={false}
      >
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
      </AuthLayout>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
