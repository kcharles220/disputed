'use client';

import { GameRoom, Player } from '../../../services/socketService';

interface GameState {
    case: {
        id: number;
        title: string;
        description: string;
        context: string;
        attackerSide: string;
        defenderSide: string;
    } | null;
    currentRound: number;
}

interface CaseReadingModalProps {
    showCaseModal: boolean;
    setShowCaseModal: (show: boolean) => void;
    gameState: GameState;
    room: GameRoom;
    currentPlayer: Player;
    isReady: boolean;
    otherPlayerReady: boolean;
    caseReadingTimeLeft: number;
    toggleReady: () => void;
    formatTime: (seconds: number) => string;
    getPlayerDisplayRole: (player: Player) => 'attacker' | 'defender';
    isPlayerOnLeftSide: (player: Player) => boolean;
}

export default function CaseReadingModal({
    showCaseModal,
    setShowCaseModal,
    gameState,
    room,
    currentPlayer,
    isReady,
    otherPlayerReady,
    caseReadingTimeLeft,
    toggleReady,
    formatTime,
    getPlayerDisplayRole,
    isPlayerOnLeftSide
}: CaseReadingModalProps) {
    if (!showCaseModal || !gameState.case) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    setShowCaseModal(false);
                }
            }}
        >
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-600 max-h-[90vh] overflow-y-auto relative">
                <button
                    onClick={() => setShowCaseModal(false)}
                    className="absolute top-4 right-4 w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-all duration-200 z-10"
                >
                    ✕
                </button>
                <div className="p-8">
                    <div className="text-center mb-6">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
                            ⚖️ LEGAL BATTLE ⚖️
                        </h1>
                        <p className="text-gray-300">Study the case carefully. The battle begins shortly!</p>
                    </div>

                    <div className="bg-gray-700/50 rounded-xl p-6 mb-6">
                        <h2 className="text-2xl font-bold text-yellow-400 mb-4">📋 {gameState.case.title}</h2>
                        
                        <div className="bg-gray-800/50 rounded-lg p-6 mb-4">
                            <h3 className="text-lg font-semibold text-blue-400 mb-3">The Situation:</h3>
                            <p className="text-gray-200 text-lg leading-relaxed mb-4">{gameState.case.description}</p>
                            <p className="text-gray-300 text-sm leading-relaxed">{gameState.case.context}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="bg-red-900/30 rounded-lg p-4">
                                    <h4 className="font-bold text-red-400 mb-2">🏢 Attacker's Side:</h4>
                                    <p className="text-sm text-gray-300">{gameState.case.attackerSide}</p>
                                </div>
                                <div className="bg-blue-900/30 rounded-lg p-4">
                                    <h4 className="font-bold text-blue-400 mb-2">👩‍💼 Defender's Side:</h4>
                                    <p className="text-sm text-gray-300">{gameState.case.defenderSide}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                        {/* Left side - Original Attacker Position */}
                        {(() => {
                            const leftPlayer = room.players.find(p => p.role === 'attacker' || p.originalRole === 'attacker');
                            const leftPlayerDisplayRole = leftPlayer ? getPlayerDisplayRole(leftPlayer) : 'attacker';
                            const isCurrentPlayerOnLeft = isPlayerOnLeftSide(currentPlayer);
                            const leftPlayerLabel = leftPlayerDisplayRole === 'attacker' ? 'ATTACKER' : 'DEFENDER';
                            const leftPlayerIsAttacker = leftPlayerDisplayRole === 'attacker';
                            
                            return (
                                <div className={`border-2 rounded-lg p-4 text-center transition-all duration-200 ${
                                    isCurrentPlayerOnLeft 
                                        ? (leftPlayerIsAttacker ? 'bg-red-900/30 border-red-500' : 'bg-blue-900/30 border-blue-500')
                                        : (leftPlayerIsAttacker ? 'bg-red-900/10 border-red-500/30' : 'bg-blue-900/10 border-blue-500/30')
                                }`}>
                                    <h3 className={`text-xl font-bold mb-2 ${leftPlayerIsAttacker ? 'text-red-400' : 'text-blue-400'}`}>
                                        {leftPlayer?.avatar || '⚖️'} {leftPlayerLabel} {isCurrentPlayerOnLeft && (
                                            <span className="mx-2 text-yellow-400 text-lg font-semibold">(YOU)</span>
                                        )}
                                    </h3>
                                    <p className="text-gray-300 font-medium mb-2">{leftPlayer?.name}</p>
                                    
                                    <div className="flex items-center justify-center mb-2">
                                        {isCurrentPlayerOnLeft ? (
                                            isReady ? (
                                                <span className="text-green-400 font-bold">✅ Ready!</span>
                                            ) : (
                                                <span className="text-gray-400">⏳ Reading...</span>
                                            )
                                        ) : (
                                            otherPlayerReady ? (
                                                <span className="text-green-400 font-bold">✅ Ready!</span>
                                            ) : (
                                                <span className="text-gray-400">⏳ Reading...</span>
                                            )
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400">
                                        Arguments for {leftPlayerDisplayRole === 'attacker' ? gameState.case.attackerSide : gameState.case.defenderSide}
                                    </p>
                                </div>
                            );
                        })()}
                        
                        {/* Right side - Original Defender Position */}
                        {(() => {
                            const rightPlayer = room.players.find(p => p.role === 'defender' || p.originalRole === 'defender');
                            const rightPlayerDisplayRole = rightPlayer ? getPlayerDisplayRole(rightPlayer) : 'defender';
                            const isCurrentPlayerOnRight = !isPlayerOnLeftSide(currentPlayer);
                            const rightPlayerLabel = rightPlayerDisplayRole === 'attacker' ? 'ATTACKER' : 'DEFENDER';
                            const rightPlayerIsAttacker = rightPlayerDisplayRole === 'attacker';
                            
                            return (
                                <div className={`border-2 rounded-lg p-4 text-center transition-all duration-200 ${
                                    isCurrentPlayerOnRight 
                                        ? (rightPlayerIsAttacker ? 'bg-red-900/30 border-red-500' : 'bg-blue-900/30 border-blue-500')
                                        : (rightPlayerIsAttacker ? 'bg-red-900/10 border-red-500/30' : 'bg-blue-900/10 border-blue-500/30')
                                }`}>
                                    <h3 className={`text-xl font-bold mb-2 ${rightPlayerIsAttacker ? 'text-red-400' : 'text-blue-400'}`}>
                                        {rightPlayer?.avatar || '⚖️'} {rightPlayerLabel} {isCurrentPlayerOnRight && (
                                            <span className="mx-2 text-yellow-400 text-lg font-semibold">(YOU)</span>
                                        )}
                                    </h3>
                                    <p className="text-gray-300 font-medium mb-2">{rightPlayer?.name}</p>
                                    
                                    <div className="flex items-center justify-center mb-2">
                                        {isCurrentPlayerOnRight ? (
                                            isReady ? (
                                                <span className="text-green-400 font-bold">✅ Ready!</span>
                                            ) : (
                                                <span className="text-gray-400">⏳ Reading...</span>
                                            )
                                        ) : (
                                            otherPlayerReady ? (
                                                <span className="text-green-400 font-bold">✅ Ready!</span>
                                            ) : (
                                                <span className="text-gray-400">⏳ Reading...</span>
                                            )
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400">
                                        Arguments for {rightPlayerDisplayRole === 'attacker' ? gameState.case.attackerSide : gameState.case.defenderSide}
                                    </p>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="text-center">
                        <div className="mb-6">
                            <div className="flex items-center justify-center gap-4 mb-4">
                                <div className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${caseReadingTimeLeft <= 30 ? 'border-red-500 bg-red-900/20' : 'border-yellow-500 bg-yellow-900/20'}`}>
                                    <span className={`font-bold ${caseReadingTimeLeft <= 30 ? 'text-red-400' : 'text-yellow-400'}`}>
                                        ⏰ Time Remaining: {formatTime(caseReadingTimeLeft)}
                                    </span>
                                </div>
                            </div>

                            {isReady && otherPlayerReady ? (
                                <div className="mb-4">
                                    <div className="text-green-400 font-bold text-lg mb-2">🚀 Both players ready! Starting battle...</div>
                                </div>
                            ) : isReady ? (
                                <div className="mb-4">
                                    <div className="text-yellow-400 font-bold mb-2">✅ You're ready! Waiting for opponent...</div>
                                </div>
                            ) : null}

                            <button
                                onClick={toggleReady}
                                disabled={isReady && otherPlayerReady}
                                className={`px-8 py-4 font-bold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg ${
                                    isReady 
                                        ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                                        : 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white'
                                } ${isReady && otherPlayerReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isReady ? '✅ Ready!' : '📖 I\'m Ready to Battle!'}
                            </button>
                            
                            {caseReadingTimeLeft <= 10 && (
                                <div className="mt-4 text-red-400 font-bold animate-pulse">
                                    ⚠️ Battle will start automatically in {caseReadingTimeLeft} seconds!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
