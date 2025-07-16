import { NextRequest, NextResponse } from 'next/server'
import { MongoClient, ObjectId } from 'mongodb'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { z } from 'zod'

const client = new MongoClient(process.env.MONGODB_URI!)

// Validation schema for profile update
const profileUpdateSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  avatar: z.string().min(1, 'Avatar is required')
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
    const validatedData = profileUpdateSchema.parse(body)
    const { username, avatar } = validatedData

    // Connect to database
    await client.connect()
    const db = client.db()
    const users = db.collection('users')

    // Check if username is already taken by another user
    const existingUser = await users.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') },
      _id: { $ne: new ObjectId(session.user.id) } // Exclude current user
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      )
    }

    // Update user profile
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      {
        $set: {
          username: username.trim(),
          name: username.trim(), // Also update name field
          avatar: avatar,
          updatedAt: new Date()
        }
      }
    )

    if (!updateResult.modifiedCount) {
      throw new Error('Failed to update profile')
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        username: username.trim(),
        avatar: avatar
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Profile update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: error.issues },
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
