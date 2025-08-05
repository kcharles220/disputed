import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'; // Use your backend port

export interface Player {
  id: string;
  username: string;
  avatar: string;
  position?: 'left' | 'right';
  currentRole?: 'prosecutor' | 'defender' | null;
  lastRole?: 'prosecutor' | 'defender' | null;
  points: number;
  ready: boolean;
  score: number;
  socketId?: string;
  arguments?: { argument: string; score: number, round: number, exchange: number, role: string }[];
  connected?: boolean;
  language?: string;
}

export interface GameRoom {
  roomId: string;
  gameState: string;
  caseDetails: any;
  players: Player[];
  turn: string | null;
  roundData: { number: number; analysis: any, winner: string, role: string, prosecutorScore: number, defenderScore: number }[];
  round: number;
  exchange: number;
  argumentCount: number;
  arguments: { argument: string; score: number, round: number, exchange: number, socketId: string, role: string }[];
  tiebreakerWinner: string | null;
  language: string;
}

export interface PlayerData {
  name: string;
  avatar: string;
  roomId: string;
  gameState: string;
  caseDetails: any;
  players: Player[];
  turn: string | null;
  round: { number: number; analysis: any };
  exchange: number;
  argumentCount: number;
  tiebreakerWinner: string | null;
  gamesPlayed?: number;
  gamesWon?: number;
  gamesLost?: number;
  pointsWon?: number;
  pointsLost?: number;
  winPercentage?: number;
  averageArgumentScore?: number;
  bestArgumentScore?: number;
  worstArgumentScore?: number;
  totalRoundsPlayed?: number;
  totalRoundsWon?: number;
  averageGameDuration?: number;
  longestWinStreak?: number;
  currentWinStreak?: number;
  // Role-specific stats
  prosecutorGamesPlayed?: number;
  prosecutorGamesWon?: number;
  prosecutorPointsWon?: number;
  prosecutorAverageScore?: number;
  defenderGamesPlayed?: number;
  defenderGamesWon?: number;
  defenderPointsWon?: number;
  defenderAverageScore?: number;
  preferredRole?: 'prosecutor' | 'defender' | 'none';
}

class SocketService {
  // Listen for game state updates

  private socket: Socket | null = null;
  private readonly serverUrl = SERVER_URL;

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      // If already connected, resolve immediately
      if (this.socket && this.socket.connected) {
        resolve(this.socket);
        return;
      }

      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
      }

      console.log('Connecting to Socket.IO server at:', this.serverUrl);
      this.socket = io(this.serverUrl, {
        timeout: 10000,
        transports: ['websocket', 'polling'],
        withCredentials: true
      });

      this.socket.on('connect', () => {
        console.log('Connected to server:', this.socket?.id);
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('Connection error:', error.message);
        console.error('Error type:', error.type);
        console.error('Error description:', error.description);
        console.error('Full error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Create a new game room 
  createRoom(playerData: PlayerData, language: string): Promise<{ roomId: string; room: GameRoom }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('create-room',  playerData , language);

      this.socket.once('room-created', (data) => {
        resolve(data);
      });

      // Handle potential errors
      setTimeout(() => {
        reject(new Error('Room creation timeout'));
      }, 5000);
    });
  }

  // Join an existing room
  joinRoom(roomId: string, playerData: PlayerData, language: string): Promise<GameRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('join-room', { roomId, playerData }, language);

      this.socket.once('gameStateUpdate', (room: GameRoom) => {
        resolve(room);
      });

      this.socket.once('join-error', (error) => {
        reject(new Error(error.message));
      });

      // Handle timeout
      setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 5000);
    });
  }
  // Proceed to the next phase of the game
  proceed(roomId: string) {
    if (this.socket) {
      this.socket.emit('proceed', roomId);
    }
  }
  // Toggle player ready status
  toggleReady(roomId: string, ready: boolean) {
    if (this.socket) {
      this.socket.emit('setReady', { roomId, ready });
    }
  }

  // Get room information
  getRoomInfo(roomId: string): Promise<GameRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('get-room-info', roomId);

      this.socket.once('room-info', (room: GameRoom) => {
        resolve(room);
      });

      this.socket.once('room-not-found', () => {
        reject(new Error('Room not found'));
      });
    });
  }

  requestRoomInfo(roomId: string) {
    if (this.socket) {
      this.socket.emit('get-room-info', roomId);
    }
  }

  // Event listeners
  onRoomUpdated(callback: (room: GameRoom) => void) {
    if (this.socket) {
      this.socket.on('room-updated', callback);
    }
  }
  onGameStateUpdate(callback: (gameState: GameRoom) => void) {
    if (this.socket) {
      this.socket.on('gameStateUpdate', callback);
    }
  }
  onGameStarting(callback: (room: GameRoom) => void) {
    if (this.socket) {
      this.socket.on('game-starting', callback);
    }
  }

  onForceSubmitArgument(callback: () => void) {
    if (this.socket) {
      this.socket.on('forceSubmitArgument', callback);
    }
  }

  onJoinError(callback: (error: { message: string }) => void) {
    if (this.socket) {
      this.socket.on('join-error', callback);
    }
  }

  // Game argument events
  onGameArgument(callback: (argument: any) => void) {
    if (this.socket) {
      this.socket.on('game-argument', callback);
    }
  }

  onRoundComplete(callback: (result: any) => void) {
    if (this.socket) {
      this.socket.on('round-complete', callback);
    }
  }

  onNextRound(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('next-round', callback);
    }
  }

  onGameEnd(callback: (result: any) => void) {
    if (this.socket) {
      this.socket.on('game-end', callback);
    }
  }

  // Listen for next round ready state updates
  onNextRoundReadyUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('next-round-ready-update', callback);
    }
  }

  // Listen for next round ready state reset
  onNextRoundReadyStateReset(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('next-round-ready-state-reset', callback);
    }
  }

  // Listen for next round ready cleared
  onNextRoundReadyCleared(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('next-round-ready-cleared', callback);
    }
  }

  // Listen for next round timer updates
  onNextRoundTimerUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('next-round-timer-update', callback);
    }
  }
  // Remove event listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Submit argument
  submitArgument(roomId: string, argument: any) {
    if (this.socket) {
      this.socket.emit('submitArgument', { roomId, argument });
    }
  }
  // Submit argument
  chooseSide(roomId: string, role: string) {
    if (this.socket) {
      this.socket.emit('chooseSide', { roomId, role });
    }
  }
  getSocket() {
    return this.socket;
  }

  // Listen for timer updates from the server
  onTimerUpdate(callback: (timer: { timerValue: number; timerRemaining: number; timerRunning: boolean }) => void) {
    if (this.socket) {
      this.socket.on('timerUpdate', callback);
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
