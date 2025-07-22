'use client';

import { GameRoom, Player } from '../../../services/socketService';



interface CaseReviewModalProps {
    showCaseReviewModal: boolean;
    setShowCaseReviewModal: (show: boolean) => void;
    gameState: GameRoom;
    currentPlayer: Player;
    leftPlayer: Player | null;
    rightPlayer: Player | null;
}

export default function CaseReviewModal({
    showCaseReviewModal,
    setShowCaseReviewModal,
    gameState,
    currentPlayer,
    leftPlayer,
    rightPlayer
}: CaseReviewModalProps) {
    if (!showCaseReviewModal || !gameState.caseDetails) return null;

    return (
        <div
            className="fixed inset-0 bg-slate-900/95 backdrop-blur-lg flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={(e) => {
                // Only allow clicking outside to close during review mode (when both players are ready)

                setShowCaseReviewModal(false);

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


                    <button
                        onClick={() => setShowCaseReviewModal(false)}
                        className="absolute top-6 right-6 w-10 h-10 bg-gradient-to-br from-red-600/90 to-red-700/90 hover:from-red-500/90 hover:to-red-600/90 rounded-full flex items-center justify-center text-white/95 hover:text-white transition-all duration-200 z-20 shadow-lg border border-red-500/60"
                    >
                        ✕
                    </button>


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
                                📋 {gameState.caseDetails.title}
                            </h2>

                            <div className="space-y-4">
                                <div className="bg-slate-100/90 rounded-lg p-4 border-l-4 border-slate-500">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-2">📖 The Situation:</h3>
                                    <p className="text-slate-700 leading-relaxed mb-3">{gameState.caseDetails.description}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                    <div className={`rounded-lg p-4 border-l-4 shadow-sm ${leftPlayer?.currentRole === 'prosecutor' ? 'bg-red-100/90 border-red-500' : 'bg-blue-100/90 border-blue-500'}`}>
                                        <h4 className={`font-bold mb-2 flex items-center gap-2 ${leftPlayer?.currentRole === 'prosecutor' ? 'text-red-800' : 'text-blue-800'}`}>
                                            {leftPlayer?.currentRole === 'prosecutor' ? '⚔️ Prosecution\'s Position:' : '🛡️ Defense\'s Position:'}
                                        </h4>
                                        <p className="text-slate-700 text-sm">
                                            {leftPlayer?.currentRole === 'prosecutor'
                                                ? gameState.caseDetails.prosecutionPosition
                                                : gameState.caseDetails.defensePosition}
                                        </p>
                                    </div>
                                    <div className={`rounded-lg p-4 border-l-4 shadow-sm ${rightPlayer?.currentRole === 'prosecutor' ? 'bg-red-100/90 border-red-500' : 'bg-blue-100/90 border-blue-500'}`}>
                                        <h4 className={`font-bold mb-2 flex items-center gap-2 ${rightPlayer?.currentRole === 'prosecutor' ? 'text-red-800' : 'text-blue-800'}`}>
                                            {rightPlayer?.currentRole === 'prosecutor' ? '⚔️ Prosecution\'s Position:' : '🛡️ Defense\'s Position:'}
                                        </h4>
                                        <p className="text-slate-700 text-sm">
                                            {rightPlayer?.currentRole === 'prosecutor'
                                                ? gameState.caseDetails.prosecutionPosition
                                                : gameState.caseDetails.defensePosition}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>



                        <div className="text-center">
                            <div className="mb-6">



                                <div className="bg-blue-200/90 border-2 border-blue-500 rounded-xl p-6">
                                    <p className="text-blue-900 font-medium">📚 Case Review Mode</p>
                                    <p className="text-blue-800 text-sm mt-1">You can review the case details anytime during the battle</p>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
