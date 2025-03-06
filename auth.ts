import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({

            credentials: {
                email: {},
            },
            authorize: async (credentials) => {
                let user = null

                if (credentials.email === "test@test.com") {
                    user = {
                        id: "1",
                        name: "Test User",
                        email: "test@test.com"
                    }
                }

                return user
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.email = user.email
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.email = token.email as string
            }
            return session
        },
        signIn: async () => {
            return true;
        }
    },
})