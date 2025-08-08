'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AiOutlineArrowLeft, AiOutlineMail, AiOutlineCheckCircle } from 'react-icons/ai'
import { useTranslation } from 'react-i18next'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [error, setError] = useState('')
  const { t } = useTranslation("common");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsEmailSent(true)
      } else {
        setError(data.error || t('failed_reset_password'))
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      setError(t('error_occurred_try_again'))
    } finally {
      setIsLoading(false)
    }
  }

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-3/4 left-3/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        {/* Back to signin button */}
        <div className="absolute top-6 left-6 z-30">
          <Link
            href="/auth/signin"
            className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg font-medium hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
          >
            <AiOutlineArrowLeft size={16} />
            {t('back_to_signin')}
          </Link>
        </div>

        {/* Success Message */}
        <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-md w-full border border-white/30 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <AiOutlineCheckCircle className="text-green-600" size={32} />
              </div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
                {t('reset_email_sent')}
              </h1>
              <p className="text-gray-600 mb-6">
                {t('check_email_reset_link_with_email', { email })}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {t('check_spam_folder')}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => {
                  setIsEmailSent(false)
                  setEmail('')
                  setError('')
                }}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02]"
              >
                {t('send_another_email')}
              </button>

              <Link
                href="/auth/signin"
                className="w-full py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 transform hover:scale-[1.02] block text-center"
              >
                {t('back_to_signin')}
              </Link>
            </div>
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

      {/* Back to signin button */}
      <div className="absolute top-6 left-6 z-30">
        <Link
          href="/auth/signin"
          className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg font-medium hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
        >
          <AiOutlineArrowLeft size={16} />
          {t('back_to_signin')}
        </Link>
      </div>

      {/* Main Container */}
      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-md w-full border border-white/30">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <AiOutlineMail className="text-blue-600" size={32} />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
              {t('forgot_password_title')}
            </h1>
            <p className="text-gray-600">
              {t('forgot_password_subtitle')}
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
                placeholder={t('enter_email_address')}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              {isLoading ? t('sending_reset_email') : t('send_reset_email')}
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