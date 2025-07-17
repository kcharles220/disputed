import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import { ExtendedProfile } from '@/types/next-auth'

const client = new MongoClient(process.env.MONGODB_URI!)
const clientPromise = client.connect()

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const client = new MongoClient(process.env.MONGODB_URI!)
          await client.connect()
          
          const users = client.db().collection('users')
          const user = await users.findOne({ email: credentials.email })
          
          if (!user) {
            await client.close()
            return null
          }

          const isValidPassword = await bcrypt.compare(credentials.password, user.password)
          
          if (!isValidPassword) {
            await client.close()
            return null
          }

          await client.close()
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            rating: user.rating,
            gamesPlayed: user.gamesPlayed,
            gamesWon: user.gamesWon,
            gamesLost: user.gamesLost,
            pointsWon: user.pointsWon,
            pointsLost: user.pointsLost,
            winPercentage: user.winPercentage,
            averageArgumentScore: user.averageArgumentScore,
            bestArgumentScore: user.bestArgumentScore,
            worstArgumentScore: user.worstArgumentScore,
            totalRoundsPlayed: user.totalRoundsPlayed,
            totalRoundsWon: user.totalRoundsWon,
            averageGameDuration: user.averageGameDuration,
            longestWinStreak: user.longestWinStreak,
            currentWinStreak: user.currentWinStreak,
            // Role-specific stats
            prosecutorRoundsPlayed: user.prosecutorRoundsPlayed,
            prosecutorRoundsWon: user.prosecutorRoundsWon,
            prosecutorPointsWon: user.prosecutorPointsWon,
            prosecutorAverageScore: user.prosecutorAverageScore,
            defenderRoundsPlayed: user.defenderRoundsPlayed,
            defenderRoundsWon: user.defenderRoundsWon,
            defenderPointsWon: user.defenderPointsWon,
            defenderAverageScore: user.defenderAverageScore,
            preferredRole: user.preferredRole
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.avatar = (user as any).avatar
        token.rating = (user as any).rating
        token.gamesPlayed = (user as any).gamesPlayed
        token.gamesWon = (user as any).gamesWon
        token.gamesLost = (user as any).gamesLost
        token.pointsWon = (user as any).pointsWon
        token.pointsLost = (user as any).pointsLost
        token.winPercentage = (user as any).winPercentage
        token.averageArgumentScore = (user as any).averageArgumentScore
        token.bestArgumentScore = (user as any).bestArgumentScore
        token.worstArgumentScore = (user as any).worstArgumentScore
        token.totalRoundsPlayed = (user as any).totalRoundsPlayed
        token.totalRoundsWon = (user as any).totalRoundsWon
        token.averageGameDuration = (user as any).averageGameDuration
        token.longestWinStreak = (user as any).longestWinStreak
        token.currentWinStreak = (user as any).currentWinStreak
        // Role-specific stats
        token.prosecutorRoundsPlayed = (user as any).prosecutorRoundsPlayed
        token.prosecutorRoundsWon = (user as any).prosecutorRoundsWon
        token.prosecutorPointsWon = (user as any).prosecutorPointsWon
        token.prosecutorAverageScore = (user as any).prosecutorAverageScore
        token.defenderRoundsPlayed = (user as any).defenderRoundsPlayed
        token.defenderRoundsWon = (user as any).defenderRoundsWon
        token.defenderPointsWon = (user as any).defenderPointsWon
        token.defenderAverageScore = (user as any).defenderAverageScore
        token.preferredRole = (user as any).preferredRole
      }

      // Handle Google OAuth user creation/update
      if (profile && !user.username) {
        try {
          const client = new MongoClient(process.env.MONGODB_URI!)
          await client.connect()
          
          const users = client.db().collection('users')
          
          // Check if user exists
          const existingUser = await users.findOne({ 
            $or: [
              { email: profile.email },
              { googleId: profile.sub }
            ]
          })

          if (existingUser) {
            // Update existing user with Google info if needed
            if (!existingUser.googleId) {
              await users.updateOne(
                { _id: existingUser._id },
                { 
                  $set: { 
                    googleId: profile.sub,
                    name: profile.name || existingUser.name,
                    avatar: existingUser.avatar || '⚖️'
                  }
                }
              )
            }
            
            // Update token with user data
            token.id = existingUser._id.toString()
            token.username = existingUser.username
            token.avatar = existingUser.avatar
            token.rating = existingUser.rating
            token.gamesPlayed = existingUser.gamesPlayed || 0
            token.gamesWon = existingUser.gamesWon || 0
            token.gamesLost = existingUser.gamesLost || 0
            token.pointsWon = existingUser.pointsWon || 0
            token.pointsLost = existingUser.pointsLost || 0
            token.winPercentage = existingUser.winPercentage || 0
            token.averageArgumentScore = existingUser.averageArgumentScore || 0
            token.bestArgumentScore = existingUser.bestArgumentScore || 0
            token.worstArgumentScore = existingUser.worstArgumentScore || 0
            token.totalRoundsPlayed = existingUser.totalRoundsPlayed || 0
            token.totalRoundsWon = existingUser.totalRoundsWon || 0
            token.averageGameDuration = existingUser.averageGameDuration || 0
            token.longestWinStreak = existingUser.longestWinStreak || 0
            token.currentWinStreak = existingUser.currentWinStreak || 0
          } else {
            // Create new user from Google profile
            const googleProfile = profile as ExtendedProfile
            const baseUsername = ((profile as any).given_name || profile.name || profile.email?.split('@')[0] || 'Player').replace(/[^a-zA-Z0-9]/g, '')
            
            // Generate unique username
            let username = baseUsername
            let counter = 1
            while (await users.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } })) {
              username = `${baseUsername}${counter}`
              counter++
            }

            const newUser = {
              email: profile.email!,
              name: profile.name!,
              username: username,
              googleId: profile.sub,
              avatar: '⚖️',
              rating: 1200,
              gamesPlayed: 0,
              gamesWon: 0,
              gamesLost: 0,
              pointsWon: 0,
              pointsLost: 0,
              winPercentage: 0,
              averageArgumentScore: 0,
              bestArgumentScore: 0,
              worstArgumentScore: 0,
              totalRoundsPlayed: 0,
              totalRoundsWon: 0,
              averageGameDuration: 0,
              longestWinStreak: 0,
              currentWinStreak: 0,
              // Role-specific stats
              prosecutorRoundsPlayed: 0,
              prosecutorRoundsWon: 0,
              prosecutorPointsWon: 0,
              prosecutorAverageScore: 0,
              defenderRoundsPlayed: 0,
              defenderRoundsWon: 0,
              defenderPointsWon: 0,
              defenderAverageScore: 0,
              preferredRole: 'none',
              createdAt: new Date()
            }

            const result = await users.insertOne(newUser)
            
            // Update token with new user data
            token.id = result.insertedId.toString()
            token.username = username
            token.avatar = '⚖️'
            token.rating = 1200
            token.gamesPlayed = 0
            token.gamesWon = 0
            token.gamesLost = 0
            token.pointsWon = 0
            token.pointsLost = 0
            token.winPercentage = 0
            token.averageArgumentScore = 0
            token.bestArgumentScore = 0
            token.worstArgumentScore = 0
            token.totalRoundsPlayed = 0
            token.totalRoundsWon = 0
            token.averageGameDuration = 0
            token.longestWinStreak = 0
            token.currentWinStreak = 0
            // Role-specific stats
            token.prosecutorRoundsPlayed = 0
            token.prosecutorRoundsWon = 0
            token.prosecutorPointsWon = 0
            token.prosecutorAverageScore = 0
            token.defenderRoundsPlayed = 0
            token.defenderRoundsWon = 0
            token.defenderPointsWon = 0
            token.defenderAverageScore = 0
            token.preferredRole = 'none'
          }

          await client.close()
        } catch (error) {
          console.error('Error handling Google OAuth user:', error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        (session.user as any).avatar = token.avatar as string
        (session.user as any).rating = token.rating as number
        (session.user as any).gamesPlayed = token.gamesPlayed as number
        (session.user as any).gamesWon = token.gamesWon as number
        (session.user as any).gamesLost = token.gamesLost as number
        (session.user as any).pointsWon = token.pointsWon as number
        (session.user as any).pointsLost = token.pointsLost as number
        (session.user as any).winPercentage = token.winPercentage as number
        (session.user as any).averageArgumentScore = token.averageArgumentScore as number
        (session.user as any).bestArgumentScore = token.bestArgumentScore as number
        (session.user as any).worstArgumentScore = token.worstArgumentScore as number
        (session.user as any).totalRoundsPlayed = token.totalRoundsPlayed as number
        (session.user as any).totalRoundsWon = token.totalRoundsWon as number
        (session.user as any).averageGameDuration = token.averageGameDuration as number
        (session.user as any).longestWinStreak = token.longestWinStreak as number
        (session.user as any).currentWinStreak = token.currentWinStreak as number
        // Role-specific stats
        (session.user as any).prosecutorRoundsPlayed = token.prosecutorRoundsPlayed as number
        (session.user as any).prosecutorRoundsWon = token.prosecutorRoundsWon as number
        (session.user as any).prosecutorPointsWon = token.prosecutorPointsWon as number
        (session.user as any).prosecutorAverageScore = token.prosecutorAverageScore as number
        (session.user as any).defenderRoundsPlayed = token.defenderRoundsPlayed as number
        (session.user as any).defenderRoundsWon = token.defenderRoundsWon as number
        (session.user as any).defenderPointsWon = token.defenderPointsWon as number
        (session.user as any).defenderAverageScore = token.defenderAverageScore as number
        (session.user as any).preferredRole = token.preferredRole as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
}
