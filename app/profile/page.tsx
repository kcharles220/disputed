'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProfilePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    avatar: '⚖️'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userStats, setUserStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [hasLoadedStats, setHasLoadedStats] = useState(false)

  const avatarOptions = ['⚖️', '👨‍💼', '👩‍💼', '👨‍⚖️', '👩‍⚖️', '🎭', '⚔️', '🏛️', '📚', '🗣️', '💼', '🎯']

  // Function to fetch fresh user stats from database
  const fetchUserStats = async () => {
    try {
      setStatsLoading(true)
      const response = await fetch('/api/user/stats')
      if (response.ok) {
        const stats = await response.json()
        console.log('Fetched userStats:', stats) // Debug log
        setUserStats(stats)
        setHasLoadedStats(true)
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  // Function to fetch stats only if not already loaded
  const fetchUserStatsIfNeeded = async () => {
    if (!hasLoadedStats) {
      await fetchUserStats()
    }
  }

  // Redirect if not authenticated and fetch fresh stats
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      // Reset state when user logs out
      setUserStats(null)
      setHasLoadedStats(false)
      setStatsLoading(true)
    } else {
      setFormData({
        username: session.user?.username || '',
        avatar: session.user?.image || '⚖️'
      })
      // Fetch fresh stats from database only if not already loaded
      fetchUserStatsIfNeeded()
    }
  }, [session?.user?.id, status, router, hasLoadedStats])

  // Update formData when fresh user stats are loaded
  useEffect(() => {
    console.log('useEffect triggered - userStats:', userStats, 'session:', session) // Debug log
    if (userStats && session) {
      console.log('Updating formData with userStats.avatar:', (userStats as any)?.avatar) // Debug log
      setFormData({
        username: (userStats as any)?.username || session.user?.username || '',
        avatar: (userStats as any)?.avatar || '⚖️'
      })
    }
  }, [userStats, session])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSaveProfile = async () => {
    if (!formData.username.trim()) {
      setError('Username cannot be empty')
      return
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          avatar: formData.avatar
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      // Update the session with new data
      await update({
        username: formData.username.trim(),
        avatar: formData.avatar
      })

      // Refresh user stats to get the latest data
      setHasLoadedStats(false)
      await fetchUserStats()

      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err: any) {
      setError(err.message || 'An error occurred while updating profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setFormData({
      username: session?.user?.username || '',
      avatar: session?.user?.image || '⚖️'
    })
    setIsEditing(false)
    setError('')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect
  }

  const user = userStats || session.user // Use fresh stats if available, fall back to session

  // Loading skeleton component
  const LoadingSkeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className || 'h-4 w-16'}`}></div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Back to home button */}
      <div className="absolute top-6 left-6 z-30">
        <Link
          href="/"
          className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg font-medium hover:bg-white/20 transition-all duration-200"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Sign Out Button */}
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="px-5 py-2.5 bg-red-600/80 backdrop-blur-sm text-white border border-red-500/30 rounded-lg font-medium hover:bg-red-600 transition-all duration-200"
        >
          Sign Out
        </button>
      </div>

      {/* Main Container */}
      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-4xl w-full border border-white/30">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-800 to-blue-800 bg-clip-text text-transparent mb-2">
              Your Profile
            </h1>
            <p className="text-gray-600">Manage your account and view your legal battle statistics</p>
            <button
              onClick={fetchUserStats}
              className="mt-3 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
            >
              🔄 Refresh Stats
            </button>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg">
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Profile Information */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Information</h2>
              
              {/* Avatar Selection */}
              <div>
                <label className="block text-gray-700 font-semibold mb-3">Avatar</label>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center text-3xl border-3 border-purple-300">
                    {(() => {
                      console.log('Avatar display logic:')
                      console.log('- isEditing:', isEditing)
                      console.log('- statsLoading:', statsLoading)
                      console.log('- userStats:', userStats)
                      console.log('- userStats.avatar:', (userStats as any)?.avatar)
                      console.log('- session.user.image:', session?.user?.image)
                      console.log('- formData.avatar:', formData.avatar)
                      
                      if (isEditing) {
                        return formData.avatar
                      } else if (statsLoading) {
                        return <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
                      } else {
                        const avatar = (userStats as any)?.avatar || session?.user?.image || '⚖️'
                        console.log('Final avatar to display:', avatar)
                        return avatar
                      }
                    })()}
                  </div>
                  {!isEditing && (
                    <div className="text-gray-600">
                      <div className="font-medium">{user?.username}</div>
                      <div className="text-sm">Legal Battle Champion</div>
                    </div>
                  )}
                </div>
                
                {isEditing && (
                  <div className="grid grid-cols-6 gap-2">
                    {avatarOptions.map((avatar) => (
                      <button
                        key={avatar}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, avatar }))}
                        className={`w-12 h-12 text-2xl rounded-lg border-2 transition-all duration-200 ${
                          formData.avatar === avatar
                            ? 'border-purple-500 bg-purple-100 scale-110'
                            : 'border-gray-300 hover:border-purple-300 hover:scale-105'
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Username */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Username</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none transition-colors duration-200 text-black"
                    placeholder="Enter username"
                  />
                ) : (
                  <div className="p-3 bg-gray-100 rounded-xl text-gray-800 font-medium">
                    {user?.username}
                  </div>
                )}
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Email</label>
                <div className="p-3 bg-gray-100 rounded-xl text-gray-600">
                  {user?.email}
                </div>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                      className="flex-1 py-3 bg-gray-500 text-white font-bold rounded-xl hover:bg-gray-600 transition-all duration-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Battle Statistics</h2>
              
              {/* Rating Card */}
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-6 rounded-xl border-2 border-yellow-300">
                <div className="text-center">
                  <div className="text-3xl font-black text-yellow-800 mb-2">
                    {statsLoading ? <LoadingSkeleton className="h-8 w-20 mx-auto" /> : (user?.rating || 1200)}
                  </div>
                  <div className="text-yellow-700 font-semibold">Current Rating</div>
                </div>
              </div>

              {/* Game Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-100 p-4 rounded-xl border-2 border-blue-300 text-center">
                  <div className="text-2xl font-bold text-blue-800">
                    {statsLoading ? <LoadingSkeleton className="h-6 w-8 mx-auto" /> : (user?.gamesPlayed || 0)}
                  </div>
                  <div className="text-blue-600 text-sm font-medium">Games Played</div>
                </div>
                
                <div className="bg-green-100 p-4 rounded-xl border-2 border-green-300 text-center">
                  <div className="text-2xl font-bold text-green-800">
                    {statsLoading ? <LoadingSkeleton className="h-6 w-8 mx-auto" /> : (user?.gamesWon || 0)}
                  </div>
                  <div className="text-green-600 text-sm font-medium">Games Won</div>
                </div>
                
                <div className="bg-red-100 p-4 rounded-xl border-2 border-red-300 text-center">
                  <div className="text-2xl font-bold text-red-800">
                    {statsLoading ? <LoadingSkeleton className="h-6 w-8 mx-auto" /> : (user?.gamesLost || 0)}
                  </div>
                  <div className="text-red-600 text-sm font-medium">Games Lost</div>
                </div>
                
                <div className="bg-purple-100 p-4 rounded-xl border-2 border-purple-300 text-center">
                  <div className="text-2xl font-bold text-purple-800">
                    {statsLoading ? <LoadingSkeleton className="h-6 w-12 mx-auto" /> : `${user?.winPercentage?.toFixed(1) || '0.0'}%`}
                  </div>
                  <div className="text-purple-600 text-sm font-medium">Win Rate</div>
                </div>
              </div>

              {/* Rounds Performance */}
              <div className="bg-indigo-50 p-4 rounded-xl border-2 border-indigo-300">
                <h3 className="text-lg font-bold text-indigo-800 mb-3">Round Statistics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-indigo-600">Total Rounds Played</span>
                    <span className="font-bold text-indigo-800">
                      {statsLoading ? <LoadingSkeleton className="h-4 w-8" /> : (user?.totalRoundsPlayed || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-600">Rounds Won</span>
                    <span className="font-bold text-indigo-800">
                      {statsLoading ? <LoadingSkeleton className="h-4 w-8" /> : (user?.totalRoundsWon || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-600">Rounds Lost</span>
                    <span className="font-bold text-indigo-800">
                      {statsLoading ? <LoadingSkeleton className="h-4 w-8" /> : (user?.totalRoundsLost || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-600">Round Win Rate</span>
                    <span className="font-bold text-indigo-800">
                      {statsLoading ? <LoadingSkeleton className="h-4 w-12" /> : (
                        user?.totalRoundsPlayed ? `${((user.totalRoundsWon / user.totalRoundsPlayed) * 100).toFixed(1)}%` : '0.0%'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Points and Performance */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-700">Performance Metrics</h3>
                
                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Argument Score</span>
                    <span className="font-bold text-blue-600">
                      {statsLoading ? <LoadingSkeleton className="h-4 w-12" /> : (user?.averageArgumentScore?.toFixed(1) || '0.0')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Best Argument Score</span>
                    <span className="font-bold text-yellow-600">
                      {statsLoading ? <LoadingSkeleton className="h-4 w-8" /> : (user?.bestArgumentScore || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Worst Argument Score</span>
                    <span className="font-bold text-orange-600">
                      {statsLoading ? <LoadingSkeleton className="h-4 w-8" /> : (user?.worstArgumentScore || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Game Duration</span>
                    <span className="font-bold text-indigo-600">
                      {statsLoading ? <LoadingSkeleton className="h-4 w-16" /> : (user?.averageGameDuration ? `${user.averageGameDuration.toFixed(1)} min` : '0.0 min')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Win Streak</span>
                    <span className="font-bold text-orange-600">
                      {statsLoading ? <LoadingSkeleton className="h-4 w-8" /> : (user?.currentWinStreak || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Best Win Streak</span>
                    <span className="font-bold text-purple-600">
                      {statsLoading ? <LoadingSkeleton className="h-4 w-8" /> : (user?.longestWinStreak || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Performance Analysis */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-700">Role Performance</h3>
                
                {/* Preferred Role Display */}
                {!statsLoading && (user as any)?.preferredRole && (user as any).preferredRole !== 'none' && (
                  <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-4 rounded-xl border-2 border-yellow-300">
                    <div className="text-center">
                      <h4 className="text-md font-bold text-yellow-800 mb-1">
                        🏆 Best Role: {(user as any).preferredRole === 'prosecutor' ? '🔥 PROSECUTOR' : '🛡️ DEFENDER'}
                      </h4>
                      <div className="text-yellow-700 text-xs">
                        Based on win rate and performance
                      </div>
                    </div>
                  </div>
                )}

                {statsLoading && (
                  <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-4 rounded-xl border-2 border-yellow-300">
                    <div className="text-center">
                      <LoadingSkeleton className="h-5 w-48 mx-auto mb-2" />
                      <LoadingSkeleton className="h-3 w-32 mx-auto" />
                    </div>
                  </div>
                )}

                {/* Role Stats Compact */}
                <div className="space-y-3">
                  {/* Prosecutor Stats */}
                  <div className="bg-red-50 p-3 rounded-xl border-2 border-red-300">
                    <h4 className="text-md font-bold text-red-800 mb-2 flex items-center gap-1">
                      🔥 Prosecutor
                    </h4>
                    {!statsLoading ? (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-red-600">Rounds</span>
                          <span className="font-bold text-red-800">{(user as any)?.prosecutorRoundsPlayed || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Win Rate</span>
                          <span className="font-bold text-red-800">
                            {(user as any)?.prosecutorRoundsPlayed ? 
                              (((user as any).prosecutorRoundsWon / (user as any).prosecutorRoundsPlayed) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Avg Score</span>
                          <span className="font-bold text-red-800">
                            {(user as any)?.prosecutorAverageScore ? 
                              (user as any).prosecutorAverageScore.toFixed(1) : '0.0'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-red-600">Rounds</span>
                          <LoadingSkeleton className="h-4 w-8" />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Win Rate</span>
                          <LoadingSkeleton className="h-4 w-12" />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Avg Score</span>
                          <LoadingSkeleton className="h-4 w-10" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Defender Stats */}
                  <div className="bg-blue-50 p-3 rounded-xl border-2 border-blue-300">
                    <h4 className="text-md font-bold text-blue-800 mb-2 flex items-center gap-1">
                      🛡️ Defender
                    </h4>
                    {!statsLoading ? (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-600">Rounds</span>
                          <span className="font-bold text-blue-800">{(user as any)?.defenderRoundsPlayed || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Win Rate</span>
                          <span className="font-bold text-blue-800">
                            {(user as any)?.defenderRoundsPlayed ? 
                              (((user as any).defenderRoundsWon / (user as any).defenderRoundsPlayed) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Avg Score</span>
                          <span className="font-bold text-blue-800">
                            {(user as any)?.defenderAverageScore ? 
                              (user as any).defenderAverageScore.toFixed(1) : '0.0'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-blue-600">Rounds</span>
                          <LoadingSkeleton className="h-4 w-8" />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Win Rate</span>
                          <LoadingSkeleton className="h-4 w-12" />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Avg Score</span>
                          <LoadingSkeleton className="h-4 w-10" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
