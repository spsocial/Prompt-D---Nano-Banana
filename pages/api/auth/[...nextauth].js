import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const authOptions = {
  adapter: PrismaAdapter(prisma),
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
    async session({ session, user }) {
      // Add user ID and credits to session
      if (session?.user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email }
        })

        if (dbUser) {
          session.user.id = dbUser.id
          session.user.userId = dbUser.userId
          session.user.credits = dbUser.credits
        }
      }
      return session
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          userId: user.userId,
        }
      }
      return token
    }
  },
  pages: {
    signIn: '/', // Redirect to home page for sign in
    error: '/', // Error page
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug for development
}

export default NextAuth(authOptions)
