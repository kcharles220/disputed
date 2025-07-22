'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { socketService, PlayerData } from './services/socketService';
import { useUser } from './lib/UserContext';
import { stat } from 'fs';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { user: currentUser, isLoading: isLoadingUser } = useUser();
  const [selectedAvatar, setSelectedAvatar] = useState('⚖️');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  // Removed local isLoadingUser and hasLoadedUser state; use context only

  const avatarOptions = ['⚖️', '👨‍💼', '👩‍💼', '👨‍⚖️', '👩‍⚖️', '🎭', '⚔️', '🏛️', '📚', '🗣️', '💼', '🎯'];
  const guestNameSuggestions = [
    'LegalEagle2024', 'CourtCrusher', 'LawyerLegend', 'JusticeWarrior',
    'ArgumentAce', 'DebateDefender', 'CaseCracker', 'VerdictVanguard'
  ];

  // Loading skeleton component
  const LoadingSkeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className || 'h-4 w-16'}`}></div>
  );

  // Use useState with null initially to avoid hydration mismatch
  const [placeholderName, setPlaceholderName] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);


  // Set the placeholder name only on the client side after hydration
  useEffect(() => {
    setIsClient(true);
    setPlaceholderName(guestNameSuggestions[Math.floor(Math.random() * guestNameSuggestions.length)]);
  }, []);



  // Fetch user data when session changes
  // No need for local user loading state, context handles it

  // Update selectedAvatar when currentUser data loads
  useEffect(() => {
    if (currentUser?.avatar) {
      setSelectedAvatar(currentUser.avatar);
      setReady(true); // Set ready to true when avatar is available
    }


  }, [currentUser?.avatar]);

  const handleCreateGame = async () => {
    setIsCreatingGame(true);
    setError('');

    try {
      // Connect to socket
      await socketService.connect();

      const finalName = session?.user?.username || session?.user?.name || playerName.trim() || placeholderName;

      const playerData: PlayerData = {
        name: finalName,
        avatar: currentUser?.avatar || selectedAvatar,
        // Include fresh user data if available, otherwise use session data
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

      // Create room
      const { roomId } = await socketService.createRoom(playerData);

      // Navigate to lobby with just room ID
      router.push(`/lobby?room=${roomId}`);
    } catch (err) {
      setError('Failed to create game. Please try again.');
      console.error('Error creating game:', err);
      socketService.disconnect();
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleJoinGame = () => {
    

    router.push('/join');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>

        {/* Additional floating orbs */}
        <div className="absolute top-1/2 left-1/6 w-48 h-48 bg-cyan-500/15 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-1/3 right-1/6 w-56 h-56 bg-violet-500/15 rounded-full blur-2xl animate-float-delayed"></div>
      </div>

      {/* Scanlines effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse"></div>
      </div>

      {/* How to Play Button - Top Left */}
      <div className="absolute top-6 left-6 z-30">
        <button
          onClick={() => setShowHowToPlay(true)}
          className="group flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 cursor-pointer"
        >
          <span className="text-xl">❓</span>
          <span className="hidden sm:inline">How to Play</span>
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

          {/* Clean Title with Subtle Animation */}
          <div className="text-center mb-6">
            <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-slate-800 via-blue-800 to-slate-800 bg-clip-text text-transparent animate-gentle-pulse">
              DISPUTED!
            </h1>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 text-center">
              {error}
            </div>
          )}

          {/* Avatar and Name Section */}
          <div className="flex items-center gap-6 mb-10">

            {/* Avatar Selection Circle */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => !session && setShowAvatarPicker(!showAvatarPicker)}
                disabled={!!session}
                className={`w-20 h-20 bg-gradient-to-br from-red-100 to-indigo-100 rounded-full flex items-center justify-center text-3xl transition-all duration-200 shadow-lg border-3 border-white/40 ${session
                  ? 'cursor-not-allowed opacity-70'
                  : 'hover:scale-110 cursor-pointer'
                  }`}
              >
                {(!ready && status !== 'unauthenticated') ? (
                  <LoadingSkeleton className="h-8 w-8 bg-white/20" />

                ) : (
                  selectedAvatar

                )}
              </button>

              {session && (
                <p className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                  Avatar from profile
                </p>
              )}

              {/* Avatar Picker Dropdown - Properly positioned */}
              {showAvatarPicker && (
                <>
                  {/* Click outside to close */}
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowAvatarPicker(false)}
                  />

                  {/* Dropdown positioned above the button to avoid overflow */}
                  <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl p-4 grid grid-cols-4 gap-3 z-30 border border-white/30 min-w-[240px]">
                    {avatarOptions.map((avatar, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedAvatar(avatar);
                          setShowAvatarPicker(false);
                        }}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all duration-150 cursor-pointer border-2 ${selectedAvatar === avatar
                          ? 'bg-blue-100 border-blue-500 scale-110 shadow-md'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:scale-105'
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
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={session ? (session.user?.username || session.user?.name || 'Enter display name') : (isClient ? placeholderName : 'Loading...')}
                className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white shadow-sm placeholder-gray-400 text-black"
                disabled={session ? true : false}
              />
            </div>
          </div>

          {/* Enhanced Game Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleCreateGame}
              disabled={isCreatingGame || (!ready && status !== 'unauthenticated')}
              className={`group relative overflow-hidden w-full py-4 text-xl font-bold rounded-xl transition-all duration-300 shadow-lg cursor-pointer transform border-2 ${isCreatingGame || (!ready && status !== 'unauthenticated')
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed border-gray-300'
                : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 hover:scale-[1.02] active:scale-[0.98] border-blue-500/30 hover:shadow-blue-500/25 hover:shadow-xl'
                }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <span className="relative flex items-center justify-center gap-2">
                <span className="text-2xl">⚖️</span>
                {isCreatingGame ? 'CREATING...' : 'CREATE GAME'}
              </span>
            </button>

            <button
              onClick={handleJoinGame}
              className="group relative overflow-hidden w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] border-2 border-purple-500/30 hover:shadow-purple-500/25 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <span className="relative flex items-center justify-center gap-2">
                <span className="text-2xl">🚪</span>
                JOIN GAME
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowHowToPlay(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/30 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowHowToPlay(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-red-500/20 hover:bg-red-500/30 rounded-full flex items-center justify-center text-red-600 hover:text-red-700 transition-all duration-200"
            >
              ✕
            </button>

            {/* Modal Content */}
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-black bg-gradient-to-r from-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
                  How to Play DISPUTED!
                </h2>
                <p className="text-gray-600 text-lg">Master the art of legal argumentation</p>
              </div>

              {/* Game Overview */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-xl font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <span className="text-2xl">⚖️</span>
                  Game Overview
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  DISPUTED! is a best-of-3 competitive debate game where players receive the same legal case but argue from different perspectives.
                  Players alternate roles across rounds, with AI judging each round. If tied after 2 rounds, the best performer chooses their role for the decisive 3rd round!
                </p>
              </div>

              {/* How to Start */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                  <h4 className="text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    Create Game
                  </h4>
                  <ul className="text-gray-700 space-y-2 text-sm">
                    <li>• Click "CREATE GAME" to start a new match</li>
                    <li>• Share the room code with friends</li>
                    <li>• Wait for players to join your lobby</li>
                    <li>• Start the game when everyone's ready</li>
                  </ul>
                </div>

                <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                  <h4 className="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
                    <span className="text-xl">🚪</span>
                    Join Game
                  </h4>
                  <ul className="text-gray-700 space-y-2 text-sm">
                    <li>• Click "JOIN GAME" to enter a room</li>
                    <li>• Enter the 6-digit room code</li>
                    <li>• Choose your avatar and name</li>
                    <li>• Wait for the host to start</li>
                  </ul>
                </div>
              </div>

              {/* Gameplay Steps */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                <h3 className="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🏛️</span>
                  Best-of-3 Format
                </h3>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                    <div>
                      <strong className="text-orange-800">Case Assignment:</strong>
                      <span className="text-gray-700 ml-2">Both players receive the same legal case to study</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                    <div>
                      <strong className="text-orange-800">Round 1:</strong>
                      <span className="text-gray-700 ml-2">Roles assigned randomly - one defends, one attacks</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                    <div>
                      <strong className="text-orange-800">Round 2:</strong>
                      <span className="text-gray-700 ml-2">Players automatically switch roles from Round 1</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                    <div>
                      <strong className="text-orange-800">Tiebreaker Round:</strong>
                      <span className="text-gray-700 ml-2">If tied 1-1, best performer chooses their preferred role</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">5</div>
                    <div>
                      <strong className="text-orange-800">Victory:</strong>
                      <span className="text-gray-700 ml-2">First to win 2 rounds wins the match!</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scoring */}
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200">
                <h3 className="text-xl font-bold text-yellow-800 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  Scoring & Strategy
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-bold text-yellow-800 mb-2">Win Conditions:</h4>
                    <ul className="text-gray-700 space-y-1">
                      <li>• Best 2 out of 3 rounds wins</li>
                      <li>• AI judges each round individually</li>
                      <li>• Strong logical arguments score higher</li>
                      <li>• Clear evidence presentation matters</li>
                      <li>• Best performer gets tiebreaker choice</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-yellow-800 mb-2">Winning Tips:</h4>
                    <ul className="text-gray-700 space-y-1">
                      <li>• Aim to win first 2 rounds quickly</li>
                      <li>• Master both sides of the case</li>
                      <li>• Perform consistently for tiebreaker edge</li>
                      <li>• Choose your stronger role if tied</li>
                      <li>• Adapt strategy based on round scores</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="text-center pt-4">
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="group px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  Got it! Let's Play ⚖️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(-2deg); }
        }
        
        .animate-float-delayed {
          animation: float-delayed 5s ease-in-out infinite 1s;
        }
        
        @keyframes gentle-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 0.9; }
        }
        
        .animate-gentle-pulse {
          animation: gentle-pulse 4s ease-in-out infinite;
        }
      `}</style>

    </div>
  );
}
