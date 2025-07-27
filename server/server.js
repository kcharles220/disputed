const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3002", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store game rooms
const gameRooms = new Map();

// Store active timers for each room
const roomTimers = new Map();

// Store auto-start timers for each room (separate from room data to avoid circular references)
const autoStartTimers = new Map();

// Store case reading timers for each room
const caseReadingTimers = new Map();

// Store next round timers for each room
const nextRoundTimers = new Map();

// Store current timer values for synchronization
const timerValues = new Map(); // { roomId: { argumentTime: 10, caseReadingTime: 120, nextRoundTime: 60, phase: 1 } }

// Format comprehensive player data for client consumption
function formatPlayerData(room) {
  const playersData = {};

  if (!room || !room.players) {
    return playersData;
  }

  room.players.forEach(player => {
    const playerId = player.id;
    const playerPerformance = room.playerPerformance?.[playerId] || { totalScore: 0, rounds: 0 };
    const roundWins = room.playerScores?.[playerId] || 0;

    // Get scores for each round
    const roundScores = {};
    for (let round = 1; round <= 3; round++) {
      if (room.roundHistory && room.roundHistory[round - 1]) {
        const roundData = room.roundHistory[round - 1];
        // Find what role this player had in this round
        const playerRoleInRound = roundData.playerRoles?.[playerId];
        if (playerRoleInRound) {
          roundScores[`round${round}_score`] = playerRoleInRound === 'prosecutor' ?
            roundData.prosecutorScore : roundData.defenderScore;
          roundScores[`round${round}_role`] = playerRoleInRound;
        } else {
          roundScores[`round${round}_score`] = 0;
          roundScores[`round${round}_role`] = null;
        }
      } else {
        roundScores[`round${round}_score`] = 0;
        roundScores[`round${round}_role`] = null;
      }
    }

    playersData[playerId] = {
      id: playerId,
      username: player.username,
      avatar: player.avatar,
      current_role: player.displayRole || player.role,
      original_role: player.originalRole || player.role,
      rounds_won: roundWins,
      total_score: Math.round(playerPerformance.totalScore * 10) / 10,
      average_score: playerPerformance.rounds > 0 ?
        Math.round((playerPerformance.totalScore / playerPerformance.rounds) * 10) / 10 : 0,
      rounds_played: playerPerformance.rounds,
      ...roundScores
    };
  });

  return playersData;
}

// Start argument timer for a room
function startArgumentTimer(roomId, currentTurn) {
  // Check if game has ended before starting timer
  const room = gameRooms.get(roomId);
  if (!room || isGameEnded(room)) {
    console.log(`Preventing argument timer start for room ${roomId} - game has ended`);
    return;
  }

  // Clear any existing timer for this room
  if (roomTimers.has(roomId)) {
    clearInterval(roomTimers.get(roomId));
  }

  let timeLeft = 10; // 10 seconds per turn (first phase)
  let phase = 1; // Phase 1: normal timer, Phase 2: interrupt grace period

  // Initialize timer values
  if (!timerValues.has(roomId)) {
    timerValues.set(roomId, {});
  }
  const roomTimerData = timerValues.get(roomId);
  roomTimerData.argumentTime = timeLeft;
  roomTimerData.phase = phase;

  const timer = setInterval(() => {
    // Check if game has ended - stop timer if so
    const room = gameRooms.get(roomId);
    if (!room || isGameEnded(room)) {
      console.log(`Stopping argument timer for room ${roomId} - game has ended`);
      clearInterval(timer);
      roomTimers.delete(roomId);
      if (timerValues.has(roomId)) {
        delete timerValues.get(roomId).argumentTime;
        delete timerValues.get(roomId).phase;
      }
      return;
    }

    timeLeft -= 1;
    roomTimerData.argumentTime = timeLeft;
    roomTimerData.phase = phase;

    // Broadcast timer update to all players in the room
    io.to(roomId).emit('timer-update', {
      timeLeft,
      currentTurn,
      phase
    });

    // When first timer reaches 0, start interrupt phase
    if (timeLeft === 0 && phase === 1) {
      console.log(`Phase 1 timer expired for ${currentTurn} in room ${roomId}, starting interrupt phase`);

      // Start phase 2 - interrupt grace period
      phase = 2;
      timeLeft = 10; // Another 10 seconds for interrupt phase
      roomTimerData.argumentTime = timeLeft;
      roomTimerData.phase = phase;

      // Notify players that interrupt is now available
      io.to(roomId).emit('interrupt-available', {
        currentTurn,
        phase: 2
      });

    } else if (timeLeft === 0 && phase === 2) {
      // Phase 2 timer expired - force submission
      console.log(`Phase 2 timer expired for ${currentTurn} in room ${roomId}, forcing auto-submission`);

      io.to(roomId).emit('time-up', {
        currentTurn,
        phase: 2
      });

      clearInterval(timer);
      roomTimers.delete(roomId);
      if (timerValues.has(roomId)) {
        delete timerValues.get(roomId).argumentTime;
        delete timerValues.get(roomId).phase;
      }
    }
  }, 1000);

  roomTimers.set(roomId, timer);

  // Send initial timer state
  io.to(roomId).emit('timer-update', {
    timeLeft,
    currentTurn,
    phase: 1
  });
}

// Stop timer for a room
function stopArgumentTimer(roomId) {
  if (roomTimers.has(roomId)) {
    clearInterval(roomTimers.get(roomId));
    roomTimers.delete(roomId);
  }
  if (timerValues.has(roomId)) {
    const roomTimerData = timerValues.get(roomId);
    delete roomTimerData.argumentTime;
    delete roomTimerData.phase;
  }
}

// Start case reading timer for a room
function startCaseReadingTimer(roomId) {
  // Check if game has ended before starting timer
  const room = gameRooms.get(roomId);
  if (!room || isGameEnded(room)) {
    console.log(`Preventing case reading timer start for room ${roomId} - game has ended`);
    return;
  }

  // Clear any existing timer for this room
  if (caseReadingTimers.has(roomId)) {
    clearInterval(caseReadingTimers.get(roomId));
  }

  let timeLeft = 120; // 2 minutes to read case

  // Initialize timer values
  if (!timerValues.has(roomId)) {
    timerValues.set(roomId, {});
  }
  const roomTimerData = timerValues.get(roomId);
  roomTimerData.caseReadingTime = timeLeft;

  const timer = setInterval(() => {
    // Check if game has ended - stop timer if so
    const room = gameRooms.get(roomId);
    if (!room || isGameEnded(room)) {
      console.log(`Stopping case reading timer for room ${roomId} - game has ended`);
      clearInterval(timer);
      caseReadingTimers.delete(roomId);
      if (timerValues.has(roomId)) {
        delete timerValues.get(roomId).caseReadingTime;
      }
      return;
    }

    timeLeft -= 1;
    roomTimerData.caseReadingTime = timeLeft;

    // Broadcast timer update to all players in the room
    io.to(roomId).emit('case-reading-timer-update', {
      timeLeft
    });

    if (timeLeft <= 0) {
      console.log(`Case reading timer expired for room ${roomId}, checking if game ended before auto-starting`);
      clearInterval(timer);
      caseReadingTimers.delete(roomId);
      if (timerValues.has(roomId)) {
        delete timerValues.get(roomId).caseReadingTime;
      }

      // Auto-start the game only if it hasn't ended
      const currentRoom = gameRooms.get(roomId);
      if (currentRoom && currentRoom.gameState === 'case-reading' && !isGameEnded(currentRoom)) {
        currentRoom.gameState = 'arguing';
        currentRoom.currentTurn = 'prosecutor';

        io.to(roomId).emit('game-started', {
          gameState: currentRoom.gameState,
          currentTurn: currentRoom.currentTurn
        });

        // Start argument timer
        setTimeout(() => {
          // Double-check game hasn't ended while we were waiting
          const latestRoom = gameRooms.get(roomId);
          if (latestRoom && !isGameEnded(latestRoom)) {
            startArgumentTimer(roomId, 'prosecutor');
          } else {
            console.log(`Preventing argument timer start for room ${roomId} - game ended during case reading timeout`);
          }
        }, 2000);
      } else {
        console.log(`Preventing game auto-start for room ${roomId} - game has ended or invalid state`);
      }
    }
  }, 1000);

  caseReadingTimers.set(roomId, timer);

  // Send initial timer state
  io.to(roomId).emit('case-reading-timer-update', {
    timeLeft
  });
}

// Stop case reading timer for a room
function stopCaseReadingTimer(roomId) {
  if (caseReadingTimers.has(roomId)) {
    clearInterval(caseReadingTimers.get(roomId));
    caseReadingTimers.delete(roomId);
  }
  if (timerValues.has(roomId)) {
    delete timerValues.get(roomId).caseReadingTime;
  }
}

// Start next round timer for a room
function startNextRoundTimer(roomId) {
  // Clear any existing timer for this room
  if (nextRoundTimers.has(roomId)) {
    clearInterval(nextRoundTimers.get(roomId));
  }

  let timeLeft = 60; // 60 seconds to get ready for next round

  // Initialize timer values
  if (!timerValues.has(roomId)) {
    timerValues.set(roomId, {});
  }
  const roomTimerData = timerValues.get(roomId);
  roomTimerData.nextRoundTime = timeLeft;

  const timer = setInterval(() => {
    timeLeft -= 1;
    roomTimerData.nextRoundTime = timeLeft;

    // Check if game has ended - stop timer if so
    const room = gameRooms.get(roomId);
    if (!room || isGameEnded(room)) {
      console.log(`Stopping next round timer for room ${roomId} - game has ended`);
      clearInterval(timer);
      nextRoundTimers.delete(roomId);
      if (timerValues.has(roomId)) {
        delete timerValues.get(roomId).nextRoundTime;
      }
      return;
    }

    // Broadcast timer update to all players in the room
    io.to(roomId).emit('next-round-timer-update', {
      timeLeft
    });

    if (timeLeft <= 0) {
      console.log(`Next round timer expired for room ${roomId}, checking if game ended before auto-starting`);
      clearInterval(timer);
      nextRoundTimers.delete(roomId);
      if (timerValues.has(roomId)) {
        delete timerValues.get(roomId).nextRoundTime;
      }

      // Double-check game hasn't ended before auto-starting
      const currentRoom = gameRooms.get(roomId);
      if (currentRoom && !isGameEnded(currentRoom)) {
        console.log(`Auto-starting next round for room ${roomId}`);
        startNextRound(roomId);
      } else {
        console.log(`Preventing auto-start for room ${roomId} - game has ended`);
        cleanupRoomTimers(roomId);
      }
    }
  }, 1000);

  nextRoundTimers.set(roomId, timer);

  // Send initial timer state
  io.to(roomId).emit('next-round-timer-update', {
    timeLeft
  });
}

// Stop next round timer for a room
function stopNextRoundTimer(roomId) {
  if (nextRoundTimers.has(roomId)) {
    clearInterval(nextRoundTimers.get(roomId));
    nextRoundTimers.delete(roomId);
  }
  if (timerValues.has(roomId)) {
    delete timerValues.get(roomId).nextRoundTime;
  }
}

// Check if a game has ended (utility function)
function isGameEnded(room) {
  if (!room) return true;

  // Check if game is explicitly marked as ended
  if (room.gameEnded === true) return true;

  const playerWins = Object.values(room.playerScores || {});
  const maxPlayerWins = Math.max(...(playerWins.length > 0 ? playerWins : [0]));

  // Game ends when someone wins 2 rounds OR we've completed more than max rounds
  // (max rounds is 3, so only end if currentRound > 3, meaning we're past round 3)
  return maxPlayerWins >= 2 || room.currentRound > room.maxRounds;
}

// Clean up all timers and resources for a room when game ends
function cleanupRoomTimers(roomId) {
  console.log(`[CLEANUP] Starting cleanup for room ${roomId}`);

  // Stop argument timer
  if (roomTimers.has(roomId)) {
    clearInterval(roomTimers.get(roomId));
    roomTimers.delete(roomId);
    console.log(`[CLEANUP] Cleared argument timer for room ${roomId}`);
  }

  // Stop case reading timer
  if (caseReadingTimers.has(roomId)) {
    clearInterval(caseReadingTimers.get(roomId));
    caseReadingTimers.delete(roomId);
    console.log(`[CLEANUP] Cleared case reading timer for room ${roomId}`);
  }

  // Stop next round timer
  if (nextRoundTimers.has(roomId)) {
    clearInterval(nextRoundTimers.get(roomId));
    nextRoundTimers.delete(roomId);
    console.log(`[CLEANUP] Cleared next round timer for room ${roomId}`);
  }

  // Clear auto-start timer
  if (autoStartTimers.has(roomId)) {
    clearTimeout(autoStartTimers.get(roomId));
    autoStartTimers.delete(roomId);
    console.log(`[CLEANUP] Cleared auto-start timer for room ${roomId}`);
  }

  // Clear all timer values
  if (timerValues.has(roomId)) {
    timerValues.delete(roomId);
    console.log(`[CLEANUP] Cleared timer values for room ${roomId}`);
  }

  console.log(`[CLEANUP] All timers cleaned up for room ${roomId}`);
}

// Start the next round (called when both players are ready or timeout)
function startNextRound(roomId) {
  const room = gameRooms.get(roomId);
  if (!room) return;

  // Check if game has already ended - prevent starting new rounds
  if (isGameEnded(room)) {
    console.log(`Preventing startNextRound for room ${roomId} - game has already ended`);
    cleanupRoomTimers(roomId);
    return;
  }

  // Clear auto-start timer if it exists
  if (autoStartTimers.has(roomId)) {
    clearTimeout(autoStartTimers.get(roomId));
    autoStartTimers.delete(roomId);
  }

  // Clear next round timer if it exists
  stopNextRoundTimer(roomId);

  // Clear readiness tracking
  delete room.nextRoundReady;
  // Notify all clients that readiness has been reset
  io.to(roomId).emit('next-round-ready-cleared', {
    message: 'Starting new round - ready states cleared'
  });
  // Start the round
  room.currentTurn = 'prosecutor';

  // Generate comprehensive player data
  const playersData = formatPlayerData(room);

  io.to(roomId).emit('next-round-started', {
    round: room.currentRound,
    scores: room.scores,
    players: room.players,
    playerData: playersData // NEW: Comprehensive player data
  });

  // Start timer for the new round
  setTimeout(() => {
    // Double-check game hasn't ended while we were waiting
    const currentRoom = gameRooms.get(roomId);
    if (currentRoom && !isGameEnded(currentRoom)) {
      startArgumentTimer(roomId, 'prosecutor');
    } else {
      console.log(`Preventing argument timer start for room ${roomId} - game ended during timeout`);
    }
  }, 2000);
}

// Generate random room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Simulate AI-generated cases
function generateCase() {
  const cases = [
    {
      id: 1,
      title: "The Case of the Disputed Contract",
      description: "A tech startup claims a former employee violated their non-compete agreement by joining a competitor.",
      context: "TechNova Inc. hired Sarah Chen as a Senior Software Engineer with a 2-year non-compete clause. After 18 months, Sarah left to join RivalTech, a direct competitor, citing TechNova's toxic work environment and unpaid overtime. TechNova claims Sarah is using proprietary algorithms she developed while employed with them. Sarah argues the non-compete is unenforceable due to TechNova's breach of employment terms and the algorithms being based on open-source code she contributed to before joining TechNova.",
      prosecutorSide: "TechNova Inc.",
      defenderSide: "Sarah Chen"
    },
    {
      id: 2,
      title: "The Intellectual Property Theft Case",
      description: "A software company accuses a former intern of stealing proprietary code and selling it to competitors.",
      context: "CodeCorp hired Alex Rodriguez as a summer intern to work on their flagship AI algorithm. Three months after the internship ended, CodeCorp discovered their exact algorithm implementation being used by three different startups. Alex claims the code was based on open-source libraries and academic papers, not proprietary work. CodeCorp argues Alex had access to confidential code repositories and signed strict NDAs.",
      prosecutorSide: "CodeCorp",
      defenderSide: "Alex Rodriguez"
    },
    {
      id: 3,
      title: "The Trademark Dispute",
      description: "Two companies clash over the right to use a similar brand name in the same industry.",
      context: "FreshFoods LLC has operated a organic grocery chain since 2015 under the name 'Fresh Market'. In 2023, a new startup 'FreshMarket' (no space) launched a meal delivery service. FreshFoods claims trademark infringement and consumer confusion. FreshMarket argues the names are sufficiently different and they operate in different sectors of the food industry.",
      prosecutorSide: "FreshFoods LLC",
      defenderSide: "FreshMarket Startup"
    }
  ];

  return cases[Math.floor(Math.random() * cases.length)];
}

// Function to call AI service and get analysis (placeholder for now)
async function callAIForAnalysis(attackArguments, defenseArguments) {
  // TODO: Replace this with actual AI API call
  // Example implementation for real AI integration:
  /*
  try {
    const response = await fetch('YOUR_AI_API_ENDPOINT', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        prosecutor_arguments: attackArguments.map(arg => arg.content),
        defender_arguments: defenseArguments.map(arg => arg.content),
        case_context: room.case // You might want to pass case context too
      })
    });
    
    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }
    
    const aiResponse = await response.json();
    return aiResponse;
  } catch (error) {
    console.error('AI API call failed:', error);
    throw error;
  }
  */

  console.log('Calling AI for analysis with:', {
    prosecutorArgs: attackArguments.length,
    defenderArgs: defenseArguments.length
  });

  // Mock AI response - replace this with actual AI call later
  const mockAIResponse = {
    "Prosecutor": {
      "Argument 1 score": 8.5,
      "Argument 2 score": 7.0,
      "Argument 3 score": 9.2
    },
    "Defender": {
      "Argument 1 score": 8.8,
      "Argument 2 score": 6.5,
      "Argument 3 score": 7.9
    },
    "Analysis": "The prosecutor presented stronger arguments overall, particularly in Argument 3, which was both impactful and well-structured. The defender, however, made a solid point in Argument 1 but lacked consistency in the following arguments. Overall, the debate was fairly balanced but slightly favored the prosecutor."
  };

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return mockAIResponse;
}

// Process AI response and calculate final scores
function processAIAnalysis(aiResponse) {
  try {
    // Validate AI response structure
    if (!aiResponse || typeof aiResponse !== 'object') {
      throw new Error('Invalid AI response: not an object');
    }

    if (!aiResponse.Prosecutor || !aiResponse.Defender) {
      throw new Error('Invalid AI response: missing Prosecutor or Defender sections');
    }

    // Extract and sum prosecutor scores
    const prosecutorScores = Object.values(aiResponse.Prosecutor || {});
    if (prosecutorScores.length === 0) {
      throw new Error('Invalid AI response: no prosecutor scores found');
    }

    const prosecutorScore = prosecutorScores.reduce((sum, score) => {
      const numScore = parseFloat(score);
      if (isNaN(numScore)) {
        throw new Error(`Invalid prosecutor score: ${score}`);
      }
      return sum + numScore;
    }, 0);

    // Extract and sum defender scores
    const defenderScores = Object.values(aiResponse.Defender || {});
    if (defenderScores.length === 0) {
      throw new Error('Invalid AI response: no defender scores found');
    }

    const defenderScore = defenderScores.reduce((sum, score) => {
      const numScore = parseFloat(score);
      if (isNaN(numScore)) {
        throw new Error(`Invalid defender score: ${score}`);
      }
      return sum + numScore;
    }, 0);

    // Determine winner based on total scores
    const winner = prosecutorScore > defenderScore ? 'prosecutor' : 'defender';

    // Get analysis from AI response
    const analysis = aiResponse.Analysis || "Analysis not provided by AI.";

    console.log('AI Analysis processed successfully:', {
      prosecutorScore: prosecutorScore.toFixed(1),
      defenderScore: defenderScore.toFixed(1),
      winner,
      analysisLength: analysis.length,
      prosecutorIndividualScores: prosecutorScores,
      defenderIndividualScores: defenderScores
    });

    return {
      prosecutorScore: Math.round(prosecutorScore * 10) / 10,
      defenderScore: Math.round(defenderScore * 10) / 10,
      winner,
      analysis
    };
  } catch (error) {
    console.error('Error processing AI analysis:', error);

    // Fallback to random scoring if AI processing fails
    const fallbackProsecutorScore = Math.random() * 30; // 0-30 range for 3 arguments
    const fallbackDefenderScore = Math.random() * 30;

    return {
      prosecutorScore: Math.round(fallbackProsecutorScore * 10) / 10,
      defenderScore: Math.round(fallbackDefenderScore * 10) / 10,
      winner: fallbackProsecutorScore > fallbackDefenderScore ? 'prosecutor' : 'defender',
      analysis: "Analysis could not be generated due to an error. Scores were determined using fallback method."
    };
  }
}

// Simulate AI analysis of arguments and determine round winner
async function analyzeArgumentsAndDetermineWinner(attackArguments, defenseArguments) {
  try {
    // Call AI service to get analysis
    const aiResponse = await callAIForAnalysis(attackArguments, defenseArguments);

    // Process the AI response to get final scores
    const result = processAIAnalysis(aiResponse);

    console.log('Final analysis result:', result);
    return result;

  } catch (error) {
    console.error('Error in AI analysis:', error);

    // Fallback to the old random method if AI fails
    console.log('Falling back to random scoring due to AI error');

    let prosecutorScore = 0;
    let defenderScore = 0;

    // Simple fallback scoring
    attackArguments.forEach((arg) => {
      const strength = Math.random() * 10;
      const lengthBonus = Math.min(arg.content.length / 25, 5);
      const keywordBonus = (arg.content.match(/evidence|proof|violation|contract|law|precedent|liability|damages|breach/gi) || []).length;
      prosecutorScore += strength + lengthBonus + keywordBonus;
    });

    defenseArguments.forEach((arg) => {
      const strength = Math.random() * 10;
      const lengthBonus = Math.min(arg.content.length / 25, 5);
      const keywordBonus = (arg.content.match(/defense|innocent|false|unfair|rights|freedom|justified|legal|proper/gi) || []).length;
      defenderScore += strength + lengthBonus + keywordBonus;
    });

    prosecutorScore += Math.random() * 5;
    defenderScore += Math.random() * 5;

    const prosecutorAvg = (prosecutorScore / attackArguments.length).toFixed(1);
    const defenderAvg = (defenderScore / defenseArguments.length).toFixed(1);
    const winner = prosecutorScore > defenderScore ? 'prosecutor' : 'defender';

    let analysis = `After analyzing ${attackArguments.length + defenseArguments.length} arguments across 3 exchanges:\n\n`;
    analysis += `🔥 Prosecutor averaged ${prosecutorAvg} points per argument with strong ${attackArguments.length > 0 ? (attackArguments[0].content.match(/evidence|proof|violation/gi) || []).length > 0 ? 'factual' : 'strategic' : 'legal'} positioning.\n`;
    analysis += `🛡️ Defender averaged ${defenderAvg} points per argument with effective ${defenseArguments.length > 0 ? (defenseArguments[0].content.match(/rights|freedom|unfair/gi) || []).length > 0 ? 'rights-based' : 'defensive' : 'legal'} rebuttals.\n\n`;
    analysis += `The ${winner} presented the more compelling case through stronger argumentation and legal reasoning.`;

    return {
      prosecutorScore: Math.round(prosecutorScore * 10) / 10,
      defenderScore: Math.round(defenderScore * 10) / 10,
      winner,
      analysis
    };
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new game room
  socket.on('create-room', (playerData) => {
    const roomId = generateRoomId();
    const gameCase = generateCase();

    const room = {
      id: roomId,
      players: [{
        id: socket.id,
        name: playerData.name,
        avatar: playerData.avatar,
        ready: false
      }],
      gameState: 'waiting',
      case: gameCase,
      currentRound: 1,
      maxRounds: 3,
      scores: { prosecutor: 0, defender: 0 },
      playerScores: {}, // Track wins per player
      playerPerformance: {}, // Track individual performance scores
      roundHistory: [], // Track detailed round data
      roundArguments: [],
      currentTurn: 'prosecutor', // Track whose turn it is
      createdAt: new Date()
    };

    gameRooms.set(roomId, room);
    socket.join(roomId);

    socket.emit('room-created', { roomId, room });
    console.log(`Room ${roomId} created by ${playerData.name} with case: ${gameCase.title}`);
  });

  // Join an existing room
  socket.on('join-room', (data) => {
    const { roomId, playerData } = data;
    const room = gameRooms.get(roomId);

    if (!room) {
      socket.emit('join-error', { message: 'Room not found' });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('join-error', { message: 'Room is full' });
      return;
    }

    if (room.gameState !== 'waiting') {
      socket.emit('join-error', { message: 'Game already in progress' });
      return;
    }

    // Check for duplicate usernames (case-insensitive)
    const existingPlayer = room.players.find(player =>
      player.name.toLowerCase() === playerData.name.toLowerCase()
    );

    if (existingPlayer) {
      socket.emit('join-error', { message: 'Username already taken in this room' });
      return;
    }

    // Add player to room
    room.players.push({
      id: socket.id,
      name: playerData.name,
      avatar: playerData.avatar,
      ready: false
    });

    socket.join(roomId);

    // Notify all players in the room
    io.to(roomId).emit('room-updated', room);
    console.log(`${playerData.name} joined room ${roomId}`);
  });

  // Player ready status (lobby ready)
  socket.on('player-ready', (data) => {
    console.log('Player ready event received:', data, 'from socket:', socket.id);
    const { roomId } = data;
    const room = gameRooms.get(roomId);

    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        console.log(`Player ${player.name} toggling ready from ${player.ready} to ${!player.ready}`);
        player.ready = !player.ready;

        console.log('Room players ready status:', room.players.map(p => ({ name: p.name, ready: p.ready })));

        // Check if both players are ready
        if (room.players.length === 2 && room.players.every(p => p.ready)) {
          console.log('Both players ready! Setting game state to starting');
          room.gameState = 'starting';

          // Assign roles randomly
          const roles = ['prosecutor', 'defender'];
          const shuffledRoles = Math.random() < 0.5 ? roles : roles.reverse();

          room.players[0].role = shuffledRoles[0];
          room.players[1].role = shuffledRoles[1];

          // Store original roles immediately when first assigned
          room.players[0].originalRole = shuffledRoles[0];
          room.players[1].originalRole = shuffledRoles[1];

          // Initialize display roles to match original roles (Round 1)
          room.players[0].displayRole = shuffledRoles[0];
          room.players[1].displayRole = shuffledRoles[1];

          console.log('Roles assigned:', room.players.map(p => ({
            name: p.name,
            role: p.role,
            originalRole: p.originalRole,
            displayRole: p.displayRole
          })));

          // Transition to case-reading phase and start case reading timer
          room.gameState = 'case-reading';
          startCaseReadingTimer(roomId);

          io.to(roomId).emit('game-starting', room);
        } else {
          console.log('Emitting room-updated event');
          io.to(roomId).emit('room-updated', room);
        }
      } else {
        console.log('Player not found in room');
      }
    } else {
      console.log('Room not found:', roomId);
    }
  });

  // Case reading ready status (separate from lobby ready)
  socket.on('playerReady', (data) => {
    console.log('Case reading ready event received:', data, 'from socket:', socket.id);
    const { roomId, ready } = data;
    const room = gameRooms.get(roomId);

    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        // Add case reading ready state
        if (!player.caseReadingReady) {
          player.caseReadingReady = false;
        }
        player.caseReadingReady = ready;

        console.log(`Player ${player.name} case reading ready: ${ready}`);
        console.log('Room players case reading status:', room.players.map(p => ({ name: p.name, caseReadingReady: p.caseReadingReady })));

        // Emit individual player ready state to all players
        io.to(roomId).emit('playerReady', {
          playerId: socket.id,
          playerName: player.name,
          ready: ready
        });

        // Check if both players are ready for case reading
        if (room.players.length === 2 && room.players.every(p => p.caseReadingReady)) {
          console.log('Both players ready for case reading! Starting game');

          // Stop case reading timer since players are ready
          stopCaseReadingTimer(roomId);

          room.gameState = 'arguing';
          room.currentTurn = 'prosecutor'; // Start with prosecutor

          // Start the argument timer
          startArgumentTimer(roomId, 'prosecutor');

          // Prepare the full game state object
          const playersData = formatPlayerData(room);
          const gameState = {
            gamePhase: 'arguing',
            currentTurn: room.currentTurn,
            arguments: room.roundArguments ? room.roundArguments.filter(arg => arg.round === room.currentRound) : [],
            allRoundArguments: room.roundArguments || [],
            currentRound: room.currentRound,
            maxRounds: room.maxRounds,
            scores: room.scores,
            playerScores: room.playerScores,
            playerData: playersData,
            case: room.case,
            roundHistory: room.roundHistory || [],
            // Add timer info if needed
          };
          io.to(roomId).emit('game-state', gameState);
        }
      } else {
        console.log('Player not found in room for case reading ready');
      }
    } else {
      console.log('Room not found for case reading ready:', roomId);
    }
  });

  // Game argument handling
  socket.on('submit-argument', async (data) => {
    const { roomId, argument } = data;
    console.log('Argument submitted for room:', roomId, 'by player:', argument.playerName);

    const room = gameRooms.get(roomId);
    if (room) {
      // Initialize round arguments if needed
      if (!room.roundArguments) {
        room.roundArguments = [];
      }

      // Add argument to current round
      room.roundArguments.push({
        ...argument,
        round: room.currentRound
      });

      // Stop the current timer since an argument was submitted
      stopArgumentTimer(roomId);

      // Switch turns
      room.currentTurn = room.currentTurn === 'prosecutor' ? 'defender' : 'prosecutor';

      // Broadcast argument to all players in room with turn update
      io.to(roomId).emit('game-argument', {
        ...argument,
        round: room.currentRound,
        nextTurn: room.currentTurn
      });

      // Send explicit turn update to ensure all clients are synchronized
      console.log(`Broadcasting turn update to all clients in room ${roomId}: turn is now ${room.currentTurn}`);
      io.to(roomId).emit('turn-update', {
        currentTurn: room.currentTurn,
        round: room.currentRound
      });

      // Check if round should end (6 arguments per round - 3 from each player)
      const currentRoundArgs = room.roundArguments.filter(arg => arg.round === room.currentRound);
      const prosecutorArgs = currentRoundArgs.filter(arg => arg.type === 'attack');
      const defenderArgs = currentRoundArgs.filter(arg => arg.type === 'defense');

      console.log(`Round ${room.currentRound} progress: Total args: ${currentRoundArgs.length}, Prosecutor: ${prosecutorArgs.length}/3, Defender: ${defenderArgs.length}/3`);
      console.log('Current round arguments:', currentRoundArgs.map(arg => ({ player: arg.playerName, type: arg.type, round: arg.round })));

      if (prosecutorArgs.length >= 3 && defenderArgs.length >= 3) {
        console.log(`Round ${room.currentRound} ready for analysis with ${prosecutorArgs.length} prosecutor args and ${defenderArgs.length} defender args`);

        // Stop any active timer since round is complete
        stopArgumentTimer(roomId);

        // Analyze arguments and determine round winner (now async)
        const roundResult = await analyzeArgumentsAndDetermineWinner(prosecutorArgs, defenderArgs);

        // Initialize player-based scores if needed
    if (room) {
      // Initialize round arguments if needed
      if (!room.roundArguments) {
        room.roundArguments = [];
      }

      // Add argument to current round
      room.roundArguments.push({
        ...argument,
        round: room.currentRound
      });

      // Stop the current timer since an argument was submitted
      stopArgumentTimer(roomId);

      // Switch turns
      room.currentTurn = room.currentTurn === 'prosecutor' ? 'defender' : 'prosecutor';

      // Prepare the full game state object after argument submission
      const playersData = formatPlayerData(room);
      const gameState = {
        gamePhase: 'arguing',
        currentTurn: room.currentTurn,
        arguments: room.roundArguments ? room.roundArguments.filter(arg => arg.round === room.currentRound) : [],
        allRoundArguments: room.roundArguments || [],
        currentRound: room.currentRound,
        maxRounds: room.maxRounds,
        scores: room.scores,
        playerScores: room.playerScores,
        playerData: playersData,
        case: room.case,
        roundHistory: room.roundHistory || [],
        // Add timer info if needed
      };
      io.to(roomId).emit('game-state', gameState);

      // Check if round should end (6 arguments per round - 3 from each player)
      const currentRoundArgs = room.roundArguments.filter(arg => arg.round === room.currentRound);
      const prosecutorArgs = currentRoundArgs.filter(arg => arg.type === 'attack');
      const defenderArgs = currentRoundArgs.filter(arg => arg.type === 'defense');

      console.log(`Round ${room.currentRound} progress: Total args: ${currentRoundArgs.length}, Prosecutor: ${prosecutorArgs.length}/3, Defender: ${defenderArgs.length}/3`);
      console.log('Current round arguments:', currentRoundArgs.map(arg => ({ player: arg.playerName, type: arg.type, round: arg.round })));

      if (prosecutorArgs.length >= 3 && defenderArgs.length >= 3) {
        // ...existing code for round end and game-state emission...
      }
    }

        // Fix: define argumentScores as an empty array for now to prevent ReferenceError
        const argumentScores = [];
        // TODO: Populate argumentScores with actual data if needed
        const roundData = {
          round: room.currentRound,
          winner: roundResult.winner,
          prosecutorScore: roundResult.prosecutorScore,
          defenderScore: roundResult.defenderScore,
          analysis: roundResult.analysis,
          playerRoles: {}, // Track which player had which role this round
          arguments: currentRoundArgs,
          argumentScores // Ordered array for client (currently empty)
        };

        // Record player roles for this round
        room.players.forEach(player => {
          roundData.playerRoles[player.id] = player.role;
        });

        // Initialize round history if needed
        if (!room.roundHistory) {
          room.roundHistory = [];
        }
        room.roundHistory.push(roundData);

        // Store individual player performance for side choice decisions - INITIALIZE FIRST
        if (!room.playerPerformance) {
          room.playerPerformance = {};
        }

        // Track individual player performance scores
        const prosecutorPlayer = room.players.find(p => p.role === 'prosecutor');
        const defenderPlayer = room.players.find(p => p.role === 'defender');

        if (prosecutorPlayer) {
          if (!room.playerPerformance[prosecutorPlayer.id]) {
            room.playerPerformance[prosecutorPlayer.id] = { totalScore: 0, rounds: 0 };
          }
          room.playerPerformance[prosecutorPlayer.id].totalScore += roundResult.prosecutorScore;
          room.playerPerformance[prosecutorPlayer.id].rounds += 1;
        }

        if (defenderPlayer) {
          if (!room.playerPerformance[defenderPlayer.id]) {
            room.playerPerformance[defenderPlayer.id] = { totalScore: 0, rounds: 0 };
          }
          room.playerPerformance[defenderPlayer.id].totalScore += roundResult.defenderScore;
          room.playerPerformance[defenderPlayer.id].rounds += 1;
        }

        // Generate comprehensive player data
        const playersData = formatPlayerData(room);

        // Detailed player information logging - NOW SAFE TO ACCESS playerPerformance
        console.log('\n=== ROUND END PLAYER DETAILS ===');
        console.log(`Room ID: ${roomId} | Round: ${room.currentRound}`);

        Object.values(playersData).forEach(playerData => {
          console.log(`Player: ${playerData.name}`);
          console.log(`  - Socket ID: ${playerData.id}`);
          console.log(`  - Current Role: ${playerData.current_role}`);
          console.log(`  - Original Role: ${playerData.original_role}`);
          console.log(`  - Round Wins: ${playerData.rounds_won}`);
          console.log(`  - Round 1 Score: ${playerData.round1_score || 0} (Role: ${playerData.round1_role || 'N/A'})`);
          console.log(`  - Round 2 Score: ${playerData.round2_score || 0} (Role: ${playerData.round2_role || 'N/A'})`);
          console.log(`  - Round 3 Score: ${playerData.round3_score || 0} (Role: ${playerData.round3_role || 'N/A'})`);
          console.log(`  - Total Score: ${playerData.total_score}`);
          console.log(`  - Average Score: ${playerData.average_score}`);
          console.log(`  - Rounds Played: ${playerData.rounds_played}`);
          console.log('');
        });

        console.log(`Round Analysis: ${roundResult.analysis}`);
        console.log('=== END ROUND DETAILS ===\n');

        // Add a small delay before broadcasting round completion to ensure all clients have processed arguments
        setTimeout(() => {
          // Check if game should end - use player-based scoring
          const playerWins = Object.values(room.playerScores || {});
          const maxPlayerWins = Math.max(...(playerWins.length > 0 ? playerWins : [0]));
          const shouldEndGame =
            maxPlayerWins >= 2 ||
            room.currentRound > room.maxRounds;

          // Prepare the full game state object
          const gameState = {
            phase: shouldEndGame ? 'game-over' : 'round-complete',
            round: room.currentRound,
            winner: shouldEndGame ? (() => {
              let gameWinner = null;
              let winningPlayerId = null;
              let maxWins = 0;
              for (const [playerId, wins] of Object.entries(room.playerScores || {})) {
                if (wins > maxWins) {
                  maxWins = wins;
                  winningPlayerId = playerId;
                }
              }
              if (winningPlayerId && maxWins > 0) {
                const winningPlayer = room.players.find(p => p.id === winningPlayerId);
                return winningPlayer?.originalRole;
              } else {
                return 'tie';
              }
            })() : roundResult.winner,
            scores: room.scores,
            playerScores: room.playerScores,
            playerData: playersData,
            analysis: roundResult.analysis,
            prosecutorScore: roundResult.prosecutorScore,
            defenderScore: roundResult.defenderScore,
            roundHistory: room.roundHistory,
            // Add any other relevant state fields here
          };

          // Mark the room as ended to prevent any further game actions
          if (shouldEndGame) {
            cleanupRoomTimers(roomId);
            room.gameEnded = true;
          }

          // Emit the single game-state event
          io.to(roomId).emit('game-state', gameState);
        }, 500); // 500ms delay to ensure all clients are ready
      }
    }
  });

  // Handle side choice for round 3 when it's a draw
  socket.on('choose-side', (data) => {
    const { roomId, chosenSide } = data; // chosenSide: 'prosecutor' or 'defender'
    console.log('Side choice received for room:', roomId, 'side:', chosenSide, 'from socket:', socket.id);

    const room = gameRooms.get(roomId);
    if (room && room.waitingForSideChoice && room.waitingForSideChoice.playerId === socket.id) {
      const chooserPlayer = room.players.find(p => p.id === socket.id);
      const otherPlayer = room.players.find(p => p.id !== socket.id);

      if (chooserPlayer && otherPlayer) {
        // Ensure original roles are preserved
        if (!chooserPlayer.originalRole) {
          chooserPlayer.originalRole = chooserPlayer.role;
        }
        if (!otherPlayer.originalRole) {
          otherPlayer.originalRole = otherPlayer.role;
        }

        // Assign display roles based on choice (keep original roles unchanged)
        chooserPlayer.displayRole = chosenSide;
        otherPlayer.displayRole = chosenSide === 'prosecutor' ? 'defender' : 'prosecutor';

        // Also update the current role to match the chosen display role
        chooserPlayer.role = chosenSide;
        otherPlayer.role = chosenSide === 'prosecutor' ? 'defender' : 'prosecutor';

        console.log(`Side choice complete:`);
        console.log(`${chooserPlayer.name}: originalRole=${chooserPlayer.originalRole}, displayRole=${chooserPlayer.displayRole}, role=${chooserPlayer.role}`);
        console.log(`${otherPlayer.name}: originalRole=${otherPlayer.originalRole}, displayRole=${otherPlayer.displayRole}, role=${otherPlayer.role}`);

        // Clear the waiting state
        delete room.waitingForSideChoice;

        // Clear readiness tracking for the new round
        delete room.nextRoundReady;

        // Start the round
        room.currentTurn = 'prosecutor';

        // Generate updated player data after role assignment
        const updatedPlayersData = formatPlayerData(room);

        // Emit side choice complete first
        io.to(roomId).emit('side-choice-complete', {
          round: room.currentRound,
          scores: room.scores,
          players: room.players,
          playerData: updatedPlayersData, // NEW: Comprehensive player data
          chooserName: chooserPlayer.name,
          chosenSide: chosenSide
        });

        // Then emit next round started to properly transition clients to arguing phase
        setTimeout(() => {
          const nextRoundPlayersData = formatPlayerData(room);
          io.to(roomId).emit('next-round-started', {
            round: room.currentRound,
            scores: room.scores,
            players: room.players,
            playerData: nextRoundPlayersData // NEW: Comprehensive player data
          });

          // Start timer for the new round
          setTimeout(() => {
            startArgumentTimer(roomId, 'prosecutor');
          }, 2000);
        }, 1000);
      }
    }
  });

  // Handle next round readiness - simplified approach
  socket.on('next-round-ready', (data) => {
    const { roomId } = data;
    console.log('Next round ready received for room:', roomId, 'from socket:', socket.id);

    const room = gameRooms.get(roomId);
    if (!room || !room.nextRoundReady) {
      console.log('Room or nextRoundReady not found');
      return;
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) {
      console.log('Player not found in room');
      return;
    }

    // Mark this player as ready
    room.nextRoundReady[socket.id] = true;
    console.log(`Player ${player.name} is now ready for round ${room.currentRound}`);

    // Broadcast updated readiness to all players
    const readyCount = Object.values(room.nextRoundReady).filter(ready => ready).length;
    const totalPlayers = room.players.length;

    io.to(roomId).emit('next-round-ready-update', {
      playerId: socket.id,
      playerName: player.name,
      readyCount: readyCount,
      totalPlayers: totalPlayers,
      allReady: readyCount === totalPlayers,
      readyStates: room.nextRoundReady // Send all player ready states
    });

    // Check if both players are ready
    if (readyCount === totalPlayers) {
      console.log(`Both players ready for round ${room.currentRound}!`);

      // Check if we're waiting for side choice - if so, don't start the round yet
      if (room.waitingForSideChoice) {
        console.log('Both players ready, but waiting for side choice. Not starting round yet.');
        return;
      }

      console.log('Starting round...');

      // Clear any auto-start timers since players are ready
      if (autoStartTimers.has(roomId)) {
        clearTimeout(autoStartTimers.get(roomId));
        autoStartTimers.delete(roomId);
      }

      // Clear next round timer since players are ready
      stopNextRoundTimer(roomId);

      // Start the next round after a brief delay
      setTimeout(() => {
        startNextRound(roomId);
      }, 1000);
    }
  });

  // Handle interrupt (force submission when time is up)
  socket.on('interrupt-player', (data) => {
    const { roomId } = data;
    console.log('Interrupt event received for room:', roomId, 'from socket:', socket.id);

    const room = gameRooms.get(roomId);
    if (room) {
      // Stop the timer
      stopArgumentTimer(roomId);

      const previousTurn = room.currentTurn;

      // Notify all players that an interrupt occurred (this will trigger client-side submission)
      io.to(roomId).emit('player-interrupted', {
        interruptedTurn: previousTurn,
        nextTurn: room.currentTurn === 'prosecutor' ? 'defender' : 'prosecutor'
      });

      // Set a timeout to submit a fallback argument if no argument is received within 2 seconds
      setTimeout(() => {
        const currentRoom = gameRooms.get(roomId);
        if (currentRoom && currentRoom.currentTurn === previousTurn) {
          // Still the same turn, meaning no argument was submitted - use fallback
          console.log('No argument submitted after interrupt, using fallback');

          const interruptedPlayer = currentRoom.players.find(p => p.role === previousTurn);
          if (interruptedPlayer) {
            const forcedArgument = {
              id: Date.now().toString(),
              playerId: interruptedPlayer.id,
              playerName: interruptedPlayer.name,
              content: "[Interrupted by opponent]",
              timestamp: new Date(),
              type: interruptedPlayer.role === 'prosecutor' ? 'attack' : 'defense',
              round: currentRoom.currentRound
            };

            // Add forced argument to room
            if (!currentRoom.roundArguments) {
              currentRoom.roundArguments = [];
            }
            currentRoom.roundArguments.push(forcedArgument);

            // Switch turns
            currentRoom.currentTurn = currentRoom.currentTurn === 'prosecutor' ? 'defender' : 'prosecutor';

            // Broadcast the forced argument to all players
            io.to(roomId).emit('game-argument', {
              ...forcedArgument,
              round: currentRoom.currentRound,
              nextTurn: currentRoom.currentTurn
            });

            // Check if round should end and continue game logic
            const currentRoundArgs = currentRoom.roundArguments.filter(arg => arg.round === currentRoom.currentRound);
            const prosecutorArgs = currentRoundArgs.filter(arg => arg.type === 'attack');
            const defenderArgs = currentRoundArgs.filter(arg => arg.type === 'defense');

            if (prosecutorArgs.length < 3 || defenderArgs.length < 3) {
              // Round not complete yet, start timer for next player's turn
              console.log(`Starting timer for ${currentRoom.currentTurn} after fallback interrupt`);
              startArgumentTimer(roomId, currentRoom.currentTurn);
            }
          }
        }
      }, 2000); // 2 second grace period for client to submit their argument

      console.log(`Interrupt signal sent for ${previousTurn} in room ${roomId}`);
    }
  });

  // Handle timer synchronization requests (when tab becomes visible)
  socket.on('request-timer-sync', (data) => {
    const { roomId } = data;
    const room = gameRooms.get(roomId);

    if (!room) return;

    // Check if game has ended - don't sync timers for ended games
    if (isGameEnded(room)) {
      console.log(`Timer sync requested for room ${roomId} but game has ended - ignoring`);
      return;
    }

    console.log(`Timer sync requested for room ${roomId}`);

    const roomTimerData = timerValues.get(roomId) || {};

    // Send current timer states based on game phase and stored values
    if (room.gameState === 'case-reading' && caseReadingTimers.has(roomId)) {
      const timeLeft = roomTimerData.caseReadingTime || 120;
      socket.emit('case-reading-timer-update', { timeLeft });
      console.log(`Synced case reading timer: ${timeLeft}s`);
    }

    if (roomTimers.has(roomId)) {
      const timeLeft = roomTimerData.argumentTime || 10;
      const phase = roomTimerData.phase || 1;
      socket.emit('timer-update', {
        timeLeft,
        currentTurn: room.currentTurn,
        phase
      });
      console.log(`Synced argument timer: ${timeLeft}s, phase: ${phase}`);
    }

    if (nextRoundTimers.has(roomId)) {
      const timeLeft = roomTimerData.nextRoundTime || 60;
      socket.emit('next-round-timer-update', { timeLeft });
      console.log(`Synced next round timer: ${timeLeft}s`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Remove player from any rooms
    for (const [roomId, room] of gameRooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);

        if (room.players.length === 0) {
          // Delete empty room and clean up all timers
          gameRooms.delete(roomId);
          stopArgumentTimer(roomId);
          stopCaseReadingTimer(roomId);
          stopNextRoundTimer(roomId);

          // Clean up auto-start timer
          if (autoStartTimers.has(roomId)) {
            clearTimeout(autoStartTimers.get(roomId));
            autoStartTimers.delete(roomId);
          }

          // Clean up timer values
          if (timerValues.has(roomId)) {
            timerValues.delete(roomId);
          }

          console.log(`Room ${roomId} deleted - empty`);
        } else {
          // Notify remaining players
          io.to(roomId).emit('room-updated', room);
          console.log(`Player left room ${roomId}`);
        }
        break;
      }
    }
  });

  // Get room info
  socket.on('get-room-info', (roomId) => {
    console.log('Getting room info for:', roomId, 'from socket:', socket.id);
    const room = gameRooms.get(roomId);
    if (room) {
      console.log('Room found:', room.id, 'players:', room.players.map(p => p.name));

      // Generate comprehensive player data if game has started
      const roomWithPlayerData = {
        ...room,
        playerData: formatPlayerData(room)
      };

      socket.emit('room-info', roomWithPlayerData);
    } else {
      console.log('Room not found:', roomId);
      console.log('Available rooms:', Array.from(gameRooms.keys()));
      socket.emit('room-not-found');
    }
  });
});

// REST API endpoints
app.get('/api/rooms', (req, res) => {
  const rooms = Array.from(gameRooms.values()).map(room => ({
    id: room.id,
    playerCount: room.players.length,
    gameState: room.gameState,
    createdAt: room.createdAt
  }));
  res.json(rooms);
});

app.get('/api/room/:id', (req, res) => {
  const room = gameRooms.get(req.params.id);
  if (room) {
    res.json(room);
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
