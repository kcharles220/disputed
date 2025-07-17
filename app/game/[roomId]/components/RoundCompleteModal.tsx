'use client';

import { GameRoom, Player } from '../../../services/socketService';

interface GameState {
    gamePhase: 'case-reading' | 'arguing' | 'round-complete' | 'finished' | 'side-choice';
    currentRound: number;
    maxRounds: number;
    roundResult?: {
        round: number;
        winner: 'prosecutor' | 'defender';
        analysis: string;
        prosecutorScore: number;
        defenderScore: number;
        argumentScores?: { argumentId: string; score: number }[];
    };
}

interface RoundCompleteModalProps {
    gameState: GameState;
    room: GameRoom;
    currentPlayer: Player;
    isNextRoundReady: boolean;
    otherPlayerNextRoundReady: boolean;
    nextRoundAutoStartTime: number;
    showNextRoundReadyCheck: boolean;
    nextRoundMessage: string;
    handleNextRoundReady: () => void;
    handleProceedToGameComplete: (winner: 'prosecutor' | 'defender') => void;
    formatTime: (seconds: number) => string;
    formatScore: (score: number) => string;
    getPlayerRoundWins: (playerId: string) => number;
    getPlayerScore: (playerId: string) => number;
    getProsecutorRoundWins: () => number;
    getDefenderRoundWins: () => number;
    gameHasEnded: boolean;
}

export default function RoundCompleteModal({
    gameState,
    room,
    currentPlayer,
    isNextRoundReady,
    otherPlayerNextRoundReady,
    nextRoundAutoStartTime,
    showNextRoundReadyCheck,
    nextRoundMessage,
    handleNextRoundReady,
    handleProceedToGameComplete,
    formatTime,
    formatScore,
    getPlayerRoundWins,
    getPlayerScore,
    getProsecutorRoundWins,
    getDefenderRoundWins,
    gameHasEnded
}: RoundCompleteModalProps) {
    if (gameState.gamePhase !== 'round-complete' || !gameState.roundResult) {
        return null;
    }

    const otherPlayer = room?.players.find(p => p.id !== currentPlayer?.id);

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
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-sm rounded-full mb-4 border border-yellow-400/30">
                            <span className="text-4xl">
                                {gameState.roundResult.winner === 'prosecutor' ? '🔥' : '🛡️'}
                            </span>
                        </div>
                        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
                            Round {gameState.roundResult.round} Complete!
                        </h1>
                        <h2 className={`text-3xl font-bold mb-4 ${
                            gameState.roundResult.winner === 'prosecutor' ? 'text-red-300' : 'text-blue-300'
                        }`}>
                            {gameState.roundResult.winner === 'prosecutor' ? 'Prosecutor' : 'Defender'} Wins!
                        </h2>
                        {/* Show role switch message if applicable */}
                        {nextRoundMessage && (
                            <div className="relative overflow-hidden rounded-xl p-4 mt-4">
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-yellow-400/10 to-orange-500/15 backdrop-blur-sm border border-yellow-400/30 shadow-lg"></div>
                                <div className="relative z-10 text-yellow-300 font-semibold text-lg">
                                    🔄 {nextRoundMessage}
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
                            <p className="text-white/95 mb-4 leading-relaxed">{gameState.roundResult.analysis}</p>
                            <div className="text-sm text-cyan-300 mb-6">
                                AI analyzed 3 exchanges (6 total arguments) to determine the round winner.
                            </div>
                            
                            {/* Score Display */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="relative overflow-hidden rounded-xl p-6 text-center">
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/25 via-orange-500/20 to-red-600/25 backdrop-blur-sm border border-red-400/40 shadow-lg rounded-xl"></div>
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-gradient-to-br from-red-500/40 to-orange-500/40 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-red-400/60">
                                            <span className="text-xl">🔥</span>
                                        </div>
                                        <h4 className="font-bold text-white mb-2">Prosecutor Score</h4>
                                        <span className="text-3xl font-bold text-red-300">{gameState.roundResult.prosecutorScore}</span>
                                    </div>
                                </div>
                                <div className="relative overflow-hidden rounded-xl p-6 text-center">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/25 via-cyan-500/20 to-blue-600/25 backdrop-blur-sm border border-blue-400/40 shadow-lg rounded-xl"></div>
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/40 to-cyan-500/40 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-400/60">
                                            <span className="text-xl">🛡️</span>
                                        </div>
                                        <h4 className="font-bold text-white mb-2">Defender Score</h4>
                                        <span className="text-3xl font-bold text-blue-300">{gameState.roundResult.defenderScore}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                {/* Next Round Ready Check - only show if not final round and if game will continue */}
                {(() => {
                    const prosecutorWins = getProsecutorRoundWins();
                    const defenderWins = getDefenderRoundWins();
                    
                    // If game has ended (server sent game-end event), always show "View Final Results"
                    if (gameHasEnded) {
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
                                        const winner = prosecutorWins > defenderWins ? 'prosecutor' : 'defender';
                                        handleProceedToGameComplete(winner);
                                    }}
                                    className="relative overflow-hidden px-8 py-4 font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg text-lg border border-yellow-400/50"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/80 to-orange-600/80 backdrop-blur-sm"></div>
                                    <span className="relative z-10 text-white">🏆 View Final Results</span>
                                </button>
                            </div>
                        );
                    }
                    

                    const completedRound = gameState.roundResult.round;
                    const gameWillContinue = prosecutorWins < 2 && defenderWins < 2;
                    
                    if (gameWillContinue) {
                        return (
                            <>
                                {/* Player Readiness Status */}
                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    {/* Current Player */}
                                    <div className={`relative overflow-hidden rounded-xl p-6 text-center transition-all duration-300 ${
                                        isNextRoundReady ? 'transform scale-105 shadow-2xl' : 'opacity-90'
                                    }`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br ${
                                            isNextRoundReady 
                                                ? 'from-emerald-500/30 via-green-500/20 to-teal-500/25' 
                                                : 'from-indigo-700/40 via-purple-600/30 to-violet-700/35'
                                        } backdrop-blur-sm border-2 ${
                                            isNextRoundReady 
                                                ? 'border-emerald-400/70 shadow-emerald-500/30' 
                                                : 'border-purple-500/50'
                                        } shadow-lg rounded-xl`}></div>
                                        
                                        <div className="relative z-10">
                                            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-all duration-300 ${
                                                isNextRoundReady 
                                                    ? 'bg-gradient-to-br from-emerald-500/40 to-green-500/40 backdrop-blur-sm border border-emerald-400/60 shadow-lg shadow-emerald-500/30' 
                                                    : 'bg-gradient-to-br from-purple-600/40 to-violet-700/40 backdrop-blur-sm border border-purple-500/50'
                                            }`}>
                                                <span className="text-2xl">👤</span>
                                            </div>
                                            <h3 className="text-xl font-bold mb-3 text-white">
                                                {currentPlayer?.name} (You)
                                            </h3>
                                            
                                            {/* Player Scores */}
                                            <div className="bg-gradient-to-br from-black/50 to-black/30 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/30">
                                                <div className="text-sm text-cyan-300 mb-1">Round Wins</div>
                                                <div className="text-2xl font-bold text-white mb-1">
                                                    {getPlayerRoundWins(currentPlayer!.id)}
                                                </div>
                                                <div className="text-xs text-cyan-200">
                                                    Total Points: {formatScore(getPlayerScore(currentPlayer!.id))}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-center">
                                                {isNextRoundReady ? (
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
                                        <div className={`relative overflow-hidden rounded-xl p-6 text-center transition-all duration-300 ${
                                            otherPlayerNextRoundReady ? 'transform scale-105 shadow-2xl' : 'opacity-90'
                                        }`}>
                                            <div className={`absolute inset-0 bg-gradient-to-br ${
                                                otherPlayerNextRoundReady 
                                                    ? 'from-emerald-500/30 via-green-500/20 to-teal-500/25' 
                                                    : 'from-indigo-700/40 via-purple-600/30 to-violet-700/35'
                                            } backdrop-blur-sm border-2 ${
                                                otherPlayerNextRoundReady 
                                                    ? 'border-emerald-400/70 shadow-emerald-500/30' 
                                                    : 'border-purple-500/50'
                                            } shadow-lg rounded-xl`}></div>
                                            
                                            <div className="relative z-10">
                                                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-all duration-300 ${
                                                    otherPlayerNextRoundReady 
                                                        ? 'bg-gradient-to-br from-emerald-500/40 to-green-500/40 backdrop-blur-sm border border-emerald-400/60 shadow-lg shadow-emerald-500/30' 
                                                        : 'bg-gradient-to-br from-purple-600/40 to-violet-700/40 backdrop-blur-sm border border-purple-500/50'
                                                }`}>
                                                    <span className="text-2xl">👤</span>
                                                </div>
                                                <h3 className="text-xl font-bold mb-3 text-white">
                                                    {otherPlayer.name}
                                                </h3>
                                                
                                                {/* Player Scores */}
                                                <div className="bg-gradient-to-br from-black/50 to-black/30 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/30">
                                                    <div className="text-sm text-cyan-300 mb-1">Round Wins</div>
                                                    <div className="text-2xl font-bold text-white mb-1">
                                                        {getPlayerRoundWins(otherPlayer.id)}
                                                    </div>
                                                    <div className="text-xs text-cyan-200">
                                                        Total Points: {formatScore(getPlayerScore(otherPlayer.id))}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center justify-center">
                                                    {otherPlayerNextRoundReady ? (
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
                                        <span className={`text-2xl font-bold ${
                                            nextRoundAutoStartTime <= 10 ? 'text-red-300 animate-pulse' : 'text-white'
                                        }`}>
                                            {formatTime(nextRoundAutoStartTime)}
                                        </span>
                                    </div>
                                </div>

                                {/* Ready Status Message */}
                                

                                {/* Ready Button */}
                                <div className="text-center">
                                    <button
                                        onClick={() => handleNextRoundReady()}
                                        disabled={isNextRoundReady}
                                        className={`relative overflow-hidden px-8 py-4 font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-lg border-2 ${
                                            isNextRoundReady 
                                                ? 'border-purple-500/50 cursor-not-allowed opacity-75'
                                                : 'border-emerald-400/70 hover:shadow-emerald-500/40 hover:shadow-xl'
                                        }`}
                                    >
                                        <div className={`absolute inset-0 ${
                                            isNextRoundReady 
                                                ? 'bg-gradient-to-r from-purple-600/60 to-violet-700/60' 
                                                : 'bg-gradient-to-r from-emerald-500/90 to-teal-600/90 hover:from-emerald-400/95 hover:to-teal-500/95'
                                        } backdrop-blur-sm transition-all duration-300 rounded-xl`}></div>
                                        
                                        <span className={`relative z-10 flex items-center justify-center gap-2 ${
                                            isNextRoundReady ? 'text-purple-300' : 'text-white'
                                        }`}>
                                            <span className="text-xl">
                                                {isNextRoundReady ? '✅' : '⚔️'}
                                            </span>
                                            {isNextRoundReady ? 'Ready! Waiting for opponent...' : 'Ready for Next Round'}
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
                                    {prosecutorWins >= 2 || defenderWins >= 2 
                                        ? 'The battle has concluded! Review the final analysis above.' 
                                        : 'All rounds complete! The battle has ended.'
                                    }
                                </p>
                                <button
                                    onClick={() => {
                                        const winner = prosecutorWins > defenderWins ? 'prosecutor' : 'defender';
                                        handleProceedToGameComplete(winner);
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
                </div>
            </div>
        </div>
    );
}