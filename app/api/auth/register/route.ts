import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const client = new MongoClient(process.env.MONGODB_URI!)

// Validation schema
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password must be less than 100 characters'),
  avatar: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = registerSchema.parse(body)
    const { username, email, password, avatar } = validatedData

    // Connect to database
    await client.connect()
    const db = client.db()
    const users = db.collection('users')

    // Check if user already exists
    const existingUser = await users.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: { $regex: new RegExp(`^${username}$`, 'i') } } // Case-insensitive username check
      ]
    })

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const newUser = {
      name: username.trim(), // Use username as display name
      username: username.trim(), // Keep original case for username
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: avatar || '⚖️',
      // Game Statistics
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      rating: 1200, // Starting ELO rating
      winPercentage: 0,
      // Argument Statistics
      averageArgumentScore: 0,
      bestArgumentScore: 0,
      worstArgumentScore: 0,
      totalArguments: 0,
      totalRoundsPlayed: 0,
      totalRoundsWon: 0,
      totalRoundsLost: 0,
      // Performance Statistics
      averageGameDuration: 0,
      longestWinStreak: 0,
      currentWinStreak: 0,
      // Role-specific Statistics
      attackerRoundsPlayed: 0,
      attackerRoundsWon: 0,
      attackerPointsWon: 0,
      attackerAverageScore: 0,
      defenderRoundsPlayed: 0,
      defenderRoundsWon: 0,
      defenderPointsWon: 0,
      defenderAverageScore: 0,
      preferredRole: 'none',
      // Account Information
      createdAt: new Date(),
      provider: 'credentials',
      emailVerified: false,
      isActive: true
    }

    const result = await users.insertOne(newUser)

    if (!result.insertedId) {
      throw new Error('Failed to create user')
    }

    // Return success response (without password)
    const { password: _, ...userWithoutPassword } = newUser
    
    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: result.insertedId.toString(),
        ...userWithoutPassword
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
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
