import { NextRequest, NextResponse } from 'next/server'
import { MongoClient, ObjectId } from 'mongodb'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { z } from 'zod'

const client = new MongoClient(process.env.MONGODB_URI!)

// Validation schema for game result
const gameResultSchema = z.object({
  gameWon: z.boolean(),
  pointsEarned: z.number(),
  argumentScores: z.array(z.number()),
  gameDurationMinutes: z.number(),
  roundsPlayed: z.number(),
  roundsWon: z.number(),
  // Role-specific data
  playerRoles: z.array(z.object({
    round: z.number(),
    role: z.enum(['attacker', 'defender']),
    roundWon: z.boolean(),
    roundScore: z.number()
  }))
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = gameResultSchema.parse(body)
    const { gameWon, pointsEarned, argumentScores, gameDurationMinutes, roundsPlayed, roundsWon, playerRoles } = validatedData

    // Connect to database
    await client.connect()
    const db = client.db()
    const users = db.collection('users')

    // Get current user stats
    const user = await users.findOne({ _id: new ObjectId(session.user.id) })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate new statistics
    const currentGamesPlayed = user.gamesPlayed || 0
    const currentGamesWon = user.gamesWon || 0
    const currentGamesLost = user.gamesLost || 0
    const currentTotalRoundsPlayed = user.totalRoundsPlayed || 0
    const currentTotalRoundsWon = user.totalRoundsWon || 0
    const currentTotalRoundsLost = user.totalRoundsLost || 0
    const currentWinStreak = user.currentWinStreak || 0
    const currentLongestWinStreak = user.longestWinStreak || 0
    const currentBestArgumentScore = user.bestArgumentScore || 0
    const currentWorstArgumentScore = user.worstArgumentScore || 100
    const currentAverageArgumentScore = user.averageArgumentScore || 0
    const currentAverageGameDuration = user.averageGameDuration || 0

    // Role-specific current stats
    const currentAttackerRoundsPlayed = user.attackerRoundsPlayed || 0
    const currentAttackerRoundsWon = user.attackerRoundsWon || 0
    const currentAttackerPointsWon = user.attackerPointsWon || 0
    const currentAttackerAverageScore = user.attackerAverageScore || 0
    const currentDefenderRoundsPlayed = user.defenderRoundsPlayed || 0
    const currentDefenderRoundsWon = user.defenderRoundsWon || 0
    const currentDefenderPointsWon = user.defenderPointsWon || 0
    const currentDefenderAverageScore = user.defenderAverageScore || 0

    // Calculate role-specific performance for this game
    const attackerRounds = playerRoles.filter(r => r.role === 'attacker')
    const defenderRounds = playerRoles.filter(r => r.role === 'defender')
    
    const attackerRoundsWon = attackerRounds.filter(r => r.roundWon).length
    const defenderRoundsWon = defenderRounds.filter(r => r.roundWon).length
    
    const attackerPointsThisGame = attackerRounds.reduce((sum, r) => sum + r.roundScore, 0)
    const defenderPointsThisGame = defenderRounds.reduce((sum, r) => sum + r.roundScore, 0)
    
    const attackerAvgThisGame = attackerRounds.length > 0 ? attackerPointsThisGame / attackerRounds.length : 0
    const defenderAvgThisGame = defenderRounds.length > 0 ? defenderPointsThisGame / defenderRounds.length : 0

    // Update role-specific stats
    const newAttackerRoundsPlayed = currentAttackerRoundsPlayed + attackerRounds.length
    const newAttackerRoundsWon = currentAttackerRoundsWon + attackerRoundsWon
    const newAttackerPointsWon = currentAttackerPointsWon + attackerPointsThisGame
    const newAttackerAverageScore = newAttackerRoundsPlayed > 0 ? 
      ((currentAttackerAverageScore * currentAttackerRoundsPlayed) + attackerPointsThisGame) / newAttackerRoundsPlayed : 0

    const newDefenderRoundsPlayed = currentDefenderRoundsPlayed + defenderRounds.length
    const newDefenderRoundsWon = currentDefenderRoundsWon + defenderRoundsWon
    const newDefenderPointsWon = currentDefenderPointsWon + defenderPointsThisGame
    const newDefenderAverageScore = newDefenderRoundsPlayed > 0 ? 
      ((currentDefenderAverageScore * currentDefenderRoundsPlayed) + defenderPointsThisGame) / newDefenderRoundsPlayed : 0

    // Determine preferred role based on performance
    let preferredRole: 'attacker' | 'defender' | 'none' = 'none'
    if (newAttackerRoundsPlayed > 0 && newDefenderRoundsPlayed > 0) {
      const attackerWinRate = newAttackerRoundsWon / newAttackerRoundsPlayed
      const defenderWinRate = newDefenderRoundsWon / newDefenderRoundsPlayed
      const attackerAvgPerformance = newAttackerAverageScore
      const defenderAvgPerformance = newDefenderAverageScore
      
      // Consider both win rate and average performance
      const attackerScore = (attackerWinRate * 0.6) + (attackerAvgPerformance / 100 * 0.4)
      const defenderScore = (defenderWinRate * 0.6) + (defenderAvgPerformance / 100 * 0.4)
      
      preferredRole = attackerScore > defenderScore ? 'attacker' : 'defender'
    } else if (newAttackerRoundsPlayed > 0) {
      preferredRole = 'attacker'
    } else if (newDefenderRoundsPlayed > 0) {
      preferredRole = 'defender'
    }

    // Update basic game stats
    const newGamesPlayed = currentGamesPlayed + 1
    const newGamesWon = gameWon ? currentGamesWon + 1 : currentGamesWon
    const newGamesLost = gameWon ? currentGamesLost : currentGamesLost + 1
    const newWinPercentage = newGamesPlayed > 0 ? (newGamesWon / newGamesPlayed) * 100 : 0

    // Update rounds
    const newTotalRoundsPlayed = currentTotalRoundsPlayed + roundsPlayed
    const newTotalRoundsWon = currentTotalRoundsWon + roundsWon
    const newTotalRoundsLost = currentTotalRoundsLost + (roundsPlayed - roundsWon)

    // Update win streak
    const newWinStreak = gameWon ? currentWinStreak + 1 : 0
    const newLongestWinStreak = Math.max(currentLongestWinStreak, newWinStreak)

    // Update argument scores
    const totalPreviousArguments = user.totalArguments || 0
    const totalNewArguments = totalPreviousArguments + argumentScores.length
    
    let newBestArgumentScore = currentBestArgumentScore
    let newWorstArgumentScore = currentWorstArgumentScore === 100 ? 0 : currentWorstArgumentScore
    let newAverageArgumentScore = currentAverageArgumentScore

    if (argumentScores.length > 0) {
        const bestScoreThisGame = Math.max(...argumentScores)
        const worstScoreThisGame = Math.min(...argumentScores)
        
        newBestArgumentScore = Math.max(currentBestArgumentScore, bestScoreThisGame)
        
        // Handle worst score initialization
        if (currentWorstArgumentScore === 100 && totalPreviousArguments === 0) {
            // First time setting worst score
            newWorstArgumentScore = worstScoreThisGame
        } else {
            newWorstArgumentScore = Math.min(currentWorstArgumentScore === 100 ? worstScoreThisGame : currentWorstArgumentScore, worstScoreThisGame)
        }
        
        // Calculate weighted average of all arguments (not games)
        const totalPreviousScoreSum = totalPreviousArguments * currentAverageArgumentScore
        const totalNewScoreSum = argumentScores.reduce((a, b) => a + b, 0)
        newAverageArgumentScore = totalNewArguments > 0 ? (totalPreviousScoreSum + totalNewScoreSum) / totalNewArguments : 0
    }

    // Update average game duration
    const totalPreviousDuration = currentGamesPlayed * currentAverageGameDuration
    const newAverageGameDuration = (totalPreviousDuration + gameDurationMinutes) / newGamesPlayed

    // Calculate new rating (simplified ELO-like system)
    const currentRating = user.rating || 1200
    const avgScoreThisGame = argumentScores.length > 0 ? argumentScores.reduce((a, b) => a + b, 0) / argumentScores.length : 0
    const ratingChange = gameWon ? 
      Math.round(16 + (avgScoreThisGame / 10)) : // Win: base +16, bonus for performance
      Math.round(-16 + (avgScoreThisGame / 10))  // Loss: base -16, reduced loss for good performance
    const newRating = Math.max(100, Math.min(3000, currentRating + ratingChange)) // Cap between 100-3000

    // Update user in database
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      {
        $set: {
          gamesPlayed: newGamesPlayed,
          gamesWon: newGamesWon,
          gamesLost: newGamesLost,
          winPercentage: newWinPercentage,
          rating: newRating,
          totalRoundsPlayed: newTotalRoundsPlayed,
          totalRoundsWon: newTotalRoundsWon,
          totalRoundsLost: newTotalRoundsLost,
          currentWinStreak: newWinStreak,
          longestWinStreak: newLongestWinStreak,
          bestArgumentScore: newBestArgumentScore,
          worstArgumentScore: newWorstArgumentScore,
          averageArgumentScore: newAverageArgumentScore,
          totalArguments: totalNewArguments,
          averageGameDuration: newAverageGameDuration,
          // Role-specific stats
          attackerRoundsPlayed: newAttackerRoundsPlayed,
          attackerRoundsWon: newAttackerRoundsWon,
          attackerPointsWon: newAttackerPointsWon,
          attackerAverageScore: newAttackerAverageScore,
          defenderRoundsPlayed: newDefenderRoundsPlayed,
          defenderRoundsWon: newDefenderRoundsWon,
          defenderPointsWon: newDefenderPointsWon,
          defenderAverageScore: newDefenderAverageScore,
          preferredRole: preferredRole,
          lastGameAt: new Date()
        }
      }
    )

    if (!updateResult.modifiedCount) {
      throw new Error('Failed to update user stats')
    }

    return NextResponse.json({
      message: 'Stats updated successfully',
      stats: {
        gamesPlayed: newGamesPlayed,
        gamesWon: newGamesWon,
        gamesLost: newGamesLost,
        winPercentage: newWinPercentage,
        rating: newRating,
        ratingChange,
        currentWinStreak: newWinStreak,
        totalRoundsWon: newTotalRoundsWon,
        totalRoundsLost: newTotalRoundsLost
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Update stats error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid game data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await client.close()
  }
}
