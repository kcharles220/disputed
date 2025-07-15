'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { socketService, PlayerData } from './services/socketService';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nameFromUrl = searchParams.get('name');
  const avatarFromUrl = searchParams.get('avatar');
  
  const [selectedAvatar, setSelectedAvatar] = useState(avatarFromUrl || '⚖️');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [playerName, setPlayerName] = useState(nameFromUrl || '');
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [error, setError] = useState('');

  const avatarOptions = ['⚖️', '👨‍💼', '👩‍💼', '👨‍⚖️', '👩‍⚖️', '🎭', '⚔️', '🏛️'];
  const guestNameSuggestions = [
    'LegalEagle2024', 'CourtCrusher', 'LawyerLegend', 'JusticeWarrior', 
    'ArgumentAce', 'DebateDefender', 'CaseCracker', 'VerdictVanguard'
  ];

  // Use useState with null initially to avoid hydration mismatch
  const [placeholderName, setPlaceholderName] = useState('');
  const [isClient, setIsClient] = useState(false);

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

  const handleCreateGame = async () => {
    setIsCreatingGame(true);
    setError('');

    try {
      // Connect to socket
      await socketService.connect();

      const playerData: PlayerData = {
        name: playerName.trim() || placeholderName,
        avatar: selectedAvatar
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
    const name = playerName.trim() || placeholderName;
    router.push(`/join?name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(selectedAvatar)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Top Right Corner - Login/Register */}
      <div className="absolute top-6 right-6 flex gap-3 z-30">
        <button
          onClick={() => setShowLogin(true)}
          className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg font-medium hover:bg-white/20 transition-all duration-200 cursor-pointer"
        >
          Login
        </button>
        <button
          onClick={() => setShowRegister(true)}
          className="px-5 py-2.5 bg-blue-600/80 backdrop-blur-sm text-white border border-blue-500/30 rounded-lg font-medium hover:bg-blue-600 transition-all duration-200 cursor-pointer"
        >
          Register
        </button>
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
              placeholder={isClient ? placeholderName : 'Loading...'}
              className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white shadow-sm placeholder-gray-400 text-black"
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

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-xl p-8 max-w-sm w-full border border-white/30 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Welcome Back</h2>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-all duration-200"
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-all duration-200"
              />
              <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 cursor-pointer transition-all duration-200">
                Sign In
              </button>
              <button
                onClick={() => setShowLogin(false)}
                className="w-full py-3 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 cursor-pointer transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-xl p-8 max-w-sm w-full border border-white/30 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Join the Arena</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-all duration-200"
              />
              <input
                type="email"
                placeholder="Email address"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-all duration-200"
              />
              <input
                type="password"
                placeholder="Create password"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-all duration-200"
              />
              <input
                type="password"
                placeholder="Confirm password"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-all duration-200"
              />
              <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 cursor-pointer transition-all duration-200">
                Create Account
              </button>
              <button
                onClick={() => setShowRegister(false)}
                className="w-full py-3 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 cursor-pointer transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
