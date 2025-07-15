'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { socketService, GameRoom, Player } from '../services/socketService';

export default function GameLobby() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [coinResult, setCoinResult] = useState<'red' | 'blue' | null>(null);
  const [flipAnimation, setFlipAnimation] = useState(false);

  useEffect(() => {
    const roomId = searchParams.get('room');
    
    if (!roomId) {
      router.push('/');
      return;
    }

    const initializeSocket = async () => {
      try {
        // Ensure we're connected to the socket
        if (!socketService.getSocket()?.connected) {
          console.log('Socket not connected, redirecting to join page...');
          router.push(`/join?room=${roomId}`);
          return;
        }

        // Set up socket listeners
        socketService.onRoomUpdated((updatedRoom) => {
          console.log('Room updated:', updatedRoom);
          console.log('Players ready status:', updatedRoom.players.map(p => ({ name: p.name, ready: p.ready })));
          setRoom(updatedRoom);
          // Find current player
          const player = updatedRoom.players.find(p => p.id === socketService.getSocket()?.id);
          setCurrentPlayer(player || null);
          if (player) {
            console.log('Setting current player ready state to:', player.ready);
            setIsReady(player.ready);
          }
        });

        socketService.onGameStarting((roomData) => {
          console.log('Game starting for room:', roomData.id);
          console.log('Players with roles:', roomData.players.map(p => ({ name: p.name, role: p.role })));
          
          // Find current player's role
          const currentPlayerInRoom = roomData.players.find(p => p.id === socketService.getSocket()?.id);
          const playerRole = currentPlayerInRoom?.role;
          
          if (playerRole) {
            // Start coin flip animation with server-assigned role and pass the room ID from the event
            startCoinFlipWithRole(playerRole, roomData.id);
          }
        });

        socketService.onJoinError((error) => {
          setError(error.message);
        });

        // Get initial room state
        try {
          console.log('Getting room info for:', roomId);
          const roomInfo = await socketService.getRoomInfo(roomId);
          console.log('Room info received:', roomInfo);
          setRoom(roomInfo);
          const player = roomInfo.players.find(p => p.id === socketService.getSocket()?.id);
          setCurrentPlayer(player || null);
          if (player) {
            setIsReady(player.ready);
          }
        } catch (err) {
          console.error('Failed to get room info:', err);
          // If we can't get room info, redirect to join page
          router.push(`/join?room=${roomId}`);
        }
      } catch (err) {
        console.error('Socket initialization error:', err);
        router.push(`/join?room=${roomId}`);
      }
    };

    initializeSocket();

    return () => {
      socketService.removeAllListeners();
    };
  }, [searchParams, router]);

  const handleToggleReady = () => {
    if (room) {
      console.log('Toggling ready for room:', room.id, 'Current ready state:', isReady);
      socketService.toggleReady(room.id);
    }
  };

  const handleLeaveRoom = () => {
    socketService.disconnect();
    router.push('/');
  };

  const startCoinFlip = () => {
    setShowCoinFlip(true);
    setFlipAnimation(true);
    setCoinResult(null);
    
    // Simulate coin flip after 2 seconds
    setTimeout(() => {
      const result = Math.random() < 0.5 ? 'red' : 'blue';
      setCoinResult(result);
      setFlipAnimation(false);
      
      // Hide coin flip after showing result for 3 seconds
      setTimeout(() => {
        setShowCoinFlip(false);
        // For now, don't redirect to game page since it doesn't exist yet
        console.log('Game would start now with role:', result);
      }, 3000);
    }, 2000);
  };

  const startCoinFlipWithRole = (role: 'attacker' | 'defender', roomIdParam?: string) => {
    console.log('Starting coin flip with role:', role, 'Current room:', room);
    
    // Use passed room ID or fall back to current room state
    const currentRoomId = roomIdParam || room?.id;
    console.log('Using room ID:', currentRoomId);
    
    if (!currentRoomId) {
      console.error('No room ID available for redirect');
      return;
    }
    
    setShowCoinFlip(true);
    setFlipAnimation(true);
    setCoinResult(null);
    
    // Simulate coin flip after 2 seconds
    setTimeout(() => {
      const result = role === 'attacker' ? 'red' : 'blue';
      setCoinResult(result);
      setFlipAnimation(false);
      
      // Hide coin flip and redirect to game after showing result for 3 seconds
      setTimeout(() => {
        setShowCoinFlip(false);
        console.log('Redirecting to game with role:', role);
        console.log('Using room ID:', currentRoomId);
        console.log('Type of currentRoomId:', typeof currentRoomId);
        console.log('Room ID is valid:', !!currentRoomId && currentRoomId !== 'undefined');
        
        // Store room ID in localStorage as backup
        if (currentRoomId && typeof window !== 'undefined') {
          localStorage.setItem('currentRoomId', currentRoomId);
          console.log('Stored room ID in localStorage:', currentRoomId);
        }
        
        const gameUrl = `/game/${currentRoomId}`;
        console.log('Redirecting to URL:', gameUrl);
        console.log('About to call router.push with:', gameUrl);
        router.push(gameUrl);
        console.log('router.push called');
      }, 3000);
    }, 2000);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-400 to-red-600">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-md w-full border border-white/30 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all duration-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-indigo-600">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  const otherPlayer = room.players.find(p => p.id !== currentPlayer?.id);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Blue left half */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-400 via-blue-600 to-blue-900"
        style={{
          clipPath: 'polygon(0 0, 37.5% 0, 32.5% 100%, 0 100%)'
        }}
      />
      
      {/* Red right half */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-red-400 via-red-500 to-red-900"
        style={{
          clipPath: 'polygon(67.5% 0, 100% 0, 100% 100%, 62.5% 100%)'
        }}
      />
      
      {/* Gray center section */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-400"
        style={{
          clipPath: 'polygon(37.5% 0, 67.5% 0, 62.5% 100%, 32.5% 100%)'
        }}
      />
      
      {/* Darker gray sides of center section */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-gray-400 to-gray-600"
        style={{
          clipPath: 'polygon(37.5% 0, 39% 0, 34% 100%, 32.5% 100%)'
        }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-gray-400 to-gray-600"
        style={{
          clipPath: 'polygon(66% 0, 67.5% 0, 62.5% 100%, 61% 100%)'
        }}
      />

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        
        {/* Room title and status */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 drop-shadow-lg">
            {room.players.length < 2 ? 'Waiting for Opponent' : 'Game Lobby'}
          </h1>
          {room.players.length < 2 ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-gray-700 rounded-full animate-ping drop-shadow-md"></div>
              <div className="w-3 h-3 bg-gray-700 rounded-full animate-ping delay-150 drop-shadow-md"></div>
              <div className="w-3 h-3 bg-gray-700 rounded-full animate-ping delay-300 drop-shadow-md"></div>
            </div>
          ) : (
            <div className="text-lg text-gray-600">
              Ready to battle? Click ready when you're prepared!
            </div>
          )}
        </div>

        {/* Players section */}
        <div className="flex items-end justify-center gap-16">
          
          {/* Current Player */}
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center text-4xl shadow-2xl border-4 border-white mb-4 mx-auto">
              {currentPlayer?.avatar || '⚖️'}
            </div>
            <h3 className="text-xl font-bold text-gray-800 drop-shadow-sm">{currentPlayer?.name || 'You'}</h3>
            <div className="mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isReady ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
              }`}>
                {isReady ? 'Ready' : 'Not Ready'}
              </span>
            </div>
          </div>

          {/* VS text */}
          <div className="text-center mb-16">
            <div className="text-6xl font-black text-gray-800 drop-shadow-lg opacity-90">
              VS
            </div>
          </div>

          {/* Opponent */}
          <div className="text-center">
            {otherPlayer ? (
              <>
                <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-pink-200 rounded-full flex items-center justify-center text-4xl shadow-2xl border-4 border-white mb-4 mx-auto">
                  {otherPlayer.avatar}
                </div>
                <h3 className="text-xl font-bold text-gray-800 drop-shadow-sm">{otherPlayer.name}</h3>
                <div className="mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    otherPlayer.ready ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                  }`}>
                    {otherPlayer.ready ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white mb-4 mx-auto">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 drop-shadow-sm">Waiting...</h3>
                <p className="text-gray-600 text-sm">Share room code below</p>
              </>
            )}
          </div>

        </div>

        {/* Game info and controls */}
        <div className="mt-16 text-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-white/50">
          
            <p className="text-gray-600 mb-4">Share this room code with your opponent:</p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-gray-100 rounded-lg px-4 py-2 font-mono text-lg font-bold text-gray-800">
                {room.id}
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    const shareableLink = `${window.location.origin}/lobby/${room.id}`;
                    navigator.clipboard.writeText(shareableLink).then(() => {
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }).catch(() => {
                      // Fallback for browsers that don't support clipboard API
                      const textArea = document.createElement('textarea');
                      textArea.value = shareableLink;
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textArea);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    });
                  }}
                  className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-all duration-200 cursor-pointer shadow-md group border border-gray-300"
                  title="Copy shareable link"
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="group-hover:scale-110 transition-transform duration-200"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </button>
                {linkCopied && (
                  <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap relative animate-pulse">
                      ✓ Copied link!
                      {/* Pointer arrow */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-green-600"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Ready button */}
            <div className="flex gap-4 justify-center">
              <button 
                onClick={handleLeaveRoom}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all duration-200 cursor-pointer shadow-lg"
              >
                Leave Room
              </button>
              <button 
                onClick={handleToggleReady}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 cursor-pointer shadow-lg ${
                  isReady 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isReady ? 'Not Ready' : 'Ready Up!'}
              </button>
              
              
            </div>
            
            {room.players.length === 2 && room.players.every(p => p.ready) && !showCoinFlip && (
              <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-800 font-medium mb-3">🎉 Both players are ready!</p>
                <button
                  onClick={startCoinFlip}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-bold hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 cursor-pointer shadow-lg transform hover:scale-105"
                >
                  🪙 Flip Coin to Start!
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Coin Flip Overlay */}
      {showCoinFlip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-12 max-w-md w-full border border-white/30 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Deciding Roles...</h2>
            
            {/* Coin Animation */}
            <div className="flex justify-center mb-8">
              <div 
                className={`w-32 h-32 rounded-full border-8 border-yellow-400 flex items-center justify-center text-4xl font-bold transition-all duration-500 ${
                  flipAnimation ? 'animate-spin' : ''
                } ${
                  coinResult === 'red' ? 'bg-gradient-to-br from-red-400 to-red-600 text-white' :
                  coinResult === 'blue' ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white' :
                  'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-800'
                }`}
                style={{
                  animationDuration: flipAnimation ? '0.1s' : '0.5s'
                }}
              >
                {flipAnimation ? '🪙' : coinResult === 'red' ? '⚔️' : coinResult === 'blue' ? '🛡️' : '🪙'}
              </div>
            </div>

            {/* Status Text */}
            <div className="text-lg text-gray-700">
              {flipAnimation ? (
                <div className="flex items-center justify-center gap-2">
                  <span>Flipping coin</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              ) : coinResult === 'red' ? (
                <div className="space-y-2">
                  <p className="text-xl font-bold text-red-600">🔥 You are the ATTACKER! 🔥</p>
                  <p className="text-sm text-gray-600">You'll start the legal battle and present your case first</p>
                </div>
              ) : coinResult === 'blue' ? (
                <div className="space-y-2">
                  <p className="text-xl font-bold text-blue-600">🛡️ You are the DEFENDER! 🛡️</p>
                  <p className="text-sm text-gray-600">You'll respond to attacks and protect your position</p>
                </div>
              ) : null}
            </div>

            {coinResult && (
              <div className="mt-6 text-sm text-gray-500">
                Role assigned! You can now start the legal battle.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
