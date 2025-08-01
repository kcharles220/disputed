'use client';

import { GameRoom, Player, socketService } from '../../../services/socketService';


interface SideChoiceModalProps {
    gameState: GameRoom;
    currentPlayer: Player;
    leftPlayer: Player | null;
    rightPlayer: Player | null;
    showSideChoiceModal: boolean;
    setShowSideChoiceModal: (show: boolean) => void;
}

export default function SideChoiceModal({
    gameState,
    currentPlayer,
    leftPlayer,
    rightPlayer,
    showSideChoiceModal,
    setShowSideChoiceModal,
}: SideChoiceModalProps) {

       const handleSideChoice = (side: string) => {
           socketService.chooseSide(gameState.roomId, side);
       };

    if (gameState.gameState !== 'side-choice' ) {
        return null;
    }

const bestPlayer: Player | undefined = gameState.players.reduce(
    (prev, curr) => (curr.score > prev.score ? curr : prev),
    gameState.players[0]
);

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-lg flex items-center justify-center z-[100] p-4"
             style={{ zIndex: 1000 }}>
            {/* Background effects */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            
            <div className="relative bg-gradient-to-br from-white/20 via-white/10 to-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-2xl w-full border border-white/30 overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-purple-500/10 rounded-full blur-lg"></div>
                
                {/* Content */}
                <div className="relative z-10">
                    <div className="text-center mb-6">
                        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
                            ⚖️ Round 3 - Side Choice
                        </h1>
                        <h2 className="text-2xl font-bold mb-4 text-yellow-300">
                            It's a Draw! Choose Your Side
                        </h2>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl mb-6">
                        {/* Glass morphism background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-white/8 to-white/10 backdrop-blur-sm border border-white/20 shadow-lg"></div>
                        
                        {/* Content */}
                        <div className="relative z-10 p-6">
                            <h3 className="text-lg font-bold text-yellow-300 mb-3">🏆 Performance Leader Gets to Choose</h3>
                            <p className="text-white/90 mb-4">
                                Based on individual argument scores, <span className="text-green-300 font-bold">{bestPlayer.username}</span> performed better and gets to choose their side for the final round!
                            </p>
                            
                            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/10">
                                <h4 className="text-sm font-bold text-white/70 mb-2">Current Match Score</h4>
                                <div className="flex justify-center items-center gap-6 mb-2">
                                    <span className="text-red-300 font-bold text-xl">{leftPlayer?.username}: {leftPlayer?.points}</span>
                                    <span className="text-white/60">-</span>
                                    <span className="text-blue-300 font-bold text-xl">{rightPlayer?.username}: {rightPlayer?.points}</span>
                                </div>
                                <div className="flex justify-center items-center gap-6 text-sm text-white/60">
                                    <span>Individual Total: {leftPlayer?.score}</span>
                                    <span>-</span>
                                    <span>Individual Total: {rightPlayer?.score}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                {bestPlayer.id === currentPlayer?.id ? (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-center text-white mb-4">Choose Your Side:</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleSideChoice('prosecutor')}
                                className="relative overflow-hidden rounded-xl p-6 text-center transition-all duration-200 transform hover:scale-105"
                            >
                                {/* Glass morphism background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-red-400/10 to-orange-500/15 backdrop-blur-sm border-2 border-red-400/50 hover:border-red-300/70 shadow-lg"></div>
                                
                                {/* Content */}
                                <div className="relative z-10">
                                    <h4 className="text-2xl font-bold text-red-300 mb-2">🔥 PROSECUTOR</h4>
                                    <p className="text-white/80 text-sm">Lead the charge and make the case</p>
                                    <p className="text-white/60 text-xs mt-2">You go first each turn</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleSideChoice('defender')}
                                className="relative overflow-hidden rounded-xl p-6 text-center transition-all duration-200 transform hover:scale-105"
                            >
                                {/* Glass morphism background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-indigo-500/15 backdrop-blur-sm border-2 border-blue-400/50 hover:border-blue-300/70 shadow-lg"></div>
                                
                                {/* Content */}
                                <div className="relative z-10">
                                    <h4 className="text-2xl font-bold text-blue-300 mb-2">🛡️ DEFENDER</h4>
                                    <p className="text-white/80 text-sm">Counter and defend the position</p>
                                    <p className="text-white/60 text-xs mt-2">You respond to attacks</p>
                                </div>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-white mb-4">Waiting for Side Choice...</h3>
                        <p className="text-white/70 mb-4">
                            <span className="text-green-300 font-bold">{bestPlayer.username}</span> is choosing their side for the final round.
                        </p>
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-300"></div>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}
