'use client';

import { Player } from '../../../services/socketService';

interface GameState {
    gamePhase: 'case-reading' | 'arguing' | 'round-complete' | 'finished' | 'side-choice';
    sideChoice?: {
        chooserPlayerId: string;
        chooserPlayerName: string;
        playerPerformance: any;
    };
}

interface SideChoiceModalProps {
    gameState: GameState;
    currentPlayer: Player;
    handleSideChoice: (side: 'attacker' | 'defender') => void;
    getAttackerRoundWins: () => number;
    getDefenderRoundWins: () => number;
    getAttackerScore: () => number;
    getDefenderScore: () => number;
    formatScore: (score: number) => string;
}

export default function SideChoiceModal({
    gameState,
    currentPlayer,
    handleSideChoice,
    getAttackerRoundWins,
    getDefenderRoundWins,
    getAttackerScore,
    getDefenderScore,
    formatScore
}: SideChoiceModalProps) {
    console.log('SideChoiceModal render check:', {
        gamePhase: gameState.gamePhase,
        hasSideChoice: !!gameState.sideChoice,
        chooserPlayerId: gameState.sideChoice?.chooserPlayerId,
        currentPlayerId: currentPlayer?.id,
        shouldRender: gameState.gamePhase === 'side-choice' && !!gameState.sideChoice
    });
    
    if (gameState.gamePhase !== 'side-choice' || !gameState.sideChoice) {
        console.log('SideChoiceModal not rendering - phase:', gameState.gamePhase, 'hasSideChoice:', !!gameState.sideChoice);
        return null;
    }

    console.log('🎯 SideChoiceModal is rendering - side choice active after both players ready!');

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
             style={{ zIndex: 1000 }}>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 max-w-2xl w-full border border-gray-600">
                <div className="text-center mb-6">
                    <h1 className="text-4xl font-bold mb-2">
                        ⚖️ Round 3 - Side Choice
                    </h1>
                    <h2 className="text-2xl font-bold mb-4 text-yellow-400">
                        It's a Draw! Choose Your Side
                    </h2>
                </div>

                <div className="bg-gray-700/50 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-bold text-yellow-400 mb-3">🏆 Performance Leader Gets to Choose</h3>
                    <p className="text-gray-200 mb-4">
                        Based on individual argument scores, <span className="text-green-400 font-bold">{gameState.sideChoice.chooserPlayerName}</span> performed better and gets to choose their side for the final round!
                    </p>
                    
                    <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-bold text-gray-400 mb-2">Current Match Score</h4>
                        <div className="flex justify-center items-center gap-6 mb-2">
                            <span className="text-red-400 font-bold text-xl">Attacker: {getAttackerRoundWins()}</span>
                            <span className="text-gray-400">-</span>
                            <span className="text-blue-400 font-bold text-xl">Defender: {getDefenderRoundWins()}</span>
                        </div>
                        <div className="flex justify-center items-center gap-6 text-sm text-gray-400">
                            <span>Individual Total: {formatScore(getAttackerScore())}</span>
                            <span>-</span>
                            <span>Individual Total: {formatScore(getDefenderScore())}</span>
                        </div>
                    </div>
                </div>

                {gameState.sideChoice.chooserPlayerId === currentPlayer?.id ? (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-center text-white mb-4">Choose Your Side:</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleSideChoice('attacker')}
                                className="bg-red-900/30 border-2 border-red-500 rounded-lg p-6 text-center transition-all duration-200 hover:bg-red-900/50 hover:scale-105 transform"
                            >
                                <h4 className="text-2xl font-bold text-red-400 mb-2">🔥 ATTACKER</h4>
                                <p className="text-gray-300 text-sm">Lead the charge and make the case</p>
                                <p className="text-gray-400 text-xs mt-2">You go first each turn</p>
                            </button>
                            <button
                                onClick={() => handleSideChoice('defender')}
                                className="bg-blue-900/30 border-2 border-blue-500 rounded-lg p-6 text-center transition-all duration-200 hover:bg-blue-900/50 hover:scale-105 transform"
                            >
                                <h4 className="text-2xl font-bold text-blue-400 mb-2">🛡️ DEFENDER</h4>
                                <p className="text-gray-300 text-sm">Counter and defend the position</p>
                                <p className="text-gray-400 text-xs mt-2">You respond to attacks</p>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-white mb-4">Waiting for Side Choice...</h3>
                        <p className="text-gray-400 mb-4">
                            <span className="text-green-400 font-bold">{gameState.sideChoice.chooserPlayerName}</span> is choosing their side for the final round.
                        </p>
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
