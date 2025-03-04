import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({

            credentials: {
                email: {},
                password: {},
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
    callbacks: {
        authorized: async ({ auth }) => {
            return !!auth
        },
    },
})