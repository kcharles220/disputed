const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { pl } = require('zod/locales');
const { set } = require('zod');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3001", // Adjust for your Next.js app
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Game state management
const games = new Map();

class Player {
  constructor(id, username, avatar, socketId) {
    this.id = id;
    this.username = username;
    this.avatar = avatar;
    this.position = null; // 'left' or 'right'
    this.currentRole = null; // 'prosecutor' or 'defender'
    this.lastRole = null;
    this.points = 0;
    this.ready = false;
    this.score = 0; // sum of argument scores
    this.arguments = []; // {argument: string, score: number}
    this.socketId = socketId; // Use id as socketId for simplicity  
  }

  reset() {
    this.ready = false;
    this.score = 0;
    this.arguments = [];
  }

  addArgument(argument, score = 0, round, exchange) {
    this.arguments.push({ argument, score, round, exchange });
  }
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.gameState = 'waiting'; // waiting for case details initially
    this.caseDetails = null;
    this.players = [];
    this.turn = null; // player id whose turn it is
    this.roundData = [];
    this.round = 1;
    this.arguments = [];
    this.exchange = 1;
    this.argumentCount = 0;
    this.tiebreakerWinner = null; // player with higher score in case of 1-1
  }

  addPlayer(player) {
    if (this.players.length < 2) {
      this.players.push(player);

      // Set positions
      if (this.players.length === 1) {
        player.position = 'left';
      } else {
        player.position = 'right';

      }
    }
  }

  async initializeGame() {
    try {
      // Get case details from AI (mocked for now)
      this.caseDetails = await this.getCaseDetailsFromAI();

      // Randomly assign roles via coinflip
      const coinFlip = Math.floor(Math.random() * 2); // 0 or 1, 50/50
      if (coinFlip === 0) {
        this.players[0].currentRole = 'prosecutor';
        this.players[1].currentRole = 'defender';
      } else {
        this.players[0].currentRole = 'defender';
        this.players[1].currentRole = 'prosecutor';
      }

      // Set initial turn to prosecutor
      this.turn = this.getProsecutor().id;

      this.players.forEach(p => p.ready = false); // Reset ready states

      this.proceed(); // Proceed to next game state
    } catch (error) {
      console.error('Error initializing game:', error);
    }
  }

  async getCaseDetailsFromAI() {
    // Mock AI response - replace with actual AI integration
    const cases = [
      {
        title: "State vs Thompson",
        description: "A case involving charges of robbery against defendant Thompson. The prosecution argues that Thompson committed armed robbery at a convenience store on Main Street. The defense maintains Thompson's innocence and questions the reliability of witness testimony.",
        prosecutionPosition: "State",
        defensePosition: "Thompson"
      },
      {
        title: "People vs Johnson",
        description: "A fraud case where Johnson is accused of embezzling funds from his employer. The prosecution claims systematic financial misconduct over two years. The defense argues the evidence is circumstantial and points to accounting errors.",
        prosecutionPosition: "People",
        defensePosition: "Johnson"
      }
    ];

    return cases[Math.floor(Math.random() * cases.length)];
  }

  getProsecutor() {
    return this.players.find(p => p.currentRole === 'prosecutor');
  }

  getDefender() {
    return this.players.find(p => p.currentRole === 'defender');
  }

  getPlayerById(id) {
    return this.players.find(p => p.id === id);
  }
  getPlayerBySocketId(id) {
    return this.players.find(p => p.socketId === id);
  }
  getOtherPlayer(playerId) {
    return this.players.find(p => p.id !== playerId);
  }

  setPlayerReady(playerId, ready) {
    console.log(`Player ${playerId} set ready: ${ready}`);
    const player = this.getPlayerBySocketId(playerId);

    if (player) {
      player.ready = ready;
      this.broadcastGameState();
    }
    this.checkBothReady();
  }

  proceed() {
    // Only proceed if there are exactly 2 players
    if (this.players.length !== 2) return;



    switch (this.gameState) {
      case 'waiting':
        this.gameState = 'starting-game';
        this.initializeGame();
        break;
      case 'starting-game':
        this.gameState = 'ready-to-start';
        break;
      case 'ready-to-start':
        this.gameState = 'case-reading';
        break;
      case 'case-reading':
        this.gameState = 'round-start';
        //this.startRound();
        break;
      case 'round-over':
        this.gameState = 'round-start';
        //this.startRound();
        break;
      case 'round-reading':
        this.gameState = 'round-start';
        //this.startRound();
        break;
      case 'tiebreaker':
        this.gameState = 'side-choice';
        break;

    }
    console.log(`Game state changed to: ${this.gameState}`);
    //set both players to not ready
    this.players.forEach(p => p.ready = false);
    this.broadcastGameState();

    switch (this.gameState) {
      case 'ready-to-start':
        setTimeout(() => {
          this.proceed();
        }, 1000);
        break;
    }
  }

  startRound() {
    // Reset player ready states
    this.players.forEach(p => p.ready = false);

    // Reset argument tracking
    this.argumentCount = 0;
    this.exchange = 1;

    // Set turn to prosecutor
    this.turn = this.getProsecutor().id;
  }

  async submitArgument(socketId, argument) {
    const player = this.getPlayerBySocketId(socketId);
    if (!player || this.turn !== player.id) {
      return false;
    }
    console.log(`Player ${player.username} submitted argument: ${argument}`);
    // Add argument to player
    player.addArgument(argument, 0, this.round, this.exchange);
    this.argumentCount++;

    this.arguments.push({
      argument: argument,
      score: 0, // Initial score is 0, will be updated later
      round: this.round,
      exchange: this.exchange,
      playerId: player.id,
      role: player.currentRole
    });
    // Switch turn to other player
    this.turn = this.getOtherPlayer(player.id).id;

    // Check if exchange is complete (2 arguments)
    if (this.argumentCount % 2 === 0) {
      this.exchange++;
    }

    // Check if round is complete (6 arguments total)
    if (this.argumentCount % 6 === 0) {
      await this.endRound();
    } else {
      this.broadcastGameState();
    }

    return true;
  }

  async endRound() {
    this.gameState = 'round-over';
    this.exchange = 1;
    this.round++;
    this.broadcastGameState();

    try {
      // Get AI analysis and scores
      const analysis = await this.getAIAnalysis();
      

      // Calculate scores and determine winner
      let prosecutorScore = 0;
      let defenderScore = 0;

      const prosecutor = this.getProsecutor();
      const defender = this.getDefender();

      // Apply scores to arguments and sum them up
      prosecutor.arguments.filter(arg => arg.round === this.round - 1).forEach((arg, index) => {
        const score = analysis.prosecutorScores[index] || 0;
        arg.score = score;
        prosecutorScore += score;
      });

      defender.arguments.filter(arg => arg.round === this.round - 1).forEach((arg, index) => {
        const score = analysis.defenderScores[index] || 0;
        arg.score = score;
        defenderScore += score;
      });

      prosecutor.score += prosecutorScore;
      defender.score += defenderScore;

      // Determine round winner
      if (prosecutorScore > defenderScore) {
        prosecutor.points++;
       
      } else if (defenderScore > prosecutorScore) {
        defender.points++;
      }
      this.roundData.push({
        number: this.round - 1,
        analysis: analysis.analysis,
        winner: prosecutorScore > defenderScore ? prosecutor.username : defender.username,
        role: prosecutorScore > defenderScore ? prosecutor.currentRole : defender.currentRole,
        prosecutorScore : prosecutorScore,
        defenderScore : defenderScore
      });
      // Check game end conditions
      if (prosecutor.points === 2 || defender.points === 2) {
        this.gameState = 'game-over';
      } else if (prosecutor.points === 1 && defender.points === 1) {
        // Tiebreaker needed
        this.gameState = 'tiebreaker';
        // Determine who gets to choose side (higher total score)
        this.tiebreakerWinner = prosecutorScore > defenderScore ? prosecutor : defender;
        this.players.forEach(p => p.ready = false);
      } else {
        // Next round
        this.gameState = 'round-reading';
        this.prepareNextRound();
      }

      this.broadcastGameState();
    } catch (error) {
      console.error('Error ending round:', error);
    }
  }

  prepareNextRound() {

    // Switch roles for round 2
    this.players.forEach(player => {
      player.lastRole = player.currentRole;
    });

    if (this.round === 2) {
      this.players.forEach(player => {
        player.currentRole = player.currentRole === 'prosecutor' ? 'defender' : 'prosecutor';
        
      });
    }
    this.turn = this.getProsecutor().id; // Reset turn to prosecutor
  }

  checkBothReady() {
    const bothReady = this.players.every(p => p.ready);

    if (bothReady) {
      this.proceed();
    }
  }

  chooseSideForTiebreaker(playerId, chosenRole) {
    console.log(`Player ${playerId} chose side: ${chosenRole}`);
    const notChosenRole = chosenRole === 'prosecutor' ? 'prosecutor' : 'defender';
    this.players.forEach(player => {
      player.lastRole = player.currentRole;
    });
     this.players.forEach(player => {
      if (player.socketId === playerId) {
        player.currentRole = chosenRole; // Assign chosen role to tiebreaker winner
      } else {
        player.currentRole = notChosenRole; 
      }
    });

    //this.round.number = 3;
    this.gameState = 'tiebreaker-start';
    //this.startRound();
    this.broadcastGameState();

    return true;
  }

  async getAIAnalysis() {
    // Mock AI analysis - replace with actual AI integration
    const prosecutorScores = Array(3).fill(0).map(() => Math.floor(Math.random() * 11)); // 0-10
    const defenderScores = Array(3).fill(0).map(() => Math.floor(Math.random() * 11)); // 0-10

    return {
      prosecutorScores,
      defenderScores,
      analysis: "Mock analysis of the arguments presented in this round."
    };
  }

  broadcastGameState() {
    const gameData = {
      roomId: this.roomId,
      gameState: this.gameState,
      caseDetails: this.caseDetails,
      players: this.players.map(p => ({
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        position: p.position,
        currentRole: p.currentRole,
        lastRole: p.lastRole,
        points: p.points,
        ready: p.ready,
        score: p.score,
        arguments: p.arguments,
        socketId: p.socketId
      })),
      arguments: this.arguments,
      turn: this.turn,
      round: this.round,
      roundData: this.roundData,
      exchange: this.exchange,
      argumentCount: this.argumentCount,
      tiebreakerWinner: this.tiebreakerWinner ? this.tiebreakerWinner.id : null
    };

    io.to(this.roomId).emit('gameStateUpdate', gameData);
    // Log all socket ids in the room for debugging
    const clients = io.sockets.adapter.rooms.get(this.roomId);
    if (clients) {
      console.log(`Emitting to sockets in room ${this.roomId}:`, Array.from(clients));
    } else {
      console.log(`No sockets found in room ${this.roomId}`);
      //delete room
      games.delete(this.roomId);
      if (!games.has(this.roomId)) {
        console.log(`Room ${this.roomId} successfully deleted.`);
      }
      console.log(`All rooms:`, Array.from(games.keys()));
    }

    console.log(`updated roomId ${this.roomId}!`);

  }
  getGameData() {
    return {
      roomId: this.roomId,
      gameState: this.gameState,
      caseDetails: this.caseDetails,
      players: this.players.map(p => ({
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        position: p.position,
        currentRole: p.currentRole,
        lastRole: p.lastRole,
        points: p.points,
        ready: p.ready,
        score: p.score,
        arguments: p.arguments,
        socketId: p.socketId
      })),
      arguments: this.arguments,
      turn: this.turn,
      round: this.round,
      roundData: this.roundData,
      exchange: this.exchange,
      argumentCount: this.argumentCount,
      tiebreakerWinner: this.tiebreakerWinner ? this.tiebreakerWinner.id : null
    };
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data) => {
    const { roomId, playerData } = data;
    const game = games.get(roomId);

    if (!game) {
      socket.emit('join-error', { message: 'Room not found' });
      return;
    }

    if (game.players.length >= 2) {
      socket.emit('join-error', { message: 'Room is full' });
      return;
    }

    if (game.gameState !== 'waiting') {
      socket.emit('join-error', { message: 'Game already in progress' });
      return;
    }

    // Check for duplicate usernames (case-insensitive)
    const existingPlayer = game.players.find(player =>
      typeof player.username === 'string' &&
      typeof playerData.name === 'string' &&
      player.username.toLowerCase() === playerData.name.toLowerCase()
    );

    if (existingPlayer) {
      socket.emit('join-error', { message: 'Username already taken in this room' });
      return;
    }
    socket.join(roomId);

    game.addPlayer(new Player(playerData.userId, playerData.name, playerData.avatar, socket.id));

    game.broadcastGameState();
  });

  socket.on('setReady', ({ roomId, ready }) => {
    const game = games.get(roomId);
    if (game) {
      game.setPlayerReady(socket.id, ready);
    }
  });

  socket.on('submitArgument', async ({ roomId, argument }) => {
    const game = games.get(roomId);
    if (game) {
      const success = await game.submitArgument(socket.id, argument);
      if (!success) {
        socket.emit('error', { message: 'Invalid argument submission' });
      }
    }
  });

  socket.on('chooseSide', ({ roomId, playerId, role }) => {
    const game = games.get(roomId);
    if (game) {
      const success = game.chooseSideForTiebreaker(playerId, role);
      if (!success) {
        socket.emit('error', { message: 'Invalid side choice' });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Handle player disconnection - could pause game or end it
    games.forEach((game, roomId) => {
      const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        // Could implement reconnection logic or game pause here
        console.log(`Player left game ${roomId}`);
        game.players.splice(playerIndex, 1); // Remove player from game
        game.broadcastGameState();

      }
    });

  });

  socket.on('create-room', async (playerData) => {
    const roomId = generateRoomId();
    const game = new GameRoom(roomId);
    games.set(roomId, game);

    // Create a Player instance with all required fields
    const player = new Player(playerData.userId, playerData.name, playerData.avatar, socket.id);
    // All other fields are set by Player constructor or addPlayer

    socket.join(roomId); // Ensure creator joins the room
    game.addPlayer(player);

    socket.emit('room-created', { roomId, gameData: game.getGameData() });
    console.log(`Room ${roomId} created by ${playerData.name}`);
  });

  socket.on('get-room-info', (roomId) => {
    console.log(`Requesting info for room ${roomId}`);
    const game = games.get(roomId);

    if (game) {
      game.broadcastGameState();
    } else {
      console.log(`Room ${roomId} not found for socket ${socket.id}`);
    }
  });


  // Proceed event: client requests to proceed the game (no data needed)
  socket.on('proceed', (roomId) => {
    const game = games.get(roomId);

    if (game) {
      game.proceed();
    } else {
      console.log(`Proceed called but no game found for socket ${socket.id}`);
    }
  });
});

// REST endpoints for health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', activeGames: games.size });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };