"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {

        debugger;

        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            const result = await signIn("credentials", {
                email,
                redirect: false,
            })

            console.log(result)

            if (result?.error) {
                setIsLoading(false)
                setError("Invalid credentials" + result.error)
            } else {
                router.push("/")
                router.refresh()
            }
        } catch (error) {
            setError("Something went wrong. Please try again." + error.message)
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0D1117] text-white">
            <div className="w-full max-w-md p-6 bg-[#161B22] rounded-lg shadow-md border border-gray-700">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-center">Login</h2>
                    <p className="text-center text-gray-400">
                        Enter your email to sign in to your account
                    </p>
                </div>
                <div className="space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium">Email</label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-[#0D1117] border-gray-700 text-white placeholder:text-gray-500"
                            />
                        </div>
                        {error && (
                            <div className="text-sm font-medium text-red-500">
                                {error}
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
} 