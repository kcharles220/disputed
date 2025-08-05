'use client';

import { use, useEffect, useState } from 'react';
import { GameRoom, Player, socketService } from '../../../services/socketService';
import { useTranslation } from 'react-i18next';



interface CaseReadingModalProps {
    showCaseModal: boolean;
    setShowCaseModal: (show: boolean) => void;
    gameState: GameRoom;
    currentPlayer: Player;
    leftPlayer: Player | null;
    rightPlayer: Player | null;
}

export default function CaseReadingModal({
    showCaseModal,
    setShowCaseModal,
    gameState,
    currentPlayer,
    leftPlayer,
    rightPlayer
}: CaseReadingModalProps) {
    const [timeLeft, setTimeLeft] = useState(120); // Default to 60 seconds
    const { t } = useTranslation('common');
    useEffect(() => {
        const socket = socketService.getSocket();
        if (!socket) return;

        // Listen for timerUpdate from server
        const handleTimerUpdate = (timer: { timerValue: number; timerRemaining: number; timerRunning: boolean }) => {
            setTimeLeft(timer.timerRemaining);
            console.log('Timer update received:', timer);

        };


        socket.on('timerUpdate', handleTimerUpdate);

        return () => {
            socket.off('timerUpdate', handleTimerUpdate);
        };


    }, []);

    const toggleReady = () => {

        if (gameState) {
            const newReadyState = !currentPlayer?.ready;
            console.log('Toggling ready for room:', gameState.roomId, 'Sending ready:', newReadyState);
            socketService.toggleReady(gameState.roomId, newReadyState);
        }
    };
    if (!showCaseModal || !gameState.caseDetails) return null;

    return (
        <div
            className="fixed inset-0 bg-slate-900/95 backdrop-blur-lg flex items-center justify-center z-50 p-4 overflow-y-auto"

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



                    <div className="p-8 text-gray-800 relative z-10">
                        <div className="text-center mb-6">
                            <h1 className="text-4xl font-bold text-slate-800 mb-2 drop-shadow-sm">
                                ⚖️ {t("legal_case_file")} ⚖️
                            </h1>
                            <p className="text-slate-700/90 font-medium">{t("study_details")}</p>
                        </div>

                        {/* Case Details */}
                        <div className="bg-white/80 rounded-xl p-6 mb-6 shadow-lg border border-slate-300/70 backdrop-blur-sm">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                📋 {gameState.caseDetails.title}
                            </h2>

                            <div className="space-y-4">
                                <div className="bg-slate-100/90 rounded-lg p-4 border-l-4 border-slate-500">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-2">📖 {t("the_situation")}:</h3>
                                    <p className="text-slate-700 leading-relaxed mb-3">{gameState.caseDetails.description}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                    <div className={`rounded-lg p-4 border-l-4 shadow-sm ${leftPlayer?.currentRole === 'prosecutor' ? 'bg-red-100/90 border-red-500' : 'bg-blue-100/90 border-blue-500'}`}>
                                        <h4 className={`font-bold mb-2 flex items-center gap-2 ${leftPlayer?.currentRole === 'prosecutor' ? 'text-red-800' : 'text-blue-800'}`}>
                                            {leftPlayer?.currentRole === 'prosecutor' ? '⚔️ ' + t("prosecution_position") : '🛡️ ' + t("defense_position")}
                                        </h4>
                                        <p className="text-slate-700 text-sm">
                                            {leftPlayer?.currentRole === 'prosecutor'
                                                ? gameState.caseDetails.prosecutionPosition
                                                : gameState.caseDetails.defensePosition}
                                        </p>
                                    </div>
                                    <div className={`rounded-lg p-4 border-l-4 shadow-sm ${rightPlayer?.currentRole === 'prosecutor' ? 'bg-red-100/90 border-red-500' : 'bg-blue-100/90 border-blue-500'}`}>
                                        <h4 className={`font-bold mb-2 flex items-center gap-2 ${rightPlayer?.currentRole === 'prosecutor' ? 'text-red-800' : 'text-blue-800'}`}>
                                            {rightPlayer?.currentRole === 'prosecutor' ? '⚔️ ' + t("prosecution_position") : '🛡️ ' + t("defense_position")}
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

                        {/* Player Assignment Cards - Only show during initial case reading */}
                        {(
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                {/* Left side - Original Prosecutor Position */}
                                {(() => {


                                    return (
                                        <div className={`rounded-xl p-6 shadow-lg border-2 transition-all duration-200 ${currentPlayer?.position === 'left'
                                            ? currentPlayer?.ready
                                                ? 'bg-green-100/90 border-green-400 shadow-green-200/50 transform scale-105'
                                                : leftPlayer?.currentRole === 'prosecutor'
                                                    ? 'bg-white/80 border-red-300 shadow-red-200/50 transform scale-105'
                                                    : 'bg-white/80 border-blue-300 shadow-blue-200/50 transform scale-105'
                                            : gameState.players.find(p => p.id !== currentPlayer?.id)?.ready
                                                ? 'bg-green-100/90 border-green-400 shadow-green-200/50 opacity-75'
                                                : 'bg-white/80 border-gray-300 opacity-75'
                                            }`}>
                                            <div className="text-center">
                                                <div className={`w-16 h-16 mx-auto mb-3 ${leftPlayer?.currentRole === 'prosecutor'
                                                    ? 'bg-gradient-to-br from-red-400 to-red-600'
                                                    : 'bg-gradient-to-br from-blue-400 to-blue-600'
                                                    } rounded-full flex items-center justify-center text-2xl text-white shadow-lg`}>
                                                    {leftPlayer?.avatar || '⚖️'}
                                                </div>
                                                <h3 className={`text-xl font-bold mb-2 ${leftPlayer?.currentRole === 'prosecutor' ? 'text-red-700' : 'text-blue-700'
                                                    }`}>
                                                    {leftPlayer?.currentRole === 'prosecutor' ? t('prosecutor_caps') : t('defender_caps')}
                                                    {currentPlayer?.position === 'left' && (
                                                        <span className="ml-2 text-amber-600 text-lg font-bold">({t('you')})</span>
                                                    )}
                                                </h3>
                                                <p className="text-slate-700 font-medium mb-3">{leftPlayer?.username}</p>

                                                <div className="flex items-center justify-center mb-3">
                                                    {currentPlayer?.position === 'left' ? (
                                                        currentPlayer?.ready ? (
                                                            <span className="text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full">✅ {t('ready')}</span>
                                                        ) : (
                                                            <span className="text-amber-600 bg-amber-100 px-3 py-1 rounded-full">📖 {t('reading')}</span>
                                                        )
                                                    ) : (
                                                        gameState.players.find(p => p.id !== currentPlayer?.id)?.ready ? (
                                                            <span className="text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full">✅ {t('ready')}</span>
                                                        ) : (
                                                            <span className="text-amber-600 bg-amber-100 px-3 py-1 rounded-full">📖 {t('reading')}</span>
                                                        )
                                                    )}
                                                </div>
                                                <p className={`text-sm px-3 py-2 rounded-lg ${leftPlayer?.currentRole === 'prosecutor'
                                                    ? 'bg-red-50 text-red-700'
                                                    : 'bg-blue-50 text-blue-700'
                                                    }`}>
                                                    {t('arguing_for')}: {leftPlayer?.currentRole === 'prosecutor' ? gameState.caseDetails.prosecutionPosition : gameState.caseDetails.defensePosition}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Right side - Original Defender Position */}
                                {(() => {


                                    return (
                                        <div className={`rounded-xl p-6 shadow-lg border-2 transition-all duration-200 ${currentPlayer?.position === 'right'
                                            ? currentPlayer?.ready
                                                ? 'bg-green-100/90 border-green-400 shadow-green-200/50 transform scale-105'
                                                : rightPlayer?.currentRole === 'prosecutor'
                                                    ? 'bg-white/80 border-red-300 shadow-red-200/50 transform scale-105'
                                                    : 'bg-white/80 border-blue-300 shadow-blue-200/50 transform scale-105'
                                            : gameState.players.find(p => p.id !== currentPlayer?.id)?.ready
                                                ? 'bg-green-100/90 border-green-400 shadow-green-200/50 opacity-75'
                                                : 'bg-white/80 border-gray-300 opacity-75'
                                            }`}>
                                            <div className="text-center">
                                                <div className={`w-16 h-16 mx-auto mb-3 ${rightPlayer?.currentRole === 'prosecutor'
                                                    ? 'bg-gradient-to-br from-red-400 to-red-600'
                                                    : 'bg-gradient-to-br from-blue-400 to-blue-600'
                                                    } rounded-full flex items-center justify-center text-2xl text-white shadow-lg`}>
                                                    {rightPlayer?.avatar || '⚖️'}
                                                </div>
                                                <h3 className={`text-xl font-bold mb-2 ${rightPlayer?.currentRole === 'prosecutor' ? 'text-red-700' : 'text-blue-700'
                                                    }`}>
                                                    {rightPlayer?.currentRole === 'prosecutor' ? t('prosecutor_caps') : t('defender_caps')}
                                                    {currentPlayer?.position === 'right' && (
                                                        <span className="ml-2 text-amber-600 text-lg font-bold">({t('you')})</span>
                                                    )}
                                                </h3>
                                                <p className="text-slate-700 font-medium mb-3">{rightPlayer?.username}</p>

                                                <div className="flex items-center justify-center mb-3">
                                                    {currentPlayer?.position === 'right' ? (
                                                        currentPlayer?.ready ? (
                                                            <span className="text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full">✅ {t('ready')}</span>
                                                        ) : (
                                                            <span className="text-amber-600 bg-amber-100 px-3 py-1 rounded-full">📖 {t('reading')}</span>
                                                        )
                                                    ) : (
                                                        gameState?.players.find(p => p.id !== currentPlayer?.id)?.ready ? (
                                                            <span className="text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full">✅ {t('ready')}</span>
                                                        ) : (
                                                            <span className="text-amber-600 bg-amber-100 px-3 py-1 rounded-full">📖 {t('reading')}</span>
                                                        )
                                                    )}
                                                </div>
                                                <p className={`text-sm px-3 py-2 rounded-lg ${rightPlayer?.currentRole === 'prosecutor'
                                                    ? 'bg-red-50 text-red-700'
                                                    : 'bg-blue-50 text-blue-700'
                                                    }`}>
                                                    {t('arguing_for')}: {rightPlayer?.currentRole === 'prosecutor' ? gameState.caseDetails.prosecutionPosition : gameState.caseDetails.defensePosition}
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
                                {(
                                    <div className="flex items-center justify-center gap-4 mb-4">
                                        <div className={`bg-white/95 px-6 py-3 rounded-xl shadow-lg border-2 transition-all duration-200 ${timeLeft <= 30
                                            ? 'border-red-500 animate-pulse'
                                            : 'border-slate-500'
                                            }`}>
                                            <span className={`font-bold ${timeLeft <= 30 ? 'text-red-700' : 'text-slate-800'
                                                }`}>
                                                ⏰ {t('time_remaining')}: {timeLeft}
                                            </span>
                                        </div>
                                    </div>
                                )}



                                {/* Only show ready button and auto-start warning during initial case reading */}
                                {(
                                    <>
                                        <button
                                            onClick={toggleReady}
                                            disabled={currentPlayer?.ready && gameState.players.find(p => p.id !== currentPlayer?.id)?.ready}
                                            className={`px-8 py-4 font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg border-2 ${currentPlayer?.ready
                                                ? 'bg-green-600 hover:bg-green-700 border-green-500 text-white'
                                                : 'bg-slate-600 hover:bg-slate-700 border-slate-500 text-white'
                                                } ${currentPlayer?.ready && gameState.players.find(p => p.id !== currentPlayer?.id)?.ready ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {currentPlayer?.ready ? '✅ ' + t("ready") + '!': '📖 ' + t("not_ready")}
                                        </button>
                                                
                                        {timeLeft <= 10 && (
                                            <div className="mt-4 bg-red-200/90 border-2 border-red-500 rounded-lg p-3 animate-pulse">
                                                <div className="text-red-800 font-bold">
                                                    ⚠️ {t('battle_start_warning', { timeLeft })}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}


                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
