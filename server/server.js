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

// Start argument timer for a room
function startArgumentTimer(roomId, currentTurn) {
  // Clear any existing timer for this room
  if (roomTimers.has(roomId)) {
    clearInterval(roomTimers.get(roomId));
  }
  
  let timeLeft = 10; // 10 seconds per turn (first phase)
  let phase = 1; // Phase 1: normal timer, Phase 2: interrupt grace period
  
  const timer = setInterval(() => {
    timeLeft -= 1;
    
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
}

// Start the next round (called when both players are ready or timeout)
function startNextRound(roomId) {
  const room = gameRooms.get(roomId);
  if (!room) return;
  
  // Clear auto-start timer if it exists
  if (autoStartTimers.has(roomId)) {
    clearTimeout(autoStartTimers.get(roomId));
    autoStartTimers.delete(roomId);
  }
  
  // Clear readiness tracking
  delete room.nextRoundReady;
  
  // Start the round
  room.currentTurn = 'attacker';
  
  io.to(roomId).emit('next-round-started', {
    round: room.currentRound,
    scores: room.scores,
    players: room.players
  });
  
  // Start timer for the new round
  setTimeout(() => {
    startArgumentTimer(roomId, 'attacker');
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
      attackerSide: "TechNova Inc.",
      defenderSide: "Sarah Chen"
    },
    {
      id: 2,
      title: "The Intellectual Property Theft Case",
      description: "A software company accuses a former intern of stealing proprietary code and selling it to competitors.",
      context: "CodeCorp hired Alex Rodriguez as a summer intern to work on their flagship AI algorithm. Three months after the internship ended, CodeCorp discovered their exact algorithm implementation being used by three different startups. Alex claims the code was based on open-source libraries and academic papers, not proprietary work. CodeCorp argues Alex had access to confidential code repositories and signed strict NDAs.",
      attackerSide: "CodeCorp",
      defenderSide: "Alex Rodriguez"
    },
    {
      id: 3,
      title: "The Trademark Dispute",
      description: "Two companies clash over the right to use a similar brand name in the same industry.",
      context: "FreshFoods LLC has operated a organic grocery chain since 2015 under the name 'Fresh Market'. In 2023, a new startup 'FreshMarket' (no space) launched a meal delivery service. FreshFoods claims trademark infringement and consumer confusion. FreshMarket argues the names are sufficiently different and they operate in different sectors of the food industry.",
      attackerSide: "FreshFoods LLC",
      defenderSide: "FreshMarket Startup"
    }
  ];
  
  return cases[Math.floor(Math.random() * cases.length)];
}

// Simulate AI analysis of arguments and determine round winner
function analyzeArgumentsAndDetermineWinner(attackArguments, defenseArguments) {
  // Simulate AI analysis with weighted scoring
  let attackerScore = 0;
  let defenderScore = 0;
  
  // Analyze attacker arguments (should be 3 arguments)
  attackArguments.forEach((arg, index) => {
    // Simple keyword-based scoring simulation
    const strength = Math.random() * 10; // Random base strength
    const lengthBonus = Math.min(arg.content.length / 25, 5); // Bonus for detailed arguments
    const keywordBonus = (arg.content.match(/evidence|proof|violation|contract|law|precedent|liability|damages|breach/gi) || []).length;
    const positionBonus = index === 0 ? 1 : index === 2 ? 1.2 : 0.8; // Slight bonus for opening and closing arguments
    attackerScore += (strength + lengthBonus + keywordBonus) * positionBonus;
  });
  
  // Analyze defender arguments (should be 3 arguments)
  defenseArguments.forEach((arg, index) => {
    const strength = Math.random() * 10;
    const lengthBonus = Math.min(arg.content.length / 25, 5);
    const keywordBonus = (arg.content.match(/defense|innocent|false|unfair|rights|freedom|justified|legal|proper/gi) || []).length;
    const positionBonus = index === 0 ? 1 : index === 2 ? 1.2 : 0.8; // Slight bonus for opening and closing arguments
    defenderScore += (strength + lengthBonus + keywordBonus) * positionBonus;
  });
  
  // Add some randomness for unpredictability
  attackerScore += Math.random() * 5;
  defenderScore += Math.random() * 5;
  
  // Generate more detailed analysis
  const attackerAvg = (attackerScore / attackArguments.length).toFixed(1);
  const defenderAvg = (defenderScore / defenseArguments.length).toFixed(1);
  const winner = attackerScore > defenderScore ? 'attacker' : 'defender';
  
  let analysis = `After analyzing ${attackArguments.length + defenseArguments.length} arguments across 3 exchanges:\n\n`;
  analysis += `🔥 Attacker averaged ${attackerAvg} points per argument with strong ${attackArguments.length > 0 ? (attackArguments[0].content.match(/evidence|proof|violation/gi) || []).length > 0 ? 'factual' : 'strategic' : 'legal'} positioning.\n`;
  analysis += `🛡️ Defender averaged ${defenderAvg} points per argument with effective ${defenseArguments.length > 0 ? (defenseArguments[0].content.match(/rights|freedom|unfair/gi) || []).length > 0 ? 'rights-based' : 'defensive' : 'legal'} rebuttals.\n\n`;
  analysis += `The ${winner} presented the more compelling case through stronger argumentation and legal reasoning.`;
  
  return {
    attackerScore: Math.round(attackerScore * 10) / 10,
    defenderScore: Math.round(defenderScore * 10) / 10,
    winner,
    analysis
  };
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
      scores: { attacker: 0, defender: 0 },
      roundArguments: [],
      currentTurn: 'attacker', // Track whose turn it is
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
          const roles = ['attacker', 'defender'];
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
          room.gameState = 'arguing';
          room.currentTurn = 'attacker'; // Start with attacker
          
          // Start the argument timer
          startArgumentTimer(roomId, 'attacker');
          
          io.to(roomId).emit('bothPlayersReady');
        }
      } else {
        console.log('Player not found in room for case reading ready');
      }
    } else {
      console.log('Room not found for case reading ready:', roomId);
    }
  });

  // Game argument handling
  socket.on('submit-argument', (data) => {
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
      room.currentTurn = room.currentTurn === 'attacker' ? 'defender' : 'attacker';
      
      // Broadcast argument to all players in room
      io.to(roomId).emit('game-argument', {
        ...argument,
        round: room.currentRound,
        nextTurn: room.currentTurn
      });
      
      // Check if round should end (6 arguments per round - 3 from each player)
      const currentRoundArgs = room.roundArguments.filter(arg => arg.round === room.currentRound);
      const attackerArgs = currentRoundArgs.filter(arg => arg.type === 'attack');
      const defenderArgs = currentRoundArgs.filter(arg => arg.type === 'defense');
      
      console.log(`Round ${room.currentRound} progress: Total args: ${currentRoundArgs.length}, Attacker: ${attackerArgs.length}/3, Defender: ${defenderArgs.length}/3`);
      console.log('Current round arguments:', currentRoundArgs.map(arg => ({ player: arg.playerName, type: arg.type, round: arg.round })));
      
      if (attackerArgs.length >= 3 && defenderArgs.length >= 3) {
        console.log(`Round ${room.currentRound} ready for analysis with ${attackerArgs.length} attacker args and ${defenderArgs.length} defender args`);
        
        // Stop any active timer since round is complete
        stopArgumentTimer(roomId);
        
        // Analyze arguments and determine round winner
        const roundResult = analyzeArgumentsAndDetermineWinner(attackerArgs, defenderArgs);
        
        // Initialize player-based scores if needed
        if (!room.playerScores) {
          room.playerScores = {};
        }
        
        // Update player-based scores (tracks wins by actual player, not role)
        // Find the player who was playing the winning role this round
        const winningPlayer = room.players.find(p => p.role === roundResult.winner);
        if (winningPlayer) {
          if (!room.playerScores[winningPlayer.id]) {
            room.playerScores[winningPlayer.id] = 0;
          }
          room.playerScores[winningPlayer.id] += 1;
          console.log(`SERVER: Player ${winningPlayer.name} (${winningPlayer.id}) wins round ${room.currentRound} as ${roundResult.winner}. Player now has ${room.playerScores[winningPlayer.id]} wins.`);
        }
        
        // Update role-based scores for UI compatibility (based on original roles, not current roles)
        const originalAttackerPlayer = room.players.find(p => p.originalRole === 'attacker');
        const originalDefenderPlayer = room.players.find(p => p.originalRole === 'defender');
        
        room.scores.attacker = originalAttackerPlayer ? (room.playerScores[originalAttackerPlayer.id] || 0) : 0;
        room.scores.defender = originalDefenderPlayer ? (room.playerScores[originalDefenderPlayer.id] || 0) : 0;
        
        console.log(`Round ${room.currentRound} complete. Winner: ${roundResult.winner}. Role-based scores: ${room.scores.attacker}-${room.scores.defender}. Player scores:`, 
          Object.entries(room.playerScores).map(([id, score]) => {
            const player = room.players.find(p => p.id === id);
            return `${player ? player.name : id}: ${score}`;
          }).join(', ')
        );
        
        // Store individual player performance for side choice decisions - INITIALIZE FIRST
        if (!room.playerPerformance) {
          room.playerPerformance = {};
        }
        
        // Track individual player performance scores
        const attackerPlayer = room.players.find(p => p.role === 'attacker');
        const defenderPlayer = room.players.find(p => p.role === 'defender');
        
        if (attackerPlayer) {
          if (!room.playerPerformance[attackerPlayer.id]) {
            room.playerPerformance[attackerPlayer.id] = { totalScore: 0, rounds: 0 };
          }
          room.playerPerformance[attackerPlayer.id].totalScore += roundResult.attackerScore;
          room.playerPerformance[attackerPlayer.id].rounds += 1;
        }
        
        if (defenderPlayer) {
          if (!room.playerPerformance[defenderPlayer.id]) {
            room.playerPerformance[defenderPlayer.id] = { totalScore: 0, rounds: 0 };
          }
          room.playerPerformance[defenderPlayer.id].totalScore += roundResult.defenderScore;
          room.playerPerformance[defenderPlayer.id].rounds += 1;
        }

        // Detailed player information logging - NOW SAFE TO ACCESS playerPerformance
        console.log('\n=== ROUND END PLAYER DETAILS ===');
        console.log(`Room ID: ${roomId} | Round: ${room.currentRound}`);
        
        room.players.forEach(player => {
          const playerRoundWins = room.playerScores[player.id] || 0;
          const playerPerformance = room.playerPerformance[player.id];
          const averageScore = playerPerformance ? (playerPerformance.totalScore / playerPerformance.rounds).toFixed(1) : '0.0';
          const currentRoundScore = player.role === 'attacker' ? roundResult.attackerScore : roundResult.defenderScore;
          
          console.log(`Player: ${player.name}`);
          console.log(`  - Socket ID: ${player.id}`);
          console.log(`  - Current Role: ${player.role}`);
          console.log(`  - Original Role: ${player.originalRole || player.role}`);
          console.log(`  - Display Role: ${player.displayRole || player.role}`);
          console.log(`  - Round Wins: ${playerRoundWins}`);
          console.log(`  - Current Round Score: ${currentRoundScore.toFixed(1)} points`);
          console.log(`  - Average Score: ${averageScore} points`);
          console.log(`  - Total Points Earned: ${playerPerformance ? playerPerformance.totalScore.toFixed(1) : '0.0'}`);
          console.log(`  - Rounds Played: ${playerPerformance ? playerPerformance.rounds : 0}`);
          console.log(`  - Is Round Winner: ${player.role === roundResult.winner ? 'YES' : 'NO'}`);
          console.log('');
        });
        
        console.log(`Round Analysis: ${roundResult.analysis}`);
        console.log('=== END ROUND DETAILS ===\n');

        // Broadcast round results with enhanced data
        io.to(roomId).emit('round-complete', {
          round: room.currentRound,
          winner: roundResult.winner,
          scores: room.scores, // Role-based scores for UI compatibility
          playerScores: room.playerScores, // Player-based scores for accuracy
          playerPerformance: room.playerPerformance, // Individual performance data
          analysis: roundResult.analysis,
          attackerScore: roundResult.attackerScore,
          defenderScore: roundResult.defenderScore
        });
        
        // Check if game should end - use player-based scoring
        const playerWins = Object.values(room.playerScores || {});
        const maxPlayerWins = Math.max(...(playerWins.length > 0 ? playerWins : [0]));
        
        const shouldEndGame = 
          maxPlayerWins >= 2 || 
          room.currentRound >= room.maxRounds;
        
        console.log(`SERVER: Checking game end conditions. Max player wins: ${maxPlayerWins}, Current round: ${room.currentRound}, Should end: ${shouldEndGame}`);
        
        if (shouldEndGame) {
          // Determine overall winner based on player scores
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
            const winningPlayerOriginalRole = winningPlayer?.originalRole;
            gameWinner = winningPlayerOriginalRole; // Send 'attacker' or 'defender' for UI compatibility
            console.log(`SERVER: Game winner determined: ${winningPlayer?.name} (original role: ${gameWinner}) with ${maxWins} wins`);
          } else {
            gameWinner = 'tie';
            console.log(`SERVER: Game ends in tie`);
          }
          
          setTimeout(() => {
            io.to(roomId).emit('game-end', { 
              winner: gameWinner,
              finalScores: room.scores, // Keep role-based scores for UI compatibility
              playerScores: room.playerScores, // Add player-based scores
              message: gameWinner === 'tie' ? 'The battle ends in a tie!' : `${gameWinner} wins the battle!`
            });
          }, 3000);
        } else {
          // Start next round with role switching logic - DELAY role switching
          room.currentRound += 1;
          
          // Initialize next round readiness tracking
          room.nextRoundReady = {};
          room.players.forEach(player => {
            room.nextRoundReady[player.id] = false;
          });
          
          // Start 1-minute auto-start timer
          const autoStartTimer = setTimeout(() => {
            const currentRoom = gameRooms.get(roomId);
            if (currentRoom && currentRoom.nextRoundReady) {
              console.log(`Auto-starting round ${currentRoom.currentRound} after 1 minute timeout`);
              startNextRound(roomId);
            }
          }, 60000); // 1 minute
          
          // Store timer separately to avoid circular references in Socket.IO
          autoStartTimers.set(roomId, autoStartTimer);
          
          // Determine if roles should switch or if side choice is needed
          if (room.currentRound === 2) {
            // Round 2: Switch roles for actual gameplay - IMMEDIATE
            console.log('Round 2: Switching roles for new round');
            
            // Switch roles immediately after round complete
            room.players.forEach(player => {
              // Ensure originalRole is preserved
              if (!player.originalRole) {
                player.originalRole = player.role; // Store original role if somehow missing
              }
              // Switch both display role and current role (opposite of original role)
              player.displayRole = player.originalRole === 'attacker' ? 'defender' : 'attacker';
              player.role = player.originalRole === 'attacker' ? 'defender' : 'attacker';
              console.log(`Player ${player.name}: originalRole=${player.originalRole}, displayRole=${player.displayRole}, role=${player.role}`);
            });
            
            // Send updated player data to clients immediately
            io.to(roomId).emit('players-updated', {
              round: room.currentRound,
              scores: room.scores,
              players: room.players,
              message: 'Roles have been switched for Round 2!'
            });
            
          } else if (room.currentRound === 3) {
            // Round 3: Check if it's a tie using player-based scores
            const playerScores = Object.values(room.playerScores || {});
            const isTie = playerScores.length === 2 && playerScores.every(score => score === 1);
            
            console.log(`SERVER: Round 3 logic. Player scores:`, room.playerScores, `Is tie: ${isTie}`);
            
            if (isTie) {
              // It's a draw, let the better performer choose side
              console.log('Round 3: Draw detected, allowing side choice');
              
              // Find the player with better average performance
              let bestPlayerId = null;
              let bestAverage = -1;
              
              for (const [playerId, performance] of Object.entries(room.playerPerformance)) {
                const average = performance.totalScore / performance.rounds;
                if (average > bestAverage) {
                  bestAverage = average;
                  bestPlayerId = playerId;
                }
              }
              
              if (bestPlayerId) {
                const chooserPlayer = room.players.find(p => p.id === bestPlayerId);
                console.log(`Player ${chooserPlayer.name} gets to choose side for round 3`);
                
                // Set room state to waiting for side choice
                room.waitingForSideChoice = {
                  playerId: bestPlayerId,
                  playerName: chooserPlayer.name
                };
                
                setTimeout(() => {
                  io.to(roomId).emit('side-choice-needed', {
                    round: room.currentRound,
                    scores: room.scores,
                    chooserPlayerId: bestPlayerId,
                    chooserPlayerName: chooserPlayer.name,
                    playerPerformance: room.playerPerformance
                  });
                }, 3000);
              }
            } else {
              // Round 3: Not a draw, continue with switched roles from Round 2 - DELAYED
              setTimeout(() => {
                room.players.forEach(player => {
                  // Ensure originalRole is preserved
                  if (!player.originalRole) {
                    player.originalRole = player.role;
                  }
                  // Keep the role and display role from Round 2 (switched from original)
                  if (!player.displayRole) {
                    player.displayRole = player.originalRole === 'attacker' ? 'defender' : 'attacker';
                    player.role = player.originalRole === 'attacker' ? 'defender' : 'attacker';
                  }
                  console.log(`Round 3 (no draw) - Player ${player.name}: originalRole=${player.originalRole}, displayRole=${player.displayRole}, role=${player.role}`);
                });
                
                // Notify players to get ready for final round
                io.to(roomId).emit('next-round-ready-check', {
                  round: room.currentRound,
                  scores: room.scores,
                  players: room.players,
                  message: 'Final round! Keep your current roles.',
                  autoStartIn: 60 // seconds
                });
                
              }, 3000); // 3 second delay to allow round complete modal to be processed
            }
          }
        }
      } else {
        // Round not complete yet, start timer for next player's turn
        startArgumentTimer(roomId, room.currentTurn);
      }
    }
  });

  // Handle side choice for round 3 when it's a draw
  socket.on('choose-side', (data) => {
    const { roomId, chosenSide } = data; // chosenSide: 'attacker' or 'defender'
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
        otherPlayer.displayRole = chosenSide === 'attacker' ? 'defender' : 'attacker';
        
        // Also update the current role to match the chosen display role
        chooserPlayer.role = chosenSide;
        otherPlayer.role = chosenSide === 'attacker' ? 'defender' : 'attacker';
        
        console.log(`Side choice complete:`);
        console.log(`${chooserPlayer.name}: originalRole=${chooserPlayer.originalRole}, displayRole=${chooserPlayer.displayRole}, role=${chooserPlayer.role}`);
        console.log(`${otherPlayer.name}: originalRole=${otherPlayer.originalRole}, displayRole=${otherPlayer.displayRole}, role=${otherPlayer.role}`);
        
        // Clear the waiting state
        delete room.waitingForSideChoice;
        
        // Start the round
        room.currentTurn = 'attacker';
        
        io.to(roomId).emit('side-choice-complete', {
          round: room.currentRound,
          scores: room.scores,
          players: room.players,
          chooserName: chooserPlayer.name,
          chosenSide: chosenSide
        });
        
        // Start timer for the new round after a brief delay
        setTimeout(() => {
          startArgumentTimer(roomId, 'attacker');
        }, 2000);
      }
    }
  });

  // Handle next round readiness
  socket.on('next-round-ready', (data) => {
    const { roomId, ready } = data;
    console.log('Next round readiness received for room:', roomId, 'ready:', ready, 'from socket:', socket.id);
    
    const room = gameRooms.get(roomId);
    if (room && room.nextRoundReady) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        room.nextRoundReady[socket.id] = ready;
        
        console.log(`Player ${player.name} readiness for round ${room.currentRound}: ${ready}`);
        
        // Notify all players of readiness update
        io.to(roomId).emit('next-round-ready-update', {
          playerId: socket.id,
          playerName: player.name,
          ready: ready,
          readyPlayers: Object.values(room.nextRoundReady).filter(r => r).length,
          totalPlayers: room.players.length
        });
        
        // Check if both players are ready
        const allReady = Object.values(room.nextRoundReady).every(r => r);
        if (allReady) {
          console.log(`Both players ready for round ${room.currentRound}! Starting round.`);
          
          // Clear the auto-start timer since we're starting manually
          if (autoStartTimers.has(roomId)) {
            clearTimeout(autoStartTimers.get(roomId));
            autoStartTimers.delete(roomId);
          }
          
          setTimeout(() => {
            startNextRound(roomId);
          }, 1000); // Brief delay to show "both ready" state
        }
      }
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
        nextTurn: room.currentTurn === 'attacker' ? 'defender' : 'attacker'
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
              type: interruptedPlayer.role === 'attacker' ? 'attack' : 'defense',
              round: currentRoom.currentRound
            };
            
            // Add forced argument to room
            if (!currentRoom.roundArguments) {
              currentRoom.roundArguments = [];
            }
            currentRoom.roundArguments.push(forcedArgument);
            
            // Switch turns
            currentRoom.currentTurn = currentRoom.currentTurn === 'attacker' ? 'defender' : 'attacker';
            
            // Broadcast the forced argument to all players
            io.to(roomId).emit('game-argument', {
              ...forcedArgument,
              round: currentRoom.currentRound,
              nextTurn: currentRoom.currentTurn
            });
            
            // Check if round should end and continue game logic
            const currentRoundArgs = currentRoom.roundArguments.filter(arg => arg.round === currentRoom.currentRound);
            const attackerArgs = currentRoundArgs.filter(arg => arg.type === 'attack');
            const defenderArgs = currentRoundArgs.filter(arg => arg.type === 'defense');
            
            if (attackerArgs.length < 3 || defenderArgs.length < 3) {
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
          
          // Clean up auto-start timer
          if (autoStartTimers.has(roomId)) {
            clearTimeout(autoStartTimers.get(roomId));
            autoStartTimers.delete(roomId);
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
      socket.emit('room-info', room);
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
