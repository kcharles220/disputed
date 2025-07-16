'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { socketService, PlayerData } from './services/socketService';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const nameFromUrl = searchParams.get('name');
  const avatarFromUrl = searchParams.get('avatar');
  
  const [selectedAvatar, setSelectedAvatar] = useState(avatarFromUrl || '⚖️');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [playerName, setPlayerName] = useState(nameFromUrl || '');
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [hasLoadedUser, setHasLoadedUser] = useState(false);

  const avatarOptions = ['⚖️', '👨‍💼', '👩‍💼', '👨‍⚖️', '👩‍⚖️', '🎭', '⚔️', '🏛️'];
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

  // Fetch fresh user data from database
  const fetchCurrentUser = async () => {
    if (session?.user?.id && !hasLoadedUser) {
      setIsLoadingUser(true);
      try {
        const response = await fetch('/api/user/current');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
          setHasLoadedUser(true);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      } finally {
        setIsLoadingUser(false);
      }
    }
  };

  // Set the placeholder name only on the client side after hydration
  useEffect(() => {
    setIsClient(true);
    // Only generate a random placeholder if no name was passed from URL
    if (!nameFromUrl) {
      setPlaceholderName(guestNameSuggestions[Math.floor(Math.random() * guestNameSuggestions.length)]);
    } else {
      setPlaceholderName(nameFromUrl);
    }
  }, [nameFromUrl]);

  // Fetch user data when session changes
  useEffect(() => {
    if (session?.user?.id) {
      fetchCurrentUser();
    } else {
      // Reset state when user logs out
      setCurrentUser(null);
      setHasLoadedUser(false);
      setIsLoadingUser(false);
    }
  }, [session?.user?.id, hasLoadedUser]);

  const handleCreateGame = async () => {
    setIsCreatingGame(true);
    setError('');

    try {
      // Connect to socket
      await socketService.connect();

      const finalName = session?.user?.username || session?.user?.name || playerName.trim() || placeholderName;
      
      const playerData: PlayerData = {
        name: finalName,
        avatar: selectedAvatar,
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
        })
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
    const finalName = session?.user?.username || session?.user?.name || playerName.trim() || placeholderName;
    const params = new URLSearchParams({
      name: finalName,
      avatar: selectedAvatar
    });
    
    // Add fresh user data if available, otherwise use session data
    if (session) {
      if (session.user?.id) params.append('userId', session.user.id);
      const rating = currentUser?.rating || session.user?.rating || 1000;
      params.append('rating', rating.toString());
      const gamesPlayed = currentUser?.gamesPlayed || session.user?.gamesPlayed || 0;
      params.append('gamesPlayed', gamesPlayed.toString());
      const gamesWon = currentUser?.gamesWon || session.user?.gamesWon || 0;
      params.append('gamesWon', gamesWon.toString());
      const gamesLost = currentUser?.gamesLost || session.user?.gamesLost || 0;
      params.append('gamesLost', gamesLost.toString());
      const winPercentage = currentUser?.winPercentage || session.user?.winPercentage || 0;
      params.append('winPercentage', winPercentage.toString());
      const averageArgumentScore = currentUser?.averageArgumentScore || session.user?.averageArgumentScore || 0;
      params.append('averageArgumentScore', averageArgumentScore.toString());
      const bestArgumentScore = currentUser?.bestArgumentScore || session.user?.bestArgumentScore || 0;
      params.append('bestArgumentScore', bestArgumentScore.toString());
      const worstArgumentScore = currentUser?.worstArgumentScore || session.user?.worstArgumentScore || 0;
      params.append('worstArgumentScore', worstArgumentScore.toString());
      const totalRoundsPlayed = currentUser?.totalRoundsPlayed || session.user?.totalRoundsPlayed || 0;
      params.append('totalRoundsPlayed', totalRoundsPlayed.toString());
      const totalRoundsWon = currentUser?.totalRoundsWon || session.user?.totalRoundsWon || 0;
      params.append('totalRoundsWon', totalRoundsWon.toString());
      const totalRoundsLost = currentUser?.totalRoundsLost || session.user?.totalRoundsLost || 0;
      params.append('totalRoundsLost', totalRoundsLost.toString());
      const averageGameDuration = currentUser?.averageGameDuration || session.user?.averageGameDuration || 0;
      params.append('averageGameDuration', averageGameDuration.toString());
      const longestWinStreak = currentUser?.longestWinStreak || session.user?.longestWinStreak || 0;
      params.append('longestWinStreak', longestWinStreak.toString());
      const currentWinStreak = currentUser?.currentWinStreak || session.user?.currentWinStreak || 0;
      params.append('currentWinStreak', currentWinStreak.toString());
    }
    
    router.push(`/join?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Top Right Corner - Auth Section */}
      <div className="absolute top-6 right-6 flex flex-col gap-3 z-30">
        {status === 'loading' ? (
          <div className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white/70 border border-white/20 rounded-lg font-medium">
            Loading...
          </div>
        ) : session ? (
          <div className="flex flex-col gap-3">
            {/* Profile Button */}
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center gap-5 text-white/90 text-lg bg-white/10 backdrop-blur-sm px-8 py-6 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200 cursor-pointer min-w-[280px]"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-3xl">
                {(currentUser?.image || session.user?.image) ? (
                  <img src={currentUser?.image || session.user.image} alt="Avatar" className="w-16 h-16 rounded-full" />
                ) : (
                  <span>⚖️</span>
                )}
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-xl">{currentUser?.username || session.user?.username || session.user?.name}</div>
                <div className="text-base text-white/70">
                  Rating: <span className="text-yellow-300 font-bold text-xl">
                    {isLoadingUser ? (
                      <LoadingSkeleton className="h-6 w-16 inline-block" />
                    ) : (
                      currentUser?.rating || session.user?.rating || 1000
                    )}
                  </span>
                </div>
              </div>
            </button>
            
            {/* Sign Out Button */}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-5 py-2.5 bg-red-600/80 backdrop-blur-sm text-white border border-red-500/30 rounded-lg font-medium hover:bg-red-600 transition-all duration-200 cursor-pointer"
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
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-lg w-full border border-white/30">
          
          {/* Title */}
          <h1 className="text-5xl font-black text-center mb-10 bg-gradient-to-r from-slate-800 to-blue-800 bg-clip-text text-transparent">
            DISPUTED
          </h1>

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
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="w-20 h-20 bg-gradient-to-br from-red-100 to-indigo-100 rounded-full flex items-center justify-center text-3xl hover:scale-110 transition-all duration-200 shadow-lg cursor-pointer border-3 border-white/40"
              >
                {selectedAvatar}
              </button>
              
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
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all duration-150 cursor-pointer border-2 ${
                          selectedAvatar === avatar 
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

          {/* Game Action Buttons */}
          <div className="space-y-4">
            <button 
              onClick={handleCreateGame}
              disabled={isCreatingGame}
              className={`w-full py-4 text-xl font-bold rounded-xl transition-all duration-200 shadow-lg cursor-pointer transform ${
                isCreatingGame 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isCreatingGame ? 'CREATING...' : 'CREATE GAME'}
            </button>
            
            <button 
              onClick={handleJoinGame}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
            >
              JOIN GAME
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
