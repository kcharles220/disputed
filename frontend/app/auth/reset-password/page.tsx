'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineLock, AiOutlineCheckCircle } from 'react-icons/ai'
import { useTranslation } from 'react-i18next'

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')
  const { t } = useTranslation("common");

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState(true)

  useEffect(() => {
    if (!token) {
      setIsValidToken(false)
      setError(t('reset_link_invalid_expired'))
    }
  }, [token, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('passwords_do_not_match'))
      return
    }

    if (password.length < 6) {
      setError(t('password_min_6_chars'))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
      } else {
        setError(data.error || t('failed_reset_password'))
      }
    } catch (error) {
      console.error('Reset password error:', error)
      setError(t('error_occurred_try_again'))
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-pink-900 relative overflow-hidden">
        <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-md w-full border border-white/30 text-center">
            <h1 className="text-3xl font-black text-red-600 mb-4">{t('invalid_reset_link')}</h1>
            <p className="text-gray-600 mb-6">
              {t('reset_link_invalid_expired')}
            </p>
            <Link
              href="/auth/forgot-password"
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] block text-center"
            >
              {t('request_new_reset_link')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900 relative overflow-hidden">
        <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-md w-full border border-white/30 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <AiOutlineCheckCircle className="text-green-600" size={32} />
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
              {t('password_reset_successful')}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('password_reset_success_message')}
            </p>
            <Link
              href="/auth/signin"
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] block text-center"
            >
              {t('sign_in_now')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main Container */}
      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-md w-full border border-white/30">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <AiOutlineLock className="text-blue-600" size={32} />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
              {t('reset_password')}
            </h1>
            <p className="text-gray-600">
              {t('enter_new_password')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Reset Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">
                {t('new_password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full p-4 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-colors duration-200 pr-12 text-black"
                  placeholder={t('enter_new_password_placeholder')}
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

            <div>
              <label htmlFor="confirmPassword" className="block text-gray-700 font-semibold mb-2">
                {t('confirm_new_password')}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full p-4 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-colors duration-200 pr-12 text-black"
                  placeholder={t('confirm_new_password_placeholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              {isLoading ? t('resetting_password') : t('reset_password_button')}
            </button>
          </form>

          {/* Back to Sign In */}
          <div className="text-center mt-8">
            <p className="text-gray-600">
              {t('remember_password')}{' '}
              <Link
                href="/auth/signin"
                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors duration-200"
              >
                {t('sign_in_here')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordInner />
    </Suspense>
  )
}
