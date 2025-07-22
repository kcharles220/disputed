'use client';

import { useRouter } from 'next/router';
import { GameRoom, Player } from '../../../services/socketService';
import { useState } from 'react';



interface GameCompleteModalProps {
    gameState: GameRoom;
    currentPlayer: Player | null;
    leftPlayer: Player | null;
    rightPlayer: Player | null;
    showGameCompleteModal: boolean;
    setShowGameCompleteModal: (show: boolean) => void;
}

export default function GameCompleteModal({
    gameState,
    currentPlayer,
    leftPlayer,
    rightPlayer,
    showGameCompleteModal,
    setShowGameCompleteModal
}: GameCompleteModalProps) {
    if (!showGameCompleteModal) {
        return null;
    }
    console.log('Game complete state:', gameState);
    const router = useRouter();
const [showFullBattleLog, setShowFullBattleLog] = useState(false);
    // Find winner: player with points === 2
    const winner = gameState.players?.find(p => p.points === 2);
    
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
                            {winner?.lastRole === 'prosecutor' ? (
                                <span className="text-yellow-300 drop-shadow-lg">
                                    👑 {winner?.username} TRIUMPHS!
                                </span>
                            ) : (
                                <span className="text-yellow-300 drop-shadow-lg">
                                    👑 {winner?.username} TRIUMPHS!
                                </span>
                            )}
                        </div>
                        <p className="text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                            {winner?.lastRole === 'prosecutor'
                                ? `${winner?.username} has presented an unshakeable case and claims victory in this legal battle!`
                                : `${winner?.username} has successfully defended their position and emerges as the champion!`
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
                                            {/* Left Player */}
                                            <div className="flex flex-col items-center transform hover:scale-105 transition-transform duration-300">
                                                {/* Enhanced Avatar */}
                                                <div className="relative">
                                                    <div className="w-32 h-32 bg-gradient-to-br from-red-400 via-red-500 to-orange-600 rounded-full flex items-center justify-center text-5xl border-4 border-red-300/50 shadow-2xl mb-6">
                                                        {leftPlayer?.avatar || '⚔️'}
                                                    </div>
                                                    {leftPlayer?.username === winner?.username && (
                                                        <div className="absolute -top-4 -right-4 text-6xl">👑</div>
                                                    )}
                                                </div>
                                                {/* Player Name */}
                                                <div className="text-2xl font-bold text-white mb-6 text-center">
                                                    {leftPlayer?.username}
                                                </div>
                                                {/* Score */}
                                                <div className="text-7xl font-black bg-gradient-to-b from-red-200 to-red-600 bg-clip-text text-transparent drop-shadow-2xl">
                                                    {leftPlayer?.points}
                                                </div>
                                            </div>

                                            {/* VS Section with enhanced styling */}
                                            <div className="flex flex-col items-center">
                                                <div className="text-6xl text-white/70 font-black drop-shadow-2xl mb-4">VS</div>
                                            </div>

                                            {/* Right Player */}
                                            <div className="flex flex-col items-center transform hover:scale-105 transition-transform duration-300">
                                                {/* Enhanced Avatar */}
                                                <div className="relative">
                                                    <div className="w-32 h-32 bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-5xl border-4 border-blue-300/50 shadow-2xl mb-6">
                                                        {rightPlayer?.avatar || '🛡️'}
                                                    </div>
                                                    {winner?.username === rightPlayer?.username && (
                                                        <div className="absolute -top-4 -right-4 text-6xl">👑</div>
                                                    )}
                                                </div>
                                                {/* Player Name */}
                                                <div className="text-2xl font-bold text-white mb-6 text-center">
                                                    {rightPlayer?.username}
                                                </div>
                                                {/* Score */}
                                                <div className="text-7xl font-black bg-gradient-to-b from-blue-200 to-blue-600 bg-clip-text text-transparent drop-shadow-2xl">
                                                    {rightPlayer?.points}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Individual Performance Score with enhanced styling */}
                                        <div className="w-full border-t-2 border-white/30 pt-8">
                                            <h3 className="text-2xl font-bold text-center text-white mb-6 drop-shadow-lg">📊 Individual Performance</h3>
                                            <div className="flex justify-center items-center gap-16">
                                                <div className="text-center transform hover:scale-110 transition-transform duration-300">
                                                    <div className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{leftPlayer?.score}</div>
                                                    <div className="text-lg text-white/70">{leftPlayer?.username}</div>
                                                </div>
                                                <div className="text-3xl text-white/50">—</div>
                                                <div className="text-center transform hover:scale-110 transition-transform duration-300">
                                                    <div className="text-4xl font-bold text-white mb-2 drop-shadow-lg">{rightPlayer?.score}</div>
                                                    <div className="text-lg text-white/70">{rightPlayer?.username}</div>
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
                    
                        <div className="relative bg-gradient-to-br from-white/20 via-white/10 to-white/5 backdrop-blur-xl rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] border border-white/30">
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
                            {gameState.argumentCount === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4 opacity-40">⚖️</div>
                                    <p className="text-white/60">No arguments recorded.</p>
                                </div>
                            ) : (
                                            <div className="space-y-8">
                                                {/* Display completed rounds from history */}
                                                {gameState.roundData.map((round, roundIndex) => (
                                                    <div key={`round-history-${roundIndex}`} className="space-y-6">
                                                        {/* Round Header */}
                                                        <div className="relative overflow-hidden rounded-xl p-4">
                                                            {/* Glass morphism background */}
                                                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-yellow-400/10 to-orange-500/15 backdrop-blur-sm border border-yellow-400/30 shadow-lg"></div>
                                                            {/* Content */}
                                                            <div className="relative z-10 flex items-center justify-between">
                                                                <h3 className="text-2xl font-bold text-yellow-300">
                                                                    ⚔️ Round {round.number}
                                                                    {round.number === 2 && <span className="text-lg ml-2">(Roles Switched)</span>}
                                                                </h3>
                                                                <div className="text-right">
                                                                    <div className={`text-lg font-bold ${round.role === 'prosecutor' ? 'text-red-300' : 'text-blue-300'}`}>
                                                                        🏆 {round.role === 'prosecutor' ? 'Prosecutor' : 'Defender'} Won
                                                                    </div>
                                                                    <div className="text-sm text-white/60">
                                                                        Score: {round.prosecutorScore} - {round.defenderScore}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Round Arguments */}
                                                        <div className="space-y-4 ml-4">
                                                            {gameState.arguments.map((argument, argIndex) => {
                                                                
                                                                return (
                                                                    <div >
                                                                        {/* Exchange Header */}
                                                                        {argument.role === 'prosecutor' && (
                                                                            <div className="text-center text-sm text-white/50 mb-3 font-semibold">
                                                                                Exchange #{argument.exchange}
                                                                            </div>
                                                                        )}
                                                                        {/* Argument */}
                                                                        <div className="relative overflow-hidden ">
                                                                            {/* Glass morphism background - fix layering and only round right side */}
                                                                            <div className={`absolute inset-0 ${argument.role === 'prosecutor'
                                                                                    ? 'bg-gradient-to-br from-red-500/20 via-red-400/10 to-orange-500/20 border-l-4'
                                                                                    : 'bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-indigo-500/20 border-r-4'
                                                                                } backdrop-blur-sm  ${argument.role === 'prosecutor'
                                                                                    ? 'border-red-400 rounded-r-xl'
                                                                                    : 'border-blue-400 rounded-l-xl'
                                                                                } shadow-lg `}></div>
                                                                            {/* Content */}
                                                                            <div className="relative z-10 p-4">
                                                                                <div className="flex items-center justify-between mb-3">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <span className="text-xl">
                                                                                            {argument.role === 'prosecutor' ? '🔥' : '🛡️'}
                                                                                        </span>
                                                                                        <span className={`font-semibold ${argument.role === 'prosecutor' ? 'text-red-300' : 'text-blue-300'}`}>
                                                                                            {argument.playerId === leftPlayer?.id ? leftPlayer?.username : rightPlayer?.username}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-4">
                                                                                        {argument.score !== undefined && (
                                                                                            <span className={`text-lg font-bold ${argument.score >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                                                                                {argument.score >= 0 ? `+${argument.score}` : argument.score}
                                                                                            </span>
                                                                                        )}
                                                                                        <span className="text-xs text-white/50">
                                                                                            Arg #{argIndex + 1}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                <p className="text-white/90 leading-relaxed">{argument.argument}</p>
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
