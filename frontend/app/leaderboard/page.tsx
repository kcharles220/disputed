'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

interface LeaderboardUser {
  _id: string;
  username: string;
  image?: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  winPercentage: number;
  currentWinStreak: number;
  longestWinStreak: number;
}

export default function Leaderboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'winPercentage' | 'winStreak'>('rating');

  // Loading skeleton component
  const LoadingSkeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-300 rounded ${className || 'h-4 w-16'}`}></div>
  );

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setLeaderboardData(data);
      } else {
        setError('Failed to load leaderboard');
      }
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Error fetching leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedData = [...leaderboardData].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'winPercentage':
        return b.winPercentage - a.winPercentage;
      case 'winStreak':
        return b.longestWinStreak - a.longestWinStreak;
      default:
        return b.rating - a.rating;
    }
  });

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${index + 1}`;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-400';
      case 1: return 'text-gray-300';
      case 2: return 'text-orange-400';
      default: return 'text-white/70';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Back button */}
      <div className="absolute top-6 left-6 z-30">
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg font-medium hover:bg-white/20 transition-all duration-200 cursor-pointer"
        >
          ← Back to Home
        </button>
      </div>

      {/* Top Right Corner - Auth Section */}
      <div className="absolute top-6 right-6 flex flex-col gap-3 z-30">
        {status === 'loading' ? (
          <div className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white/70 border border-white/20 rounded-lg font-medium">
            Loading...
          </div>
        ) : session ? (
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/profile')}
              className="px-6 py-3 bg-blue-600/80 backdrop-blur-sm text-white border border-blue-500/30 rounded-lg font-medium hover:bg-blue-600 transition-all duration-200 cursor-pointer"
            >
              📊 My Stats
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-6 py-3 bg-red-600/80 backdrop-blur-sm text-white border border-red-500/30 rounded-lg font-medium hover:bg-red-600 transition-all duration-200 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/auth/signin')}
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200 cursor-pointer min-w-[120px]"
            >
              Login
            </button>
            <button
              onClick={() => router.push('/auth/signup')}
              className="px-8 py-4 bg-blue-600/80 backdrop-blur-sm text-white border border-blue-500/30 rounded-xl font-semibold text-lg hover:bg-blue-600 transition-all duration-200 cursor-pointer min-w-[120px]"
            >
              Register
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-4xl w-full border border-white/30">
          
          {/* Title */}
          <h1 className="text-4xl font-black text-center mb-8 bg-gradient-to-r from-purple-800 to-blue-800 bg-clip-text text-transparent">
            🏆 LEADERBOARD
          </h1>

          {/* Sort Options */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setSortBy('rating')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                sortBy === 'rating'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Rating
            </button>
            <button
              onClick={() => setSortBy('winPercentage')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                sortBy === 'winPercentage'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Win Rate
            </button>
            <button
              onClick={() => setSortBy('winStreak')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                sortBy === 'winStreak'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Win Streak
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 text-center">
              {error}
            </div>
          )}

          {/* Leaderboard Content */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
                    <LoadingSkeleton className="w-8 h-8 rounded-full" />
                    <LoadingSkeleton className="w-12 h-8 rounded-full" />
                    <div className="flex-1">
                      <LoadingSkeleton className="h-5 w-32 mb-1" />
                      <LoadingSkeleton className="h-4 w-24" />
                    </div>
                    <LoadingSkeleton className="w-16 h-8" />
                  </div>
                ))}
              </div>
            ) : sortedData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-xl">No players found</p>
                <p className="text-sm">Be the first to play and claim the top spot!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedData.map((user, index) => (
                  <div
                    key={user._id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                      index < 3
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200'
                        : session?.user?.id === user._id
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {/* Rank */}
                    <div className={`text-2xl font-bold min-w-[3rem] text-center ${getRankColor(index)}`}>
                      {getRankIcon(index)}
                    </div>

                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-2xl">
                      <span>{user.image || '⚖️'}</span>
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{user.username}</span>
                        {session?.user?.id === user._id && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">YOU</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {user.gamesPlayed} games • {user.gamesWon}W
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <div className="font-bold text-lg text-gray-800">
                        {sortBy === 'rating' && user.rating}
                        {sortBy === 'winPercentage' && `${user.winPercentage.toFixed(1)}%`}
                        {sortBy === 'winStreak' && user.longestWinStreak}
                      </div>
                      <div className="text-xs text-gray-500">
                        {sortBy === 'rating' && 'Rating'}
                        {sortBy === 'winPercentage' && 'Win Rate'}
                        {sortBy === 'winStreak' && 'Best Streak'}
                      </div>
                    </div>

                    {/* Current Streak Badge */}
                    {user.currentWinStreak > 0 && (
                      <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        🔥 {user.currentWinStreak}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <div className="text-center mt-6">
            <button
              onClick={fetchLeaderboard}
              disabled={isLoading}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
