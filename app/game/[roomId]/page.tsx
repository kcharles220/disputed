'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { socketService, GameRoom, Player } from '../../services/socketService';
import CaseReadingModal from './components/CaseReadingModal';
import RoundCompleteModal from './components/RoundCompleteModal';
import SideChoiceModal from './components/SideChoiceModal';
import GameCompleteModal from './components/GameCompleteModal';

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

interface PlayerData {
    id: string;
    name: string;
    avatar: string;
    current_role: 'prosecutor' | 'defender';
    original_role: 'prosecutor' | 'defender';
    rounds_won: number;
    total_score: number;
    average_score: number;
    rounds_played: number;
    round1_score: number;
    round1_role: 'prosecutor' | 'defender' | null;
    round2_score: number;
    round2_role: 'prosecutor' | 'defender' | null;
    round3_score: number;
    round3_role: 'prosecutor' | 'defender' | null;
}

interface GameState {
    case: {
        id: number;
        title: string;
        description: string;
        context: string;
        prosecutorSide: string;
        defenderSide: string;
    } | null;
    arguments: GameArgument[];
    allRoundArguments: GameArgument[]; // Store all arguments from all rounds
    currentTurn: 'prosecutor' | 'defender';
    currentRound: number;
    maxRounds: number;
    scores: { prosecutor: number; defender: number }; // Role-based round wins for display
    playerScores: { [playerId: string]: number }; // Player-based round wins for tracking
    individualScores: { [playerId: string]: number }; // Track scores by player ID
    playerData?: { [playerId: string]: PlayerData }; // NEW: Comprehensive player data from server
    gamePhase: 'case-reading' | 'arguing' | 'round-complete' | 'finished' | 'side-choice';
    winner?: string;
    roundResult?: {
        round: number;
        winner: 'prosecutor' | 'defender';
        analysis: string;
        prosecutorScore: number;
        defenderScore: number;
        argumentScores?: { argumentId: string; score: number }[]; // Individual argument scores
    };
    roundHistory: {
        round: number;
        winner: 'prosecutor' | 'defender';
        analysis: string;
        prosecutorScore: number;
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
   

    let roomId = params.roomId as string;
   

    // Fallback to localStorage if roomId is undefined
    if ((!roomId || roomId === 'undefined') && typeof window !== 'undefined') {
        const storedRoomId = localStorage.getItem('currentRoomId');
        if (storedRoomId) {
            roomId = storedRoomId;
        }
    }

    const [room, setRoom] = useState<GameRoom | null>(null);
    const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
    const [gameState, setGameState] = useState<GameState>({
        case: null,
        arguments: [],
        allRoundArguments: [],
        currentTurn: 'prosecutor',
        currentRound: 1,
        maxRounds: 3,
        scores: { prosecutor: 0, defender: 0 },
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

    // Next round readiness states - simplified
    const [isNextRoundReady, setIsNextRoundReady] = useState(false);
    const [otherPlayerNextRoundReady, setOtherPlayerNextRoundReady] = useState(false);
    const [nextRoundAutoStartTime, setNextRoundAutoStartTime] = useState(60);
    const [showNextRoundReadyCheck, setShowNextRoundReadyCheck] = useState(false);
    const [nextRoundMessage, setNextRoundMessage] = useState('');

    // Game completion states
    const [gameHasEnded, setGameHasEnded] = useState(false);
    const [showGameCompleteModal, setShowGameCompleteModal] = useState(false);
    const [showFullBattleLog, setShowFullBattleLog] = useState(false);

    // Refs to capture current values in event handlers
    const currentPlayerRef = useRef<Player | null>(null);
    const currentArgumentRef = useRef<string>('');
    const gameHasEndedRef = useRef<boolean>(false);

    // Track page visibility to handle timer sync when tab becomes active again
    const [isPageVisible, setIsPageVisible] = useState(true);

    // Handle page visibility changes for timer synchronization
    useEffect(() => {
        const handleVisibilityChange = () => {
            const visible = !document.hidden;
            setIsPageVisible(visible);

            if (visible && roomId) {
                // Request fresh timer state from server when tab becomes visible
                socketService.getSocket()?.emit('request-timer-sync', { roomId });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [roomId]);

    // Function to update user stats when game ends
    const updateUserStats = async (gameResult: any) => {
        if (!session?.user?.id || !currentPlayer) {
            return;
        }

        try {
            // Calculate role data from round history
            const playerRoles: Array<{
                round: number;
                role: 'prosecutor' | 'defender';
                roundWon: boolean;
                roundScore: number;
            }> = [];

            // Build role data from round history
            gameState.roundHistory.forEach(round => {
                // Use display role if available, otherwise use role for round 1
                let playerRole: 'prosecutor' | 'defender';

                if (round.round === 1) {
                    // Round 1: always use original role
                    playerRole = currentPlayer.role as 'prosecutor' | 'defender';
                } else {
                    // Rounds 2+: use display role if available, otherwise calculate
                    playerRole = currentPlayer.displayRole ||
                        (currentPlayer.role === 'prosecutor' ? 'defender' : 'prosecutor');
                }

                const roundWon = round.winner === playerRole;
                const roundScore = playerRole === 'prosecutor' ? round.prosecutorScore : round.defenderScore;

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


            const response = await fetch('/api/user/update-stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gameData),
            });

            if (response.ok) {
                const result = await response.json();
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
        gameHasEndedRef.current = gameHasEnded;
    }, [gameHasEnded]);

    useEffect(() => {
        gameHasEndedRef.current = gameHasEnded;
    }, [gameHasEnded]);

    useEffect(() => {
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
                socketService.getSocket()?.onAny((event, ...args) => {
                    console.log('Socket event:', event, args);
                });
                // Get room info and current player
                try {
                    const roomInfo = await socketService.getRoomInfo(roomId);
                    setRoom(roomInfo);

                    // Set the case from server
                    if (roomInfo.case) {
                        setGameState(prev => ({
                            ...prev,
                            case: roomInfo.case || null,
                            currentRound: roomInfo.currentRound || 1,
                            maxRounds: roomInfo.maxRounds || 3,
                            scores: roomInfo.scores || { prosecutor: 0, defender: 0 }
                        }));
                    }

                    const player = roomInfo.players.find(p => p.id === socketService.getSocket()?.id);
                    setCurrentPlayer(player || null);

                    // Check if current player should start first based on display role
                    if (player && getPlayerDisplayRole(player) === 'prosecutor') {
                        setIsMyTurn(true);
                    }
                } catch (roomError) {
                    console.error('Failed to get room info:', roomError);
                    // If room not found, redirect back to lobby
                    router.push(`/lobby?room=${roomId}`);
                    return;
                }

                // Set up socket listeners for game events
                socketService.onGameArgument((argument) => {

                    setGameState(prev => {
                        const newArguments = [...prev.arguments, argument];
                        const newAllRoundArguments = [...prev.allRoundArguments, { ...argument, round: prev.currentRound }];


                        return {
                            ...prev,
                            arguments: newArguments,
                            allRoundArguments: newAllRoundArguments,
                            currentTurn: argument.nextTurn || prev.currentTurn // Use server's turn info
                        };
                    });
                });

                // Listen for explicit turn updates from server
                socketService.getSocket()?.on('turn-update', (data) => {
                    setGameState(prev => ({
                        ...prev,
                        currentTurn: data.currentTurn,
                        currentRound: data.round
                    }));
                });

                socketService.onRoundComplete((result) => {
                   

                    setGameState(prev => {
                       
                        const roundHistoryEntry = {
                            round: result.round,
                            winner: result.winner,
                            analysis: result.analysis,
                            prosecutorScore: result.prosecutorScore,
                            defenderScore: result.defenderScore,
                            arguments: prev.arguments.map(arg => ({ ...arg, round: prev.currentRound })),
                            argumentScores: result.argumentScores || []
                        };

                   

                        const newState = {
                            ...prev,
                            gamePhase: 'round-complete' as const,
                            scores: result.scores, // Use server role-based scores
                            playerScores: result.playerScores || {}, // Use server player-based scores
                            playerData: result.playerData || {}, // NEW: Use server comprehensive player data
                            roundResult: result,
                            roundHistory: [...prev.roundHistory, roundHistoryEntry]
                        };

                        return newState;
                    });

                    // Check if game will continue to determine if we should show ready check
                    const playerWins = Object.values(result.playerScores || {}) as number[];
                    const maxPlayerWins = Math.max(...(playerWins.length > 0 ? playerWins : [0]));
                    const gameWillContinue = maxPlayerWins < 2 && result.round < 3; // Use maxRounds directly since gameState isn't updated yet


                    // Check for 1-1 tie scenario going to round 3 (side choice needed)
                    const playerWinCounts = Object.values(result.playerScores || {}) as number[];
                    const is1v1Tie = result.round === 2 && playerWinCounts.length === 2 &&
                        playerWinCounts.every(wins => wins === 1);

                    if (gameWillContinue) {
                        // Enable ready check for all scenarios where game continues
                        // This includes 1-1 ties that will need side choice
                        setTimeout(() => {
                            setShowNextRoundReadyCheck(true);
                            setNextRoundAutoStartTime(60);

                            if (is1v1Tie) {
                            } else {
                            }
                        }, 2000); // 2 second delay to let users read the analysis first
                    } else {
                    }
                });

                socketService.onNextRound((data) => {
                    

                    // Handle role switching - update both currentPlayer and room carefully
                    if (data.players) {

                        // Find the updated current player
                        const updatedCurrentPlayer = data.players.find((p: any) => p.id === socketService.getSocket()?.id);

                        if (updatedCurrentPlayer) {
                           

                            // Update current player state
                            setCurrentPlayer(updatedCurrentPlayer);
                        }

                        // Update room with new players data while preserving other room properties
                        setRoom(prev => {
                            if (!prev) return null;

                            

                            return {
                                ...prev,
                                players: data.players
                            };
                        });

                        
                    }

                    setGameState(prev => ({
                        ...prev,
                        currentRound: data.round,
                        scores: data.scores,
                        currentTurn: 'prosecutor',
                        gamePhase: 'arguing',
                        arguments: [],
                        roundResult: undefined
                    }));

                    // Reset ready states for new round
                    setIsNextRoundReady(false);
                    setOtherPlayerNextRoundReady(false);
                    setShowNextRoundReadyCheck(false);
                    setNextRoundAutoStartTime(60);

                    // Reset turn to prosecutor for new round (will be updated based on current player's role)
                    // Note: We'll let the turn checking useEffect handle this properly
                });

                // Listen for side choice needed (round 3 draw)
                socketService.getSocket()?.on('side-choice-needed', (data) => {
                    

                    // Store the side choice data but don't change game phase yet
                    // The modal will only appear when both players are ready
                    setGameState(prev => ({
                        ...prev,
                        currentRound: data.round,
                        scores: data.scores,
                        sideChoice: {
                            chooserPlayerId: data.chooserPlayerId,
                            chooserPlayerName: data.chooserPlayerName,
                            playerPerformance: data.playerPerformance
                        }
                    }));

                    // Don't transition to side choice here - let the useEffect handle it when both are ready
                });

                // Listen for side choice completion
                socketService.getSocket()?.on('side-choice-complete', (data) => {

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
                        currentTurn: 'prosecutor',
                        gamePhase: 'arguing',
                        arguments: [],
                        roundResult: undefined,
                        sideChoice: undefined
                    }));

                    // Reset turn based on new display role
                    if (updatedPlayer && getPlayerDisplayRole(updatedPlayer) === 'prosecutor') {
                        setIsMyTurn(true);
                    } else {
                        setIsMyTurn(false);
                    }
                });

                // Listen for players updated (when roles are switched)
                socketService.getSocket()?.on('players-updated', (data) => {
                    setNextRoundMessage(data.message || '');

                    // Update room and players
                    if (data.players) {
                        const updatedPlayer = data.players.find((p: any) => p.id === socketService.getSocket()?.id);
                        if (updatedPlayer) {
                            setCurrentPlayer(updatedPlayer);
                            setRoom(prev => prev ? { ...prev, players: data.players } : null);
                        }
                    }

                    // Update game state for the new round but keep the round-complete phase
                    // This ensures the modal continues to show with the ready check
                    setGameState(prev => ({
                        ...prev,
                        currentRound: data.round,
                        scores: data.scores,
                        gamePhase: 'round-complete' // Keep in round-complete so modal shows with ready check
                    }));

                    // Enable ready check if not already enabled
                    setTimeout(() => {
                        setShowNextRoundReadyCheck(true);
                        setNextRoundAutoStartTime(60);
                    }, 1000);
                });

                // Listen for next round ready updates - server-driven ready state management
                socketService.onNextRoundReadyUpdate((data) => {

                    // Use the server's readyStates to set our local state accurately
                    if (data.readyStates && currentPlayer) {
                        const myReadyState = data.readyStates[currentPlayer.id] || false;
                        const otherPlayer = room?.players.find(p => p.id !== currentPlayer.id);
                        const otherPlayerReadyState = otherPlayer ? data.readyStates[otherPlayer.id] || false : false;

                        setIsNextRoundReady(myReadyState);
                        setOtherPlayerNextRoundReady(otherPlayerReadyState);

                        
                    }

                    
                });

                // Listen for ready state reset when a new round completes
                socketService.onNextRoundReadyStateReset((data) => {

                    // Reset both players' ready states as instructed by server
                    setIsNextRoundReady(false);
                    setOtherPlayerNextRoundReady(false);

                });

                // Listen for ready state cleared when round starts
                socketService.onNextRoundReadyCleared((data) => {

                    // Ensure both players are marked as not ready when round starts
                    setIsNextRoundReady(false);
                    setOtherPlayerNextRoundReady(false);

                });

                // Listen for next round started
                socketService.getSocket()?.on('next-round-started', (data) => {

                    // Reset all readiness states for the new round
                    setShowNextRoundReadyCheck(false);
                    setIsNextRoundReady(false);
                    setOtherPlayerNextRoundReady(false);
                    setNextRoundAutoStartTime(60);
                    setNextRoundMessage(''); // Clear any role switch message when new round starts

                    setGameState(prev => ({
                        ...prev,
                        currentRound: data.round,
                        scores: data.scores,
                        currentTurn: 'prosecutor',
                        gamePhase: 'arguing',
                        arguments: [],
                        roundResult: undefined
                    }));
                });

                socketService.onGameEnd((result) => {
                    

                    // Stop all game activities but keep the modal visible
                    setGameHasEnded(true);
                    setShowNextRoundReadyCheck(false);
                    setIsNextRoundReady(false);
                    setOtherPlayerNextRoundReady(false);

                    setGameState(prev => ({
                        ...prev,
                        winner: result.winner,
                        playerData: result.playerData || {} // NEW: Store final comprehensive player data
                        // Keep gamePhase as 'round-complete' so modal stays visible
                        // GameCompleteModal will only show when user clicks "View Final Results"
                    }));

                    // Update user stats if authenticated
                    updateUserStats(result);
                });

                // Listen for player ready states
                socketService.getSocket()?.on('playerReady', (data) => {
                    if (data.playerId !== socketService.getSocket()?.id) {
                        setOtherPlayerReady(data.ready);
                    }
                });

                // Listen for single game-state event from server
                socketService.getSocket()?.on('game-state', (data) => {
                    if (!data) return;
                    // Always update arguments, turn, and phase robustly
                    setGameState(prev => ({
                        ...prev,
                        ...data,
                        gamePhase: data.gamePhase || data.phase || prev.gamePhase,
                        currentTurn: data.currentTurn || prev.currentTurn,
                        arguments: data.arguments || prev.arguments,
                        allRoundArguments: data.allRoundArguments || prev.allRoundArguments,
                        currentRound: data.currentRound || data.round || prev.currentRound,
                        maxRounds: data.maxRounds || prev.maxRounds,
                        scores: data.scores || prev.scores,
                        playerScores: data.playerScores || prev.playerScores,
                        playerData: data.playerData || prev.playerData,
                        case: data.case || prev.case,
                        roundHistory: data.roundHistory || prev.roundHistory
                    }));

                    // Hide/show modals and set game end state based on phase
                    const phase = data.gamePhase || data.phase;
                    if (phase === 'case-reading') {
                        setShowCaseModal(true);
                        setShowNextRoundReadyCheck(false);
                        setShowGameCompleteModal(false);
                        setGameHasEnded(false);
                    } else if (phase === 'arguing') {
                        setShowCaseModal(false);
                        setShowNextRoundReadyCheck(false);
                        setShowGameCompleteModal(false);
                        setGameHasEnded(false);
                        setCurrentArgument('');
                    } else if (phase === 'round-complete') {
                        setShowCaseModal(false);
                        setShowNextRoundReadyCheck(true);
                        setShowGameCompleteModal(false);
                        setGameHasEnded(false);
                    } else if (phase === 'side-choice') {
                        setShowCaseModal(false);
                        setShowNextRoundReadyCheck(false);
                        setShowGameCompleteModal(false);
                        setGameHasEnded(false);
                    } else if (phase === 'game-over' || phase === 'finished') {
                        setShowCaseModal(false);
                        setShowNextRoundReadyCheck(false);
                        setShowGameCompleteModal(true);
                        setGameHasEnded(true);
                    }
                });

                // Listen for server-side next round timer updates
                socketService.onNextRoundTimerUpdate((data) => {
                    if (gameHasEndedRef.current) return;

                    setNextRoundAutoStartTime(data.timeLeft);

                    // Server will handle auto-start when timer reaches 0
                });

                // Listen for time up events (only Phase 2 - final auto-submission)
                socketService.getSocket()?.on('time-up', (data) => {
                    if (gameHasEndedRef.current) return; // Ignore time-up events after game ends


                    // Only auto-submit if it's phase 2 and my turn
                    if (data.phase === 2 && currentPlayerRef.current?.role === data.currentTurn && currentPlayerRef.current) {

                        const argument: GameArgument = {
                            id: Date.now().toString(),
                            playerId: currentPlayerRef.current.id,
                            playerName: currentPlayerRef.current.name,
                            content: currentArgumentRef.current.trim() || "[No argument provided]" + " [Time expired]",
                            timestamp: new Date(),
                            type: currentPlayerRef.current.role === 'prosecutor' ? 'attack' : 'defense',
                            round: gameState.currentRound
                        };

                        // Submit the current argument
                        socketService.submitArgument(roomId, argument);
                        setCurrentArgument(''); // Clear the argument field
                    }
                });

                // Listen for interrupt availability (Phase 2 only)
                socketService.getSocket()?.on('interrupt-available', (data) => {
                    if (gameHasEndedRef.current) return; // Ignore interrupt events after game ends

                    // Only allow interrupt in phase 2 and if it's not my turn
                    if (data.phase === 2) {
                        setCanInterrupt(currentPlayerRef.current?.role !== data.currentTurn);
                        setTimerPhase(2); // Ensure we're in phase 2
                    }
                });

                // Listen for player interruptions
                socketService.getSocket()?.on('player-interrupted', (data) => {
                    if (gameHasEndedRef.current) return; // Ignore interrupt events after game ends

                    setCanInterrupt(false);

                    // If I was the one interrupted, submit my current argument
                    if (currentPlayerRef.current?.role === data.interruptedTurn && currentArgumentRef.current.trim() && currentPlayerRef.current) {

                        const argument: GameArgument = {
                            id: Date.now().toString(),
                            playerId: currentPlayerRef.current.id,
                            playerName: currentPlayerRef.current.name,
                            content: currentArgumentRef.current.trim() + " [Interrupted]",
                            timestamp: new Date(),
                            type: currentPlayerRef.current.role === 'prosecutor' ? 'attack' : 'defense',
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

    // Case reading timer countdown - DISABLED: Timer now handled server-side for synchronization
    // Client timers cause desync when browser tabs are backgrounded
    // The server will send case-reading-timer-update events to keep all clients synchronized
    useEffect(() => {
        // Remove client-side timer - server handles this now
        // if (showCaseModal && gameState.gamePhase === 'case-reading' && caseReadingTimeLeft > 0) {
        //     const timer = setTimeout(() => {
        //         setCaseReadingTimeLeft(prev => prev - 1);
        //     }, 1000);
        //     return () => clearTimeout(timer);
        // } else if (caseReadingTimeLeft === 0 && showCaseModal && !gameHasEnded) {
        //     // Auto-start game when timer runs out
        //     startGame();
        // }
    }, [showCaseModal, gameState.gamePhase, caseReadingTimeLeft]);

    // Handle turn changes
    useEffect(() => {
        if (currentPlayer && gameState.gamePhase === 'arguing') {
            // Use display role for turn checking (visual representation)
            const myDisplayRole = getPlayerDisplayRole(currentPlayer);
            const isMyTurnNow = myDisplayRole === gameState.currentTurn;
            

            if (isMyTurnNow !== isMyTurn) {
                setIsMyTurn(isMyTurnNow);
                setCanInterrupt(false); // Reset interrupt state on turn change
            }
        }
    }, [gameState.currentTurn, currentPlayer, gameState.gamePhase, isMyTurn]);

    // Handle transition to side choice when ready states change
    useEffect(() => {
        
        // If we have side choice data stored but are still in round-complete phase,
        // and both players are now ready, transition to side choice phase
        if (gameState.gamePhase === 'round-complete' &&
            gameState.sideChoice &&
            isNextRoundReady &&
            otherPlayerNextRoundReady) {

            // Stop the auto-start timer when entering side choice phase
            setShowNextRoundReadyCheck(false);
            setNextRoundAutoStartTime(0);

            // Clear ready states to prevent server auto-start during side choice
            setIsNextRoundReady(false);
            setOtherPlayerNextRoundReady(false);

            setGameState(prev => ({
                ...prev,
                gamePhase: 'side-choice'
            }));

        }
    }, [isNextRoundReady, otherPlayerNextRoundReady, gameState.gamePhase, gameState.sideChoice]);

    // Next round auto-start countdown - DISABLED: Client timers cause desync
    // Server will handle auto-start timing and send synchronized updates
    useEffect(() => {
        // Don't run auto-start timer during side choice phase
        // DISABLED: Client-side countdown causes desynchronization when tabs are backgrounded
        // Server will send next-round-timer-update events to keep all clients synchronized
        // if (showNextRoundReadyCheck && 
        //     nextRoundAutoStartTime > 0 && 
        //     !gameHasEnded && 
        //     gameState.gamePhase !== 'side-choice') {
        //     const timer = setTimeout(() => {
        //         setNextRoundAutoStartTime(prev => prev - 1);
        //     }, 1000);
        //     return () => clearTimeout(timer);
        // }
    }, [showNextRoundReadyCheck, nextRoundAutoStartTime, gameHasEnded, gameState.gamePhase]);

    const handleSubmitArgument = () => {
        if (!currentArgument.trim() || !currentPlayer || gameHasEnded) return;


        const argument: GameArgument = {
            id: Date.now().toString(),
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            content: currentArgument.trim(),
            timestamp: new Date(),
            type: getPlayerDisplayRole(currentPlayer) === 'prosecutor' ? 'attack' : 'defense',
            round: gameState.currentRound
        };

        // Send argument via socket
        socketService.submitArgument(roomId, argument);

        setCurrentArgument('');
        setCanInterrupt(false); // Reset interrupt state after submission
        // Don't set isMyTurn to false here - let the socket event handle turn switching
    };

    const handleSideChoice = (chosenSide: 'prosecutor' | 'defender') => {
        

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
    };

    // Simplified next round ready handler
    const handleNextRoundReady = () => {
        if (gameHasEnded || isNextRoundReady) return;



        // Send ready signal to server (no ready/unready toggle, just ready once)
        socketService.getSocket()?.emit('next-round-ready', {
            roomId
        });
    };

    const handleProceedToGameComplete = (winner: 'prosecutor' | 'defender') => {
        setGameHasEnded(true);
        setGameState(prev => ({
            ...prev,
            gamePhase: 'finished',
            winner: winner
        }));
        setShowGameCompleteModal(true);
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

    const formatScore = (score: number) => {
        return score % 1 === 0 ? score.toString() : score.toFixed(1);
    };

    // Helper functions to get player data from server-provided comprehensive data
    const getPlayerData = (playerId: string): PlayerData | null => {
        const data = gameState.playerData?.[playerId] || null;
        return data;
    };

    const getPlayerScore = (playerId: string) => {
        const playerData = getPlayerData(playerId);
        const score = playerData?.total_score || 0;

        return score;
    };

    const getPlayerRoundWins = (playerId: string) => {
        const playerData = getPlayerData(playerId);
        const wins = playerData?.rounds_won || 0;
        return wins;
    };

    const getPlayerRoundScore = (playerId: string, round: number) => {
        const playerData = getPlayerData(playerId);
        if (!playerData) return 0;

        switch (round) {
            case 1: return playerData.round1_score;
            case 2: return playerData.round2_score;
            case 3: return playerData.round3_score;
            default: return 0;
        }
    };

    const getPlayerRoundRole = (playerId: string, round: number) => {
        const playerData = getPlayerData(playerId);
        if (!playerData) return null;

        switch (round) {
            case 1: return playerData.round1_role;
            case 2: return playerData.round2_role;
            case 3: return playerData.round3_role;
            default: return null;
        }
    };

    const getProsecutorScore = () => {
        const prosecutorPlayer = room?.players.find(p => (p.originalRole || p.role) === 'prosecutor');
        const score = prosecutorPlayer ? getPlayerScore(prosecutorPlayer.id) : 0;
        return score;
    };

    const getDefenderScore = () => {
        const defenderPlayer = room?.players.find(p => (p.originalRole || p.role) === 'defender');
        const score = defenderPlayer ? getPlayerScore(defenderPlayer.id) : 0;
        return score;
    };

    const getProsecutorRoundWins = () => {
        const prosecutorPlayer = room?.players.find(p => (p.originalRole || p.role) === 'prosecutor');
        const wins = prosecutorPlayer ? getPlayerRoundWins(prosecutorPlayer.id) : 0;
        return wins;
    };

    const getDefenderRoundWins = () => {
        const defenderPlayer = room?.players.find(p => (p.originalRole || p.role) === 'defender');
        const wins = defenderPlayer ? getPlayerRoundWins(defenderPlayer.id) : 0;
        return wins;
    };

    const otherPlayer = room?.players.find(p => p.id !== currentPlayer?.id);

    // Helper function to get the display role for a player (visual representation)
    const getPlayerDisplayRole = (player: Player): 'prosecutor' | 'defender' => {
        // If displayRole is set, use it (for rounds 2+ with role switching)
        if (player.displayRole) {
            return player.displayRole;
        }
        // Otherwise use the original role (round 1)
        return player.role as 'prosecutor' | 'defender';
    };

    // Helper function to check if current player should be on the left side (original prosecutor position)
    const isPlayerOnLeftSide = (player: Player): boolean => {
        // Players stay on their original sides regardless of display role
        // Use originalRole if available, otherwise fallback to initial role
        return (player.originalRole || player.role) === 'prosecutor';
    };

    if (!room || !currentPlayer || !gameState.case) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-white text-2xl">Loading game...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 relative overflow-hidden">
            {/* Dynamic background effects based on current prosecutor/defender positions */}
            <div className="absolute inset-0">
                {(() => {
                    // Determine current roles and positions
                    const leftPlayer = room.players.find(p => (p.originalRole || p.role) === 'prosecutor');
                    const rightPlayer = room.players.find(p => (p.originalRole || p.role) === 'defender');
                    const leftPlayerDisplayRole = leftPlayer ? getPlayerDisplayRole(leftPlayer) : 'prosecutor';
                    const rightPlayerDisplayRole = rightPlayer ? getPlayerDisplayRole(rightPlayer) : 'defender';

                    // Left side gets prosecutor color if left player is currently prosecutor, else defender color
                    const leftSideIsProsecutor = leftPlayerDisplayRole === 'prosecutor';
                    // Right side gets prosecutor color if right player is currently prosecutor, else defender color  
                    const rightSideIsProsecutor = rightPlayerDisplayRole === 'prosecutor';

                    return (
                        <>
                            {/* Left side - Dynamic color based on current role */}
                            <div className="absolute inset-y-0 left-0 w-1/2">
                                {leftSideIsProsecutor ? (
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
                                {rightSideIsProsecutor ? (
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
                <CaseReadingModal
                    showCaseModal={showCaseModal}
                    setShowCaseModal={setShowCaseModal}
                    gameState={gameState}
                    room={room}
                    currentPlayer={currentPlayer}
                    isReady={isReady}
                    otherPlayerReady={otherPlayerReady}
                    caseReadingTimeLeft={caseReadingTimeLeft}
                    toggleReady={toggleReady}
                    formatTime={formatTime}
                    getPlayerDisplayRole={getPlayerDisplayRole}
                    isPlayerOnLeftSide={isPlayerOnLeftSide}
                />

                {/* Round Complete Modal */}
                <RoundCompleteModal
                    gameState={gameState}
                    room={room}
                    currentPlayer={currentPlayer}
                    isNextRoundReady={isNextRoundReady}
                    otherPlayerNextRoundReady={otherPlayerNextRoundReady}
                    nextRoundAutoStartTime={nextRoundAutoStartTime}
                    showNextRoundReadyCheck={showNextRoundReadyCheck}
                    nextRoundMessage={nextRoundMessage}
                    handleNextRoundReady={handleNextRoundReady}
                    handleProceedToGameComplete={handleProceedToGameComplete}
                    formatTime={formatTime}
                    formatScore={formatScore}
                    getPlayerRoundWins={getPlayerRoundWins}
                    getPlayerScore={getPlayerScore}
                    getProsecutorRoundWins={getProsecutorRoundWins}
                    getDefenderRoundWins={getDefenderRoundWins}
                    gameHasEnded={gameHasEnded}
                />

                {/* Side Choice Modal */}
                <SideChoiceModal
                    gameState={gameState}
                    currentPlayer={currentPlayer}
                    handleSideChoice={handleSideChoice}
                    getProsecutorRoundWins={getProsecutorRoundWins}
                    getDefenderRoundWins={getDefenderRoundWins}
                    getProsecutorScore={getProsecutorScore}
                    getDefenderScore={getDefenderScore}
                    formatScore={formatScore}
                />

                {/* Game Complete Modal */}
                <GameCompleteModal
                    gameState={gameState}
                    room={room}
                    showFullBattleLog={showFullBattleLog}
                    setShowFullBattleLog={setShowFullBattleLog}
                    router={router}
                    formatScore={formatScore}
                    getProsecutorScore={getProsecutorScore}
                    getDefenderScore={getDefenderScore}
                    showModal={showGameCompleteModal}
                />

                {/* Main Game Interface */}
                {!showCaseModal && gameState.gamePhase !== 'round-complete' && gameState.gamePhase !== 'side-choice' && gameState.gamePhase !== 'finished' && !gameHasEnded && !showGameCompleteModal && (
                    <div className="min-h-screen px-8 py-8">

                        {/* Players Section - Top positioning */}
                        <div className="flex w-full gap-8 mb-10 items-center">
                            {(() => {
                                // Left side - Player who was originally the prosecutor (stays on left regardless of current role)
                                const leftPlayer = room.players.find(p => (p.originalRole || p.role) === 'prosecutor');
                                const leftPlayerDisplayRole = leftPlayer ? getPlayerDisplayRole(leftPlayer) : 'prosecutor';
                                const isCurrentPlayerOnLeft = leftPlayer?.id === currentPlayer?.id;
                                const leftPlayerLabel = leftPlayerDisplayRole === 'prosecutor' ? 'PROSECUTOR' : 'DEFENDER';
                                const leftPlayerIsProsecutor = leftPlayerDisplayRole === 'prosecutor';

                                

                                return (
                                    <div className={`w-[35%] relative overflow-hidden transition-all duration-300 h-36 ${isCurrentPlayerOnLeft
                                        ? 'transform scale-105'
                                        : 'opacity-80'
                                        }`}>
                                        {/* Glass morphism background */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${leftPlayerIsProsecutor
                                            ? 'from-red-500/20 via-red-400/10 to-orange-500/20'
                                            : 'from-blue-500/20 via-blue-400/10 to-indigo-500/20'
                                            } backdrop-blur-xl rounded-2xl border ${isCurrentPlayerOnLeft
                                                ? (leftPlayerIsProsecutor ? 'border-red-400/50 shadow-red-500/25' : 'border-blue-400/50 shadow-blue-500/25')
                                                : (leftPlayerIsProsecutor ? 'border-red-500/30' : 'border-blue-500/30')
                                            } shadow-2xl`}></div>

                                        {/* Decorative elements */}
                                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                                        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-500/10 rounded-full blur-lg"></div>

                                        {/* Content */}
                                        <div className="relative z-10 p-6 flex items-center gap-6 h-full">
                                            {/* Avatar */}
                                            <div className={`w-16 h-16 bg-gradient-to-br ${leftPlayerIsProsecutor
                                                ? 'from-red-500 to-orange-600'
                                                : 'from-blue-500 to-indigo-600'
                                                } rounded-full flex items-center justify-center text-3xl flex-shrink-0 border-2 ${leftPlayerIsProsecutor ? 'border-red-300/50' : 'border-blue-300/50'
                                                } shadow-lg`}>
                                                {leftPlayer?.avatar || '⚖️'}
                                            </div>

                                            {/* Text */}
                                            <div className="flex-1">
                                                <h3 className={`text-2xl font-bold ${leftPlayerIsProsecutor ? 'text-red-300' : 'text-blue-300'} mb-1`}>
                                                    {leftPlayerLabel} {isCurrentPlayerOnLeft && (
                                                        <span className="mx-2 text-yellow-300 text-lg font-semibold">(YOU)</span>
                                                    )}
                                                </h3>
                                                <p className="text-white/90 font-medium text-lg">{leftPlayer?.name}</p>
                                                <div className="text-sm text-white/60 mt-1">
                                                    {leftPlayerDisplayRole === 'prosecutor' ? gameState.case?.prosecutorSide || 'Plaintiff' : gameState.case?.defenderSide || 'Defendant'}
                                                </div>
                                            </div>

                                            {/* Timer for current turn */}
                                            {gameState.currentTurn === leftPlayerDisplayRole && gameState.gamePhase === 'arguing' && (
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
                                            {gameState.currentTurn === leftPlayerDisplayRole && gameState.gamePhase === 'arguing' && (
                                                <div className={`w-5 h-5 ${leftPlayerIsProsecutor ? 'bg-red-400' : 'bg-blue-400'} rounded-full animate-pulse flex-shrink-0 shadow-lg`}></div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Left Score - 5% width */}
                            <div className="w-[5%] flex flex-col items-center justify-center">
                                {(() => {
                                    const leftPlayer = room?.players.find(p => (p.originalRole || p.role) === 'prosecutor');
                                    const leftPlayerDisplayRole = leftPlayer ? getPlayerDisplayRole(leftPlayer) : 'prosecutor';
                                    const leftIsProsecutor = leftPlayerDisplayRole === 'prosecutor';
                                    // Score always belongs to the leftPlayer (original prosecutor), regardless of current role
                                    const leftPlayerScore = leftPlayer ? getPlayerScore(leftPlayer.id) : 0;
                                    const leftPlayerRoundWins = leftPlayer ? getPlayerRoundWins(leftPlayer.id) : 0;
                                    return (
                                        <>
                                            <span className={`text-8xl font-bold bg-gradient-to-b ${leftIsProsecutor ? 'from-red-300 to-red-500' : 'from-blue-300 to-blue-500'
                                                } bg-clip-text text-transparent drop-shadow-lg`}>
                                                {leftPlayerRoundWins}
                                            </span>
                                            <span className={`text-sm mt-1 ${leftIsProsecutor ? 'text-red-200' : 'text-blue-200'}`}>
                                                ({formatScore(leftPlayerScore)})
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
                                        <span className="font-semibold">Round {gameState.currentRound}/{gameState.maxRounds}</span>
                                        {gameState.currentRound === 2 && (
                                            <span className="text-yellow-300 text-sm font-bold animate-pulse">🔄 ROLES SWITCHED!</span>
                                        )}
                                        <span>Turn: {(() => {
                                            if (gameState.currentTurn === 'prosecutor') {
                                                const attackingPlayer = room?.players.find(p => getPlayerDisplayRole(p) === 'prosecutor');
                                                return `🔥 ${attackingPlayer?.name || 'Prosecutor'}`;
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
                                    const rightPlayer = room?.players.find(p => (p.originalRole || p.role) === 'defender');
                                    const rightPlayerDisplayRole = rightPlayer ? getPlayerDisplayRole(rightPlayer) : 'defender';
                                    const rightIsProsecutor = rightPlayerDisplayRole === 'prosecutor';
                                    // Score always belongs to the rightPlayer (original defender), regardless of current role
                                    const rightPlayerScore = rightPlayer ? getPlayerScore(rightPlayer.id) : 0;
                                    const rightPlayerRoundWins = rightPlayer ? getPlayerRoundWins(rightPlayer.id) : 0;
                                    return (
                                        <>
                                            <span className={`text-8xl font-bold bg-gradient-to-b ${rightIsProsecutor ? 'from-red-300 to-red-500' : 'from-blue-300 to-blue-500'
                                                } bg-clip-text text-transparent drop-shadow-lg`}>
                                                {rightPlayerRoundWins}
                                            </span>
                                            <span className={`text-sm mt-1 ${rightIsProsecutor ? 'text-red-200' : 'text-blue-200'}`}>
                                                ({formatScore(rightPlayerScore)})
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
                                const rightPlayerLabel = rightPlayerDisplayRole === 'prosecutor' ? 'PROSECUTOR' : 'DEFENDER';
                                const rightPlayerIsProsecutor = rightPlayerDisplayRole === 'prosecutor';

                               

                                return (
                                    <div className={`w-[35%] relative overflow-hidden transition-all duration-300 h-36 ${isCurrentPlayerOnRight
                                        ? 'transform scale-105'
                                        : 'opacity-80'
                                        }`}>
                                        {/* Glass morphism background */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${rightPlayerIsProsecutor
                                            ? 'from-red-500/20 via-red-400/10 to-orange-500/20'
                                            : 'from-blue-500/20 via-blue-400/10 to-indigo-500/20'
                                            } backdrop-blur-xl rounded-2xl border ${isCurrentPlayerOnRight
                                                ? (rightPlayerIsProsecutor ? 'border-red-400/50 shadow-red-500/25' : 'border-blue-400/50 shadow-blue-500/25')
                                                : (rightPlayerIsProsecutor ? 'border-red-500/30' : 'border-blue-500/30')
                                            } shadow-2xl`}></div>

                                        {/* Decorative elements */}
                                        <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                                        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-purple-500/10 rounded-full blur-lg"></div>

                                        {/* Content */}
                                        <div className="relative z-10 p-6 flex items-center gap-6 h-full">
                                            {/* Dot indicator */}
                                            {gameState.currentTurn === rightPlayerDisplayRole && gameState.gamePhase === 'arguing' && (
                                                <div className={`w-5 h-5 ${rightPlayerIsProsecutor ? 'bg-red-400' : 'bg-blue-400'} rounded-full animate-pulse flex-shrink-0 shadow-lg`}></div>
                                            )}

                                            {/* Timer */}
                                            {gameState.currentTurn === rightPlayerDisplayRole && gameState.gamePhase === 'arguing' && (
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
                                                <h3 className={`text-2xl font-bold ${rightPlayerIsProsecutor ? 'text-red-300' : 'text-blue-300'} mb-1`}>
                                                    {isCurrentPlayerOnRight && (
                                                        <span className="mx-2 text-yellow-300 text-lg font-semibold">(YOU)</span>
                                                    )} {rightPlayerLabel}
                                                </h3>
                                                <p className="text-white/90 font-medium text-lg">{rightPlayer?.name}</p>
                                                <div className="text-sm text-white/60 mt-1">
                                                    {rightPlayerDisplayRole === 'prosecutor' ? gameState.case?.prosecutorSide || 'Plaintiff' : gameState.case?.defenderSide || 'Defendant'}
                                                </div>
                                            </div>

                                            {/* Avatar */}
                                            <div className={`w-16 h-16 bg-gradient-to-br ${rightPlayerIsProsecutor
                                                ? 'from-red-500 to-orange-600'
                                                : 'from-blue-500 to-indigo-600'
                                                } rounded-full flex items-center justify-center text-3xl flex-shrink-0 border-2 ${rightPlayerIsProsecutor ? 'border-red-300/50' : 'border-blue-300/50'
                                                } shadow-lg`}>
                                                {rightPlayer?.avatar || '⚖️'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Input Section */}
                        {gameState.gamePhase === 'arguing' && (
                            <div className="relative mb-8 overflow-hidden">
                                {/* Glass morphism background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl"></div>
                                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-purple-500/10 rounded-full blur-lg"></div>

                                {/* Content */}
                                <div className="relative z-10 p-8">
                                    {isMyTurn ? (
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className={`text-xl font-bold ${timerPhase === 2 ? 'text-red-300 animate-pulse' : 'text-yellow-300'}`}>
                                                    {timerPhase === 2 ? '⚡ HURRY! Opponent can interrupt!' : '🎯 Your Turn! Make your argument:'}
                                                </h3>
                                                <div className={`text-base ${timerPhase === 2 ? 'text-red-300' : 'text-white/70'}`}>
                                                    Exchange {Math.floor(gameState.arguments.length / 2) + 1}/3
                                                    {timerPhase === 2 && <span className="ml-2 animate-pulse">⚡ INTERRUPT PHASE</span>}
                                                </div>
                                            </div>
                                            <div className="mb-4 text-base text-white/70">
                                                {(() => {
                                                    const currentPlayerArgs = gameState.arguments.filter(arg =>
                                                        arg.type === (currentPlayer && getPlayerDisplayRole(currentPlayer) === 'prosecutor' ? 'attack' : 'defense')
                                                    ).length;
                                                    const remaining = 3 - currentPlayerArgs;
                                                    return `You have ${remaining} argument${remaining !== 1 ? 's' : ''} remaining this round.`;
                                                })()}
                                            </div>
                                            <div className="relative">
                                                <textarea
                                                    value={currentArgument}
                                                    onChange={(e) => setCurrentArgument(e.target.value)}
                                                    placeholder={`Write your ${currentPlayer && getPlayerDisplayRole(currentPlayer) === 'prosecutor' ? 'attack' : 'defense'} argument here...`}
                                                    className={`w-full h-40 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl p-6 text-white placeholder-white/50 resize-none focus:outline-none text-lg transition-all duration-300 border ${timerPhase === 2
                                                        ? 'border-red-400/60 shadow-red-500/20 animate-pulse focus:border-red-300'
                                                        : 'border-white/20 focus:border-yellow-400/60 shadow-yellow-500/10'
                                                        } shadow-lg`}
                                                    maxLength={250}
                                                    disabled={gameHasEnded}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between mt-6">
                                                <span className="text-base text-white/60">
                                                    {currentArgument.length}/250 characters
                                                </span>
                                                <button
                                                    onClick={handleSubmitArgument}
                                                    disabled={!currentArgument.trim() || gameHasEnded}
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
                                                Waiting for {otherPlayer?.name} to make their argument...
                                            </p>
                                            <div className="text-base text-white/60 mt-3">
                                                Exchange {Math.floor(gameState.arguments.length / 2) + (gameState.arguments.length % 2)}/3 in progress
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
                                        Round {gameState.currentRound} Progress: {Math.floor(gameState.arguments.length / 2) + (gameState.arguments.length % 2)}/3 exchanges
                                    </div>
                                </div>
                                <div className="space-y-6 max-h-[600px] overflow-y-auto">
                                    {gameState.arguments.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="text-6xl mb-4 opacity-40">⚖️</div>
                                            <p className="text-white/60 text-lg">
                                                No arguments yet. {room?.players.find(p => p.role === 'prosecutor')?.name} will start the battle!<br />
                                                <span className="text-base">Each round requires 3 exchanges (6 total arguments) before AI analysis.</span>
                                            </p>
                                        </div>
                                    ) : (
                                        gameState.arguments.map((argument, index) => {
                                            const exchangeNumber = Math.floor(index / 2) + 1;
                                            const isFirstInExchange = index % 2 === 0;

                                            return (
                                                <div key={argument.id}>
                                                    {isFirstInExchange && exchangeNumber > 1 && (
                                                        <div className="border-t border-white/20 my-6 pt-6">
                                                            <div className="text-center text-sm text-white/50 mb-4">
                                                                Exchange #{exchangeNumber}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {index === 0 && (
                                                        <div className="text-center text-sm text-white/50 mb-4">
                                                            Exchange #1
                                                        </div>
                                                    )}
                                                    <div className="relative overflow-hidden rounded-xl">
                                                        {/* Glass morphism background for argument */}
                                                        <div className={`absolute inset-0 ${argument.type === 'attack'
                                                            ? 'bg-gradient-to-br from-red-500/20 via-red-400/10 to-orange-500/20'
                                                            : 'bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-indigo-500/20'
                                                            } backdrop-blur-sm border-l-4 ${argument.type === 'attack'
                                                                ? 'border-red-400'
                                                                : 'border-blue-400'
                                                            } shadow-lg`}></div>

                                                        {/* Content */}
                                                        <div className="relative z-10 p-6">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <span className="text-2xl">
                                                                    {argument.type === 'attack' ? '🔥' : '🛡️'}
                                                                </span>
                                                                <span className={`font-semibold text-lg ${argument.type === 'attack' ? 'text-red-300' : 'text-blue-300'
                                                                    }`}>
                                                                    {argument.playerName} ({argument.type === 'attack' ? 'Prosecutor' : 'Defender'})
                                                                </span>
                                                                <span className="text-sm text-white/50 ml-auto">
                                                                    Argument #{index + 1}
                                                                </span>
                                                            </div>
                                                            <p className="text-white/90 text-lg leading-relaxed">{argument.content}</p>
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
