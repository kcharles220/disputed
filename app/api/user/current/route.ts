import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { MongoClient, ObjectId } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI!)

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await client.connect()
    const db = client.db('disputed')
    
    // Fetch current user data from database
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(session.user.id) },
      { 
        projection: { 
          username: 1,
          email: 1,
          image: 1,
          avatar: 1,
          rating: 1,
          gamesPlayed: 1,
          gamesWon: 1,
          gamesLost: 1,
          winPercentage: 1,
          averageArgumentScore: 1,
          bestArgumentScore: 1,
          worstArgumentScore: 1,
          totalArguments: 1,
          totalRoundsPlayed: 1,
          totalRoundsWon: 1,
          totalRoundsLost: 1,
          averageGameDuration: 1,
          longestWinStreak: 1,
          currentWinStreak: 1,
          // Role-specific stats
          prosecutorRoundsPlayed: 1,
          prosecutorRoundsWon: 1,
          prosecutorPointsWon: 1,
          prosecutorAverageScore: 1,
          defenderRoundsPlayed: 1,
          defenderRoundsWon: 1,
          defenderPointsWon: 1,
          defenderAverageScore: 1,
          preferredRole: 1
        } 
      }
    )

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar || user.image,
      rating: user.rating || 1000,
      gamesPlayed: user.gamesPlayed || 0,
      gamesWon: user.gamesWon || 0,
      gamesLost: user.gamesLost || 0,
      winPercentage: user.winPercentage || 0,
      averageArgumentScore: user.averageArgumentScore || 0,
      bestArgumentScore: user.bestArgumentScore || 0,
      worstArgumentScore: user.worstArgumentScore || 0,
      totalRoundsPlayed: user.totalRoundsPlayed || 0,
      totalRoundsWon: user.totalRoundsWon || 0,
      totalRoundsLost: user.totalRoundsLost || 0,
      averageGameDuration: user.averageGameDuration || 0,
      longestWinStreak: user.longestWinStreak || 0,
      currentWinStreak: user.currentWinStreak || 0,
      // Role-specific stats
      prosecutorRoundsPlayed: user.prosecutorRoundsPlayed || 0,
      prosecutorRoundsWon: user.prosecutorRoundsWon || 0,
      prosecutorPointsWon: user.prosecutorPointsWon || 0,
      prosecutorAverageScore: user.prosecutorAverageScore || 0,
      defenderRoundsPlayed: user.defenderRoundsPlayed || 0,
      defenderRoundsWon: user.defenderRoundsWon || 0,
      defenderPointsWon: user.defenderPointsWon || 0,
      defenderAverageScore: user.defenderAverageScore || 0,
      preferredRole: user.preferredRole || 'none'
    })

  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await client.close()
  }
}
