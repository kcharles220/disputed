require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { pl } = require('zod/locales');
const { set } = require('zod');
const AI_API_KEY = process.env.AI_API_KEY;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3001",
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
    this.connected = true;
  }

  reset() {
    this.ready = false;
    this.score = 0;
    this.arguments = [];
  }

  addArgument(argument, score = 0, round, exchange, role) {
    this.arguments.push({ argument, score, round, exchange, role });
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
    const themes = [
      "philosophy", "technology", "food", "animals", "sports", "history",
      "absurdity", "future", "mythology", "music"
    ];

    const twists = [
      "in a parallel universe",
      "in the distant future",
      "in the prehistoric past",
      "where animals can talk",
      "in a world run by robots",
      "on a giant floating turtle",
      "where magic is illegal",
      "involving a famous historical figure",
      "in a world where dreams can be used as evidence",
      "where time travel is common",
      "where emotions are taxed",
      "inside a simulation",
      "where AI has civil rights",
      "on a reality TV show",
      "in zero gravity courtrooms",
      "in a society that worships cheese",
      "during an interplanetary trial",
      "in a courtroom made of jelly"
    ];

    const formats = [
      "news report",
      "transcript from the trial",
      "police report summary",
      "personal blog post summary of the trial",
      "Wikipedia-style summary",
      "classified government file",
      "social media post thread",
      "children’s story version of the trial"
    ];

    const conflictTypes = [
      "property dispute",
      "moral disagreement",
      "intellectual rights battle",
      "identity confusion case",
      "time travel paradox dispute",
      "species discrimination lawsuit",
      "phantom ownership case",
      "custody battle over an idea",
      "allegation of emotional sabotage",
      "trial over the meaning of a word",
      "dispute over dreams",
      "lawsuit over artistic interpretation",
      "meta-legal case where the law itself is on trial"
    ];

    const tones = [
      "dramatic",
      "satirical",
      "wholesome",
      "noir-style",
      "overly serious for a silly case",
      "epic fantasy tone",
      "mockumentary vibe",
      "Shakespearean",
      "cyberpunk tone"
    ];


    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const randomTwist = twists[Math.floor(Math.random() * twists.length)];
    const randomFormat = formats[Math.floor(Math.random() * formats.length)];
    const randomConflictType = conflictTypes[Math.floor(Math.random() * conflictTypes.length)];
    const randomTone = tones[Math.floor(Math.random() * tones.length)];

    const prompt = `
Generate a completely original and unique fictional court case in JSON format with the following structure:

{ 
  "title": "string" (just a title, no sides, e.g. 'The Case of the 5th Street'), 
  "description": "string" (short, not more than 5 sentences, use clear language), 
  "prosecutionPosition": "string (just the label, e.g. 'State', 'People', or a name)", 
  "defensePosition": "string (just the label, e.g. a name or group)" 
}

The case must be themed around: **${randomTheme}**, and should involve a conflict such as: **${randomConflictType}**, ${randomTwist}.
Format the description like a **${randomFormat}**, and write it in a **${randomTone}** tone.

**IMPORTANT:** 
- The case must be concrete, specific, and easy to argue for both sides.
- Avoid poetic, archaic, or abstract language—use modern, clear, and direct wording.
- Clearly state what the defendant is accused of, what the evidence is, and what each side’s main argument is.
- The case should be understandable to someone with no knowledge of the setting.
- Make sure the case is arguable and has clear sides for prosecution and defense.

Be as creative, absurd, and unpredictable as possible, but always keep the facts clear and debatable. Do NOT repeat previous examples. 
Return only the JSON object, no extra text.
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${AI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    try {
      // Remove Markdown code fences if present
      const cleanedText = text
        .replace(/```json\s*/i, '')
        .replace(/```/g, '')
        .trim();

      const fetchedCase = JSON.parse(cleanedText);
      console.log("Generated case:", fetchedCase);
      return fetchedCase;
    } catch (e) {
      console.error('Failed to parse Gemini response:', text);
      throw e;
    }
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
    player.addArgument(argument, 0, this.round, this.exchange, player.currentRole);
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

    this.players.forEach(player => {
      player.lastRole = player.currentRole;
    });

    this.broadcastGameState();

    try {
      // Get AI analysis and scores
      const analysis = await this.getAIAnalysis(this);


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
      // Fix floating-point precision
      prosecutor.score = Math.round((prosecutor.score + Number.EPSILON) * 10) / 10;
      defender.score = Math.round((defender.score + Number.EPSILON) * 10) / 10;
      prosecutorScore = Math.round((prosecutorScore + Number.EPSILON) * 10) / 10;
      defenderScore = Math.round((defenderScore + Number.EPSILON) * 10) / 10;
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
        prosecutorScore: prosecutorScore,
        defenderScore: defenderScore
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

  chooseSideForTiebreaker(socketId, chosenRole) {
    const notChosenRole = chosenRole === 'prosecutor' ? 'defender' : 'prosecutor';
    this.players.forEach(player => {
      player.lastRole = player.currentRole;
    });
    this.players.forEach(player => {
      if (player.socketId === socketId) {
        player.currentRole = chosenRole; // Assign chosen role to tiebreaker winner
      } else {
        player.currentRole = notChosenRole;
      }
    });

    //this.round.number = 3;
    this.gameState = 'round-start';
    //this.startRound();
    this.broadcastGameState();

    return true;
  }

  async getAIAnalysis(context) {

    const caseDetails = context.caseDetails;
    const presentedArguments = context.arguments.filter(arg => arg.round === context.round - 1);
    const prompt = `
    this is a fictional court case analysis task. You will be given a case description and arguments presented by both sides in a courtroom setting. Your task is to analyze the arguments and provide scores for each argument based on their strength, relevance, and persuasiveness.

    Be extremely strict, rational, and critical in your scoring. Do not be generous or empathetic. If an argument is weak, irrelevant, or poorly constructed, give it a low score without hesitation. Only arguments that are truly excellent should receive high scores.

    The case details are as follows:
    case title: ${caseDetails.title},
    case description: ${caseDetails.description},
    prosecution position: ${caseDetails.prosecutionPosition},
    defense position: ${caseDetails.defensePosition},

    argument1 (prosecutor): ${presentedArguments[0]?.argument || "No argument"},
    argument2 (defender): ${presentedArguments[1]?.argument || "No argument"},
    argument3 (prosecutor): ${presentedArguments[2]?.argument || "No argument"},
    argument4 (defender): ${presentedArguments[3]?.argument || "No argument"},
    argument5 (prosecutor): ${presentedArguments[4]?.argument || "No argument"},
    argument6 (defender): ${presentedArguments[5]?.argument || "No argument"},

    Your task is to analyze these arguments and provide a JSON response with the following structure:
    {
      "argument1Score": number, // Score for argument 1 (prosecutor)
      "argument2Score": number, // Score for argument 2 (defender)
      "argument3Score": number, // Score for argument 3 (prosecutor)
      "argument4Score": number, // Score for argument 4 (defender)
      "argument5Score": number, // Score for argument 5 (prosecutor)
      "argument6Score": number, // Score for argument 6 (defender)
      "analysis": string // Your analysis of the argumentation
    }
    Be as rational, precise, critical, strict and rigid as possible in your scoring.
    Each score should be a number between 0 and 10 (with decimals if needed), where 0 is the equivalent of No Argument.
    The analysis should be a short (not more than 100 words) explanation of your reasoning behind the scores, discussing the strengths and weaknesses of each side (prosecution and defense).
    Do not include any additional text or explanations outside of the JSON response!
    `;
    console.log("AI Prompt:", prompt);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${AI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    try {
      // Remove Markdown code fences if present
      const cleanedText = text
        .replace(/```json\s*/i, '')
        .replace(/```/g, '')
        .trim();

      const aiAnswer = JSON.parse(cleanedText);
      console.log("AI Answer:", aiAnswer);
      const analysis = aiAnswer.analysis || "No analysis provided";
      const prosecutorScores = [aiAnswer.argument1Score, aiAnswer.argument3Score, aiAnswer.argument5Score];
      const defenderScores = [aiAnswer.argument2Score, aiAnswer.argument4Score, aiAnswer.argument6Score];
      let pindex = 0;
      let dindex = 0;
      this.arguments.filter(arg => arg.round === this.round - 1).forEach((arg, index) => {
        if (arg.role === 'prosecutor') {
          arg.score = prosecutorScores[pindex];
          pindex++;

        } else {
          arg.score = defenderScores[dindex];
          dindex++;
        }
      });
      return {
        prosecutorScores,
        defenderScores,
        analysis
      };
    } catch (e) {
      console.error('Failed to parse Gemini response:', text);
      throw e;
    }
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
        socketId: p.socketId,
        connected: p.connected
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
        socketId: p.socketId,
        connected: p.connected
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

  socket.on('chooseSide', ({ roomId, role }) => {
    console.log(roomId, role);

    const game = games.get(roomId);
    if (game) {
      const success = game.chooseSideForTiebreaker(socket.id, role);
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
        if (game.gameState === 'waiting') {
          game.players.splice(playerIndex, 1);
        } else {
          game.players[playerIndex].connected = false;
        }
        console.log(`Player left game ${roomId}`);

        game.broadcastGameState();
        if (game.players.every(p => !p.connected)) {
          games.delete(roomId);
          console.log(`Room ${roomId} deleted after all players disconnected.`);
        }
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

// === Debug endpoint to list all active game rooms and their data ===
app.get('/debug/games/full', (req, res) => {
  const allGames = {};
  games.forEach((game, roomId) => {
    // Use getGameData() if you want a clean, serializable version
    allGames[roomId] = game.getGameData ? game.getGameData() : game;
  });
  res.json(allGames);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };