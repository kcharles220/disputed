'use client'

import { Suspense, useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FcGoogle } from 'react-icons/fc'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import { useTranslation } from 'react-i18next'

function SignInInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') || '/'
  const error = searchParams?.get('error')
  const { t } = useTranslation("common");

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setLoginError(t('invalid_email_password'))
        setIsLoading(false)
        return
      }

      // Get the session to ensure user is logged in
      const session = await getSession()
      if (session) {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setLoginError(t('error_occurred_signin'))
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('google', { callbackUrl })
    } catch (error) {
      console.error('Google sign in error:', error)
      setLoginError(t('failed_signin_google'))
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Back to home button */}
      <div className="absolute top-6 left-6 z-30">
        <Link
          href="/"
          className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg font-medium hover:bg-white/20 transition-all duration-200"
        >
          ← {t('back_to_home')}
        </Link>
      </div>

      {/* Main Container */}
      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-md w-full border border-white/30">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
              {t('welcome_back')}
            </h1>
            <p className="text-gray-600">{t('sign_in_continue')}</p>
          </div>

          {/* Error Messages */}
          {(error || loginError) && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm">
                {loginError || t('auth_failed_try_again')}
              </p>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleCredentialsSignIn} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                {t('email_address')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-4 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-colors duration-200 text-black"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full p-4 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-colors duration-200 pr-12 text-black"
                  placeholder={t('enter_password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              {isLoading ? t('signing_in') : t('sign_in')}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-8">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500">{t('or')}</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={true} //isLoading
            className="w-full py-4 px-6 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-[1.02]"
          >
            <FcGoogle size={24} />
            {t('continue_with_google')}
          </button>

          {/* Sign Up Link */}
          <div className="text-center mt-8">
            <p className="text-gray-600">
              {t('dont_have_account')}{' '}
              <Link
                href="/auth/signup"
                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors duration-200"
              >
                {t('sign_up_here')}
              </Link>
            </p>
          </div>

          {/* Forgot Password */}
          <div className="text-center mt-4">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              {t('forgot_password')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInInner />
    </Suspense>
  )
}
