'use client';

import { GameRoom, Player } from '../../../services/socketService';

interface GameArgument {
    id: string;
    playerId: string;
    playerName: string;
    content: string;
    timestamp: Date;
    type: 'attack' | 'defense';
    round?: number;
    score?: number;
}

interface GameState {
    gamePhase: 'case-reading' | 'arguing' | 'round-complete' | 'finished' | 'side-choice';
    winner?: string;
    scores: { attacker: number; defender: number };
    roundHistory: {
        round: number;
        winner: 'attacker' | 'defender';
        analysis: string;
        attackerScore: number;
        defenderScore: number;
        arguments: GameArgument[];
        argumentScores?: { argumentId: string; score: number }[];
    }[];
}

interface GameCompleteModalProps {
    gameState: GameState;
    room: GameRoom;
    showFullBattleLog: boolean;
    setShowFullBattleLog: (show: boolean) => void;
    router: any;
    formatScore: (score: number) => string;
    getAttackerScore: () => number;
    getDefenderScore: () => number;
    showModal: boolean;
}

export default function GameCompleteModal({
    gameState,
    room,
    showFullBattleLog,
    setShowFullBattleLog,
    router,
    formatScore,
    getAttackerScore,
    getDefenderScore,
    showModal
}: GameCompleteModalProps) {
    if (!showModal) {
        return null;
    }

    return (
        <>
            {/* Game End Modal */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-12 border border-gray-600 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="text-8xl mb-4">⚖️</div>
                        <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-4">
                            BATTLE COMPLETE!
                        </h1>
                        <div className="text-4xl font-bold mb-6">
                            {gameState.winner === 'attacker' ? (
                                <span className="text-yellow-400">🏆 {room?.players.find(p => p.originalRole === 'attacker')?.name} WINS!</span>
                            ) : (
                                <span className="text-yellow-400">🏆 {room?.players.find(p => p.originalRole === 'defender')?.name} WINS!</span>
                            )}
                        </div>
                        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                            {gameState.winner === 'attacker'
                                ? `${room?.players.find(p => p.originalRole === 'attacker')?.name} presented the most convincing case and emerges victorious!`
                                : `${room?.players.find(p => p.originalRole === 'defender')?.name} presented the most convincing case and emerges victorious!`
                            }
                        </p>
                    </div>

                    {/* Main Score Display */}
                    <div className="bg-gray-800/50 rounded-xl p-8 mb-8">
                        <h2 className="text-3xl font-bold text-center text-yellow-400 mb-8">📊 FINAL BATTLE SCORE</h2>
                        
                        {/* Player Scores with Avatars */}
                        <div className="flex justify-center items-center gap-20 mb-8">
                            {/* Player 1 - Original Attacker */}
                            <div className="flex flex-col items-center">
                                {/* Avatar */}
                                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center text-4xl border-4 border-gray-500 mb-6">
                                    {room?.players.find(p => p.originalRole === 'attacker')?.avatar || '⚖️'}
                                </div>
                                {/* Player Name */}
                                <div className="text-xl font-semibold text-gray-200 mb-4">{room?.players.find(p => p.originalRole === 'attacker')?.name}</div>
                            </div>

                            {/* Score and VS section */}
                            <div className="flex items-center gap-8">
                                {/* Player 1 Score */}
                                <div className="text-6xl font-bold text-white">{gameState.scores.attacker}</div>
                                {/* VS */}
                                <div className="text-5xl text-gray-400 font-bold">VS</div>
                                {/* Player 2 Score */}
                                <div className="text-6xl font-bold text-white">{gameState.scores.defender}</div>
                            </div>

                            {/* Player 2 - Original Defender */}
                            <div className="flex flex-col items-center">
                                {/* Avatar */}
                                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center text-4xl border-4 border-gray-500 mb-6">
                                    {room?.players.find(p => p.originalRole === 'defender')?.avatar || '⚖️'}
                                </div>
                                {/* Player Name */}
                                <div className="text-xl font-semibold text-gray-200 mb-4">{room?.players.find(p => p.originalRole === 'defender')?.name}</div>
                            </div>
                        </div>

                        {/* Individual Performance Score */}
                        <div className="border-t border-gray-600 pt-6">
                            <h3 className="text-xl font-bold text-center text-gray-300 mb-4">Individual Performance</h3>
                            <div className="flex justify-center items-center gap-12">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-gray-300 mb-1">{formatScore(getAttackerScore())}</div>
                                    <div className="text-sm text-gray-400">{room?.players.find(p => p.originalRole === 'attacker')?.name}</div>
                                </div>
                                <div className="text-2xl text-gray-500">-</div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-gray-300 mb-1">{formatScore(getDefenderScore())}</div>
                                    <div className="text-sm text-gray-400">{room?.players.find(p => p.originalRole === 'defender')?.name}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Battle Summary */}
                    <div className="bg-gray-800/30 rounded-xl p-6 mb-8">
                        <h3 className="text-xl font-bold text-yellow-400 mb-4 text-center">⚔️ Battle Summary</h3>
                        <div className="grid grid-cols-3 gap-6 text-center">
                            <div>
                                <div className="text-2xl font-bold text-white mb-1">{gameState.roundHistory.length}</div>
                                <div className="text-sm text-gray-400">Rounds Fought</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white mb-1">
                                    {gameState.roundHistory.reduce((total, round) => total + round.arguments.length, 0)}
                                </div>
                                <div className="text-sm text-gray-400">Total Arguments</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white mb-1">
                                    {gameState.roundHistory.reduce((total, round) => total + Math.floor(round.arguments.length / 2), 0)}
                                </div>
                                <div className="text-sm text-gray-400">Total Exchanges</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button
                            onClick={() => setShowFullBattleLog(true)}
                            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg text-lg"
                        >
                            📜 View Full Battle Log
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg text-lg"
                        >
                            🏠 Return to Menu
                        </button>
                    </div>
                </div>
            </div>

            {/* Full Battle Log Modal */}
            {showFullBattleLog && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] border border-gray-600 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-600 bg-gray-800/50">
                            <div className="flex items-center justify-between">
                                <h1 className="text-3xl font-bold text-yellow-400">📜 Complete Battle Log</h1>
                                <button
                                    onClick={() => setShowFullBattleLog(false)}
                                    className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-all duration-200"
                                >
                                    ✕
                                </button>
                            </div>
                            <p className="text-gray-300 mt-2">Review every argument from the legal battle</p>
                        </div>

                        {/* Arguments Log */}
                        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
                            {gameState.roundHistory.length === 0 ? (
                                <p className="text-gray-500 text-center py-12">No arguments recorded.</p>
                            ) : (
                                <div className="space-y-8">
                                    {/* Display completed rounds from history */}
                                    {gameState.roundHistory.map((round, roundIndex) => (
                                        <div key={`round-${round.round}`} className="space-y-6">
                                            {/* Round Header */}
                                            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-2xl font-bold text-yellow-400">
                                                        ⚔️ Round {round.round}
                                                        {round.round === 2 && <span className="text-lg ml-2">(Roles Switched)</span>}
                                                    </h3>
                                                    <div className="text-right">
                                                        <div className={`text-lg font-bold ${round.winner === 'attacker' ? 'text-red-400' : 'text-blue-400'}`}>
                                                            🏆 {round.winner === 'attacker' ? 'Attacker' : 'Defender'} Won
                                                        </div>
                                                        <div className="text-sm text-gray-400">
                                                            Score: {round.attackerScore} - {round.defenderScore}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Round Arguments */}
                                            <div className="space-y-4 ml-4">
                                                {round.arguments.map((argument, argIndex) => {
                                                    const exchangeNumber = Math.floor(argIndex / 2) + 1;
                                                    const isFirstInExchange = argIndex % 2 === 0;
                                                    const argumentScore = round.argumentScores?.find(score => score.argumentId === argument.id)?.score;
                                                    
                                                    return (
                                                        <div key={argument.id}>
                                                            {/* Exchange Header */}
                                                            {isFirstInExchange && (
                                                                <div className="text-center text-sm text-gray-500 mb-3 font-semibold">
                                                                    Exchange #{exchangeNumber}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Argument */}
                                                            <div className={`p-4 rounded-lg border-l-4 ${argument.type === 'attack'
                                                                    ? 'bg-red-900/20 border-red-500'
                                                                    : 'bg-blue-900/20 border-blue-500'
                                                                }`}>
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-xl">
                                                                            {argument.type === 'attack' ? '🔥' : '🛡️'}
                                                                        </span>
                                                                        <span className={`font-semibold ${argument.type === 'attack' ? 'text-red-400' : 'text-blue-400'}`}>
                                                                            {argument.playerName}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        {argumentScore !== undefined && (
                                                                            <div className="bg-gray-700/50 rounded-lg px-3 py-1">
                                                                                <span className="text-yellow-400 font-bold">⭐ {formatScore(argumentScore)}</span>
                                                                            </div>
                                                                        )}
                                                                        <span className="text-xs text-gray-500">
                                                                            Arg #{argIndex + 1}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-gray-200 leading-relaxed">{argument.content}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Round Analysis */}
                                            <div className="bg-gray-700/30 rounded-lg p-4 ml-4">
                                                <h4 className="text-yellow-400 font-bold mb-2">🤖 AI Round Analysis:</h4>
                                                <p className="text-gray-200 text-sm">{round.analysis}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
