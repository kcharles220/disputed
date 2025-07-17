'use client';

import { GameRoom, Player } from '../../../services/socketService';

interface GameState {
    case: {
        id: number;
        title: string;
        description: string;
        context: string;
        prosecutorSide: string;
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
    getPlayerDisplayRole: (player: Player) => 'prosecutor' | 'defender';
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
            className="fixed inset-0 bg-slate-900/95 backdrop-blur-lg flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={(e) => {
                // Only allow clicking outside to close during review mode (when both players are ready)
                if (isReady && otherPlayerReady) {
                    setShowCaseModal(false);
                }
            }}
        >
            {/* Background effects */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            
            {/* Clipboard Container */}
            <div 
                className="relative max-w-4xl w-full max-h-[90vh] my-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Clipboard Back */}
                <div className="bg-gradient-to-br from-amber-900/60 to-amber-800/50 rounded-t-3xl p-6 pb-2 border-2 border-amber-700/60 shadow-2xl">
                    {/* Clipboard Clip */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg px-8 py-3 shadow-lg border border-gray-600">
                            <div className="w-6 h-1 bg-gray-500 rounded-full mx-auto mb-1"></div>
                            <div className="w-4 h-1 bg-gray-500 rounded-full mx-auto"></div>
                        </div>
                    </div>
                </div>
                
                {/* Paper/Content - Now scrollable */}
                <div className="bg-gradient-to-br from-slate-100/95 to-gray-100/90 backdrop-blur-xl rounded-b-3xl shadow-2xl border-2 border-slate-300/50 relative overflow-hidden max-h-[80vh] overflow-y-auto">
                    {/* Paper texture lines */}
                    <div className="absolute inset-0 opacity-5">
                        {[...Array(30)].map((_, i) => (
                            <div key={i} className="border-b border-blue-400/20 h-8"></div>
                        ))}
                    </div>
                    
                    {/* Red margin line */}
                    <div className="absolute left-16 top-0 bottom-0 w-px bg-red-400/30"></div>
                    
                    {/* Only show close button when both players are ready (review mode) */}
                    {isReady && otherPlayerReady && (
                        <button
                            onClick={() => setShowCaseModal(false)}
                            className="absolute top-6 right-6 w-10 h-10 bg-gradient-to-br from-red-600/90 to-red-700/90 hover:from-red-500/90 hover:to-red-600/90 rounded-full flex items-center justify-center text-white/95 hover:text-white transition-all duration-200 z-20 shadow-lg border border-red-500/60"
                        >
                            ✕
                        </button>
                    )}
                    
                    <div className="p-8 text-gray-800 relative z-10">
                        <div className="text-center mb-6">
                            <h1 className="text-4xl font-bold text-slate-800 mb-2 drop-shadow-sm">
                                ⚖️ LEGAL CASE FILE ⚖️
                            </h1>
                            <p className="text-slate-700/90 font-medium">Study the details carefully before battle</p>
                        </div>

                        {/* Case Details */}
                        <div className="bg-white/80 rounded-xl p-6 mb-6 shadow-lg border border-slate-300/70 backdrop-blur-sm">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                📋 {gameState.case.title}
                            </h2>
                            
                            <div className="space-y-4">
                                <div className="bg-slate-100/90 rounded-lg p-4 border-l-4 border-slate-500">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-2">📖 The Situation:</h3>
                                    <p className="text-slate-700 leading-relaxed mb-3">{gameState.case.description}</p>
                                    <p className="text-slate-600 text-sm leading-relaxed">{gameState.case.context}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                    <div className="bg-red-100/90 rounded-lg p-4 border-l-4 border-red-500 shadow-sm">
                                        <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                                            ⚔️ Prosecution's Position:
                                        </h4>
                                        <p className="text-slate-700 text-sm">{gameState.case.prosecutorSide}</p>
                                    </div>
                                    <div className="bg-blue-100/90 rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
                                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                            🛡️ Defense's Position:
                                        </h4>
                                        <p className="text-slate-700 text-sm">{gameState.case.defenderSide}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Player Assignment Cards - Only show during initial case reading */}
                        {!(isReady && otherPlayerReady) && (
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                {/* Left side - Original Prosecutor Position */}
                                {(() => {
                                const leftPlayer = room.players.find(p => p.role === 'prosecutor' || p.originalRole === 'prosecutor');
                                const leftPlayerDisplayRole = leftPlayer ? getPlayerDisplayRole(leftPlayer) : 'prosecutor';
                                const isCurrentPlayerOnLeft = isPlayerOnLeftSide(currentPlayer);
                                const leftPlayerLabel = leftPlayerDisplayRole === 'prosecutor' ? 'PROSECUTOR' : 'DEFENDER';
                                const leftPlayerIsProsecutor = leftPlayerDisplayRole === 'prosecutor';
                                
                                return (
                                    <div className={`rounded-xl p-6 shadow-lg border-2 transition-all duration-200 ${
                                        isCurrentPlayerOnLeft 
                                            ? isReady
                                                ? 'bg-green-100/90 border-green-400 shadow-green-200/50 transform scale-105'
                                                : leftPlayerIsProsecutor 
                                                    ? 'bg-white/80 border-red-300 shadow-red-200/50 transform scale-105' 
                                                    : 'bg-white/80 border-blue-300 shadow-blue-200/50 transform scale-105'
                                            : otherPlayerReady
                                                ? 'bg-green-100/90 border-green-400 shadow-green-200/50 opacity-75'
                                                : 'bg-white/80 border-gray-300 opacity-75'
                                    }`}>
                                        <div className="text-center">
                                            <div className={`w-16 h-16 mx-auto mb-3 ${
                                                leftPlayerIsProsecutor 
                                                    ? 'bg-gradient-to-br from-red-400 to-red-600' 
                                                    : 'bg-gradient-to-br from-blue-400 to-blue-600'
                                            } rounded-full flex items-center justify-center text-2xl text-white shadow-lg`}>
                                                {leftPlayer?.avatar || '⚖️'}
                                            </div>
                                            <h3 className={`text-xl font-bold mb-2 ${
                                                leftPlayerIsProsecutor ? 'text-red-700' : 'text-blue-700'
                                            }`}>
                                                {leftPlayerLabel}
                                                {isCurrentPlayerOnLeft && (
                                                    <span className="ml-2 text-amber-600 text-lg font-bold">(YOU)</span>
                                                )}
                                            </h3>
                                            <p className="text-slate-700 font-medium mb-3">{leftPlayer?.name}</p>
                                            
                                            <div className="flex items-center justify-center mb-3">
                                                {isCurrentPlayerOnLeft ? (
                                                    isReady ? (
                                                        <span className="text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full">✅ Ready!</span>
                                                    ) : (
                                                        <span className="text-amber-600 bg-amber-100 px-3 py-1 rounded-full">📖 Reading...</span>
                                                    )
                                                ) : (
                                                    otherPlayerReady ? (
                                                        <span className="text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full">✅ Ready!</span>
                                                    ) : (
                                                        <span className="text-amber-600 bg-amber-100 px-3 py-1 rounded-full">📖 Reading...</span>
                                                    )
                                                )}
                                            </div>
                                            <p className={`text-sm px-3 py-2 rounded-lg ${
                                                leftPlayerIsProsecutor 
                                                    ? 'bg-red-50 text-red-700' 
                                                    : 'bg-blue-50 text-blue-700'
                                            }`}>
                                                Arguing for: {leftPlayerDisplayRole === 'prosecutor' ? gameState.case.prosecutorSide : gameState.case.defenderSide}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                            
                            {/* Right side - Original Defender Position */}
                            {(() => {
                                const rightPlayer = room.players.find(p => p.role === 'defender' || p.originalRole === 'defender');
                                const rightPlayerDisplayRole = rightPlayer ? getPlayerDisplayRole(rightPlayer) : 'defender';
                                const isCurrentPlayerOnRight = !isPlayerOnLeftSide(currentPlayer);
                                const rightPlayerLabel = rightPlayerDisplayRole === 'prosecutor' ? 'PROSECUTOR' : 'DEFENDER';
                                const rightPlayerIsProsecutor = rightPlayerDisplayRole === 'prosecutor';
                                
                                return (
                                    <div className={`rounded-xl p-6 shadow-lg border-2 transition-all duration-200 ${
                                        isCurrentPlayerOnRight 
                                            ? isReady
                                                ? 'bg-green-100/90 border-green-400 shadow-green-200/50 transform scale-105'
                                                : rightPlayerIsProsecutor 
                                                    ? 'bg-white/80 border-red-300 shadow-red-200/50 transform scale-105' 
                                                    : 'bg-white/80 border-blue-300 shadow-blue-200/50 transform scale-105'
                                            : otherPlayerReady
                                                ? 'bg-green-100/90 border-green-400 shadow-green-200/50 opacity-75'
                                                : 'bg-white/80 border-gray-300 opacity-75'
                                    }`}>
                                        <div className="text-center">
                                            <div className={`w-16 h-16 mx-auto mb-3 ${
                                                rightPlayerIsProsecutor 
                                                    ? 'bg-gradient-to-br from-red-400 to-red-600' 
                                                    : 'bg-gradient-to-br from-blue-400 to-blue-600'
                                            } rounded-full flex items-center justify-center text-2xl text-white shadow-lg`}>
                                                {rightPlayer?.avatar || '⚖️'}
                                            </div>
                                            <h3 className={`text-xl font-bold mb-2 ${
                                                rightPlayerIsProsecutor ? 'text-red-700' : 'text-blue-700'
                                            }`}>
                                                {rightPlayerLabel}
                                                {isCurrentPlayerOnRight && (
                                                    <span className="ml-2 text-amber-600 text-lg font-bold">(YOU)</span>
                                                )}
                                            </h3>
                                            <p className="text-slate-700 font-medium mb-3">{rightPlayer?.name}</p>
                                            
                                            <div className="flex items-center justify-center mb-3">
                                                {isCurrentPlayerOnRight ? (
                                                    isReady ? (
                                                        <span className="text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full">✅ Ready!</span>
                                                    ) : (
                                                        <span className="text-amber-600 bg-amber-100 px-3 py-1 rounded-full">📖 Reading...</span>
                                                    )
                                                ) : (
                                                    otherPlayerReady ? (
                                                        <span className="text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full">✅ Ready!</span>
                                                    ) : (
                                                        <span className="text-amber-600 bg-amber-100 px-3 py-1 rounded-full">📖 Reading...</span>
                                                    )
                                                )}
                                            </div>
                                            <p className={`text-sm px-3 py-2 rounded-lg ${
                                                rightPlayerIsProsecutor 
                                                    ? 'bg-red-50 text-red-700' 
                                                    : 'bg-blue-50 text-blue-700'
                                            }`}>
                                                Arguing for: {rightPlayerDisplayRole === 'prosecutor' ? gameState.case.prosecutorSide : gameState.case.defenderSide}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        )}

                        <div className="text-center">
                            <div className="mb-6">
                                {/* Only show timer during initial case reading phase (when not both ready) */}
                                {!(isReady && otherPlayerReady) && (
                                    <div className="flex items-center justify-center gap-4 mb-4">
                                        <div className={`bg-white/95 px-6 py-3 rounded-xl shadow-lg border-2 transition-all duration-200 ${
                                            caseReadingTimeLeft <= 30 
                                                ? 'border-red-500 animate-pulse' 
                                                : 'border-slate-500'
                                        }`}>
                                            <span className={`font-bold ${
                                                caseReadingTimeLeft <= 30 ? 'text-red-700' : 'text-slate-800'
                                            }`}>
                                                ⏰ Time Remaining: {formatTime(caseReadingTimeLeft)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                

                                {/* Only show ready button and auto-start warning during initial case reading */}
                                {!(isReady && otherPlayerReady) && (
                                    <>
                                        <button
                                            onClick={toggleReady}
                                            disabled={isReady && otherPlayerReady}
                                            className={`px-8 py-4 font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg border-2 ${
                                                isReady 
                                                    ? 'bg-green-600 hover:bg-green-700 border-green-500 text-white'
                                                    : 'bg-slate-600 hover:bg-slate-700 border-slate-500 text-white'
                                            } ${isReady && otherPlayerReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isReady ? '✅ Ready!' : '📖 I\'m Ready to Battle!'}
                                        </button>
                                        
                                        {caseReadingTimeLeft <= 10 && (
                                            <div className="mt-4 bg-red-200/90 border-2 border-red-500 rounded-lg p-3 animate-pulse">
                                                <div className="text-red-800 font-bold">
                                                    ⚠️ Battle will start automatically in {caseReadingTimeLeft} seconds!
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Show case review message when both players are ready */}
                                {isReady && otherPlayerReady && (
                                    <div className="bg-blue-200/90 border-2 border-blue-500 rounded-xl p-6">
                                        <p className="text-blue-900 font-medium">📚 Case Review Mode</p>
                                        <p className="text-blue-800 text-sm mt-1">You can review the case details anytime during the battle</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
