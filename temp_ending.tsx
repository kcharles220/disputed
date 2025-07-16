                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Game End Modal */}
            {gameState.gamePhase === 'finished' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-12 border border-gray-600 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="text-center mb-8">
                            <div className="text-8xl mb-4">⚖️</div>
                            <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-4">
                                BATTLE COMPLETE!
                            </h1>
                            <div className="text-4xl font-bold mb-6">
                                {(() => {
                                    const leftPlayerWins = getLeftPlayerRoundWins();
                                    const rightPlayerWins = getRightPlayerRoundWins();
                                    if (leftPlayerWins === rightPlayerWins) {
                                        return <span className="text-gray-300">🤝 It's a Tie!</span>;
                                    } else if (leftPlayerWins > rightPlayerWins) {
                                        const leftPlayer = room?.players.find(p => p.originalRole === 'attacker');
                                        return <span className="text-red-400">🏆 {leftPlayer?.name} WINS!</span>;
                                    } else {
                                        const rightPlayer = room?.players.find(p => p.originalRole === 'defender');
                                        return <span className="text-blue-400">🏆 {rightPlayer?.name} WINS!</span>;
                                    }
                                })()}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={() => setShowFullBattleLog(true)}
                                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg text-lg"
                            >
                                📜 View Full Battle Log
                            </button>
                            <button
                                onClick={() => router.push('/lobby')}
                                className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg text-lg"
                            >
                                🏠 Return to Lobby
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Battle Log Modal */}
            {showFullBattleLog && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] border border-gray-600 overflow-hidden">
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
                        </div>

                        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                            <p className="text-gray-500 text-center py-12">Battle log will be displayed here.</p>
                        </div>

                        <div className="p-6 border-t border-gray-600 bg-gray-800/50">
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-400">
                                    Battle completed
                                </div>
                                <button
                                    onClick={() => setShowFullBattleLog(false)}
                                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
