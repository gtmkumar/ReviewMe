import NextAuth, { DefaultSession } from 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      publicUsername?: string
    } & DefaultSession['user']
    accessToken?: string
    provider?: string
    github?: {
      id: string
      username: string
      avatar_url: string
    }
    google?: {
      id: string
      picture: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string
    image?: string
    publicUsername?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    provider?: string
    github?: {
      id: string
      username: string
      avatar_url: string
    }
    google?: {
      id: string
      picture: string
    }
  }
}