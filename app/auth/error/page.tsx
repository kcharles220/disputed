'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The sign in link is no longer valid. It may have been used already or it may have expired.',
  Default: 'An error occurred during authentication.',
  OAuthSignin: 'Error in constructing an authorization URL.',
  OAuthCallback: 'Error in handling the response from an OAuth provider.',
  OAuthCreateAccount: 'Could not create OAuth account.',
  EmailCreateAccount: 'Could not create email account.',
  Callback: 'Error in the OAuth callback handler route.',
  OAuthAccountNotLinked: 'Email is already associated with another account.',
  EmailSignin: 'Check your email address.',
  CredentialsSignin: 'Invalid credentials.',
  SessionRequired: 'Please sign in to access this page.',
}

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'

  const getMessage = () => {
    return errorMessages[error] || errorMessages.Default
  }

  const getTitle = () => {
    switch (error) {
      case 'AccessDenied':
        return 'Access Denied'
      case 'OAuthAccountNotLinked':
        return 'Account Linking Error'
      case 'SessionRequired':
        return 'Sign In Required'
      default:
        return 'Authentication Error'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main Container */}
      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-md w-full border border-white/30 text-center">
          {/* Error Icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            {getTitle()}
          </h1>

          {/* Error Message */}
          <p className="text-gray-600 mb-8 leading-relaxed">
            {getMessage()}
          </p>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Link
              href="/auth/signin"
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] inline-block"
            >
              Try Again
            </Link>
            
            <Link
              href="/"
              className="w-full py-3 px-6 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200 transform hover:scale-[1.02] inline-block"
            >
              Back to Home
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help? Contact our support team or try signing in with a different method.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
