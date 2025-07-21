'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { socketService, PlayerData } from '../services/socketService';
import { useUser } from '../lib/UserContext';

export default function JoinGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('⚖️');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [placeholderName, setPlaceholderName] = useState('');
  const { user: currentUser, isLoading: isLoadingUser, refetchUser } = useUser();

  const avatarOptions = ['⚖️', '👨‍💼', '👩‍💼', '👨‍⚖️', '👩‍⚖️', '🎭', '⚔️', '🏛️', '📚', '🗣️', '💼', '🎯'];
  const guestNameSuggestions = [
    'LegalEagle2024', 'CourtCrusher', 'LawyerLegend', 'JusticeWarrior', 
    'ArgumentAce', 'DebateDefender', 'CaseCracker', 'VerdictVanguard'
  ];

  // Loading skeleton component
  const LoadingSkeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className || 'h-4 w-16'}`}></div>
  );


  useEffect(() => {
    setIsClient(true);
    setPlaceholderName(guestNameSuggestions[Math.floor(Math.random() * guestNameSuggestions.length)]);
    // If ?room= is present, set it as the roomId
    const urlRoom = searchParams?.get('room');
    if (urlRoom && typeof urlRoom === 'string') {
      setRoomId(urlRoom.toUpperCase());
    }
  }, [searchParams]);

  // Set player name from session when available
  useEffect(() => {
    if (session?.user?.username || session?.user?.name) {
      setPlayerName(session.user.username || session.user.name || '');
    }
  }, [session?.user?.id]);

  // Update selectedAvatar when currentUser data loads
  useEffect(() => {
    if (currentUser?.avatar) {
      setSelectedAvatar(currentUser.avatar);
    }
  }, [currentUser?.avatar]);

  const handleJoinGame = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      // Connect to socket
      await socketService.connect();

      // Use session data if available, otherwise use form data
      const finalName = session?.user?.username || session?.user?.name || playerName.trim() || placeholderName;

      const playerData: PlayerData = {
        name: finalName,
        avatar: currentUser?.avatar || selectedAvatar,
        ...(session && {
          userId: session.user?.id,
          rating: currentUser?.rating || session.user?.rating || 1000,
          gamesPlayed: currentUser?.gamesPlayed || session.user?.gamesPlayed || 0,
          gamesWon: currentUser?.gamesWon || session.user?.gamesWon || 0,
          gamesLost: currentUser?.gamesLost || session.user?.gamesLost || 0,
          winPercentage: currentUser?.winPercentage || session.user?.winPercentage || 0,
          averageArgumentScore: currentUser?.averageArgumentScore || session.user?.averageArgumentScore || 0,
          bestArgumentScore: currentUser?.bestArgumentScore || session.user?.bestArgumentScore || 0,
          worstArgumentScore: currentUser?.worstArgumentScore || session.user?.worstArgumentScore || 0,
          totalRoundsPlayed: currentUser?.totalRoundsPlayed || session.user?.totalRoundsPlayed || 0,
          totalRoundsWon: currentUser?.totalRoundsWon || session.user?.totalRoundsWon || 0,
          totalRoundsLost: currentUser?.totalRoundsLost || session.user?.totalRoundsLost || 0,
          averageGameDuration: currentUser?.averageGameDuration || session.user?.averageGameDuration || 0,
          longestWinStreak: currentUser?.longestWinStreak || session.user?.longestWinStreak || 0,
          currentWinStreak: currentUser?.currentWinStreak || session.user?.currentWinStreak || 0
        }),
        roomId: '',
        gameState: '',
        caseDetails: undefined,
        players: [],
        turn: null,
        round: {
          number: 0,
          analysis: undefined
        },
        exchange: 0,
        argumentCount: 0,
        tiebreakerWinner: null
      };

      // Join the room
      await socketService.joinRoom(roomId.toUpperCase(), playerData);
      
      // Navigate to lobby
      router.push(`/lobby?room=${roomId.toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
      socketService.disconnect();
    } finally {
      setIsJoining(false);
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
          <div className="flex flex-col gap-4">
            {/* Main Profile Card */}
            <div className="relative bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-2xl border border-white/30 p-6 shadow-2xl min-w-[360px] overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10"></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-purple-500/10 rounded-full blur-lg"></div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Header with Avatar and Basic Info */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <button
                      onClick={() => router.push('/profile')}
                      className="group w-20 h-20 bg-gradient-to-br from-yellow-400 via-purple-500 to-blue-500 rounded-full p-0.5 hover:scale-105 transition-all duration-200 cursor-pointer"
                      title="Click to edit profile"
                    >
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-2xl group-hover:bg-gradient-to-br group-hover:from-purple-300 group-hover:to-blue-300 transition-all duration-200">
                        {isLoadingUser ? (
                          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <span>{(currentUser as any)?.avatar || (session.user as any)?.avatar || '⚖️'}</span>
                        )}
                      </div>
                    </button>
                    {/* Edit Icon Overlay */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-200">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-bold text-xl text-white mb-1">
                      {currentUser?.username || session.user?.username || session.user?.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <span className="text-yellow-300 font-bold text-lg">
                          {isLoadingUser ? (
                            <LoadingSkeleton className="h-5 w-16 inline-block bg-white/20" />
                          ) : (
                            currentUser?.rating || session.user?.rating || 1000
                          )}
                        </span>
                      </div>
                      <span className="text-white/60 text-sm">rating</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm border border-white/20">
                    <div className="text-white font-bold text-lg">
                      {isLoadingUser ? (
                        <LoadingSkeleton className="h-5 w-8 mx-auto bg-white/20" />
                      ) : (
                        currentUser?.gamesPlayed || session.user?.gamesPlayed || 0
                      )}
                    </div>
                    <div className="text-white/70 text-xs uppercase tracking-wide">Games</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm border border-white/20">
                    <div className="text-green-400 font-bold text-lg">
                      {isLoadingUser ? (
                        <LoadingSkeleton className="h-5 w-8 mx-auto bg-white/20" />
                      ) : (
                        `${Math.round(currentUser?.winPercentage || session.user?.winPercentage || 0)}%`
                      )}
                    </div>
                    <div className="text-white/70 text-xs uppercase tracking-wide">Win Rate</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm border border-white/20">
                    <div className="text-orange-400 font-bold text-lg flex items-center justify-center gap-1">
                      {isLoadingUser ? (
                        <LoadingSkeleton className="h-5 w-8 bg-white/20" />
                      ) : (
                        <>
                          🔥 {currentUser?.currentWinStreak || session.user?.currentWinStreak || 0}
                        </>
                      )}
                    </div>
                    <div className="text-white/70 text-xs uppercase tracking-wide">Streak</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => router.push('/profile')}
                      className="group relative px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-[1.02] overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      <div className="relative flex items-center justify-center">
                        <span className="text-sm font-medium">View Stats</span>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => router.push('/leaderboard')}
                      className="group relative px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-[1.02] overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      <div className="relative flex items-center justify-center">
                        <span className="text-sm font-medium">Leaderboard</span>
                      </div>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="group w-full px-4 py-3 bg-gradient-to-r from-red-600/80 to-red-700/80 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-[1.02] backdrop-blur-sm border border-red-500/30 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    <div className="relative flex items-center justify-center">
                      <span className="text-sm font-medium">Sign Out</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
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
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-lg w-full border border-white/30">
          
          {/* Title */}
          <h1 className="text-4xl font-black text-center mb-8 bg-gradient-to-r from-purple-800 to-blue-800 bg-clip-text text-transparent">
            JOIN GAME
          </h1>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 text-center">
              {error}
            </div>
          )}

          {/* Room Code Input */}
          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Room Code</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="Enter room code (e.g., ABC123)"
              className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all duration-200 bg-white shadow-sm placeholder-gray-400 text-black uppercase font-mono"
              maxLength={6}
            />
          </div>

          {/* Avatar and Name Section */}
          <div className="flex items-center gap-6 mb-8">
            
            {/* Avatar Selection Circle */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => !session && setShowAvatarPicker(!showAvatarPicker)}
                disabled={!!session}
                className={`w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center text-3xl transition-all duration-200 shadow-lg border-3 border-white/40 ${
                  session 
                    ? 'cursor-not-allowed opacity-70' 
                    : 'hover:scale-110 cursor-pointer'
                }`}
              >
                {selectedAvatar}
              </button>
              
              {session && (
                <p className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                  Avatar from profile
                </p>
              )}
              
              {/* Avatar Picker Dropdown */}
              {showAvatarPicker && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setShowAvatarPicker(false)}
                  />
                  
                  <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl p-4 grid grid-cols-4 gap-3 z-30 border border-white/30 min-w-[240px]">
                    {avatarOptions.map((avatar, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedAvatar(avatar);
                          setShowAvatarPicker(false);
                        }}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all duration-150 cursor-pointer border-2 ${
                          selectedAvatar === avatar 
                            ? 'bg-purple-100 border-purple-500 scale-110 shadow-md' 
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:scale-105'
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Name Input */}
            <div className="flex-1">
              <label className="block text-gray-700 font-bold mb-2">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={isClient ? placeholderName : 'Loading...'}
                disabled={!!session}
                className={`w-full px-4 py-3 text-lg border-2 rounded-xl focus:outline-none transition-all duration-200 shadow-sm text-black ${
                  session 
                    ? 'border-gray-300 bg-gray-100 cursor-not-allowed placeholder-gray-500' 
                    : 'border-gray-200 bg-white focus:border-purple-500 placeholder-gray-400'
                }`}
              />
              {session && (
                <p className="mt-1 text-sm text-gray-600">
                  Username is set from your account profile
                </p>
              )}
            </div>
          </div>

          {/* Join Game Button */}
          <div className="text-center">
            <button 
              onClick={handleJoinGame}
              disabled={isJoining}
              className={`w-full py-4 text-xl font-bold rounded-xl transition-all duration-200 shadow-lg cursor-pointer transform ${
                isJoining 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-blue-700 text-white hover:from-purple-700 hover:to-blue-800 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isJoining ? 'JOINING...' : 'JOIN GAME'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
