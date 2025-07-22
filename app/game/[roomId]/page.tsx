'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { socketService, GameRoom, Player } from '../../services/socketService';
import CaseReadingModal from './components/CaseReadingModal';
import RoundCompleteModal from './components/RoundCompleteModal';
import SideChoiceModal from './components/SideChoiceModal';
import GameCompleteModal from './components/GameCompleteModal';
import { set } from 'zod';
import { ar } from 'zod/locales';
import CaseReviewModal from './components/CaseReviewModal';


export default function GameBattle() {
    // Placeholder definitions for missing variables and functions
    const timerPhase: number = 1;
    const timeLeft = 30;
    const [currentArgument, setCurrentArgument] = useState<string>('');
    const handleSubmitArgument = () => {
        const socket = socketService.getSocket();
        if (socket && roomId && currentArgument.trim()) {
            socket.emit('submitArgument', {
                roomId,
                argument: currentArgument
            });
        }
        setCurrentArgument('');
    };
    const canInterrupt = false;
    const handleInterrupt = () => { };


    const searchParams = useSearchParams();
    const router = useRouter();
    const roomId = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : null;
    const [gameState, setGameState] = useState<GameRoom | null>(null);
    const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
    const [nonCurrentPlayer, setNonCurrentPlayer] = useState<Player | null>(null);

    const [leftPlayer, setLeftPlayer] = useState<Player | null>(null);
    const [rightPlayer, setRightPlayer] = useState<Player | null>(null);

    const [showGameCompleteModal, setShowGameCompleteModal] = useState<boolean>(false);
    const [showRoundCompleteModal, setShowRoundCompleteModal] = useState<boolean>(false);
    const [showCaseModal, setShowCaseModal] = useState<boolean>(false);
    const [showSideChoiceModal, setShowSideChoiceModal] = useState<boolean>(false);
    const [showCaseReviewModal, setShowCaseReviewModal] = useState<boolean>(false);





    useEffect(() => {
        const socket = socketService.getSocket();
        if (!socket) return;

        // Listen for gameStateUpdate from server
        const handleGameStateUpdate = (newGameState: GameRoom) => {
            console.log('Game state retrieved:', newGameState);
            setGameState(newGameState);

            const socketId = socketService.getSocket()?.id;

            const player = newGameState.players.find((p: any) => p.socketId === socketId);
            setCurrentPlayer(player || null);
            setNonCurrentPlayer(newGameState.players.find((p: any) => p.socketId !== socketId) || null);
            setLeftPlayer(newGameState.players.find((p: any) => p.position === 'left') || null);
            setRightPlayer(newGameState.players.find((p: any) => p.position === 'right') || null);
        };
        socket.on('gameStateUpdate', handleGameStateUpdate);
        console.log('Socket connected:', socket.id);

        // Emit request-room-info only after listener is registered
        const roomId = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : null;
        if (socket && roomId) {
            console.log('Emitting request-room-info with roomId:', roomId);
            socketService.requestRoomInfo(roomId);
        }

        return () => {
            socket.off('gameStateUpdate', handleGameStateUpdate);
        };


    }, []);

    useEffect(() => {
        /*if (gameState && gameState.gameState === 'ready-to-start') {
            socketService.proceed(gameState.roomId);
        }*/
    }, [gameState]);

    // Open CaseReadingModal if gameState is 'case-reading'
    useEffect(() => {
        switch (gameState?.gameState) {
            case 'case-reading':
                setShowCaseModal(true);
                break;
            case 'game-start':
                setShowCaseModal(false);
                break;
            case 'round-over':
                setShowRoundCompleteModal(true);
                break;
            case 'round-complete':
                setShowRoundCompleteModal(true);
                break;
            case 'game-complete':
                setShowGameCompleteModal(true);
                break;
            case 'side-choice':
                setShowSideChoiceModal(true);
                break;
            default:
                setShowCaseModal(false);
                setShowRoundCompleteModal(false);
                setShowGameCompleteModal(false);
                setShowSideChoiceModal(false);
        }
    }, [gameState]);
    if (!gameState) {
        // Loading animation while waiting for gameState
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-yellow-400 mb-8"></div>
                    <div className="text-2xl text-white font-bold">Loading game...</div>
                    <div className="text-white/70 mt-2">Please wait while we connect to the game room.</div>
                </div>
            </div>
        );
    }
    return (

        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 relative overflow-hidden">
            {/* Dynamic background effects based on current prosecutor/defender positions */}
            <div className="absolute inset-0">
                {(() => {


                    return (
                        <>
                            {/* Left side - Dynamic color based on current role */}
                            <div className="absolute inset-y-0 left-0 w-1/2">
                                {leftPlayer?.currentRole === 'prosecutor' ? (
                                    // Red effects for prosecutor
                                    <>
                                        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-red-500/15 rounded-full blur-3xl animate-pulse"></div>
                                        <div className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                                        <div className="absolute top-2/3 left-1/6 w-64 h-64 bg-red-600/12 rounded-full blur-3xl animate-pulse delay-2000"></div>
                                    </>
                                ) : (
                                    // Blue effects for defender
                                    <>
                                        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl animate-pulse"></div>
                                        <div className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                                        <div className="absolute top-2/3 left-1/6 w-64 h-64 bg-blue-600/12 rounded-full blur-3xl animate-pulse delay-2000"></div>
                                    </>
                                )}
                            </div>

                            {/* Right side - Dynamic color based on current role */}
                            <div className="absolute inset-y-0 right-0 w-1/2">
                                {rightPlayer?.currentRole === 'prosecutor' ? (
                                    // Red effects for prosecutor
                                    <>
                                        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-red-500/15 rounded-full blur-3xl animate-pulse delay-500"></div>
                                        <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1500"></div>
                                        <div className="absolute top-2/3 right-1/6 w-64 h-64 bg-red-600/12 rounded-full blur-3xl animate-pulse delay-2500"></div>
                                    </>
                                ) : (
                                    // Blue effects for defender
                                    <>
                                        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl animate-pulse delay-500"></div>
                                        <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1500"></div>
                                        <div className="absolute top-2/3 right-1/6 w-64 h-64 bg-blue-600/12 rounded-full blur-3xl animate-pulse delay-2500"></div>
                                    </>
                                )}
                            </div>

                            {/* Center neutral zone */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl animate-pulse delay-1000"></div>

                            {/* Subtle dividing line effect */}
                            <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
                        </>
                    );
                })()}
            </div>

            {/* Content overlay */}
            <div className="relative z-10 text-white">
                {/* Case Modal */}
                {currentPlayer && gameState && (
                    <CaseReadingModal
                        showCaseModal={showCaseModal}
                        setShowCaseModal={setShowCaseModal}
                        gameState={gameState}
                        currentPlayer={currentPlayer}
                        leftPlayer={leftPlayer}
                        rightPlayer={rightPlayer}
                    />
                )}
                {/* Case Review Modal */}
                {currentPlayer && gameState && (
                    <CaseReviewModal
                        showCaseReviewModal={showCaseReviewModal}
                        setShowCaseReviewModal={setShowCaseReviewModal}
                        gameState={gameState}
                        currentPlayer={currentPlayer}
                        leftPlayer={leftPlayer}
                        rightPlayer={rightPlayer}
                    />
                )}
                {/* Round Complete Modal */}
                {currentPlayer && gameState && (
                    <RoundCompleteModal
                        gameState={gameState}
                        currentPlayer={currentPlayer}
                        leftPlayer={leftPlayer}
                        rightPlayer={rightPlayer}
                        showRoundCompleteModal={showRoundCompleteModal}
                        setShowRoundCompleteModal={setShowRoundCompleteModal}
                        setShowGameCompleteModal={setShowGameCompleteModal}
                    />
                )}

                {/* Side Choice Modal */}
                {currentPlayer && gameState && (
                    <SideChoiceModal
                        gameState={gameState}
                        currentPlayer={currentPlayer}
                        leftPlayer={leftPlayer}
                        rightPlayer={rightPlayer}
                        showSideChoiceModal={showSideChoiceModal}
                        setShowSideChoiceModal={setShowSideChoiceModal}
                    />
                )}
                {/* Game Complete Modal */}
                {currentPlayer && gameState && (
                    <GameCompleteModal
                        gameState={gameState}
                        currentPlayer={currentPlayer}
                        leftPlayer={leftPlayer}
                        rightPlayer={rightPlayer}
                        showGameCompleteModal={showGameCompleteModal}
                        setShowGameCompleteModal={setShowGameCompleteModal}
                    />
                )}
                {/* Main Game Interface */}
                {gameState?.gameState === 'round-start' && (
                    <div className="min-h-screen px-8 py-8">

                        {/* Players Section - Top positioning */}
                        <div className="flex w-full gap-8 mb-10 items-center">
                            {(() => {




                                return (
                                    <div className={`w-[35%] relative overflow-hidden transition-all duration-300 h-36 ${leftPlayer?.id === currentPlayer?.id
                                        ? 'transform scale-105'
                                        : 'opacity-80'
                                        }`}>
                                        {/* Glass morphism background */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${leftPlayer?.currentRole === 'prosecutor'
                                            ? 'from-red-500/20 via-red-400/10 to-orange-500/20'
                                            : 'from-blue-500/20 via-blue-400/10 to-indigo-500/20'
                                            } backdrop-blur-xl rounded-2xl border ${leftPlayer?.id === currentPlayer?.id
                                                ? (leftPlayer?.currentRole === 'prosecutor' ? 'border-red-400/50 shadow-red-500/25' : 'border-blue-400/50 shadow-blue-500/25')
                                                : (leftPlayer?.currentRole === 'prosecutor' ? 'border-red-500/30' : 'border-blue-500/30')
                                            } shadow-2xl`}></div>

                                        {/* Decorative elements */}
                                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-500/10 rounded-full blur-lg"></div>

                                        {/* Content */}
                                        <div className="relative z-10 p-6 flex items-center gap-6 h-full">
                                            {/* Avatar */}
                                            <div className={`w-16 h-16 bg-gradient-to-br ${leftPlayer?.currentRole === 'prosecutor'
                                                ? 'from-red-500 to-orange-600'
                                                : 'from-blue-500 to-indigo-600'
                                                } rounded-full flex items-center justify-center text-3xl flex-shrink-0 border-2 ${leftPlayer?.currentRole === 'prosecutor' ? 'border-red-300/50' : 'border-blue-300/50'
                                                } shadow-lg`}>
                                                {leftPlayer?.avatar || '⚖️'}
                                            </div>

                                            {/* Text */}
                                            <div className="flex-1">
                                                <h3 className={`text-2xl font-bold ${leftPlayer?.currentRole === 'prosecutor' ? 'text-red-300' : 'text-blue-300'} mb-1`}>
                                                    {leftPlayer?.currentRole?.toUpperCase()} {leftPlayer?.id === currentPlayer?.id && (
                                                        <span className="mx-2 text-yellow-300 text-lg font-semibold">(YOU)</span>
                                                    )}
                                                </h3>
                                                <p className="text-white/90 font-medium text-lg">{leftPlayer?.username}</p>
                                                <div className="text-sm text-white/60 mt-1">
                                                    {leftPlayer?.currentRole === 'prosecutor' ? gameState.caseDetails?.prosecutionPosition || 'Plaintiff' : gameState.caseDetails?.defensePosition || 'Defendant'}
                                                </div>
                                            </div>

                                            {/* Timer for current turn */}
                                            {gameState.turn === leftPlayer?.id && gameState.gameState === 'round-start' && (
                                                <div className={`text-2xl font-bold flex-shrink-0 ${timerPhase === 1
                                                    ? (timeLeft <= 3 ? 'text-red-300 animate-pulse' : 'text-green-300')
                                                    : 'text-orange-300 animate-pulse'
                                                    }`}>
                                                    {timerPhase === 1 ? '⏱️' : '⚡'} {timeLeft}s
                                                    {timerPhase === 2 && (
                                                        <div className="text-xs text-orange-200 mt-1">INTERRUPT PHASE</div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Dot indicator */}
                                            {gameState.turn === leftPlayer?.id && gameState.gameState === 'round-start' && (
                                                <div className={`w-5 h-5 ${leftPlayer?.currentRole === 'prosecutor' ? 'bg-red-400' : 'bg-blue-400'} rounded-full animate-pulse flex-shrink-0 shadow-lg`}></div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Left Score - 5% width */}
                            <div className="w-[5%] flex flex-col items-center justify-center">
                                {(() => {

                                    return (
                                        <>
                                            <span className={`text-8xl font-bold bg-gradient-to-b ${leftPlayer?.currentRole === 'prosecutor' ? 'from-red-300 to-red-500' : 'from-blue-300 to-blue-500'
                                                } bg-clip-text text-transparent drop-shadow-lg`}>
                                                {leftPlayer?.points}
                                            </span>
                                            <span className={`text-sm mt-1 ${leftPlayer?.currentRole === 'prosecutor' ? 'text-red-200' : 'text-blue-200'}`}>
                                                {leftPlayer?.score}
                                            </span>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Header - Center - 20% width */}
                            <div className="w-[20%] text-center relative">


                                {/* Content */}
                                <div className="relative z-10 p-6">
                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent mb-4 drop-shadow-lg">
                                        Dispute!
                                    </h1>
                                    <div className="flex flex-col items-center gap-2 text-base text-white/80 mb-4">
                                        <span className="font-semibold">Round {gameState.round}/3</span>
                                        {gameState.round === 2 && (
                                            <span className="text-yellow-300 text-sm font-bold animate-pulse">🔄 ROLES SWITCHED!</span>
                                        )}
                                        <span>Turn: {(() => {
                                            if ((gameState.players.find(p => p.id === gameState.turn)?.currentRole === 'prosecutor')) {
                                                return `🔥 ${gameState.players.find(p => p.id === gameState.turn)?.username || 'Prosecutor'}`;
                                            } else {
                                                return `🛡️ ${gameState.players.find(p => p.id === gameState.turn)?.username || 'Defender'}`;
                                            }
                                        })()}</span>
                                        <span>
                                            Arguments: {gameState.exchange}/3 exchanges
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => setShowCaseReviewModal(true)}
                                            className="px-6 py-3 bg-gradient-to-r from-gray-600/80 to-gray-700/80 hover:from-gray-500/80 hover:to-gray-600/80 text-white rounded-xl transition-all duration-200 text-sm border border-white/20 backdrop-blur-sm transform hover:scale-105 shadow-lg"
                                        >
                                            📋 Review Case
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Score - 5% width */}
                            <div className="w-[5%] flex flex-col items-center justify-center">
                                {(() => {

                                    return (
                                        <>
                                            <span className={`text-8xl font-bold bg-gradient-to-b ${rightPlayer?.currentRole === 'prosecutor' ? 'from-red-300 to-red-500' : 'from-blue-300 to-blue-500'
                                                } bg-clip-text text-transparent drop-shadow-lg`}>
                                                {rightPlayer?.points}
                                            </span>
                                            <span className={`text-sm mt-1 ${rightPlayer?.currentRole === 'prosecutor' ? 'text-red-200' : 'text-blue-200'}`}>
                                                {rightPlayer?.score}
                                            </span>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Right side - Original Defender Position */}
                            {(() => {


                                return (
                                    <div className={`w-[35%] relative overflow-hidden transition-all duration-300 h-36 ${currentPlayer?.id === rightPlayer?.id
                                        ? 'transform scale-105'
                                        : 'opacity-80'
                                        }`}>
                                        {/* Glass morphism background */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${rightPlayer?.currentRole === 'prosecutor'
                                            ? 'from-red-500/20 via-red-400/10 to-orange-500/20'
                                            : 'from-blue-500/20 via-blue-400/10 to-indigo-500/20'
                                            } backdrop-blur-xl rounded-2xl border ${currentPlayer?.position === 'right'
                                                ? (rightPlayer?.currentRole === 'prosecutor' ? 'border-red-400/50 shadow-red-500/25' : 'border-blue-400/50 shadow-blue-500/25')
                                                : (rightPlayer?.currentRole === 'prosecutor' ? 'border-red-500/30' : 'border-blue-500/30')
                                            } shadow-2xl`}></div>

                                        {/* Decorative elements */}
                                        <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                                        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-purple-500/10 rounded-full blur-lg"></div>

                                        {/* Content */}
                                        <div className="relative z-10 p-6 flex items-center gap-6 h-full">
                                            {/* Dot indicator */}
                                            {gameState.turn === rightPlayer?.id && gameState.gameState === 'round-start' && (
                                                <div className={`w-5 h-5 ${rightPlayer?.currentRole === 'prosecutor' ? 'bg-red-400' : 'bg-blue-400'} rounded-full animate-pulse flex-shrink-0 shadow-lg`}></div>
                                            )}

                                            {/* Timer */}
                                            {gameState.turn === rightPlayer?.id && gameState.gameState === 'round-start' && (
                                                <div className={`text-2xl font-bold flex-shrink-0 ${timerPhase === 1
                                                    ? (timeLeft <= 3 ? 'text-red-300 animate-pulse' : 'text-green-300')
                                                    : 'text-orange-300 animate-pulse'
                                                    }`}>
                                                    {timerPhase === 1 ? '⏱️' : '⚡'} {timeLeft}s
                                                    {timerPhase === 2 && (
                                                        <div className="text-xs text-orange-200 mt-1">INTERRUPT PHASE</div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Text */}
                                            <div className="flex-1 text-right">
                                                <h3 className={`text-2xl font-bold ${rightPlayer?.currentRole === 'prosecutor' ? 'text-red-300' : 'text-blue-300'} mb-1`}>
                                                    {currentPlayer?.position === 'right' && (
                                                        <span className="mx-2 text-yellow-300 text-lg font-semibold">(YOU)</span>
                                                    )} {rightPlayer?.currentRole?.toUpperCase()}
                                                </h3>
                                                <p className="text-white/90 font-medium text-lg">{rightPlayer?.username}</p>
                                                <div className="text-sm text-white/60 mt-1">
                                                    {rightPlayer?.currentRole === 'prosecutor' ? gameState.caseDetails.prosecutionPosition || 'Plaintiff' : gameState.caseDetails.defensePosition || 'Defendant'}
                                                </div>
                                            </div>

                                            {/* Avatar */}
                                            <div className={`w-16 h-16 bg-gradient-to-br ${rightPlayer?.currentRole === 'prosecutor'
                                                ? 'from-red-500 to-orange-600'
                                                : 'from-blue-500 to-indigo-600'
                                                } rounded-full flex items-center justify-center text-3xl flex-shrink-0 border-2 ${rightPlayer?.currentRole === 'prosecutor' ? 'border-red-300/50' : 'border-blue-300/50'
                                                } shadow-lg`}>
                                                {rightPlayer?.avatar || '⚖️'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Input Section */}
                        {gameState.gameState === 'round-start' && (
                            <div className="relative mb-8 overflow-hidden">
                                {/* Glass morphism background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl"></div>
                                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-purple-500/10 rounded-full blur-lg"></div>

                                {/* Content */}
                                <div className="relative z-10 p-8">
                                    {gameState.turn === currentPlayer?.id ? (
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className={`text-xl font-bold ${timerPhase === 2 ? 'text-red-300 animate-pulse' : 'text-yellow-300'}`}>
                                                    {timerPhase === 2 ? '⚡ HURRY! Opponent can interrupt!' : '🎯 Your Turn! Make your argument:'}
                                                </h3>
                                                <div className={`text-base ${timerPhase === 2 ? 'text-red-300' : 'text-white/70'}`}>
                                                    Exchange {gameState.exchange}/3
                                                    {timerPhase === 2 && <span className="ml-2 animate-pulse">⚡ INTERRUPT PHASE</span>}
                                                </div>
                                            </div>
                                            <div className="mb-4 text-base text-white/70">
                                                {(() => {
                                                    const remaining = 3 - (currentPlayer?.arguments?.filter((arg) => arg.round === gameState.round)?.length ?? 0);
                                                    return `You have ${remaining} argument${remaining !== 1 ? 's' : ''} remaining this round.`;
                                                })()}
                                            </div>
                                            <div className="relative">
                                                <textarea
                                                    value={currentArgument}
                                                    onChange={(e) => setCurrentArgument(e.target.value)}
                                                    placeholder={`Write your ${currentPlayer && currentPlayer.currentRole === 'prosecutor' ? 'attack' : 'defense'} argument here...`}
                                                    className={`w-full h-40 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl p-6 text-white placeholder-white/50 resize-none focus:outline-none text-lg transition-all duration-300 border ${timerPhase === 2
                                                        ? 'border-red-400/60 shadow-red-500/20 animate-pulse focus:border-red-300'
                                                        : 'border-white/20 focus:border-yellow-400/60 shadow-yellow-500/10'
                                                        } shadow-lg`}
                                                    maxLength={250}
                                                    disabled={gameState.gameState !== 'round-start'}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between mt-6">
                                                <span className="text-base text-white/60">
                                                    {currentArgument.length}/250 characters
                                                </span>
                                                <button
                                                    onClick={handleSubmitArgument}
                                                    disabled={!currentArgument.trim() || gameState.gameState !== 'round-start'}
                                                    className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg transform hover:scale-105 shadow-lg border border-yellow-400/30"
                                                >
                                                    🚀 Submit Argument
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="text-4xl mb-4">⏳</div>
                                            <p className="text-white/80 text-xl">
                                                Waiting for {nonCurrentPlayer?.username} to make their argument...
                                            </p>
                                            <div className="text-base text-white/60 mt-3">
                                                Exchange {gameState.exchange}/3 in progress
                                            </div>
                                            {canInterrupt && timerPhase === 2 && (
                                                <div className="mt-4">
                                                    <div className="text-sm text-orange-300 mb-2">⚡ INTERRUPT PHASE ACTIVE ⚡</div>
                                                    <button
                                                        onClick={handleInterrupt}
                                                        className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg animate-pulse border border-red-400/30"
                                                    >
                                                        ⚡ Interrupt Now!
                                                    </button>
                                                    <div className="text-xs text-white/50 mt-2">Time will expire automatically in {timeLeft}s</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Arguments Timeline */}
                        <div className="relative overflow-hidden">
                            {/* Glass morphism background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl"></div>
                            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-purple-500/10 rounded-full blur-lg"></div>

                            {/* Content */}
                            <div className="relative z-10 p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-white">📜 Log</h2>
                                    <div className="text-base text-white/70">
                                        Round {gameState.round} Progress: {gameState.exchange}/3 exchanges
                                    </div>
                                </div>
                                <div className="space-y-6 max-h-[600px] overflow-y-auto">
                                    {gameState.argumentCount === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="text-6xl mb-4 opacity-40">⚖️</div>
                                            <p className="text-white/60 text-lg">
                                                No arguments yet. {gameState.players.find(p => p.currentRole === 'prosecutor')?.username} will start the battle!<br />
                                                <span className="text-base">Each round requires 3 exchanges (6 total arguments) before AI analysis.</span>
                                            </p>
                                        </div>
                                    ) : (
                                        gameState.arguments.filter((arg) => arg.round === gameState.round)?.map((argument, index) => {
                                            const exchangeNumber = argument.exchange;

                                            return (
                                                <div key={index}>
                                                    {argument.role === 'prosecutor' && (
                                                        <div className="border-t border-white/20 my-6 pt-6">
                                                            <div className="text-center text-sm text-white/50 mb-4">
                                                                Exchange #{exchangeNumber}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="relative overflow-hidden rounded-xl">
                                                        {/* Glass morphism background for argument */}
                                                        <div className={`absolute inset-0 ${argument.role === 'prosecutor'
                                                            ? 'bg-gradient-to-br from-red-500/20 via-red-400/10 to-orange-500/20'
                                                            : 'bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-indigo-500/20'
                                                            } backdrop-blur-sm border-l-4 ${argument.role === 'prosecutor'
                                                                ? 'border-red-400'
                                                                : 'border-blue-400'
                                                            } shadow-lg`}></div>

                                                        {/* Content */}
                                                        <div className="relative z-10 p-6">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <span className="text-2xl">
                                                                    {argument.role === 'prosecutor' ? '🔥' : '🛡️'}
                                                                </span>
                                                                <span className={`font-semibold text-lg ${argument.role === 'prosecutor' ? 'text-red-300' : 'text-blue-300'
                                                                    }`}>
                                                                    {gameState.players.find(player => player.id === argument.playerId)?.username} ({argument.role === 'prosecutor' ? 'Prosecutor' : 'Defender'})
                                                                </span>
                                                                <span className="text-sm text-white/50 ml-auto">
                                                                    Argument #{index + 1}
                                                                </span>
                                                            </div>
                                                            <p className="text-white/90 text-lg leading-relaxed">{argument.argument}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
