'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socketService, GameRoom, Player } from '../../services/socketService';

interface GameArgument {
    id: string;
    playerId: string;
    playerName: string;
    content: string;
    timestamp: Date;
    type: 'attack' | 'defense';
}

interface GameState {
    case: {
        id: number;
        title: string;
        description: string;
        context: string;
        attackerSide: string;
        defenderSide: string;
    } | null;
    arguments: GameArgument[];
    currentTurn: 'attacker' | 'defender';
    currentRound: number;
    maxRounds: number;
    scores: { attacker: number; defender: number };
    gamePhase: 'case-reading' | 'arguing' | 'round-complete' | 'finished';
    winner?: string;
    roundResult?: {
        round: number;
        winner: 'attacker' | 'defender';
        analysis: string;
        attackerScore: number;
        defenderScore: number;
    };
}

export default function GameBattle() {
    const params = useParams();
    const router = useRouter();
    console.log('Game page params:', params);
    console.log('Raw params:', JSON.stringify(params));
    console.log('Window location:', typeof window !== 'undefined' ? window.location.href : 'server');
    
    let roomId = params.roomId as string;
    console.log('Extracted roomId from params:', roomId);
    console.log('Type of roomId:', typeof roomId);
    
    // Fallback to localStorage if roomId is undefined
    if ((!roomId || roomId === 'undefined') && typeof window !== 'undefined') {
        const storedRoomId = localStorage.getItem('currentRoomId');
        console.log('Trying localStorage fallback, found:', storedRoomId);
        if (storedRoomId) {
            roomId = storedRoomId;
            console.log('Using stored room ID:', roomId);
        }
    }

    const [room, setRoom] = useState<GameRoom | null>(null);
    const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
    const [gameState, setGameState] = useState<GameState>({
        case: null,
        arguments: [],
        currentTurn: 'attacker',
        currentRound: 1,
        maxRounds: 3,
        scores: { attacker: 0, defender: 0 },
        gamePhase: 'case-reading'
    });

    const [currentArgument, setCurrentArgument] = useState('');
    const [timeLeft, setTimeLeft] = useState(10); // 10 seconds per turn
    const [timerPhase, setTimerPhase] = useState(1); // 1 = normal timer, 2 = interrupt grace period
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [showCaseModal, setShowCaseModal] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [otherPlayerReady, setOtherPlayerReady] = useState(false);
    const [caseReadingTimeLeft, setCaseReadingTimeLeft] = useState(120); // 2 minutes to read case
    const [canInterrupt, setCanInterrupt] = useState(false);

    // Refs to capture current values in event handlers
    const currentPlayerRef = useRef<Player | null>(null);
    const currentArgumentRef = useRef<string>('');

    // Update refs when state changes
    useEffect(() => {
        currentPlayerRef.current = currentPlayer;
    }, [currentPlayer]);

    useEffect(() => {
        currentArgumentRef.current = currentArgument;
    }, [currentArgument]);

    useEffect(() => {
        console.log('Game page useEffect - roomId:', roomId);
        if (!roomId || roomId === 'undefined') {
            console.log('No valid roomId, redirecting to home');
            router.push('/');
            return;
        }

        const initializeGame = async () => {
            try {
                console.log('Initializing game for room:', roomId);
                if (!socketService.getSocket()?.connected) {
                    console.log('Socket not connected, redirecting to join page');
                    router.push(`/join?room=${roomId}`);
                    return;
                }

                // Get room info and current player
                console.log('Getting room info for:', roomId);
                try {
                    const roomInfo = await socketService.getRoomInfo(roomId);
                    console.log('Room info received:', roomInfo);
                    setRoom(roomInfo);
                    
                    // Set the case from server
                    if (roomInfo.case) {
                        setGameState(prev => ({
                            ...prev,
                            case: roomInfo.case || null,
                            currentRound: roomInfo.currentRound || 1,
                            maxRounds: roomInfo.maxRounds || 3,
                            scores: roomInfo.scores || { attacker: 0, defender: 0 }
                        }));
                    }
                    
                    const player = roomInfo.players.find(p => p.id === socketService.getSocket()?.id);
                    setCurrentPlayer(player || null);
                    console.log('Current player:', player);

                    // Check if current player is the attacker (should start first)
                    if (player?.role === 'attacker') {
                        setIsMyTurn(true);
                        console.log('Player is attacker, setting isMyTurn to true');
                    }
                } catch (roomError) {
                    console.error('Failed to get room info:', roomError);
                    // If room not found, redirect back to lobby
                    router.push(`/lobby?room=${roomId}`);
                    return;
                }

                // Set up socket listeners for game events
                socketService.onGameArgument((argument) => {
                    console.log('Received argument:', argument);
                    
                    setGameState(prev => {
                        const newArguments = [...prev.arguments, argument];
                        const newTurn = prev.currentTurn === 'attacker' ? 'defender' : 'attacker';
                        
                        console.log('Switching turn from', prev.currentTurn, 'to', newTurn);
                        
                        return {
                            ...prev,
                            arguments: newArguments,
                            currentTurn: newTurn
                        };
                    });
                });

                socketService.onRoundComplete((result) => {
                    console.log('Round complete:', result);
                    setGameState(prev => ({
                        ...prev,
                        gamePhase: 'round-complete',
                        scores: result.scores,
                        roundResult: result
                    }));
                });

                socketService.onNextRound((data) => {
                    console.log('Next round starting:', data);
                    setGameState(prev => ({
                        ...prev,
                        currentRound: data.round,
                        scores: data.scores,
                        currentTurn: 'attacker',
                        gamePhase: 'arguing',
                        arguments: [],
                        roundResult: undefined
                    }));
                    
                    // Reset turn to attacker for new round
                    if (currentPlayer?.role === 'attacker') {
                        setIsMyTurn(true);
                    } else {
                        setIsMyTurn(false);
                    }
                });

                socketService.onGameEnd((result) => {
                    console.log('Game ended:', result);
                    setGameState(prev => ({
                        ...prev,
                        gamePhase: 'finished',
                        winner: result.winner
                    }));
                });

                // Listen for player ready states
                socketService.getSocket()?.on('playerReady', (data) => {
                    console.log('Player ready update:', data);
                    if (data.playerId !== socketService.getSocket()?.id) {
                        setOtherPlayerReady(data.ready);
                    }
                });

                socketService.getSocket()?.on('bothPlayersReady', () => {
                    console.log('Both players ready, starting game');
                    startGame();
                });

                // Listen for server-side timer updates
                socketService.getSocket()?.on('timer-update', (data) => {
                    console.log('Timer update:', data);
                    setTimeLeft(data.timeLeft);
                    setTimerPhase(data.phase || 1);
                    setGameState(prev => ({
                        ...prev,
                        currentTurn: data.currentTurn
                    }));
                });

                // Listen for time up events (only Phase 2 - final auto-submission)
                socketService.getSocket()?.on('time-up', (data) => {
                    console.log('Time up (Phase 2):', data);
                    
                    // Only auto-submit if it's phase 2 and my turn
                    if (data.phase === 2 && currentPlayerRef.current?.role === data.currentTurn && currentPlayerRef.current) {
                        console.log('Phase 2 timer expired, auto-submitting current argument:', currentArgumentRef.current.trim());
                        
                        const argument: GameArgument = {
                            id: Date.now().toString(),
                            playerId: currentPlayerRef.current.id,
                            playerName: currentPlayerRef.current.name,
                            content: currentArgumentRef.current.trim() || "[No argument provided]" + " [Time expired]",
                            timestamp: new Date(),
                            type: currentPlayerRef.current.role === 'attacker' ? 'attack' : 'defense'
                        };

                        // Submit the current argument
                        socketService.submitArgument(roomId, argument);
                        setCurrentArgument(''); // Clear the argument field
                    }
                });

                // Listen for interrupt availability (Phase 2 only)
                socketService.getSocket()?.on('interrupt-available', (data) => {
                    console.log('Interrupt now available (Phase 2):', data);
                    // Only allow interrupt in phase 2 and if it's not my turn
                    if (data.phase === 2) {
                        setCanInterrupt(currentPlayerRef.current?.role !== data.currentTurn);
                        setTimerPhase(2); // Ensure we're in phase 2
                    }
                });

                // Listen for player interruptions
                socketService.getSocket()?.on('player-interrupted', (data) => {
                    console.log('Player interrupted:', data);
                    setCanInterrupt(false);
                    
                    // If I was the one interrupted, submit my current argument
                    if (currentPlayerRef.current?.role === data.interruptedTurn && currentArgumentRef.current.trim() && currentPlayerRef.current) {
                        console.log('I was interrupted, submitting current argument:', currentArgumentRef.current.trim());
                        
                        const argument: GameArgument = {
                            id: Date.now().toString(),
                            playerId: currentPlayerRef.current.id,
                            playerName: currentPlayerRef.current.name,
                            content: currentArgumentRef.current.trim() + " [Interrupted]",
                            timestamp: new Date(),
                            type: currentPlayerRef.current.role === 'attacker' ? 'attack' : 'defense'
                        };

                        // Submit the current argument
                        socketService.submitArgument(roomId, argument);
                        setCurrentArgument(''); // Clear the argument field
                    }
                    
                    // Update the current turn if provided
                    if (data.nextTurn) {
                        setGameState(prev => ({
                            ...prev,
                            currentTurn: data.nextTurn
                        }));
                    }
                });

            } catch (err) {
                console.error('Failed to initialize game:', err);
                router.push('/');
            }
        };

        initializeGame();

        return () => {
            socketService.removeAllListeners();
        };
    }, [roomId, router, gameState.currentTurn]);

    // Case reading timer countdown
    useEffect(() => {
        if (showCaseModal && gameState.gamePhase === 'case-reading' && caseReadingTimeLeft > 0) {
            const timer = setTimeout(() => {
                setCaseReadingTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (caseReadingTimeLeft === 0 && showCaseModal) {
            // Auto-start game when timer runs out
            startGame();
        }
    }, [showCaseModal, gameState.gamePhase, caseReadingTimeLeft]);

    // Handle turn changes
    useEffect(() => {
        if (currentPlayer && gameState.gamePhase === 'arguing') {
            const isMyTurnNow = currentPlayer.role === gameState.currentTurn;
            console.log('Turn check:', {
                currentTurn: gameState.currentTurn,
                myRole: currentPlayer.role,
                isMyTurnNow
            });
            
            if (isMyTurnNow !== isMyTurn) {
                setIsMyTurn(isMyTurnNow);
                setCanInterrupt(false); // Reset interrupt state on turn change
            }
        }
    }, [gameState.currentTurn, currentPlayer, gameState.gamePhase, isMyTurn]);

    const handleSubmitArgument = () => {
        if (!currentArgument.trim() || !currentPlayer) return;

        console.log('Submitting argument:', currentArgument.trim());

        const argument: GameArgument = {
            id: Date.now().toString(),
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            content: currentArgument.trim(),
            timestamp: new Date(),
            type: currentPlayer.role === 'attacker' ? 'attack' : 'defense'
        };

        // Send argument via socket
        socketService.submitArgument(roomId, argument);

        setCurrentArgument('');
        setCanInterrupt(false); // Reset interrupt state after submission
        // Don't set isMyTurn to false here - let the socket event handle turn switching
    };

    const handleInterrupt = () => {
        // Send interrupt signal to server (server will handle forced argument submission)
        socketService.getSocket()?.emit('interrupt-player', {
            roomId: roomId
        });
        
        setCanInterrupt(false);
        console.log('Interrupt signal sent to server');
    };

    const startGame = () => {
        setShowCaseModal(false);
        setGameState(prev => ({
            ...prev,
            gamePhase: 'arguing'
        }));
    };

    const toggleReady = () => {
        const newReadyState = !isReady;
        setIsReady(newReadyState);
        
        // Emit ready state to server
        socketService.getSocket()?.emit('playerReady', {
            roomId: roomId,
            ready: newReadyState
        });
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const otherPlayer = room?.players.find(p => p.id !== currentPlayer?.id);

    if (!room || !currentPlayer || !gameState.case) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-white text-2xl">Loading game...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">

            {/* Case Modal */}
            {showCaseModal && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowCaseModal(false);
                        }
                    }}
                >
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-600 max-h-[90vh] overflow-y-auto relative">
                        <button
                            onClick={() => setShowCaseModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-all duration-200 z-10"
                        >
                            ✕
                        </button>
                        <div className="p-8">
                            <div className="text-center mb-6">
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
                                    ⚖️ LEGAL BATTLE ⚖️
                                </h1>
                                <p className="text-gray-300">Study the case carefully. The battle begins shortly!</p>
                            </div>

                            <div className="bg-gray-700/50 rounded-xl p-6 mb-6">
                                <h2 className="text-2xl font-bold text-yellow-400 mb-4">📋 {gameState.case.title}</h2>
                                
                                <div className="bg-gray-800/50 rounded-lg p-6 mb-4">
                                    <h3 className="text-lg font-semibold text-blue-400 mb-3">The Situation:</h3>
                                    <p className="text-gray-200 text-lg leading-relaxed mb-4">{gameState.case.description}</p>
                                    <p className="text-gray-300 text-sm leading-relaxed">{gameState.case.context}</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div className="bg-red-900/30 rounded-lg p-4">
                                            <h4 className="font-bold text-red-400 mb-2">🏢 Attacker's Side:</h4>
                                            <p className="text-sm text-gray-300">{gameState.case.attackerSide}</p>
                                        </div>
                                        <div className="bg-blue-900/30 rounded-lg p-4">
                                            <h4 className="font-bold text-blue-400 mb-2">👩‍💼 Defender's Side:</h4>
                                            <p className="text-sm text-gray-300">{gameState.case.defenderSide}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className={`border-2 rounded-lg p-4 text-center transition-all duration-200 ${
                                    currentPlayer.role === 'attacker' 
                                        ? 'bg-red-900/30 border-red-500' 
                                        : 'bg-red-900/10 border-red-500/30'
                                }`}>
                                    <h3 className="text-xl font-bold text-red-400 mb-2">
                                        🔥 ATTACKER {currentPlayer.role === 'attacker' && (
                                            <span className="mx-2 text-yellow-400 text-lg font-semibold">(YOU)</span>
                                        )}
                                    </h3>
                                    <p className="text-gray-300 font-medium mb-2">{room.players.find(p => p.role === 'attacker')?.name}</p>
                                    
                                    <div className="flex items-center justify-center mb-2">
                                        {currentPlayer.role === 'attacker' ? (
                                            isReady ? (
                                                <span className="text-green-400 font-bold">✅ Ready!</span>
                                            ) : (
                                                <span className="text-gray-400">⏳ Reading...</span>
                                            )
                                        ) : (
                                            otherPlayerReady ? (
                                                <span className="text-green-400 font-bold">✅ Ready!</span>
                                            ) : (
                                                <span className="text-gray-400">⏳ Reading...</span>
                                            )
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400">Arguments for {gameState.case.attackerSide}</p>
                                </div>
                                <div className={`border-2 rounded-lg p-4 text-center transition-all duration-200 ${
                                    currentPlayer.role === 'defender' 
                                        ? 'bg-blue-900/30 border-blue-500' 
                                        : 'bg-blue-900/10 border-blue-500/30'
                                }`}>
                                    <h3 className="text-xl font-bold text-blue-400 mb-2">🛡️ DEFENDER {currentPlayer.role === 'defender' && (
                                            <span className="mx-2 text-yellow-400 text-lg font-semibold">(YOU)</span>
                                        )}</h3>
                                    <p className="text-gray-300 font-medium mb-2">{room.players.find(p => p.role === 'defender')?.name}</p>
                                    
                                    <div className="flex items-center justify-center mb-2">
                                        {currentPlayer.role === 'defender' ? (
                                            isReady ? (
                                                <span className="text-green-400 font-bold">✅ Ready!</span>
                                            ) : (
                                                <span className="text-gray-400">⏳ Reading...</span>
                                            )
                                        ) : (
                                            otherPlayerReady ? (
                                                <span className="text-green-400 font-bold">✅ Ready!</span>
                                            ) : (
                                                <span className="text-gray-400">⏳ Reading...</span>
                                            )
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400">Defense for {gameState.case.defenderSide}</p>
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="mb-6">
                                    <div className="flex items-center justify-center gap-4 mb-4">
                                        <div className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${caseReadingTimeLeft <= 30 ? 'border-red-500 bg-red-900/20' : 'border-yellow-500 bg-yellow-900/20'}`}>
                                            <span className={`font-bold ${caseReadingTimeLeft <= 30 ? 'text-red-400' : 'text-yellow-400'}`}>
                                                ⏰ Time Remaining: {formatTime(caseReadingTimeLeft)}
                                            </span>
                                        </div>
                                    </div>

                                    {isReady && otherPlayerReady ? (
                                        <div className="mb-4">
                                            <div className="text-green-400 font-bold text-lg mb-2">🚀 Both players ready! Starting battle...</div>
                                        </div>
                                    ) : isReady ? (
                                        <div className="mb-4">
                                            <div className="text-yellow-400 font-bold mb-2">✅ You're ready! Waiting for opponent...</div>
                                        </div>
                                    ) : null}

                                    <button
                                        onClick={toggleReady}
                                        disabled={isReady && otherPlayerReady}
                                        className={`px-8 py-4 font-bold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg ${
                                            isReady 
                                                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                                                : 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white'
                                        } ${isReady && otherPlayerReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isReady ? '✅ Ready!' : '📖 I\'m Ready to Battle!'}
                                    </button>
                                    
                                    {caseReadingTimeLeft <= 10 && (
                                        <div className="mt-4 text-red-400 font-bold animate-pulse">
                                            ⚠️ Battle will start automatically in {caseReadingTimeLeft} seconds!
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Round Complete Modal */}
            {gameState.gamePhase === 'round-complete' && gameState.roundResult && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 max-w-2xl w-full border border-gray-600">
                        <div className="text-center mb-6">
                            <h1 className="text-4xl font-bold mb-2">
                                {gameState.roundResult.winner === 'attacker' ? '🔥' : '🛡️'} Round {gameState.roundResult.round} Complete!
                            </h1>
                            <h2 className={`text-3xl font-bold mb-4 ${gameState.roundResult.winner === 'attacker' ? 'text-red-400' : 'text-blue-400'}`}>
                                {gameState.roundResult.winner === 'attacker' ? 'Attacker' : 'Defender'} Wins!
                            </h2>
                        </div>

                        <div className="bg-gray-700/50 rounded-xl p-6 mb-6">
                            <h3 className="text-lg font-bold text-yellow-400 mb-3">🤖 AI Analysis:</h3>
                            <p className="text-gray-200 mb-4">{gameState.roundResult.analysis}</p>
                            <div className="text-sm text-gray-400 mb-4">
                                AI analyzed 3 exchanges (6 total arguments) to determine the round winner.
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-red-900/30 rounded-lg p-4 text-center">
                                    <h4 className="font-bold text-red-400 mb-2">🔥 Attacker Score</h4>
                                    <span className="text-2xl font-bold text-white">{gameState.roundResult.attackerScore}</span>
                                </div>
                                <div className="bg-blue-900/30 rounded-lg p-4 text-center">
                                    <h4 className="font-bold text-blue-400 mb-2">🛡️ Defender Score</h4>
                                    <span className="text-2xl font-bold text-white">{gameState.roundResult.defenderScore}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                            <h3 className="text-lg font-bold text-yellow-400 mb-2">📊 Current Match Score</h3>
                            <div className="flex justify-center items-center gap-6">
                                <span className="text-red-400 font-bold text-xl">Attacker: {gameState.scores.attacker}</span>
                                <span className="text-gray-400">-</span>
                                <span className="text-blue-400 font-bold text-xl">Defender: {gameState.scores.defender}</span>
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-gray-400 mb-4">
                                {gameState.scores.attacker >= 2 || gameState.scores.defender >= 2 
                                    ? 'Game will end after this analysis!'
                                    : gameState.currentRound >= gameState.maxRounds
                                    ? 'Final round complete!'
                                    : 'Preparing next round...'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Game Interface */}
            {!showCaseModal && gameState.gamePhase !== 'round-complete' && (
                <div className="min-h-screen px-8 py-8">

                    {/* Players Section - Top positioning */}
                    <div className="flex w-full gap-8 mb-10 items-center">
                        {/* Attacker Card - 30% width */}
                        <div className={`w-[35%] p-8 rounded-xl border-2 transition-colors duration-300 h-36 ${currentPlayer.role === 'attacker'
                                ? 'bg-red-900/20 border-red-500'
                                : 'bg-red-900/10 border-red-500/30'
                            }`}>
                            <div className="flex items-center gap-6 h-full">
                                {/* Icon */}
                                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-3xl flex-shrink-0">
                                    🔥
                                </div>
                                
                                {/* Text */}
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-red-400 mb-1">
                                        ATTACKER {currentPlayer.role === 'attacker' && (
                                            <span className="mx-2 text-yellow-400 text-lg font-semibold">(YOU)</span>
                                        )}
                                    </h3>
                                    <p className="text-gray-300 font-medium text-lg">{room.players.find(p => p.role === 'attacker')?.name}</p>
                                    <div className="text-sm text-gray-400 mt-1">
                                        {gameState.case?.attackerSide || 'Plaintiff'}
                                    </div>
                                </div>
                                
                                {/* Timer */}
                                {gameState.currentTurn === 'attacker' && gameState.gamePhase === 'arguing' && (
                                    <div className={`text-2xl font-bold flex-shrink-0 ${
                                        timerPhase === 1 
                                            ? (timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-green-400')
                                            : 'text-orange-400 animate-pulse'
                                    }`}>
                                        {timerPhase === 1 ? '⏱️' : '⚡'} {timeLeft}s
                                        {timerPhase === 2 && (
                                            <div className="text-xs text-orange-300 mt-1">INTERRUPT PHASE</div>
                                        )}
                                    </div>
                                )}
                                
                                {/* Dot indicator */}
                                {gameState.currentTurn === 'attacker' && gameState.gamePhase === 'arguing' && (
                                    <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                                )}
                            </div>
                        </div>

                        {/* Attacker Score - 10% width */}
                        <div className="w-[5%] flex items-center justify-center">
                            <span className="text-8xl font-bold text-red-400">{gameState.scores.attacker}</span>
                        </div>

                        {/* Header - Center - 20% width */}
                        <div className="w-[20%] text-center">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-4">
                                Dispute!
                            </h1>
                            <div className="flex flex-col items-center gap-2 text-base text-gray-400 mb-4">
                                <span className="font-semibold">Round {gameState.currentRound}/{gameState.maxRounds}</span>
                                <span>Turn: {gameState.currentTurn === 'attacker' ? '🔥 Attacker' : '🛡️ Defender'}</span>
                                <span>Arguments: {Math.floor(gameState.arguments.length / 2) + (gameState.arguments.length % 2)}/3 exchanges</span>
                            </div>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setShowCaseModal(true)}
                                    className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-lg transition-all duration-200 text-sm border border-gray-600"
                                >
                                    📋 Review Case
                                </button>
                            </div>
                        </div>

                        {/* Defender Score - 10% width */}
                        <div className="w-[5%] flex items-center justify-center">
                            <span className="text-8xl font-bold text-blue-400">{gameState.scores.defender}</span>
                        </div>

                        {/* Defender Card - 30% width */}
                        <div className={`w-[35%] p-8 rounded-xl border-2 transition-colors duration-300 h-36 ${currentPlayer.role === 'defender'
                                ? 'bg-blue-900/20 border-blue-500'
                                : 'bg-blue-900/10 border-blue-500/30'
                            }`}>
                            <div className="flex items-center gap-6 h-full">
                                {/* Dot indicator */}
                                {gameState.currentTurn === 'defender' && gameState.gamePhase === 'arguing' && (
                                    <div className="w-5 h-5 bg-blue-500 rounded-full animate-pulse flex-shrink-0"></div>
                                )}
                                
                                {/* Timer */}
                                {gameState.currentTurn === 'defender' && gameState.gamePhase === 'arguing' && (
                                    <div className={`text-2xl font-bold flex-shrink-0 ${
                                        timerPhase === 1 
                                            ? (timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-green-400')
                                            : 'text-orange-400 animate-pulse'
                                    }`}>
                                        {timerPhase === 1 ? '⏱️' : '⚡'} {timeLeft}s
                                        {timerPhase === 2 && (
                                            <div className="text-xs text-orange-300 mt-1">INTERRUPT PHASE</div>
                                        )}
                                    </div>
                                )}
                                
                                {/* Text */}
                                <div className="flex-1 text-right">
                                    <h3 className="text-2xl font-bold text-blue-400 mb-1">
                                        {currentPlayer.role === 'defender' && (
                                            <span className="mx-2 text-yellow-400 text-lg font-semibold">(YOU)</span>
                                        )}DEFENDER
                                    </h3>
                                    <p className="text-gray-300 font-medium text-lg">{room.players.find(p => p.role === 'defender')?.name}</p>
                                    <div className="text-sm text-gray-400 mt-1">
                                        {gameState.case?.defenderSide || 'Defendant'}
                                    </div>
                                </div>
                                
                                {/* Icon */}
                                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-3xl flex-shrink-0">
                                    🛡️
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Input Section */}
                    {gameState.gamePhase === 'arguing' && (
                        <div className="bg-gray-800/50 rounded-xl p-8 mb-8">
                            {isMyTurn ? (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className={`text-xl font-bold ${timerPhase === 2 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                                            {timerPhase === 2 ? '⚡ HURRY! Opponent can interrupt!' : '🎯 Your Turn! Make your argument:'}
                                        </h3>
                                        <div className={`text-base ${timerPhase === 2 ? 'text-red-400' : 'text-gray-400'}`}>
                                            Exchange {Math.floor(gameState.arguments.length / 2) + 1}/3
                                            {timerPhase === 2 && <span className="ml-2 animate-pulse">⚡ INTERRUPT PHASE</span>}
                                        </div>
                                    </div>
                                    <div className="mb-4 text-base text-gray-400">
                                        {(() => {
                                            const currentPlayerArgs = gameState.arguments.filter(arg => 
                                                arg.type === (currentPlayer.role === 'attacker' ? 'attack' : 'defense')
                                            ).length;
                                            const remaining = 3 - currentPlayerArgs;
                                            return `You have ${remaining} argument${remaining !== 1 ? 's' : ''} remaining this round.`;
                                        })()}
                                    </div>
                                    <textarea
                                        value={currentArgument}
                                        onChange={(e) => setCurrentArgument(e.target.value)}
                                        placeholder={`Write your ${currentPlayer.role === 'attacker' ? 'attack' : 'defense'} argument here...`}
                                        className={`w-full h-40 bg-gray-700 rounded-lg p-6 text-white placeholder-gray-400 resize-none focus:outline-none text-lg transition-colors duration-300 ${
                                            timerPhase === 2 
                                                ? 'border-2 border-red-500 animate-pulse focus:border-red-400' 
                                                : 'border border-gray-600 focus:border-yellow-500'
                                        }`}
                                        maxLength={250}
                                    />
                                    <div className="flex items-center justify-between mt-6">
                                        <span className="text-base text-gray-400">
                                            {currentArgument.length}/250 characters
                                        </span>
                                        <button
                                            onClick={handleSubmitArgument}
                                            disabled={!currentArgument.trim()}
                                            className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                                        >
                                            🚀 Submit Argument
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-4">⏳</div>
                                    <p className="text-gray-400 text-xl">
                                        Waiting for {otherPlayer?.name} to make their argument...
                                    </p>
                                    <div className="text-base text-gray-500 mt-3">
                                        Exchange {Math.floor(gameState.arguments.length / 2) + (gameState.arguments.length % 2)}/3 in progress
                                    </div>
                                    {canInterrupt && timerPhase === 2 && (
                                        <div className="mt-4">
                                            <div className="text-sm text-orange-400 mb-2">⚡ INTERRUPT PHASE ACTIVE ⚡</div>
                                            <button
                                                onClick={handleInterrupt}
                                                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg animate-pulse"
                                            >
                                                ⚡ Interrupt Now!
                                            </button>
                                            <div className="text-xs text-gray-400 mt-2">Time will expire automatically in {timeLeft}s</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
{/* Arguments Timeline */}
                    <div className="bg-gray-800/50 rounded-xl p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-200">📜 Battle Log</h2>
                            <div className="text-base text-gray-400">
                                Round {gameState.currentRound} Progress: {Math.floor(gameState.arguments.length / 2) + (gameState.arguments.length % 2)}/3 exchanges
                            </div>
                        </div>
                        <div className="space-y-6 max-h-[600px] overflow-y-auto">
                            {gameState.arguments.length === 0 ? (
                                <p className="text-gray-500 text-center py-12 text-lg">
                                    No arguments yet. {room.players.find(p => p.role === 'attacker')?.name} will start the battle!<br/>
                                    <span className="text-base">Each round requires 3 exchanges (6 total arguments) before AI analysis.</span>
                                </p>
                            ) : (
                                gameState.arguments.map((argument, index) => {
                                    const exchangeNumber = Math.floor(index / 2) + 1;
                                    const isFirstInExchange = index % 2 === 0;
                                    
                                    return (
                                        <div key={argument.id}>
                                            {isFirstInExchange && exchangeNumber > 1 && (
                                                <div className="border-t border-gray-600 my-6 pt-6">
                                                    <div className="text-center text-sm text-gray-500 mb-4">
                                                        Exchange #{exchangeNumber}
                                                    </div>
                                                </div>
                                            )}
                                            {index === 0 && (
                                                <div className="text-center text-sm text-gray-500 mb-4">
                                                    Exchange #1
                                                </div>
                                            )}
                                            <div
                                                className={`p-6 rounded-lg border-l-4 ${argument.type === 'attack'
                                                        ? 'bg-red-900/20 border-red-500'
                                                        : 'bg-blue-900/20 border-blue-500'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="text-2xl">
                                                        {argument.type === 'attack' ? '🔥' : '🛡️'}
                                                    </span>
                                                    <span className={`font-semibold text-lg ${argument.type === 'attack' ? 'text-red-400' : 'text-blue-400'
                                                        }`}>
                                                        {argument.playerName} ({argument.type === 'attack' ? 'Attacker' : 'Defender'})
                                                    </span>
                                                    <span className="text-sm text-gray-500 ml-auto">
                                                        Argument #{index + 1}
                                                    </span>
                                                </div>
                                                <p className="text-gray-200 text-lg leading-relaxed">{argument.content}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                    {/* Game End */}
                    {gameState.gamePhase === 'finished' && (
                        <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border border-yellow-500/50 rounded-xl p-12 text-center">
                            <h2 className="text-5xl font-bold text-yellow-400 mb-4">⚖️ Battle Complete!</h2>
                            <h3 className="text-3xl font-bold mb-6">
                                {gameState.winner === 'tie' ? (
                                    <span className="text-gray-400">It's a Tie!</span>
                                ) : gameState.winner === 'attacker' ? (
                                    <span className="text-red-400">🔥 Attacker Wins!</span>
                                ) : (
                                    <span className="text-blue-400">🛡️ Defender Wins!</span>
                                )}
                            </h3>
                            <div className="bg-gray-800/50 rounded-lg p-8 mb-8">
                                <h4 className="text-2xl font-bold text-yellow-400 mb-4">📊 Final Score</h4>
                                <div className="flex justify-center items-center gap-8">
                                    <span className="text-red-400 font-bold text-3xl">Attacker: {gameState.scores.attacker}</span>
                                    <span className="text-gray-400 text-2xl">-</span>
                                    <span className="text-blue-400 font-bold text-3xl">Defender: {gameState.scores.defender}</span>
                                </div>
                            </div>
                            <p className="text-gray-300 mb-8 text-lg">
                                {gameState.winner === 'tie' 
                                    ? 'Both sides presented equally compelling arguments!'
                                    : `The ${gameState.winner} presented the most convincing case!`
                                }
                            </p>
                            <button
                                onClick={() => router.push('/')}
                                className="px-12 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 text-lg"
                            >
                                🏠 Return Home
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
