import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI!)

export async function GET(req: NextRequest) {
  try {
    await client.connect()
    const db = client.db('disputed')
    
    // Fetch top 50 users sorted by rating
    const users = await db.collection('users').find(
      { gamesPlayed: { $gt: 0 } }, // Only users who have played at least one game
      { 
        projection: { 
          username: 1,
          image: 1,
          rating: 1,
          gamesPlayed: 1,
          gamesWon: 1,
          gamesLost: 1,
          winPercentage: 1,
          currentWinStreak: 1,
          longestWinStreak: 1
        }
      }
    )
    .sort({ rating: -1 })
    .limit(50)
    .toArray()

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await client.close()
  }
}
