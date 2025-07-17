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
    scores: { prosecutor: number; defender: number };
    roundHistory: {
        round: number;
        winner: 'prosecutor' | 'defender';
        analysis: string;
        prosecutorScore: number;
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
    getProsecutorScore: () => number;
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
    getProsecutorScore,
    getDefenderScore,
    showModal
}: GameCompleteModalProps) {
    if (!showModal) {
        return null;
    }

    return (
        <>
            {/* Game Complete Full Screen */}
            <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 overflow-y-auto">
                {/* Subtle background effects */}
                <div className="absolute inset-0">
                    <div className="absolute top-10 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/3 right-20 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-indigo-500/6 rounded-full blur-3xl"></div>
                    <div className="absolute top-2/3 right-1/4 w-64 h-64 bg-blue-500/7 rounded-full blur-3xl"></div>
                </div>
                
                <div className="relative z-10 min-h-screen p-8 flex flex-col">
                <div className="relative z-10 min-h-screen p-8 flex flex-col">
                    {/* Header Section - Top of screen */}
                    <div className="text-center mb-12">
                        <h1 className="text-8xl font-black bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-500 bg-clip-text text-transparent mb-6 drop-shadow-2xl">
                            JUSTICE SERVED!
                        </h1>
                        <div className="text-5xl font-bold mb-8">
                            {gameState.winner === 'prosecutor' ? (
                                <span className="text-yellow-300 drop-shadow-lg">
                                    👑 {room?.players.find(p => p.originalRole === 'prosecutor')?.name} TRIUMPHS!
                                </span>
                            ) : (
                                <span className="text-yellow-300 drop-shadow-lg">
                                    👑 {room?.players.find(p => p.originalRole === 'defender')?.name} TRIUMPHS!
                                </span>
                            )}
                        </div>
                        <p className="text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                            {gameState.winner === 'prosecutor'
                                ? `${room?.players.find(p => p.originalRole === 'prosecutor')?.name} has presented an unshakeable case and claims victory in this legal battle!`
                                : `${room?.players.find(p => p.originalRole === 'defender')?.name} has successfully defended their position and emerges as the champion!`
                            }
                        </p>
                    </div>

                    {/* Main Content Area - Top to Bottom Layout */}
                    <div className="flex-1 flex flex-col gap-12 max-w-6xl mx-auto w-full">
                        
                        {/* Top Section - Score Display */}
                        <div className="w-full">
                            <div className="relative overflow-hidden rounded-3xl">
                                {/* Glass morphism background with enhanced effects */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-white/15 backdrop-blur-xl border-2 border-white/30 shadow-2xl"></div>
                                
                                {/* Content */}
                                <div className="relative z-10 p-10">
                                    <h2 className="text-4xl font-bold text-center text-yellow-300 mb-12 drop-shadow-lg">🏆 FINAL VERDICT</h2>
                                    
                                    {/* Enhanced Player Score Display */}
                                    <div className="flex flex-col items-center gap-16">
                                        {/* Score Battle */}
                                        <div className="flex items-center justify-center gap-12">
                                            {/* Player 1 - Original Prosecutor */}
                                            <div className="flex flex-col items-center transform hover:scale-105 transition-transform duration-300">
                                                {/* Enhanced Avatar */}
                                                <div className="relative">
                                                    <div className="w-32 h-32 bg-gradient-to-br from-red-400 via-red-500 to-orange-600 rounded-full flex items-center justify-center text-5xl border-4 border-red-300/50 shadow-2xl mb-6">
                                                        {room?.players.find(p => p.originalRole === 'prosecutor')?.avatar || '⚔️'}
                                                    </div>
                                                    {gameState.winner === 'prosecutor' && (
                                                        <div className="absolute -top-4 -right-4 text-6xl">👑</div>
                                                    )}
                                                </div>
                                                {/* Player Name */}
                                                <div className="text-2xl font-bold text-white mb-6 text-center">
                                                    {room?.players.find(p => p.originalRole === 'prosecutor')?.name}
                                                </div>
                                                {/* Score */}
                                                <div className="text-7xl font-black bg-gradient-to-b from-red-200 to-red-600 bg-clip-text text-transparent drop-shadow-2xl">
                                                    {gameState.scores.prosecutor}
                                                </div>
                                            </div>

                                            {/* VS Section with enhanced styling */}
                                            <div className="flex flex-col items-center">
                                                <div className="text-6xl text-white/70 font-black drop-shadow-2xl mb-4">VS</div>
                                            </div>

                                            {/* Player 2 - Original Defender */}
                                            <div className="flex flex-col items-center transform hover:scale-105 transition-transform duration-300">
                                                {/* Enhanced Avatar */}
                                                <div className="relative">
                                                    <div className="w-32 h-32 bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-5xl border-4 border-blue-300/50 shadow-2xl mb-6">
                                                        {room?.players.find(p => p.originalRole === 'defender')?.avatar || '🛡️'}
                                                    </div>
                                                    {gameState.winner === 'defender' && (
                                                        <div className="absolute -top-4 -right-4 text-6xl">👑</div>
                                                    )}
                                                </div>
                                                {/* Player Name */}
                                                <div className="text-2xl font-bold text-white mb-6 text-center">
                                                    {room?.players.find(p => p.originalRole === 'defender')?.name}
                                                </div>
                                                {/* Score */}
                                                <div className="text-7xl font-black bg-gradient-to-b from-blue-200 to-blue-600 bg-clip-text text-transparent drop-shadow-2xl">
                                                    {gameState.scores.defender}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Individual Performance Score with enhanced styling */}
                                        <div className="w-full border-t-2 border-white/30 pt-8">
                                            <h3 className="text-2xl font-bold text-center text-white mb-6 drop-shadow-lg">📊 Individual Performance</h3>
                                            <div className="flex justify-center items-center gap-16">
                                                <div className="text-center transform hover:scale-110 transition-transform duration-300">
                                                    <div className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{formatScore(getProsecutorScore())}</div>
                                                    <div className="text-lg text-white/70">{room?.players.find(p => p.originalRole === 'prosecutor')?.name}</div>
                                                </div>
                                                <div className="text-3xl text-white/50">—</div>
                                                <div className="text-center transform hover:scale-110 transition-transform duration-300">
                                                    <div className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{formatScore(getDefenderScore())}</div>
                                                    <div className="text-lg text-white/70">{room?.players.find(p => p.originalRole === 'defender')?.name}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                       
                    </div>

                    {/* Bottom Action Section */}
                    <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center items-center">
                        <button
                            onClick={() => setShowFullBattleLog(true)}
                            className="group relative overflow-hidden px-12 py-6 font-bold rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-2xl text-xl border-2 border-purple-400/50 hover:border-purple-300"
                        >
                            {/* Enhanced glass morphism background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/80 via-purple-500/80 to-purple-700/80 backdrop-blur-xl group-hover:from-purple-500/90 group-hover:to-purple-600/90 transition-all duration-300"></div>
                            
                            {/* Content */}
                            <span className="relative z-10 text-white flex items-center gap-3">
                                📜 <span>View Complete Log</span>
                            </span>
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="group relative overflow-hidden px-12 py-6 font-bold rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-2xl text-xl border-2 border-gray-400/50 hover:border-gray-300"
                        >
                            {/* Enhanced glass morphism background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-600/80 via-gray-500/80 to-gray-700/80 backdrop-blur-xl group-hover:from-gray-500/90 group-hover:to-gray-600/90 transition-all duration-300"></div>
                            
                            {/* Content */}
                            <span className="relative z-10 text-white flex items-center gap-3">
                                🏠 <span>Return to Main Menu</span>
                            </span>
                        </button>
                    </div>
                </div>
            </div>

                </div>

            {/* Full Log Modal - Enhanced as overlay */}
            {showFullBattleLog && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-lg flex items-center justify-center z-[60] p-4">
                    {/* Background effects */}
                    <div className="absolute inset-0">
                        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    </div>
                    
                    <div className="relative bg-gradient-to-br from-white/20 via-white/10 to-white/5 backdrop-blur-xl rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] border border-white/30 overflow-hidden">
                        {/* Header */}
                        <div className="relative overflow-hidden p-6 border-b border-white/20">
                            {/* Glass morphism background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-white/8 to-white/10 backdrop-blur-sm"></div>
                            
                            {/* Content */}
                            <div className="relative z-10 flex items-center justify-between">
                                <h1 className="text-3xl font-bold text-yellow-300">📜 Complete Log</h1>
                                <button
                                    onClick={() => setShowFullBattleLog(false)}
                                    className="w-10 h-10 bg-gradient-to-br from-gray-600/80 to-gray-700/80 hover:from-gray-500/80 hover:to-gray-600/80 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-all duration-200 backdrop-blur-sm border border-white/20 shadow-lg"
                                >
                                    ✕
                                </button>
                            </div>
                            <p className="text-white/80 mt-2 relative z-10">Review every argument from the legal battle</p>
                        </div>

                        {/* Arguments Log */}
                        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
                            {gameState.roundHistory.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4 opacity-40">⚖️</div>
                                    <p className="text-white/60">No arguments recorded.</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Display completed rounds from history */}
                                    {gameState.roundHistory.map((round, roundIndex) => (
                                        <div key={`round-history-${roundIndex}`} className="space-y-6">
                                            {/* Round Header */}
                                            <div className="relative overflow-hidden rounded-xl p-4">
                                                {/* Glass morphism background */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-yellow-400/10 to-orange-500/15 backdrop-blur-sm border border-yellow-400/30 shadow-lg"></div>
                                                
                                                {/* Content */}
                                                <div className="relative z-10 flex items-center justify-between">
                                                    <h3 className="text-2xl font-bold text-yellow-300">
                                                        ⚔️ Round {round.round}
                                                        {round.round === 2 && <span className="text-lg ml-2">(Roles Switched)</span>}
                                                    </h3>
                                                    <div className="text-right">
                                                        <div className={`text-lg font-bold ${round.winner === 'prosecutor' ? 'text-red-300' : 'text-blue-300'}`}>
                                                            🏆 {round.winner === 'prosecutor' ? 'Prosecutor' : 'Defender'} Won
                                                        </div>
                                                        <div className="text-sm text-white/60">
                                                            Score: {round.prosecutorScore} - {round.defenderScore}
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
                                                                <div className="text-center text-sm text-white/50 mb-3 font-semibold">
                                                                    Exchange #{exchangeNumber}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Argument */}
                                                            <div className="relative overflow-hidden rounded-xl">
                                                                {/* Glass morphism background */}
                                                                <div className={`absolute inset-0 ${argument.type === 'attack'
                                                                        ? 'bg-gradient-to-br from-red-500/20 via-red-400/10 to-orange-500/20'
                                                                        : 'bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-indigo-500/20'
                                                                    } backdrop-blur-sm border-l-4 ${argument.type === 'attack'
                                                                        ? 'border-red-400'
                                                                        : 'border-blue-400'
                                                                    } shadow-lg`}></div>
                                                                
                                                                {/* Content */}
                                                                <div className="relative z-10 p-4">
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-xl">
                                                                                {argument.type === 'attack' ? '🔥' : '🛡️'}
                                                                            </span>
                                                                            <span className={`font-semibold ${argument.type === 'attack' ? 'text-red-300' : 'text-blue-300'}`}>
                                                                                {argument.playerName}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            {argumentScore !== undefined && (
                                                                                <div className="bg-gradient-to-br from-gray-700/80 to-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-1 border border-white/10">
                                                                                    <span className="text-yellow-300 font-bold">⭐ {formatScore(argumentScore)}</span>
                                                                                </div>
                                                                            )}
                                                                            <span className="text-xs text-white/50">
                                                                                Arg #{argIndex + 1}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-white/90 leading-relaxed">{argument.content}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Round Analysis */}
                                            <div className="relative overflow-hidden rounded-xl ml-4">
                                                {/* Glass morphism background */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-gray-700/30 via-gray-600/20 to-gray-800/30 backdrop-blur-sm border border-gray-400/20 shadow-lg"></div>
                                                
                                                {/* Content */}
                                                <div className="relative z-10 p-4">
                                                    <h4 className="text-yellow-300 font-bold mb-2">🤖 AI Round Analysis:</h4>
                                                    <p className="text-white/90 text-sm leading-relaxed">{round.analysis}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Close Button */}
                        <div className="relative overflow-hidden p-6 border-t border-white/20">
                            {/* Glass morphism background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/8 backdrop-blur-sm"></div>
                            
                            <div className="relative z-10 flex justify-center">
                                <button
                                    onClick={() => setShowFullBattleLog(false)}
                                    className="px-8 py-3 bg-gradient-to-br from-purple-600/80 to-purple-700/80 hover:from-purple-500/80 hover:to-purple-600/80 rounded-xl font-bold text-white transition-all duration-200 backdrop-blur-sm border border-purple-400/30 shadow-lg transform hover:scale-105"
                                >
                                    Close Log
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
