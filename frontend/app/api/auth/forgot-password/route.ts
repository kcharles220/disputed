import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import crypto from 'crypto'

// MongoDB connection
let cachedClient: MongoClient | null = null
let cachedDb: any = null

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = new MongoClient(process.env.MONGODB_URI!)
  await client.connect()
  const db = client.db()

  cachedClient = client
  cachedDb = db

  return { client, db }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    const users = db.collection('users')

    // Check if user exists
    const user = await users.findOne({ email: email.toLowerCase() })
    
    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return NextResponse.json(
        { message: 'If an account with that email exists, we sent a reset link.' },
        { status: 200 }
      )
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Save reset token to user
    await users.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          resetToken,
          resetTokenExpiry,
        },
      }
    )

    // Send password reset email using Resend
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'}/send-reset-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          resetUrl,
          username: user.username || 'User'
        }),
      })

      if (!response.ok) {
        console.error('Failed to send reset email via backend')
      }
    } catch (error) {
      console.error('Error sending reset email:', error)
    }

    return NextResponse.json(
      { message: 'If an account with that email exists, we sent a reset link.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
