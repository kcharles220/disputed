import { io, Socket } from 'socket.io-client';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  ready: boolean;
  role?: 'attacker' | 'defender';
}

export interface GameRoom {
  id: string;
  players: Player[];
  gameState: 'waiting' | 'starting' | 'playing' | 'finished';
  case?: {
    id: number;
    title: string;
    description: string;
    context: string;
    attackerSide: string;
    defenderSide: string;
  };
  currentRound?: number;
  maxRounds?: number;
  scores?: { attacker: number; defender: number };
  createdAt: Date;
}

export interface PlayerData {
  name: string;
  avatar: string;
}

class SocketService {
  private socket: Socket | null = null;
  private readonly serverUrl = 'http://localhost:3001';

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
        transports: ['websocket', 'polling']
      });
      
      this.socket.on('connect', () => {
        console.log('Connected to server:', this.socket?.id);
        resolve(this.socket!);
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
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
  createRoom(playerData: PlayerData): Promise<{ roomId: string; room: GameRoom }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('create-room', playerData);
      
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
  joinRoom(roomId: string, playerData: PlayerData): Promise<GameRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('join-room', { roomId, playerData });
      
      this.socket.once('room-updated', (room: GameRoom) => {
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

  // Toggle player ready status
  toggleReady(roomId: string) {
    if (this.socket) {
      this.socket.emit('player-ready', { roomId });
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

  // Event listeners
  onRoomUpdated(callback: (room: GameRoom) => void) {
    if (this.socket) {
      this.socket.on('room-updated', callback);
    }
  }

  onGameStarting(callback: (room: GameRoom) => void) {
    if (this.socket) {
      this.socket.on('game-starting', callback);
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

  // Remove event listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Submit argument
  submitArgument(roomId: string, argument: any) {
    if (this.socket) {
      this.socket.emit('submit-argument', { roomId, argument });
    }
  }

  getSocket() {
    return this.socket;
  }
}

// Export singleton instance
export const socketService = new SocketService();
