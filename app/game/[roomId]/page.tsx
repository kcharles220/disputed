'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { socketService, GameRoom, Player } from '../../services/socketService';

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
    case: {
        id: number;
        title: string;
        description: string;
        context: string;
        attackerSide: string;
        defenderSide: string;
    } | null;
    arguments: GameArgument[];
    allRoundArguments: GameArgument[]; // Store all arguments from all rounds
    currentTurn: 'attacker' | 'defender';
    currentRound: number;
    maxRounds: number;
    scores: { attacker: number; defender: number }; // Role-based round wins for display
    playerScores: { [playerId: string]: number }; // Player-based round wins for tracking
    individualScores: { [playerId: string]: number }; // Track scores by player ID
    gamePhase: 'case-reading' | 'arguing' | 'round-complete' | 'finished' | 'side-choice';
    winner?: string;
    roundResult?: {
        round: number;
        winner: 'attacker' | 'defender';
        analysis: string;
        attackerScore: number;
        defenderScore: number;
        argumentScores?: { argumentId: string; score: number }[]; // Individual argument scores
    };
    roundHistory: {
        round: number;
        winner: 'attacker' | 'defender';
        analysis: string;
        attackerScore: number;
        defenderScore: number;
        arguments: GameArgument[];
        argumentScores?: { argumentId: string; score: number }[];
    }[];
    sideChoice?: {
        chooserPlayerId: string;
        chooserPlayerName: string;
        playerPerformance: any;
    };
}

export default function GameBattle() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
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
        allRoundArguments: [],
        currentTurn: 'attacker',
        currentRound: 1,
        maxRounds: 3,
        scores: { attacker: 0, defender: 0 },
        playerScores: {}, // Initialize as empty object
        individualScores: {}, // Initialize as empty object
        gamePhase: 'case-reading',
        roundHistory: []
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
    
    // Next round readiness states
    const [isNextRoundReady, setIsNextRoundReady] = useState(false);
    const [otherPlayerNextRoundReady, setOtherPlayerNextRoundReady] = useState(false);
    const [nextRoundAutoStartTime, setNextRoundAutoStartTime] = useState(60);
    const [showNextRoundReadyCheck, setShowNextRoundReadyCheck] = useState(false);
    const [nextRoundMessage, setNextRoundMessage] = useState('');

    // Refs to capture current values in event handlers
    const currentPlayerRef = useRef<Player | null>(null);
    const currentArgumentRef = useRef<string>('');

    // Function to update user stats when game ends
    const updateUserStats = async (gameResult: any) => {
        if (!session?.user?.id || !currentPlayer) {
            console.log('No authenticated user or current player, skipping stats update');
            return;
        }

        try {
            // Calculate role data from round history
            const playerRoles: Array<{
                round: number;
                role: 'attacker' | 'defender';
                roundWon: boolean;
                roundScore: number;
            }> = [];

            // Build role data from round history
            gameState.roundHistory.forEach(round => {
                // Use display role if available, otherwise use role for round 1
                let playerRole: 'attacker' | 'defender';
                
                if (round.round === 1) {
                    // Round 1: always use original role
                    playerRole = currentPlayer.role as 'attacker' | 'defender';
                } else {
                    // Rounds 2+: use display role if available, otherwise calculate
                    playerRole = currentPlayer.displayRole || 
                        (currentPlayer.role === 'attacker' ? 'defender' : 'attacker');
                }

                const roundWon = round.winner === playerRole;
                const roundScore = playerRole === 'attacker' ? round.attackerScore : round.defenderScore;

                playerRoles.push({
                    round: round.round,
                    role: playerRole,
                    roundWon,
                    roundScore
                });
            });

            // Calculate game statistics using player-based tracking
            const roundsWon = getPlayerRoundWins(currentPlayer.id);
            const roundsPlayed = gameState.roundHistory.length;
            const otherPlayerRoundWins = otherPlayer ? getPlayerRoundWins(otherPlayer.id) : 0;
            
            // Determine game winner based on player's actual round wins
            const gameWon = roundsWon > otherPlayerRoundWins;
            const totalIndividualScore = gameState.individualScores[currentPlayer.id] || 0;
            
            // Extract individual argument scores from round history
            const argumentScores: number[] = [];
            gameState.roundHistory.forEach(round => {
                if (round.argumentScores) {
                    // Find argument scores for this player's arguments
                    const playerArguments = gameState.allRoundArguments.filter(
                        arg => arg.playerId === currentPlayer.id && arg.round === round.round
                    );
                    
                    playerArguments.forEach(arg => {
                        const scoreData = round.argumentScores?.find(as => as.argumentId === arg.id);
                        if (scoreData) {
                            argumentScores.push(scoreData.score);
                        }
                    });
                }
            });

            // If no individual argument scores available, calculate from round scores
            if (argumentScores.length === 0) {
                const playerArguments = gameState.allRoundArguments.filter(arg => arg.playerId === currentPlayer.id);
                if (playerArguments.length > 0) {
                    // Estimate individual scores by dividing round scores by arguments per round
                    gameState.roundHistory.forEach(round => {
                        const roundPlayerArguments = playerArguments.filter(arg => arg.round === round.round);
                        if (roundPlayerArguments.length > 0) {
                            const roundScore = playerRoles.find(r => r.round === round.round)?.roundScore || 0;
                            const scorePerArgument = roundScore / roundPlayerArguments.length;
                            roundPlayerArguments.forEach(() => {
                                argumentScores.push(scorePerArgument);
                            });
                        }
                    });
                }
            }

            const gameData = {
                gameWon,
                pointsEarned: totalIndividualScore,
                argumentScores,
                gameDurationMinutes: Math.round((Date.now() - new Date(gameState.roundHistory[0]?.arguments[0]?.timestamp || Date.now()).getTime()) / 60000),
                roundsPlayed,
                roundsWon,
                playerRoles
            };

            console.log('Updating user stats with:', gameData);

            const response = await fetch('/api/user/update-stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gameData),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Stats updated successfully:', result);
            } else {
                console.error('Failed to update stats:', await response.text());
            }
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
    };

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

                    // Check if current player should start first based on display role
                    if (player && getPlayerDisplayRole(player) === 'attacker') {
                        setIsMyTurn(true);
                        console.log('Player display role is attacker, setting isMyTurn to true');
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
                        const newAllRoundArguments = [...prev.allRoundArguments, { ...argument, round: prev.currentRound }];
                        const newTurn = prev.currentTurn === 'attacker' ? 'defender' : 'attacker';
                        
                        console.log('Switching turn from', prev.currentTurn, 'to', newTurn);
                        
                        return {
                            ...prev,
                            arguments: newArguments,
                            allRoundArguments: newAllRoundArguments,
                            currentTurn: newTurn
                        };
                    });
                });

                socketService.onRoundComplete((result) => {
                    console.log('Round complete received from server:', result);
                    console.log('Server scores:', result.scores);
                    console.log('Server player scores:', result.playerScores);
                    console.log('Server player performance:', result.playerPerformance);
                    
                    setGameState(prev => {
                        // Create round history entry
                        const roundHistoryEntry = {
                            round: result.round,
                            winner: result.winner,
                            analysis: result.analysis,
                            attackerScore: result.attackerScore,
                            defenderScore: result.defenderScore,
                            arguments: prev.arguments.map(arg => ({ ...arg, round: prev.currentRound })),
                            argumentScores: result.argumentScores || []
                        };

                        // Use server scores directly instead of client-side calculations
                        console.log('CLIENT: Using server scores directly');
                        console.log('CLIENT: Role-based scores from server:', result.scores);
                        console.log('CLIENT: Player-based scores from server:', result.playerScores);
                        
                        // Update individual scores using server performance data
                        const newIndividualScores = { ...prev.individualScores };
                        if (result.playerPerformance) {
                            Object.entries(result.playerPerformance).forEach(([playerId, performance]: [string, any]) => {
                                newIndividualScores[playerId] = performance.totalScore;
                                console.log(`CLIENT: Player ${playerId} total score from server: ${performance.totalScore}`);
                            });
                        }

                        return {
                            ...prev,
                            gamePhase: 'round-complete',
                            scores: result.scores, // Use server role-based scores
                            playerScores: result.playerScores || {}, // Use server player-based scores
                            individualScores: newIndividualScores, // Use server individual scores
                            roundResult: result,
                            roundHistory: [...prev.roundHistory, roundHistoryEntry]
                        };
                    });

                    // Check if game will continue to determine if we should show ready check
                    const playerWins = Object.values(result.playerScores || {}) as number[];
                    const maxPlayerWins = Math.max(...(playerWins.length > 0 ? playerWins : [0]));
                    const gameWillContinue = maxPlayerWins < 2 && result.round < 3; // Assuming max 3 rounds
                    
                    if (gameWillContinue) {
                        // Enable ready check in the round complete modal after a short delay
                        setTimeout(() => {
                            setShowNextRoundReadyCheck(true);
                            setNextRoundAutoStartTime(60);
                            setIsNextRoundReady(false);
                            setOtherPlayerNextRoundReady(false);
                        }, 2000); // 2 second delay to let users read the analysis first
                    }
                });

                socketService.onNextRound((data) => {
                    console.log('Next round starting:', data);
                    console.log('Data players:', data.players);
                    console.log('DisplayRolesSwitched flag:', data.displayRolesSwitched);
                    
                    // Handle role switching - update both currentPlayer and room carefully
                    if (data.players) {
                        console.log('Updating players for next round');
                        
                        // Find the updated current player
                        const updatedCurrentPlayer = data.players.find((p: any) => p.id === socketService.getSocket()?.id);
                        
                        if (updatedCurrentPlayer) {
                            console.log('Updated current player:', {
                                name: updatedCurrentPlayer.name,
                                role: updatedCurrentPlayer.role,
                                displayRole: updatedCurrentPlayer.displayRole,
                                originalRole: updatedCurrentPlayer.originalRole
                            });
                            
                            // Update current player state
                            setCurrentPlayer(updatedCurrentPlayer);
                        }
                        
                        // Update room with new players data while preserving other room properties
                        setRoom(prev => {
                            if (!prev) return null;
                            
                            console.log('Updating room players from:', prev.players.map(p => ({ 
                                name: p.name, 
                                role: p.role, 
                                displayRole: p.displayRole, 
                                originalRole: p.originalRole 
                            })));
                            console.log('Updating room players to:', data.players.map((p: any) => ({ 
                                name: p.name, 
                                role: p.role, 
                                displayRole: p.displayRole, 
                                originalRole: p.originalRole 
                            })));
                            
                            return {
                                ...prev,
                                players: data.players
                            };
                        });
                        
                        // Log role switching information
                        if (data.displayRolesSwitched) {
                            console.log('Display roles switched for round 2 - roles are now swapped visually');
                        }
                    }
                    
                    setGameState(prev => ({
                        ...prev,
                        currentRound: data.round,
                        scores: data.scores,
                        currentTurn: 'attacker',
                        gamePhase: 'arguing',
                        arguments: [],
                        roundResult: undefined
                    }));
                    
                    // Reset turn to attacker for new round (will be updated based on current player's role)
                    // Note: We'll let the turn checking useEffect handle this properly
                });

                // Listen for side choice needed (round 3 draw)
                socketService.getSocket()?.on('side-choice-needed', (data) => {
                    console.log('Side choice needed:', data);
                    setGameState(prev => ({
                        ...prev,
                        gamePhase: 'side-choice',
                        currentRound: data.round,
                        scores: data.scores,
                        sideChoice: {
                            chooserPlayerId: data.chooserPlayerId,
                            chooserPlayerName: data.chooserPlayerName,
                            playerPerformance: data.playerPerformance
                        }
                    }));
                });

                // Listen for side choice completion
                socketService.getSocket()?.on('side-choice-complete', (data) => {
                    console.log('Side choice complete:', data);
                    
                    // Update player roles
                    const updatedPlayer = data.players.find((p: any) => p.id === socketService.getSocket()?.id);
                    if (updatedPlayer) {
                        setCurrentPlayer(updatedPlayer);
                        setRoom(prev => prev ? { ...prev, players: data.players } : null);
                    }
                    
                    setGameState(prev => ({
                        ...prev,
                        currentRound: data.round,
                        scores: data.scores,
                        currentTurn: 'attacker',
                        gamePhase: 'arguing',
                        arguments: [],
                        roundResult: undefined,
                        sideChoice: undefined
                    }));
                    
                    // Reset turn based on new display role
                    if (updatedPlayer && getPlayerDisplayRole(updatedPlayer) === 'attacker') {
                        setIsMyTurn(true);
                    } else {
                        setIsMyTurn(false);
                    }
                });

                // Listen for players updated (when roles are switched)
                socketService.getSocket()?.on('players-updated', (data) => {
                    console.log('Players updated:', data);
                    setNextRoundMessage(data.message || '');
                    
                    // Update room and players
                    if (data.players) {
                        const updatedPlayer = data.players.find((p: any) => p.id === socketService.getSocket()?.id);
                        if (updatedPlayer) {
                            setCurrentPlayer(updatedPlayer);
                            setRoom(prev => prev ? { ...prev, players: data.players } : null);
                        }
                    }
                    
                    // Update game state for the new round
                    setGameState(prev => ({
                        ...prev,
                        currentRound: data.round,
                        scores: data.scores,
                        gamePhase: 'round-complete' // Keep in round-complete so modal shows with ready check
                    }));
                });

                // Listen for next round ready updates
                socketService.getSocket()?.on('next-round-ready-update', (data) => {
                    console.log('Next round ready update:', data);
                    if (data.playerId !== socketService.getSocket()?.id) {
                        setOtherPlayerNextRoundReady(data.ready);
                    }
                });

                // Listen for next round started
                socketService.getSocket()?.on('next-round-started', (data) => {
                    console.log('Next round started:', data);
                    setShowNextRoundReadyCheck(false);
                    setGameState(prev => ({
                        ...prev,
                        currentRound: data.round,
                        scores: data.scores,
                        currentTurn: 'attacker',
                        gamePhase: 'arguing',
                        arguments: [],
                        roundResult: undefined
                    }));
                });

                socketService.onGameEnd((result) => {
                    console.log('Game ended:', result);
                    setGameState(prev => ({
                        ...prev,
                        gamePhase: 'finished',
                        winner: result.winner
                    }));

                    // Update user stats if authenticated
                    updateUserStats(result);
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
                            type: currentPlayerRef.current.role === 'attacker' ? 'attack' : 'defense',
                            round: gameState.currentRound
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
                            type: currentPlayerRef.current.role === 'attacker' ? 'attack' : 'defense',
                            round: gameState.currentRound
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
            // Use display role for turn checking (visual representation)
            const myDisplayRole = getPlayerDisplayRole(currentPlayer);
            const isMyTurnNow = myDisplayRole === gameState.currentTurn;
            console.log('Turn check:', {
                currentTurn: gameState.currentTurn,
                myCurrentRole: currentPlayer.role,
                myDisplayRole: myDisplayRole,
                myOriginalRole: currentPlayer.originalRole,
                isMyTurnNow
            });
            
            if (isMyTurnNow !== isMyTurn) {
                setIsMyTurn(isMyTurnNow);
                setCanInterrupt(false); // Reset interrupt state on turn change
            }
        }
    }, [gameState.currentTurn, currentPlayer, gameState.gamePhase, isMyTurn]);

    // Next round auto-start countdown
    useEffect(() => {
        if (showNextRoundReadyCheck && nextRoundAutoStartTime > 0) {
            const timer = setTimeout(() => {
                setNextRoundAutoStartTime(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [showNextRoundReadyCheck, nextRoundAutoStartTime]);

    const handleSubmitArgument = () => {
        if (!currentArgument.trim() || !currentPlayer) return;

        console.log('Submitting argument:', currentArgument.trim());

        const argument: GameArgument = {
            id: Date.now().toString(),
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            content: currentArgument.trim(),
            timestamp: new Date(),
            type: getPlayerDisplayRole(currentPlayer) === 'attacker' ? 'attack' : 'defense',
            round: gameState.currentRound
        };

        // Send argument via socket
        socketService.submitArgument(roomId, argument);

        setCurrentArgument('');
        setCanInterrupt(false); // Reset interrupt state after submission
        // Don't set isMyTurn to false here - let the socket event handle turn switching
    };

    const handleSideChoice = (chosenSide: 'attacker' | 'defender') => {
        console.log('Player chose side:', chosenSide);
        socketService.getSocket()?.emit('choose-side', {
            roomId: roomId,
            chosenSide: chosenSide
        });
    };

    const handleInterrupt = () => {
        // Send interrupt signal to server (server will handle forced argument submission)
        socketService.getSocket()?.emit('interrupt-player', {
            roomId: roomId
        });
        
        setCanInterrupt(false);
        console.log('Interrupt signal sent to server');
    };

    const handleNextRoundReady = (ready: boolean) => {
        console.log('Setting next round ready state:', ready);
        setIsNextRoundReady(ready);
        socketService.getSocket()?.emit('next-round-ready', {
            roomId,
            ready
        });
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

    const [showFullBattleLog, setShowFullBattleLog] = useState(false);

    const formatScore = (score: number) => {
        return score % 1 === 0 ? score.toString() : score.toFixed(1);
    };

    // Helper functions to get player scores
    const getPlayerScore = (playerId: string) => {
        const score = gameState.individualScores[playerId] || 0;
        console.log('CLIENT: Individual score for player', playerId, ':', score, 'from scores:', gameState.individualScores);
        return score;
    };

    const getPlayerRoundWins = (playerId: string) => {
        const wins = gameState.playerScores[playerId] || 0;
        console.log('CLIENT: Player', playerId, 'has', wins, 'round wins. All player scores:', gameState.playerScores);
        return wins;
    };

    const getAttackerScore = () => {
        const attackerPlayer = room?.players.find(p => p.role === 'attacker');
        const score = attackerPlayer ? getPlayerScore(attackerPlayer.id) : 0;
        console.log('CLIENT: Attacker score:', score, 'for player:', attackerPlayer?.name);
        return score;
    };

    const getDefenderScore = () => {
        const defenderPlayer = room?.players.find(p => p.role === 'defender');
        const score = defenderPlayer ? getPlayerScore(defenderPlayer.id) : 0;
        console.log('CLIENT: Defender score:', score, 'for player:', defenderPlayer?.name);
        return score;
    };

    const getAttackerRoundWins = () => {
        const attackerPlayer = room?.players.find(p => p.role === 'attacker');
        const wins = attackerPlayer ? getPlayerRoundWins(attackerPlayer.id) : 0;
        console.log('Attacker round wins:', wins, 'for player:', attackerPlayer?.name);
        return wins;
    };

    const getDefenderRoundWins = () => {
        const defenderPlayer = room?.players.find(p => p.role === 'defender');
        const wins = defenderPlayer ? getPlayerRoundWins(defenderPlayer.id) : 0;
        console.log('Defender round wins:', wins, 'for player:', defenderPlayer?.name);
        return wins;
    };

    const otherPlayer = room?.players.find(p => p.id !== currentPlayer?.id);

    // Helper function to get the display role for a player (visual representation)
    const getPlayerDisplayRole = (player: Player): 'attacker' | 'defender' => {
        // If displayRole is set, use it (for rounds 2+ with role switching)
        if (player.displayRole) {
            console.log(`Player ${player.name} has displayRole: ${player.displayRole}`);
            return player.displayRole;
        }
        // Otherwise use the original role (round 1)
        console.log(`Player ${player.name} using original role: ${player.role}`);
        return player.role as 'attacker' | 'defender';
    };

    // Helper function to check if current player should be on the left side (original attacker position)
    const isPlayerOnLeftSide = (player: Player): boolean => {
        // Players stay on their original sides regardless of display role
        // Use originalRole if available, otherwise fallback to initial role
        return (player.originalRole || player.role) === 'attacker';
    };

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
                                {/* Left side - Original Attacker Position */}
                                {(() => {
                                    const leftPlayer = room.players.find(p => p.role === 'attacker' || p.originalRole === 'attacker');
                                    const leftPlayerDisplayRole = leftPlayer ? getPlayerDisplayRole(leftPlayer) : 'attacker';
                                    const isCurrentPlayerOnLeft = isPlayerOnLeftSide(currentPlayer);
                                    const leftPlayerLabel = leftPlayerDisplayRole === 'attacker' ? 'ATTACKER' : 'DEFENDER';
                                    const leftPlayerIsAttacker = leftPlayerDisplayRole === 'attacker';
                                    
                                    return (
                                        <div className={`border-2 rounded-lg p-4 text-center transition-all duration-200 ${
                                            isCurrentPlayerOnLeft 
                                                ? (leftPlayerIsAttacker ? 'bg-red-900/30 border-red-500' : 'bg-blue-900/30 border-blue-500')
                                                : (leftPlayerIsAttacker ? 'bg-red-900/10 border-red-500/30' : 'bg-blue-900/10 border-blue-500/30')
                                        }`}>
                                            <h3 className={`text-xl font-bold mb-2 ${leftPlayerIsAttacker ? 'text-red-400' : 'text-blue-400'}`}>
                                                {leftPlayer?.avatar || '⚖️'} {leftPlayerLabel} {isCurrentPlayerOnLeft && (
                                                    <span className="mx-2 text-yellow-400 text-lg font-semibold">(YOU)</span>
                                                )}
                                            </h3>
                                            <p className="text-gray-300 font-medium mb-2">{leftPlayer?.name}</p>
                                            
                                            <div className="flex items-center justify-center mb-2">
                                                {isCurrentPlayerOnLeft ? (
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
                                            <p className="text-sm text-gray-400">
                                                Arguments for {leftPlayerDisplayRole === 'attacker' ? gameState.case.attackerSide : gameState.case.defenderSide}
                                            </p>
                                        </div>
                                    );
                                })()}
                                
                                {/* Right side - Original Defender Position */}
                                {(() => {
                                    const rightPlayer = room.players.find(p => p.role === 'defender' || p.originalRole === 'defender');
                                    const rightPlayerDisplayRole = rightPlayer ? getPlayerDisplayRole(rightPlayer) : 'defender';
                                    const isCurrentPlayerOnRight = !isPlayerOnLeftSide(currentPlayer);
                                    const rightPlayerLabel = rightPlayerDisplayRole === 'attacker' ? 'ATTACKER' : 'DEFENDER';
                                    const rightPlayerIsAttacker = rightPlayerDisplayRole === 'attacker';
                                    
                                    return (
                                        <div className={`border-2 rounded-lg p-4 text-center transition-all duration-200 ${
                                            isCurrentPlayerOnRight 
                                                ? (rightPlayerIsAttacker ? 'bg-red-900/30 border-red-500' : 'bg-blue-900/30 border-blue-500')
                                                : (rightPlayerIsAttacker ? 'bg-red-900/10 border-red-500/30' : 'bg-blue-900/10 border-blue-500/30')
                                        }`}>
                                            <h3 className={`text-xl font-bold mb-2 ${rightPlayerIsAttacker ? 'text-red-400' : 'text-blue-400'}`}>
                                                {rightPlayer?.avatar || '⚖️'} {rightPlayerLabel} {isCurrentPlayerOnRight && (
                                                    <span className="mx-2 text-yellow-400 text-lg font-semibold">(YOU)</span>
                                                )}
                                            </h3>
                                            <p className="text-gray-300 font-medium mb-2">{rightPlayer?.name}</p>
                                            
                                            <div className="flex items-center justify-center mb-2">
                                                {isCurrentPlayerOnRight ? (
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
                                            <p className="text-sm text-gray-400">
                                                Arguments for {rightPlayerDisplayRole === 'attacker' ? gameState.case.attackerSide : gameState.case.defenderSide}
                                            </p>
                                        </div>
                                    );
                                })()}
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
                            {/* Show role switch message if applicable */}
                            {nextRoundMessage && (
                                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mt-4">
                                    <div className="text-yellow-400 font-bold text-lg">
                                        🔄 {nextRoundMessage}
                                    </div>
                                </div>
                            )}
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

                        {/* Next Round Ready Check - only show if not final round and if game will continue */}
                        {(() => {
                            const attackerWins = getAttackerRoundWins();
                            const defenderWins = getDefenderRoundWins();
                            const gameWillContinue = attackerWins < 2 && defenderWins < 2 && gameState.currentRound < gameState.maxRounds;
                            
                            if (gameWillContinue) {
                                return (
                                    <>
                                        {/* Player Readiness Status */}
                                        <div className="grid grid-cols-2 gap-6 mb-6">
                                            {/* Current Player */}
                                            <div className={`border-2 rounded-lg p-4 text-center transition-all duration-200 ${
                                                isNextRoundReady 
                                                    ? 'bg-green-900/30 border-green-500' 
                                                    : 'bg-gray-900/30 border-gray-500'
                                            }`}>
                                                <h3 className="text-xl font-bold mb-2 text-white">
                                                    {currentPlayer?.name} (You)
                                                </h3>
                                                
                                                <div className="text-lg font-semibold mb-2 text-yellow-400">
                                                    {getPlayerDisplayRole(currentPlayer) === 'attacker' ? '🔥' : '🛡️'} {getPlayerDisplayRole(currentPlayer!) === 'attacker' ? 'ATTACKER' : 'DEFENDER'}
                                                </div>
                                                
                                                {/* Player Scores */}
                                                <div className="bg-black/20 rounded-lg p-3 mb-3">
                                                    <div className="text-sm text-gray-400 mb-1">Round Wins</div>
                                                    <div className="text-2xl font-bold text-white mb-1">
                                                        {getPlayerRoundWins(currentPlayer!.id)}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        Total Points: {formatScore(getPlayerScore(currentPlayer!.id))}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center justify-center mb-2">
                                                    {isNextRoundReady ? (
                                                        <span className="text-green-400 font-bold">✅ Ready</span>
                                                    ) : (
                                                        <span className="text-gray-400 font-bold">⏳ Not Ready</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Other Player */}
                                            {(() => {
                                                const otherPlayer = room?.players.find(p => p.id !== currentPlayer?.id);
                                                if (!otherPlayer) return null;
                                                
                                                return (
                                                    <div className={`border-2 rounded-lg p-4 text-center transition-all duration-200 ${
                                                        otherPlayerNextRoundReady 
                                                            ? 'bg-green-900/30 border-green-500' 
                                                            : 'bg-gray-900/30 border-gray-500'
                                                    }`}>
                                                        <h3 className="text-xl font-bold mb-2 text-white">
                                                            {otherPlayer.name}
                                                        </h3>
                                                        
                                                        <div className="text-lg font-semibold mb-2 text-yellow-400">
                                                            {getPlayerDisplayRole(otherPlayer) === 'attacker' ? '🔥' : '🛡️'} {getPlayerDisplayRole(otherPlayer) === 'attacker' ? 'ATTACKER' : 'DEFENDER'}
                                                        </div>
                                                        
                                                        {/* Player Scores */}
                                                        <div className="bg-black/20 rounded-lg p-3 mb-3">
                                                            <div className="text-sm text-gray-400 mb-1">Round Wins</div>
                                                            <div className="text-2xl font-bold text-white mb-1">
                                                                {getPlayerRoundWins(otherPlayer.id)}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                Total Points: {formatScore(getPlayerScore(otherPlayer.id))}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-center mb-2">
                                                            {otherPlayerNextRoundReady ? (
                                                                <span className="text-green-400 font-bold">✅ Ready</span>
                                                            ) : (
                                                                <span className="text-gray-400 font-bold">⏳ Not Ready</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Auto-start timer - only show if ready check is active */}
                                        {showNextRoundReadyCheck && (
                                            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                                                <div className="text-center">
                                                    <div className="text-yellow-400 font-bold mb-2">⏰ Auto-Start Timer</div>
                                                    <div className={`text-2xl font-bold ${nextRoundAutoStartTime <= 10 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                                                        {formatTime(nextRoundAutoStartTime)}
                                                    </div>
                                                    <div className="text-sm text-gray-400 mt-2">
                                                        Round will start automatically when both players are ready or when time expires
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Ready Status Message */}
                                        <div className="text-center mb-6">
                                            {isNextRoundReady && otherPlayerNextRoundReady ? (
                                                <div className="text-green-400 font-bold text-lg mb-2">
                                                    🚀 Both players ready! Starting round...
                                                </div>
                                            ) : isNextRoundReady ? (
                                                <div className="text-yellow-400 font-bold mb-2">
                                                    ✅ You're ready! Waiting for opponent...
                                                </div>
                                            ) : otherPlayerNextRoundReady ? (
                                                <div className="text-yellow-400 font-bold mb-2">
                                                    ⏳ Opponent is ready! Waiting for you...
                                                </div>
                                            ) : showNextRoundReadyCheck ? (
                                                <div className="text-gray-400 mb-2">
                                                    Read the analysis and ready up for the next round!
                                                </div>
                                            ) : (
                                                <div className="text-gray-400 mb-2">
                                                    Preparing next round...
                                                </div>
                                            )}
                                        </div>

                                        {/* Ready Button */}
                                        <div className="text-center">
                                            {showNextRoundReadyCheck ? (
                                                <button
                                                    onClick={() => handleNextRoundReady(!isNextRoundReady)}
                                                    disabled={isNextRoundReady && otherPlayerNextRoundReady}
                                                    className={`px-8 py-4 font-bold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg ${
                                                        isNextRoundReady 
                                                            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                                                            : 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white'
                                                    } ${isNextRoundReady && otherPlayerNextRoundReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {isNextRoundReady ? '✅ Ready for Next Round' : '⚔️ Ready for Next Round'}
                                                </button>
                                            ) : (
                                                <div className="animate-spin w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto"></div>
                                            )}
                                        </div>
                                    </>
                                );
                            } else {
                                return (
                                    <div className="text-center">
                                        <p className="text-gray-400 mb-4">
                                            {attackerWins >= 2 || defenderWins >= 2 
                                                ? 'Game will end after this analysis!' 
                                                : 'Final round complete!'
                                            }
                                        </p>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </div>
            )}

            {/* Side Choice Modal for Round 3 Draw */}
            {gameState.gamePhase === 'side-choice' && gameState.sideChoice && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
            )}

            {/* Main Game Interface */}
            {!showCaseModal && gameState.gamePhase !== 'round-complete' && gameState.gamePhase !== 'side-choice' && (
                <div className="min-h-screen px-8 py-8">

                    {/* Players Section - Top positioning */}
                    <div className="flex w-full gap-8 mb-10 items-center">
                        {(() => {
                            // Left side - Player who was originally the attacker (stays on left regardless of current role)
                            const leftPlayer = room.players.find(p => (p.originalRole || p.role) === 'attacker');
                            const leftPlayerDisplayRole = leftPlayer ? getPlayerDisplayRole(leftPlayer) : 'attacker';
                            const isCurrentPlayerOnLeft = leftPlayer?.id === currentPlayer?.id;
                            const leftPlayerLabel = leftPlayerDisplayRole === 'attacker' ? 'ATTACKER' : 'DEFENDER';
                            const leftPlayerIsAttacker = leftPlayerDisplayRole === 'attacker';
                            
                            console.log('LEFT PLAYER:', {
                                name: leftPlayer?.name,
                                id: leftPlayer?.id,
                                originalRole: leftPlayer?.originalRole,
                                role: leftPlayer?.role,
                                displayRole: leftPlayer?.displayRole,
                                leftPlayerDisplayRole,
                                isCurrentPlayerOnLeft
                            });
                            
                            return (
                                <div className={`w-[35%] p-8 rounded-xl border-2 transition-colors duration-300 h-36 ${
                                    isCurrentPlayerOnLeft
                                        ? (leftPlayerIsAttacker ? 'bg-red-900/20 border-red-500' : 'bg-blue-900/20 border-blue-500')
                                        : (leftPlayerIsAttacker ? 'bg-red-900/10 border-red-500/30' : 'bg-blue-900/10 border-blue-500/30')
                                }`}>
                                    <div className="flex items-center gap-6 h-full">
                                        {/* Avatar */}
                                        <div className={`w-16 h-16 ${leftPlayerIsAttacker ? 'bg-red-600' : 'bg-blue-600'} rounded-full flex items-center justify-center text-3xl flex-shrink-0 border-2 ${leftPlayerIsAttacker ? 'border-red-400' : 'border-blue-400'}`}>
                                            {leftPlayer?.avatar || '⚖️'}
                                        </div>
                                        
                                        {/* Text */}
                                        <div className="flex-1">
                                            <h3 className={`text-2xl font-bold ${leftPlayerIsAttacker ? 'text-red-400' : 'text-blue-400'} mb-1`}>
                                                {leftPlayerLabel} {isCurrentPlayerOnLeft && (
                                                    <span className="mx-2 text-yellow-400 text-lg font-semibold">(YOU)</span>
                                                )}
                                            </h3>
                                            <p className="text-gray-300 font-medium text-lg">{leftPlayer?.name}</p>
                                            <div className="text-sm text-gray-400 mt-1">
                                                {leftPlayerDisplayRole === 'attacker' ? gameState.case?.attackerSide || 'Plaintiff' : gameState.case?.defenderSide || 'Defendant'}
                                            </div>
                                        </div>
                                        
                                        {/* Timer for current turn */}
                                        {gameState.currentTurn === leftPlayerDisplayRole && gameState.gamePhase === 'arguing' && (
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
                                        {gameState.currentTurn === leftPlayerDisplayRole && gameState.gamePhase === 'arguing' && (
                                            <div className={`w-5 h-5 ${leftPlayerIsAttacker ? 'bg-red-500' : 'bg-blue-500'} rounded-full animate-pulse flex-shrink-0`}></div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Left Score - 10% width */}
                        <div className="w-[5%] flex flex-col items-center justify-center">
                            {(() => {
                                const leftPlayer = room?.players.find(p => (p.originalRole || p.role) === 'attacker');
                                const leftPlayerDisplayRole = leftPlayer ? getPlayerDisplayRole(leftPlayer) : 'attacker';
                                const leftIsAttacker = leftPlayerDisplayRole === 'attacker';
                                return (
                                    <>
                                        <span className={`text-8xl font-bold ${leftIsAttacker ? 'text-red-400' : 'text-blue-400'}`}>
                                            {leftIsAttacker ? getAttackerRoundWins() : getDefenderRoundWins()}
                                        </span>
                                        <span className={`text-sm mt-1 ${leftIsAttacker ? 'text-red-300' : 'text-blue-300'}`}>
                                            ({formatScore(leftIsAttacker ? getAttackerScore() : getDefenderScore())})
                                        </span>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Header - Center - 20% width */}
                        <div className="w-[20%] text-center">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-4">
                                Dispute!
                            </h1>
                            <div className="flex flex-col items-center gap-2 text-base text-gray-400 mb-4">
                                <span className="font-semibold">Round {gameState.currentRound}/{gameState.maxRounds}</span>
                                {gameState.currentRound === 2 && (
                                    <span className="text-yellow-400 text-sm font-bold animate-pulse">🔄 ROLES SWITCHED!</span>
                                )}
                                <span>Turn: {(() => {
                                    if (gameState.currentTurn === 'attacker') {
                                        const attackingPlayer = room?.players.find(p => getPlayerDisplayRole(p) === 'attacker');
                                        return `🔥 ${attackingPlayer?.name || 'Attacker'}`;
                                    } else {
                                        const defendingPlayer = room?.players.find(p => getPlayerDisplayRole(p) === 'defender');
                                        return `🛡️ ${defendingPlayer?.name || 'Defender'}`;
                                    }
                                })()}</span>
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

                        {/* Right Score - 10% width */}
                        <div className="w-[5%] flex flex-col items-center justify-center">
                            {(() => {
                                const rightPlayer = room?.players.find(p => (p.originalRole || p.role) === 'defender');
                                const rightPlayerDisplayRole = rightPlayer ? getPlayerDisplayRole(rightPlayer) : 'defender';
                                const rightIsAttacker = rightPlayerDisplayRole === 'attacker';
                                return (
                                    <>
                                        <span className={`text-8xl font-bold ${rightIsAttacker ? 'text-red-400' : 'text-blue-400'}`}>
                                            {rightIsAttacker ? getAttackerRoundWins() : getDefenderRoundWins()}
                                        </span>
                                        <span className={`text-sm mt-1 ${rightIsAttacker ? 'text-red-300' : 'text-blue-300'}`}>
                                            ({formatScore(rightIsAttacker ? getAttackerScore() : getDefenderScore())})
                                        </span>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Right side - Original Defender Position */}
                        {(() => {
                            const rightPlayer = room?.players.find(p => (p.originalRole || p.role) === 'defender');
                            const rightPlayerDisplayRole = rightPlayer ? getPlayerDisplayRole(rightPlayer) : 'defender';
                            const isCurrentPlayerOnRight = rightPlayer?.id === currentPlayer?.id;
                            const rightPlayerLabel = rightPlayerDisplayRole === 'attacker' ? 'ATTACKER' : 'DEFENDER';
                            const rightPlayerIsAttacker = rightPlayerDisplayRole === 'attacker';
                            
                            console.log('RIGHT PLAYER:', {
                                name: rightPlayer?.name,
                                id: rightPlayer?.id,
                                originalRole: rightPlayer?.originalRole,
                                role: rightPlayer?.role,
                                displayRole: rightPlayer?.displayRole,
                                rightPlayerDisplayRole,
                                isCurrentPlayerOnRight
                            });
                            
                            return (
                                <div className={`w-[35%] p-8 rounded-xl border-2 transition-colors duration-300 h-36 ${
                                    isCurrentPlayerOnRight
                                        ? (rightPlayerIsAttacker ? 'bg-red-900/20 border-red-500' : 'bg-blue-900/20 border-blue-500')
                                        : (rightPlayerIsAttacker ? 'bg-red-900/10 border-red-500/30' : 'bg-blue-900/10 border-blue-500/30')
                                }`}>
                                    <div className="flex items-center gap-6 h-full">
                                        {/* Dot indicator */}
                                        {gameState.currentTurn === rightPlayerDisplayRole && gameState.gamePhase === 'arguing' && (
                                            <div className={`w-5 h-5 ${rightPlayerIsAttacker ? 'bg-red-500' : 'bg-blue-500'} rounded-full animate-pulse flex-shrink-0`}></div>
                                        )}
                                        
                                        {/* Timer */}
                                        {gameState.currentTurn === rightPlayerDisplayRole && gameState.gamePhase === 'arguing' && (
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
                                            <h3 className={`text-2xl font-bold ${rightPlayerIsAttacker ? 'text-red-400' : 'text-blue-400'} mb-1`}>
                                                {isCurrentPlayerOnRight && (
                                                    <span className="mx-2 text-yellow-400 text-lg font-semibold">(YOU)</span>
                                                )}{rightPlayerLabel}
                                            </h3>
                                            <p className="text-gray-300 font-medium text-lg">{rightPlayer?.name}</p>
                                            <div className="text-sm text-gray-400 mt-1">
                                                {rightPlayerDisplayRole === 'attacker' ? gameState.case?.attackerSide || 'Plaintiff' : gameState.case?.defenderSide || 'Defendant'}
                                            </div>
                                        </div>
                                        
                                        {/* Avatar */}
                                        <div className={`w-16 h-16 ${rightPlayerIsAttacker ? 'bg-red-600' : 'bg-blue-600'} rounded-full flex items-center justify-center text-3xl flex-shrink-0 border-2 ${rightPlayerIsAttacker ? 'border-red-400' : 'border-blue-400'}`}>
                                            {rightPlayer?.avatar || '⚖️'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
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
                                                arg.type === (currentPlayer && getPlayerDisplayRole(currentPlayer) === 'attacker' ? 'attack' : 'defense')
                                            ).length;
                                            const remaining = 3 - currentPlayerArgs;
                                            return `You have ${remaining} argument${remaining !== 1 ? 's' : ''} remaining this round.`;
                                        })()}
                                    </div>
                                    <textarea
                                        value={currentArgument}
                                        onChange={(e) => setCurrentArgument(e.target.value)}
                                        placeholder={`Write your ${currentPlayer && getPlayerDisplayRole(currentPlayer) === 'attacker' ? 'attack' : 'defense'} argument here...`}
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
                                    No arguments yet. {room?.players.find(p => p.role === 'attacker')?.name} will start the battle!<br/>
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
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-12 border border-gray-600 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="text-8xl mb-4">⚖️</div>
                                <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-4">
                                    BATTLE COMPLETE!
                                </h1>
                                <div className="text-4xl font-bold mb-6">
                                    {gameState.winner === 'tie' ? (
                                        <span className="text-gray-300">🤝 It's a Tie!</span>
                                    ) : gameState.winner === 'attacker' ? (
                                        <span className="text-yellow-400">🏆 {room?.players.find(p => p.originalRole === 'attacker')?.name} WINS!</span>
                                    ) : (
                                        <span className="text-yellow-400">🏆 {room?.players.find(p => p.originalRole === 'defender')?.name} WINS!</span>
                                    )}
                                </div>
                                <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                                    {gameState.winner === 'tie' 
                                        ? 'Both sides presented equally compelling arguments in this intense legal battle!'
                                        : gameState.winner === 'attacker'
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
                    )}

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

                                {/* Case Summary */}
                                

                                {/* Arguments Log */}
                                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
                                    {gameState.roundHistory.length === 0 && gameState.allRoundArguments.length === 0 ? (
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

                                            {/* Current Round in Progress */}
                                            {gameState.gamePhase === 'arguing' && gameState.arguments.length > 0 && (
                                                <div className="space-y-6">
                                                    <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                                                        <h3 className="text-2xl font-bold text-blue-400">
                                                            ⚡ Round {gameState.currentRound} (In Progress)
                                                            {gameState.currentRound === 2 && <span className="text-lg ml-2">(Roles Switched)</span>}
                                                        </h3>
                                                        <p className="text-gray-400 mt-1">Arguments so far: {gameState.arguments.length}/6</p>
                                                    </div>
                                                    
                                                    <div className="space-y-4 ml-4">
                                                        {gameState.arguments.map((argument, argIndex) => {
                                                            const exchangeNumber = Math.floor(argIndex / 2) + 1;
                                                            const isFirstInExchange = argIndex % 2 === 0;
                                                            
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
                                                                            <span className="text-xs text-gray-500">
                                                                                Arg #{argIndex + 1}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-gray-200 leading-relaxed">{argument.content}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-6 border-t border-gray-600 bg-gray-800/50">
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm text-gray-400">
                                            {gameState.roundHistory.length > 0 && (
                                                <>
                                                    Completed Rounds: {gameState.roundHistory.length} | 
                                                    Total Arguments: {gameState.roundHistory.reduce((total, round) => total + round.arguments.length, 0) + gameState.arguments.length}
                                                </>
                                            )}
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
            )}
        </div>
    );
}
