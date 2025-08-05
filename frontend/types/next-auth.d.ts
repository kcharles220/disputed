import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      avatar: string
      gamesPlayed: number
      gamesWon: number
      gamesLost: number
      rating: number
      winPercentage: number
      averageArgumentScore: number
      bestArgumentScore: number
      worstArgumentScore: number
      totalArguments: number
      totalRoundsPlayed: number
      totalRoundsWon: number
      totalRoundsLost: number
      averageGameDuration: number
      longestWinStreak: number
      currentWinStreak: number
      // Role-specific stats
      prosecutorRoundsPlayed: number
      prosecutorRoundsWon: number
      prosecutorPointsWon: number
      prosecutorAverageScore: number
      defenderRoundsPlayed: number
      defenderRoundsWon: number
      defenderPointsWon: number
      defenderAverageScore: number
      preferredRole: 'prosecutor' | 'defender' | 'none'
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    username?: string
    avatar?: string
    gamesPlayed?: number
    gamesWon?: number
    gamesLost?: number
    rating?: number
    winPercentage?: number
    averageArgumentScore?: number
    bestArgumentScore?: number
    worstArgumentScore?: number
    totalArguments?: number
    totalRoundsPlayed?: number
    totalRoundsWon?: number
    totalRoundsLost?: number
    averageGameDuration?: number
    longestWinStreak?: number
    currentWinStreak?: number
    // Role-specific stats
    prosecutorRoundsPlayed?: number
    prosecutorRoundsWon?: number
    prosecutorPointsWon?: number
    prosecutorAverageScore?: number
    defenderRoundsPlayed?: number
    defenderRoundsWon?: number
    defenderPointsWon?: number
    defenderAverageScore?: number
    preferredRole?: 'prosecutor' | 'defender' | 'none'
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    username?: string
    avatar?: string
    gamesPlayed?: number
    gamesWon?: number
    gamesLost?: number
    rating?: number
    winPercentage?: number
    averageArgumentScore?: number
    bestArgumentScore?: number
    worstArgumentScore?: number
    totalArguments?: number
    totalRoundsPlayed?: number
    totalRoundsWon?: number
    totalRoundsLost?: number
    averageGameDuration?: number
    longestWinStreak?: number
    currentWinStreak?: number
    // Role-specific stats
    prosecutorRoundsPlayed?: number
    prosecutorRoundsWon?: number
    prosecutorPointsWon?: number
    prosecutorAverageScore?: number
    defenderRoundsPlayed?: number
    defenderRoundsWon?: number
    defenderPointsWon?: number
    defenderAverageScore?: number
    preferredRole?: 'prosecutor' | 'defender' | 'none'
  }
}

export interface ExtendedProfile {
  email?: string
  name?: string
  picture?: string
  sub?: string
}
