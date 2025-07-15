'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { socketService, PlayerData } from '../services/socketService';

export default function JoinGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams.get('room');
  const nameFromUrl = searchParams.get('name');
  const avatarFromUrl = searchParams.get('avatar');
  
  const [roomId, setRoomId] = useState(roomIdFromUrl?.toUpperCase() || '');
  const [playerName, setPlayerName] = useState(nameFromUrl || '');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarFromUrl || '⚖️');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [placeholderName, setPlaceholderName] = useState('');

  const avatarOptions = ['⚖️', '👨‍💼', '👩‍💼', '👨‍⚖️', '👩‍⚖️', '🎭', '⚔️', '🏛️'];
  const guestNameSuggestions = [
    'LegalEagle2024', 'CourtCrusher', 'LawyerLegend', 'JusticeWarrior', 
    'ArgumentAce', 'DebateDefender', 'CaseCracker', 'VerdictVanguard'
  ];

  useEffect(() => {
    setIsClient(true);
    // Only set a random placeholder if no name was passed from the main page
    if (!nameFromUrl) {
      setPlaceholderName(guestNameSuggestions[Math.floor(Math.random() * guestNameSuggestions.length)]);
    } else {
      setPlaceholderName(nameFromUrl);
    }
  }, [nameFromUrl]);

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

      const playerData: PlayerData = {
        name: playerName.trim() || placeholderName,
        avatar: selectedAvatar
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
          onClick={() => {
            const name = playerName.trim() || placeholderName;
            router.push(`/?name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(selectedAvatar)}`);
          }}
          className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg font-medium hover:bg-white/20 transition-all duration-200 cursor-pointer"
        >
          ← Back to Home
        </button>
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
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center text-3xl hover:scale-110 transition-all duration-200 shadow-lg cursor-pointer border-3 border-white/40"
              >
                {selectedAvatar}
              </button>
              
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
                className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-all duration-200 bg-white shadow-sm placeholder-gray-400 text-black"
              />
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
