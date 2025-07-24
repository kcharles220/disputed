'use client';

import { useEffect, useState } from 'react';
import { GameRoom, Player, socketService } from '../../../services/socketService';
import { set } from 'zod';



interface RoundCompleteModalProps {
    showRoundCompleteModal: boolean;
    setShowRoundCompleteModal: (show: boolean) => void;
    gameState: GameRoom;
    currentPlayer: Player;
    leftPlayer: Player | null;
    rightPlayer: Player | null;
    setShowGameCompleteModal: (show: boolean) => void;
}

export default function RoundCompleteModal({
    gameState,
    currentPlayer,
    leftPlayer,
    rightPlayer,
    showRoundCompleteModal,
    setShowRoundCompleteModal,
    setShowGameCompleteModal
}: RoundCompleteModalProps) {
    // Placeholder definitions for missing variables and functions
    const nextRoundAutoStartTime = 30;
    const formatTime = (t: any) => t;
    const [seen, setSeen] = useState(false);

    const toggleReady = () => {
        if (gameState) {
            const newReadyState = !currentPlayer?.ready;
            console.log('Toggling ready for room:', gameState.roomId, 'Sending ready:', newReadyState);
            socketService.toggleReady(gameState.roomId, newReadyState);
        }
    };
    const handleProceedToGameComplete = () => {
        setSeen(true)
        setShowGameCompleteModal(true);

        setShowRoundCompleteModal(false);
    };

    const [winner, setWinner] = useState<Player | null>(null);
    const otherPlayer = gameState.players.find(player => player.id !== currentPlayer.id) || null;
    const round = gameState.roundData.find(r => r.number === gameState.round - 1);
    const currentRoundIndex = gameState.round - 1;
    const currentPlayerScore = currentPlayer.score;
    const otherPlayerScore = otherPlayer?.score || 0;
    useEffect(() => {
        if (currentPlayerScore > otherPlayerScore) {
            setWinner(currentPlayer);
        } else {
            setWinner(otherPlayer);
        }
    }, [currentPlayerScore, otherPlayerScore, currentPlayer, otherPlayer]);

    if (seen === true) {
        return null;
    }
    if (gameState.gameState !== 'round-over' && gameState.gameState !== 'game-over' && gameState.gameState !== 'round-reading' && gameState.gameState !== 'tiebreaker' && seen === false) {
        return null;
    }
    if (!gameState) {
        return null;
    }
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
            {/* Background effects matching game vibe */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-red-500/15 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-2/3 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl animate-pulse delay-1500"></div>
            </div>

            <div className="relative bg-gradient-to-br from-white/20 via-white/10 to-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-5xl w-full border border-white/30 max-h-[90vh] overflow-y-auto">
                {/* Decorative elements */}
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-purple-500/10 rounded-full blur-lg"></div>

                {/* Content */}
                <div className="relative z-10">

                    {gameState.gameState === 'round-over' ? (
                        <div className="text-center flex flex-col items-center justify-center py-12 animate-fade-in">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-violet-500/30 rounded-full blur-2xl animate-pulse"></div>
                                <span className="relative text-5xl animate-spin-slow">🤖</span>
                            </div>
                            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-300 via-purple-400 to-violet-400 bg-clip-text text-transparent drop-shadow-lg animate-fade-in">
                                AI is Analyzing the Arguments
                            </h2>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <span className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce"></span>
                                <span className="w-3 h-3 bg-purple-400 rounded-full animate-bounce delay-150"></span>
                                <span className="w-3 h-3 bg-violet-400 rounded-full animate-bounce delay-300"></span>
                            </div>
                            <style jsx>{`
                                .animate-spin-slow {
                                    animation: spin 2.5s linear infinite;
                                }
                                @keyframes spin {
                                    100% { transform: rotate(360deg); }
                                }
                                .animate-fade-in {
                                    animation: fadeIn 1s ease;
                                }
                                @keyframes fadeIn {
                                    from { opacity: 0; transform: translateY(20px);}
                                    to { opacity: 1; transform: translateY(0);}
                                }
                            `}</style>
                        </div>
                    ) : (

                        <div>

                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-sm rounded-full mb-4 border border-yellow-400/30">
                                    <span className="text-4xl">
                                        {winner?.lastRole === 'prosecutor' ? '🔥' : '🛡️'}
                                    </span>
                                </div>
                                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
                                    Round {currentRoundIndex} Complete!
                                </h1>
                                <h2 className={`text-3xl font-bold mb-4 ${winner?.lastRole === 'prosecutor' ? 'text-red-300' : 'text-blue-300'
                                    }`}>
                                    {winner?.lastRole === 'prosecutor' ? 'Prosecutor' : 'Defender'} Wins!
                                </h2>
                                {/* Show role switch message if applicable */}
                                {currentRoundIndex === 1 && (
                                    <div className="relative overflow-hidden rounded-xl p-4 mt-4">
                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-yellow-400/10 to-orange-500/15 backdrop-blur-sm border border-yellow-400/30 shadow-lg"></div>
                                        <div className="relative z-10 text-yellow-300 font-semibold text-lg">
                                            🔄 Roles have been switched!
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* AI Analysis Section */}
                            <div className="relative overflow-hidden rounded-2xl p-6 mb-8">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-violet-900/40 backdrop-blur-sm border border-indigo-500/40 shadow-lg rounded-2xl"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-cyan-400/50">
                                            <span className="text-xl">🤖</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white">AI Verdict</h3>
                                    </div>
                                    <p className="text-white/95 mb-4 leading-relaxed">
                                        {round?.analysis || 'AI analysis of the arguments presented in this round.'}
                                    </p>
                                    <div className="text-sm text-cyan-300 mb-6">
                                        AI analyzed 3 exchanges (6 total arguments) to determine the round winner.
                                    </div>

                                    {/* Score Display */}
                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Left Player */}
                                        {leftPlayer && (
                                            <div className="relative overflow-hidden rounded-xl p-6 text-center">
                                                <div className={`absolute inset-0 bg-gradient-to-br ${leftPlayer.lastRole === 'prosecutor'
                                                    ? 'from-red-500/25 via-orange-500/20 to-red-600/25'
                                                    : 'from-blue-500/25 via-cyan-500/20 to-blue-600/25'
                                                    } backdrop-blur-sm border ${leftPlayer.lastRole === 'prosecutor'
                                                        ? 'border-red-400/40'
                                                        : 'border-blue-400/40'
                                                    } shadow-lg rounded-xl`}></div>
                                                <div className="relative z-10">
                                                    <div className={`w-12 h-12 bg-gradient-to-br ${leftPlayer.lastRole === 'prosecutor'
                                                        ? 'from-red-500/40 to-orange-500/40'
                                                        : 'from-blue-500/40 to-cyan-500/40'
                                                        } backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border ${leftPlayer.lastRole === 'prosecutor'
                                                            ? 'border-red-400/60'
                                                            : 'border-blue-400/60'
                                                        }`}>
                                                        <span className="text-xl">
                                                            {leftPlayer.lastRole === 'prosecutor' ? '🔥' : '🛡️'}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-white mb-2">
                                                        {leftPlayer.lastRole === 'prosecutor' ? 'Prosecutor' : 'Defender'} Score
                                                    </h4>
                                                    <span className={`text-3xl font-bold ${leftPlayer.lastRole === 'prosecutor' ? 'text-red-300' : 'text-blue-300'
                                                        }`}>
                                                        {leftPlayer.lastRole === 'prosecutor' ?
                                                            round?.prosecutorScore
                                                            :
                                                            round?.defenderScore
                                                        }
                                                    </span>
                                                    <div className="mt-2 text-white/80 text-lg">{leftPlayer.username}</div>
                                                </div>
                                            </div>
                                        )}
                                        {/* Right Player */}
                                        {rightPlayer && (
                                            <div className="relative overflow-hidden rounded-xl p-6 text-center">
                                                <div className={`absolute inset-0 bg-gradient-to-br ${rightPlayer.lastRole === 'prosecutor'
                                                    ? 'from-red-500/25 via-orange-500/20 to-red-600/25'
                                                    : 'from-blue-500/25 via-cyan-500/20 to-blue-600/25'
                                                    } backdrop-blur-sm border ${rightPlayer.lastRole === 'prosecutor'
                                                        ? 'border-red-400/40'
                                                        : 'border-blue-400/40'
                                                    } shadow-lg rounded-xl`}></div>
                                                <div className="relative z-10">
                                                    <div className={`w-12 h-12 bg-gradient-to-br ${rightPlayer.lastRole === 'prosecutor'
                                                        ? 'from-red-500/40 to-orange-500/40'
                                                        : 'from-blue-500/40 to-cyan-500/40'
                                                        } backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border ${rightPlayer.lastRole === 'prosecutor'
                                                            ? 'border-red-400/60'
                                                            : 'border-blue-400/60'
                                                        }`}>
                                                        <span className="text-xl">
                                                            {rightPlayer.lastRole === 'prosecutor' ? '🔥' : '🛡️'}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-white mb-2">
                                                        {rightPlayer.lastRole === 'prosecutor' ? 'Prosecutor' : 'Defender'} Score
                                                    </h4>
                                                    <span className={`text-3xl font-bold ${rightPlayer.lastRole === 'prosecutor' ? 'text-red-300' : 'text-blue-300'
                                                        }`}>
                                                        {rightPlayer.lastRole === 'prosecutor' ?
                                                            round?.prosecutorScore
                                                            :
                                                            round?.defenderScore
                                                        }
                                                    </span>
                                                    <div className="mt-2 text-white/80 text-lg">{rightPlayer.username}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Next Round Ready Check - only show if not final round and if game will continue */}
                            {(() => {


                                // If game has ended (server sent game-over event), always show "View Final Results"
                                if (gameState.gameState === 'game-over') {
                                    return (
                                        <div className="text-center">
                                            <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-sm rounded-full mx-auto mb-6 flex items-center justify-center border border-yellow-400/30">
                                                <span className="text-4xl">🏆</span>
                                            </div>
                                            <p className="text-white/80 mb-6 text-lg">
                                                The battle has concluded! Review the final analysis above.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    handleProceedToGameComplete();
                                                }}
                                                className="relative overflow-hidden px-8 py-4 font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg text-lg border border-yellow-400/50"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/80 to-orange-600/80 backdrop-blur-sm"></div>
                                                <span className="relative z-10 text-white">🏆 View Final Results</span>
                                            </button>
                                        </div>
                                    );
                                }




                                if (gameState.gameState === 'round-over' || gameState.gameState === 'round-reading' || gameState.gameState === 'tiebreaker') {
                                    return (
                                        <>
                                            {/* Player Readiness Status */}
                                            <div className="grid grid-cols-2 gap-6 mb-8">
                                                {/* Current Player */}
                                                <div className={`relative overflow-hidden rounded-xl p-6 text-center transition-all duration-300 ${currentPlayer.ready ? 'transform scale-105 shadow-2xl' : 'opacity-90'
                                                    }`}>
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${currentPlayer.ready
                                                        ? 'from-emerald-500/30 via-green-500/20 to-teal-500/25'
                                                        : 'from-indigo-700/40 via-purple-600/30 to-violet-700/35'
                                                        } backdrop-blur-sm border-2 ${currentPlayer.ready
                                                            ? 'border-emerald-400/70 shadow-emerald-500/30'
                                                            : 'border-purple-500/50'
                                                        } shadow-lg rounded-xl`}></div>

                                                    <div className="relative z-10">
                                                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-all duration-300 ${currentPlayer.ready
                                                            ? 'bg-gradient-to-br from-emerald-500/40 to-green-500/40 backdrop-blur-sm border border-emerald-400/60 shadow-lg shadow-emerald-500/30'
                                                            : 'bg-gradient-to-br from-purple-600/40 to-violet-700/40 backdrop-blur-sm border border-purple-500/50'
                                                            }`}>
                                                            <span className="text-2xl">👤</span>
                                                        </div>
                                                        <h3 className="text-xl font-bold mb-3 text-white">
                                                            {currentPlayer?.username} (You)
                                                        </h3>

                                                        {/* Player Scores */}
                                                        <div className="bg-gradient-to-br from-black/50 to-black/30 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/30">
                                                            <div className="text-sm text-cyan-300 mb-1">Round Wins</div>
                                                            <div className="text-2xl font-bold text-white mb-1">
                                                                {currentPlayer.points}
                                                            </div>
                                                            <div className="text-xs text-cyan-200">
                                                                Total Score: {currentPlayerScore}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-center">
                                                            {currentPlayer.ready ? (
                                                                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                                                                    <span className="text-lg animate-pulse">✅</span>
                                                                    <span>Ready</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-purple-300 font-medium">
                                                                    <span className="text-lg">⏳</span>
                                                                    <span>Not Ready</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Other Player */}
                                                {otherPlayer && (
                                                    <div className={`relative overflow-hidden rounded-xl p-6 text-center transition-all duration-300 ${otherPlayer.ready ? 'transform scale-105 shadow-2xl' : 'opacity-90'
                                                        }`}>
                                                        <div className={`absolute inset-0 bg-gradient-to-br ${otherPlayer.ready
                                                            ? 'from-emerald-500/30 via-green-500/20 to-teal-500/25'
                                                            : 'from-indigo-700/40 via-purple-600/30 to-violet-700/35'
                                                            } backdrop-blur-sm border-2 ${otherPlayer.ready
                                                                ? 'border-emerald-400/70 shadow-emerald-500/30'
                                                                : 'border-purple-500/50'
                                                            } shadow-lg rounded-xl`}></div>

                                                        <div className="relative z-10">
                                                            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-all duration-300 ${otherPlayer.ready
                                                                ? 'bg-gradient-to-br from-emerald-500/40 to-green-500/40 backdrop-blur-sm border border-emerald-400/60 shadow-lg shadow-emerald-500/30'
                                                                : 'bg-gradient-to-br from-purple-600/40 to-violet-700/40 backdrop-blur-sm border border-purple-500/50'
                                                                }`}>
                                                                <span className="text-2xl">👤</span>
                                                            </div>
                                                            <h3 className="text-xl font-bold mb-3 text-white">
                                                                {otherPlayer.username}
                                                            </h3>

                                                            {/* Player Scores */}
                                                            <div className="bg-gradient-to-br from-black/50 to-black/30 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/30">
                                                                <div className="text-sm text-cyan-300 mb-1">Round Wins</div>
                                                                <div className="text-2xl font-bold text-white mb-1">
                                                                    {otherPlayer.points}
                                                                </div>
                                                                <div className="text-xs text-cyan-200">
                                                                    Total Score: {otherPlayerScore}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-center">
                                                                {otherPlayer.ready ? (
                                                                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                                                                        <span className="text-lg animate-pulse">✅</span>
                                                                        <span>Ready</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 text-purple-300 font-medium">
                                                                        <span className="text-lg">⏳</span>
                                                                        <span>Not Ready</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Auto-start timer */}
                                            <div className="relative overflow-hidden rounded-lg p-3 mb-6">
                                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-orange-500/20 backdrop-blur-sm border border-amber-400/40 shadow-md rounded-lg"></div>

                                                <div className="relative z-10 flex items-center justify-center gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500/30 to-orange-500/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-amber-400/50">
                                                        <span className="text-sm">⏰</span>
                                                    </div>
                                                    <span className="text-amber-200 font-medium">Auto-Start:</span>
                                                    <span className={`text-2xl font-bold ${nextRoundAutoStartTime <= 10 ? 'text-red-300 animate-pulse' : 'text-white'
                                                        }`}>
                                                        {formatTime(nextRoundAutoStartTime)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Ready Status Message */}


                                            {/* Ready Button */}
                                            <div className="text-center">
                                                <button
                                                    onClick={() => toggleReady()}
                                                    disabled={currentPlayer.ready}
                                                    className={`relative overflow-hidden px-8 py-4 font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-lg border-2 ${currentPlayer.ready
                                                        ? 'border-purple-500/50 cursor-not-allowed opacity-75'
                                                        : 'border-emerald-400/70 hover:shadow-emerald-500/40 hover:shadow-xl'
                                                        }`}
                                                >
                                                    <div className={`absolute inset-0 ${currentPlayer.ready
                                                        ? 'bg-gradient-to-r from-purple-600/60 to-violet-700/60'
                                                        : 'bg-gradient-to-r from-emerald-500/90 to-teal-600/90 hover:from-emerald-400/95 hover:to-teal-500/95'
                                                        } backdrop-blur-sm transition-all duration-300 rounded-xl`}></div>

                                                    <span className={`relative z-10 flex items-center justify-center gap-2 ${currentPlayer.ready ? 'text-purple-300' : 'text-white'
                                                        }`}>
                                                        <span className="text-xl">
                                                            {currentPlayer.ready ? '✅' : '⚔️'}
                                                        </span>
                                                        {currentPlayer.ready ? 'Ready! Waiting for opponent...' : 'Ready for Next Round'}
                                                    </span>
                                                </button>
                                            </div>
                                        </>
                                    );
                                } else {
                                    return (
                                        <div className="text-center">
                                            <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-sm rounded-full mx-auto mb-6 flex items-center justify-center border border-yellow-400/30">
                                                <span className="text-4xl">🏁</span>
                                            </div>
                                            <p className="text-white/80 mb-6 text-lg">
                                                {currentPlayer.points >= 2 || (otherPlayer?.points ?? 0) >= 2
                                                    ? 'The battle has concluded! Review the final analysis above.'
                                                    : 'All rounds complete! The battle has ended.'
                                                }
                                            </p>
                                            <button
                                                onClick={() => {
                                                    handleProceedToGameComplete();
                                                }}
                                                className="relative overflow-hidden px-8 py-4 font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg text-lg border border-yellow-400/50"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/80 to-orange-600/80 backdrop-blur-sm"></div>
                                                <span className="relative z-10 text-white">🏆 View Final Results</span>
                                            </button>
                                        </div>
                                    );
                                }

                            })()}
                        </div>)}
                </div>

            </div>

        </div>
    );
}