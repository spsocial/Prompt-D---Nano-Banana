import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Called when user signs in
      console.log('🔐 User signing in:', user.email)

      // Check if user exists in our system
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email }
      })

      if (!existingUser) {
        // Create new user with email as userId
        const userId = 'U-' + user.email.split('@')[0].toUpperCase()

        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            image: user.image,
            lastActive: new Date()
          },
          create: {
            userId: userId,
            email: user.email,
            name: user.name,
            image: user.image,
            firstSeen: new Date(),
            lastActive: new Date(),
            credits: 10, // Give 10 free credits for new users
            totalGenerated: 0,
            totalSpent: 0,
            creditsUsed: 0
          }
        })

        console.log(`✅ Created new user: ${user.email} with 10 free credits`)
      } else {
        // Update last active
        await prisma.user.update({
          where: { email: user.email },
          data: { lastActive: new Date() }
        })
        console.log(`✅ User logged in: ${user.email}`)
      }

      return true
    },
    async jwt({ token, user, account, profile }) {
      // First time login - save user info to token
      if (account && profile) {
        // Get or create user in database
        const dbUser = await prisma.user.findUnique({
          where: { email: profile.email }
        })

        if (dbUser) {
          token.userId = dbUser.userId
          token.dbId = dbUser.id
          token.credits = dbUser.credits
        }
      }
      return token
    },
    async session({ session, token }) {
      // Add user info from token to session
      if (session?.user && token) {
        session.user.userId = token.userId
        session.user.id = token.dbId
        session.user.credits = token.credits
      }
      return session
    }
  },
  pages: {
    signIn: '/', // Redirect to home page for sign in
    error: '/', // Error page
  },
  session: {
    strategy: "jwt", // Changed from database to jwt
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug for development
}

export default NextAuth(authOptions)
