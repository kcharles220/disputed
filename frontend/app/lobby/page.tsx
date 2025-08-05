'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { socketService, GameRoom, Player } from '../services/socketService';
import { useTranslation } from 'react-i18next';

function GameLobbyInner() {
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
  const [flipped, setFlipped] = useState(false);
  const { t, i18n } = useTranslation('common');

  useEffect(() => {
    const roomId = searchParams?.get('room');

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
        } else { console.log('Socket already connected:', socketService.getSocket()?.id); }

        // Listen for gameStateUpdate and update room state
        socketService.onGameStateUpdate((gameState) => {
          console.log('Received gameStateUpdate:', gameState);
          setRoom(gameState);
          // Use socketId to determine current player
          const socketId = socketService.getSocket()?.id;
          const player = gameState.players.find(p => p.socketId === socketId);
          setCurrentPlayer(player || null);
          if (player) {
            setIsReady(player.ready);
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
          // Use socketId to determine current player
          const socketId = socketService.getSocket()?.id;
          const player = roomInfo.players.find(p => p.socketId === socketId);
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
      const newReadyState = !currentPlayer?.ready;
      console.log('Toggling ready for room:', room.roomId, 'Sending ready:', newReadyState);
      socketService.toggleReady(room.roomId, newReadyState);
    }
  };

  const handleLeaveRoom = () => {
    socketService.disconnect();
    router.push('/');
  };

  const startGame = () => {
    /* if (room && room.gameState === 'waiting') {
       socketService.proceed(room.roomId);
     }*/
  };

  const startCoinFlip = () => {
    setShowCoinFlip(true);
    setFlipAnimation(true);
    setCoinResult(null);
    // Simulate coin flip after 2 seconds
    setTimeout(() => {
      const result = currentPlayer?.currentRole === 'prosecutor' ? 'red' : 'blue';
      setCoinResult(result);
      setFlipAnimation(false);
      // Hide coin flip after showing result for 3 seconds
      setTimeout(() => {
        const gameUrl = room ? `/game/${room.roomId}` : '/game';
        console.log('Redirecting to URL:', gameUrl);

        router.push(gameUrl);
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

  // Show preparing message if game is starting
  if (room.gameState === 'starting-game') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Animated robot */}
          <div className="flex flex-col items-center">
            <div className="animate-bounce-slow">
              <span className="text-7xl drop-shadow-lg">🤖</span>
            </div>
            {/* Animated text */}
            <div className="text-white text-2xl font-bold flex items-center gap-3">
              <span className="animate-fade-in">{t("generating_random_case")}</span>
            </div>
            {/* Animated gears */}
            <div className="flex gap-2 mt-2">
              <span className="inline-block animate-spin-slow text-indigo-300 text-2xl">⚙️</span>
              <span className="inline-block animate-spin-reverse text-purple-300 text-xl">⚙️</span>
              <span className="inline-block animate-spin-slow text-blue-300 text-lg">⚙️</span>
            </div>
          </div>

        </div>
        {/* Custom keyframes */}
        <style jsx>{`
          @keyframes bounce-slow {
        0%, 100% { transform: translateY(0);}
        50% { transform: translateY(-24px);}
          }
          .animate-bounce-slow {
        animation: bounce-slow 2s infinite;
          }
          @keyframes spin-slow {
        0% { transform: rotate(0deg);}
        100% { transform: rotate(360deg);}
          }
          .animate-spin-slow {
        animation: spin-slow 3s linear infinite;
          }
          @keyframes spin-reverse {
        0% { transform: rotate(0deg);}
        100% { transform: rotate(-360deg);}
          }
          .animate-spin-reverse {
        animation: spin-reverse 4s linear infinite;
          }
          @keyframes fade-in {
        0% { opacity: 0;}
        100% { opacity: 1;}
          }
          .animate-fade-in {
        animation: fade-in 1.2s ease-in;
          }
        `}</style>
      </div>
    );
  }

  // Start coin flip automatically if gameState is 'ready-to-start'
  if (room.gameState === 'ready-to-start' && !flipped) {
    setFlipped(true);
    startCoinFlip();
  }

  // Always display current player on the left and opponent on the right
  let leftPlayer: Player | null = null;
  let rightPlayer: Player | null = null;
  if (currentPlayer) {
    leftPlayer = room.players.find(p => p.position === 'left') || null;
    rightPlayer = room.players.find(p => p.position === 'right') || null;
  } else if (room.players.length > 0) {
    leftPlayer = room.players[0];
    rightPlayer = room.players[1] || null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 relative overflow-hidden">
      {/* Subtle intellectual background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1500"></div>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">

        {/* Room title and status */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-indigo-300 bg-clip-text mb-2 drop-shadow-lg">
            {room.players.length < 2 ? `⚖️ ${t("waiting_for_opponent")} ⚖️` : `🏛️ ${t("debate_chamber")} 🏛️`}
          </h1>
          {room.players.length < 2 ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-blue-400/70 rounded-full animate-pulse drop-shadow-md"></div>
              <div className="w-3 h-3 bg-purple-400/70 rounded-full animate-pulse delay-500 drop-shadow-md"></div>
              <div className="w-3 h-3 bg-indigo-400/70 rounded-full animate-pulse delay-1000 drop-shadow-md"></div>
            </div>
          ) : (
            <div className="text-lg text-blue-200 font-medium">
              💭 {t("prepare_your_arguments")}
            </div>
          )}
        </div>

        {/* Players section */}
        <div className="flex items-end justify-center gap-48 relative p-4">
          {/* Left: Current Player */}
          <div className="text-center flex-1 flex flex-col items-center">
            <div className="relative">
              <div className="w-28 h-28 bg-gradient-to-br from-blue-500/30 to-indigo-600/30 backdrop-blur-sm rounded-full flex items-center justify-center text-5xl shadow-2xl border-2 border-blue-300/40 mb-4 mx-auto">
          {leftPlayer?.avatar || '⚖️'}
              </div>
            </div>
            <h3 className="text-xl font-bold text-blue-100 drop-shadow-sm">{leftPlayer?.username || 'You'}</h3>
            <div className="mt-2">
              <div className={`w-40 mx-auto px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border shadow-lg transition-colors duration-200 ${leftPlayer?.ready ? 'bg-green-500/70 text-white border-green-300/50' : 'bg-blue-500/70 text-white border-blue-300/50'
          }`}>
          <div className="text-center">
            {leftPlayer?.ready ? `✓ ${t("ready")}` : `📝 ${t("preparing")}`}
          </div>
              </div>
            </div>
          </div>

          {/* VS text */}
          <div className="absolute left-1/2 transform -translate-x-1/2 mb-16">
            <div className="text-6xl font-bold text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text drop-shadow-lg">
              VS
            </div>
          </div>

          {/* Right: Opponent */}
          <div className="text-center flex-1 flex flex-col items-center">
            {rightPlayer ? (
              <>
          <div className="relative">
            <div className="w-28 h-28 bg-gradient-to-br from-purple-500/30 to-violet-600/30 backdrop-blur-sm rounded-full flex items-center justify-center text-5xl shadow-2xl border-2 border-purple-300/40 mb-4 mx-auto">
              {rightPlayer.avatar}
            </div>
          </div>
          <h3 className="text-xl font-bold text-purple-100 drop-shadow-sm">{rightPlayer.username}</h3>
          <div className="mt-2">
            <div className={`w-40 mx-auto px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border shadow-lg transition-colors duration-200 ${rightPlayer.ready ? 'bg-green-500/70 text-white border-green-300/50' : 'bg-purple-500/70 text-white border-purple-300/50'
              }`}>
              <div className="text-center">
                {rightPlayer.ready ? `✓ ${t("ready")}` : `📝 ${t("preparing")}`}
              </div>
            </div>
          </div>
              </>
            ) : (
              <>
          <div className="relative">
            <div className="w-28 h-28 bg-gradient-to-br from-gray-500/30 to-gray-700/30 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border-2 border-gray-400/40 mb-4 mx-auto">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-purple-300 rounded-full animate-pulse delay-300"></div>
                <div className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse delay-600"></div>
              </div>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-200 drop-shadow-sm">{t("seeking_debater")}</h3>
          <p className="text-blue-200 text-sm font-medium">{t("share_code")}</p>
              </>
            )}
          </div>
        </div>

        {/* Game info and controls */}
        <div className="mt-16 text-center">
          <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-blue-300/20">

            <p className="text-blue-200 mb-4 font-medium">{t("debate_chamber_code")}:</p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-indigo-900/60 backdrop-blur-sm rounded-lg px-6 py-3 font-mono text-xl font-bold text-blue-200 border border-indigo-400/30 shadow-lg">
                {room.roomId}
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    const shareableLink = `${window.location.origin}/lobby/${room.roomId}`;
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
                  className="p-3 bg-blue-600/70 hover:bg-blue-500/70 text-white backdrop-blur-sm rounded-lg transition-all duration-200 cursor-pointer shadow-lg group border border-blue-400/40 transform hover:scale-105"
                  title="Copy debate chamber link"
                >
                  <svg
                    width="24"
                    height="24"
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
                    <div className="bg-green-600/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap relative animate-pulse border border-green-400/30">
                      ✓ Copied chamber link!
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
                className="px-8 py-4 bg-red-600/70 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-red-500/70 transition-all duration-200 cursor-pointer shadow-lg border border-red-400/40 transform hover:scale-105"
              >
                🚪 {t("leave_chamber")}
              </button>
              <div className="w-48">
                <button
                  onClick={handleToggleReady}
                  className={`w-full px-8 py-4 rounded-lg font-medium transition-all duration-200 cursor-pointer shadow-lg backdrop-blur-sm border transform hover:scale-105 ${isReady
                    ? 'bg-blue-600/70 text-white hover:bg-blue-500/70 border-blue-400/40'
                    : 'bg-green-600/70 text-white hover:bg-green-500/70 border-green-400/40'
                    }`}
                >
                  <div className="text-center">
                    {isReady ? `📝 ${t("revise_arguments")}` : `✓ ${t("ready_to_debate")}`}
                  </div>
                </button>
              </div>


            </div>
            {/*
            {room.players.length === 2 && room.players.every(p => p.ready) && !showCoinFlip && (
              <div className="mt-6 p-6 bg-purple-600/20 backdrop-blur-sm border border-purple-400/30 rounded-lg">
                <p className="text-purple-200 font-medium mb-4 text-lg">🎭 Both debaters are ready!</p>
                <button
                  onClick={startGame}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600/70 to-purple-600/70 backdrop-blur-sm text-white rounded-lg font-medium hover:from-indigo-500/70 hover:to-purple-500/70 transition-all duration-200 cursor-pointer shadow-lg transform hover:scale-105 border border-indigo-400/30 text-lg"
                >
                  🎯 Begin Philosophical Duel
                </button>
              </div>
            )}
            */}
          </div>
        </div>

      </div>

      {/* Coin Flip Overlay */}
      {showCoinFlip && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg flex items-center justify-center z-50">
          {/* Background effects for the modal */}
          <div className="absolute inset-0">
            <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="relative bg-black/40 backdrop-blur-xl rounded-3xl shadow-2xl p-12 max-w-lg w-full border border-blue-300/30 text-center">
            <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-indigo-300 bg-clip-text mb-2 drop-shadow-lg">
              ⚖️ {t("role_assignment")} ⚖️
            </h2>
            <p className="text-blue-200 mb-10 font-medium">{t("scales_of_justice")}</p>

            {/* Coin Animation */}
            <div className="flex justify-center mb-10">
              <div className="relative">
                <div
                  className={`w-40 h-40 rounded-full flex items-center justify-center text-6xl font-bold transition-all duration-500 shadow-2xl ${flipAnimation ? 'animate-spin' : ''
                    } ${coinResult === 'red' ? 'bg-gradient-to-br from-red-500/80 to-red-700/80 text-white border-4 border-red-300/50' :
                      coinResult === 'blue' ? 'bg-gradient-to-br from-blue-500/80 to-blue-700/80 text-white border-4 border-blue-300/50' :
                        'bg-gradient-to-br from-indigo-500/60 to-purple-600/60 text-blue-100 border-4 border-indigo-300/50'
                    } backdrop-blur-sm`}
                  style={{
                    animationDuration: flipAnimation ? '0.1s' : '0.5s'
                  }}
                >
                  {flipAnimation ? '⚖️' : coinResult === 'red' ? '⚔️' : coinResult === 'blue' ? '🛡️' : '⚖️'}
                </div>
                {/* Glow effect */}
                <div className={`absolute inset-0 rounded-full blur-xl ${coinResult === 'red' ? 'bg-red-500/30' :
                  coinResult === 'blue' ? 'bg-blue-500/30' :
                    'bg-indigo-500/20'
                  } animate-pulse`}></div>
              </div>
            </div>

            {/* Status Text */}
            <div className="text-lg">
              {flipAnimation ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-blue-200 font-medium">{t("consulting_the_scales")}</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-blue-400/70 rounded-full animate-pulse"></div>
                    <div className="w-3 h-3 bg-purple-400/70 rounded-full animate-pulse delay-300"></div>
                    <div className="w-3 h-3 bg-indigo-400/70 rounded-full animate-pulse delay-600"></div>
                  </div>
                </div>
              ) : coinResult === 'red' ? (
                <div className="space-y-4">
                  <p className="text-2xl font-bold text-transparent bg-gradient-to-r from-red-300 to-red-500 bg-clip-text drop-shadow-lg">
                    ⚔️ {t("you_are_prosecutor")} ⚔️
                  </p>
                  <p className="text-blue-200 font-medium">{t("prosecutor_role")}</p>
                  <div className="bg-red-500/20 backdrop-blur-sm border border-red-300/30 rounded-lg p-4 mt-4">
                    <p className="text-red-200 text-sm">{t("prosecutor_mission")}</p>
                  </div>
                </div>
              ) : coinResult === 'blue' ? (
                <div className="space-y-4">
                  <p className="text-2xl font-bold text-transparent bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text drop-shadow-lg">
                    🛡️ {t("you_are_defender")} 🛡️
                  </p>
                  <p className="text-blue-200 font-medium">{t("defender_role")}</p>
                  <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-300/30 rounded-lg p-4 mt-4">
                    <p className="text-blue-200 text-sm">{t("defender_mission")}</p>
                  </div>
                </div>
              ) : null}
            </div>

            {coinResult && (
              <div className="mt-8 p-4 bg-indigo-500/20 backdrop-blur-sm border border-indigo-300/30 rounded-lg">
                <p className="text-indigo-200 font-medium">⚖️ {t("scales_spoken")} ⚖️</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GameLobby() {
  const { t } = useTranslation('common');

  return (
    <Suspense fallback={<div>{t('loading')}</div>}>
      <GameLobbyInner />
    </Suspense>
  );
}
