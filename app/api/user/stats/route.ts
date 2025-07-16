import { NextRequest, NextResponse } from 'next/server'
import { MongoClient, ObjectId } from 'mongodb'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'

const client = new MongoClient(process.env.MONGODB_URI!)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Connect to database
    await client.connect()
    const db = client.db()
    const users = db.collection('users')

    // Get current user with all stats
    const user = await users.findOne(
      { _id: new ObjectId(session.user.id) },
      { 
        projection: { 
          password: 0, // Exclude password
          _id: 0 // Exclude MongoDB _id
        } 
      }
    )

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(user, { status: 200 })

  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await client.close()
  }
}
