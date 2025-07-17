'use client';

import { GameRoom, Player } from '../../../services/socketService';

interface GameState {
    gamePhase: 'case-reading' | 'arguing' | 'round-complete' | 'finished' | 'side-choice';
    currentRound: number;
    maxRounds: number;
    roundResult?: {
        round: number;
        winner: 'attacker' | 'defender';
        analysis: string;
        attackerScore: number;
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
    handleProceedToGameComplete: (winner: 'attacker' | 'defender') => void;
    formatTime: (seconds: number) => string;
    formatScore: (score: number) => string;
    getPlayerRoundWins: (playerId: string) => number;
    getPlayerScore: (playerId: string) => number;
    getAttackerRoundWins: () => number;
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
    getAttackerRoundWins,
    getDefenderRoundWins,
    gameHasEnded
}: RoundCompleteModalProps) {
    if (gameState.gamePhase !== 'round-complete' || !gameState.roundResult) {
        return null;
    }

    const otherPlayer = room?.players.find(p => p.id !== currentPlayer?.id);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 max-w-5xl w-full border border-gray-600 max-h-[90vh] overflow-y-auto">
                <div className="text-center mb-6">
                    <h1 className="text-4xl font-bold mb-2">
                        {gameState.roundResult.winner === 'attacker' ? '🔥' : '🛡️'} Round {gameState.roundResult.round} Complete!
                    </h1>
                    <h2 className={`text-3xl font-bold mb-4 ${gameState.roundResult.winner === 'attacker' ? 'text-red-400' : 'text-blue-400'}`}>
                        {gameState.roundResult.winner === 'attacker' ? 'Attacker' : 'Defender'} Wins!
                    </h2>
                    {/* Show role switch message if applicable */}
                    {nextRoundMessage && (
                        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mt-4">
                            <div className="text-yellow-400 font-bold text-lg">
                                🔄 {nextRoundMessage}
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-gray-700/50 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-bold text-yellow-400 mb-3">🤖 AI Analysis:</h3>
                    <p className="text-gray-200 mb-4">{gameState.roundResult.analysis}</p>
                    <div className="text-sm text-gray-400 mb-4">
                        AI analyzed 3 exchanges (6 total arguments) to determine the round winner.
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-red-900/30 rounded-lg p-4 text-center">
                            <h4 className="font-bold text-red-400 mb-2">🔥 Attacker Score</h4>
                            <span className="text-2xl font-bold text-white">{gameState.roundResult.attackerScore}</span>
                        </div>
                        <div className="bg-blue-900/30 rounded-lg p-4 text-center">
                            <h4 className="font-bold text-blue-400 mb-2">🛡️ Defender Score</h4>
                            <span className="text-2xl font-bold text-white">{gameState.roundResult.defenderScore}</span>
                        </div>
                    </div>
                </div>

                {/* Next Round Ready Check - only show if not final round and if game will continue */}
                {(() => {
                    const attackerWins = getAttackerRoundWins();
                    const defenderWins = getDefenderRoundWins();
                    
                    // If game has ended (server sent game-end event), always show "View Final Results"
                    if (gameHasEnded) {
                        return (
                            <div className="text-center">
                                <p className="text-gray-400 mb-6">
                                    The battle has concluded! Review the final analysis above.
                                </p>
                                <button
                                    onClick={() => {
                                        const winner = attackerWins > defenderWins ? 'attacker' : 'defender';
                                        handleProceedToGameComplete(winner);
                                    }}
                                    className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg text-lg"
                                >
                                    🏆 View Final Results
                                </button>
                            </div>
                        );
                    }
                    
                    // Game continues if nobody has 2+ wins AND the completed round is less than maxRounds
                    const completedRound = gameState.roundResult.round;
                    const gameWillContinue = attackerWins < 2 && defenderWins < 2 && completedRound < gameState.maxRounds;
                    
                    if (gameWillContinue) {
                        return (
                            <>
                                {/* Player Readiness Status */}
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    {/* Current Player */}
                                    <div className={`border-2 rounded-lg p-4 text-center transition-all duration-200 ${
                                        isNextRoundReady 
                                            ? 'bg-green-900/30 border-green-500' 
                                            : 'bg-gray-900/30 border-gray-500'
                                    }`}>
                                        <h3 className="text-xl font-bold mb-2 text-white">
                                            {currentPlayer?.name} (You)
                                        </h3>
                                        
                                        {/* Player Scores */}
                                        <div className="bg-black/20 rounded-lg p-3 mb-3">
                                            <div className="text-sm text-gray-400 mb-1">Round Wins</div>
                                            <div className="text-2xl font-bold text-white mb-1">
                                                {getPlayerRoundWins(currentPlayer!.id)}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Total Points: {formatScore(getPlayerScore(currentPlayer!.id))}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-center mb-2">
                                            {isNextRoundReady ? (
                                                <span className="text-green-400 font-bold">✅ Ready</span>
                                            ) : (
                                                <span className="text-gray-400 font-bold">⏳ Not Ready</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Other Player */}
                                    {otherPlayer && (
                                        <div className={`border-2 rounded-lg p-4 text-center transition-all duration-200 ${
                                            otherPlayerNextRoundReady 
                                                ? 'bg-green-900/30 border-green-500' 
                                                : 'bg-gray-900/30 border-gray-500'
                                        }`}>
                                            <h3 className="text-xl font-bold mb-2 text-white">
                                                {otherPlayer.name}
                                            </h3>
                                            
                                            {/* Player Scores */}
                                            <div className="bg-black/20 rounded-lg p-3 mb-3">
                                                <div className="text-sm text-gray-400 mb-1">Round Wins</div>
                                                <div className="text-2xl font-bold text-white mb-1">
                                                    {getPlayerRoundWins(otherPlayer.id)}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Total Points: {formatScore(getPlayerScore(otherPlayer.id))}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-center mb-2">
                                                {otherPlayerNextRoundReady ? (
                                                    <span className="text-green-400 font-bold">✅ Ready</span>
                                                ) : (
                                                    <span className="text-gray-400 font-bold">⏳ Not Ready</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Auto-start timer */}
                                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                                    <div className="text-center">
                                        <div className="text-yellow-400 font-bold mb-2">⏰ Auto-Start Timer</div>
                                        <div className={`text-2xl font-bold ${nextRoundAutoStartTime <= 10 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                                            {formatTime(nextRoundAutoStartTime)}
                                        </div>
                                        <div className="text-sm text-gray-400 mt-2">
                                            Round will start automatically when both players are ready or when time expires
                                        </div>
                                    </div>
                                </div>

                                {/* Ready Status Message */}
                                <div className="text-center mb-6">
                                    {isNextRoundReady && otherPlayerNextRoundReady ? (
                                        <div className="text-green-400 font-bold text-lg mb-2">
                                            🚀 Both players ready! Starting round...
                                        </div>
                                    ) : isNextRoundReady ? (
                                        <div className="text-yellow-400 font-bold mb-2">
                                            ✅ You're ready! Waiting for opponent...
                                        </div>
                                    ) : otherPlayerNextRoundReady ? (
                                        <div className="text-yellow-400 font-bold mb-2">
                                            ⏳ Opponent is ready! Click Ready to continue...
                                        </div>
                                    ) : (
                                        <div className="text-gray-400 mb-2">
                                            Read the analysis and click Ready when you're prepared for the next round!
                                        </div>
                                    )}
                                </div>

                                {/* Ready Button */}
                                <div className="text-center">
                                    <button
                                        onClick={() => handleNextRoundReady()}
                                        disabled={isNextRoundReady}
                                        className={`px-8 py-4 font-bold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg ${
                                            isNextRoundReady 
                                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white'
                                        }`}
                                    >
                                        {isNextRoundReady ? '✅ Ready! Waiting for opponent...' : '⚔️ Ready for Next Round'}
                                    </button>
                                </div>
                            </>
                        );
                    } else {
                        return (
                            <div className="text-center">
                                <p className="text-gray-400 mb-6">
                                    {attackerWins >= 2 || defenderWins >= 2 
                                        ? 'The battle has concluded! Review the final analysis above.' 
                                        : 'All rounds complete! The battle has ended.'
                                    }
                                </p>
                                <button
                                    onClick={() => {
                                        const winner = attackerWins > defenderWins ? 'attacker' : 'defender';
                                        handleProceedToGameComplete(winner);
                                    }}
                                    className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg text-lg"
                                >
                                    🏆 View Final Results
                                </button>
                            </div>
                        );
                    }
                })()}
            </div>
        </div>
    );
}