"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { Send, Search, Plus, Mic } from "lucide-react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { MarkdownRenderer } from "../components/ui/markdown-renderer"
import AuthStatus from "../components/auth-status"
import Link from "next/link"

export default function ChatInterface() {

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-[#0D1117] text-white">
      <header className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Chat App</h1>
            <Link href="/tools" className="text-blue-400 hover:text-blue-300 text-sm">
              Tools
            </Link>
          </div>
          <AuthStatus />
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            {message.role === "user" ? (
              <div className="flex justify-end">
                <div className="bg-[#2A2F35] rounded-lg p-3 max-w-[80%]">
                  <MarkdownRenderer content={message.content} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-[#1C1F24] rounded-lg p-4 max-w-[80%]">
                  <MarkdownRenderer content={message.content} />
                </div>
                {message.content.length <= 0 && (
                  <span className="italic font-light">
                    {'calling tool: ' + message?.toolInvocations?.[0].toolName}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>
      <footer className="p-4">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <Button type="button" size="icon" variant="ghost">
            <Plus className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything"
            className="flex-1 bg-[#1C1F24] border-none text-white placeholder-gray-400"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </footer>
    </div>
  )
}

