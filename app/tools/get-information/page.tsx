"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToolResult } from "@/components/ui/tool-result";

export default function GetInformationPage() {
  const [question, setQuestion] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError("Please enter a question to search for information");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/tools/get-information', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim()
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to search knowledge base');
      }
      
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Error searching knowledge base: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Search Knowledge Base</h1>
        <p className="text-gray-300">
          Search the knowledge base for information related to your query.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="question" className="block text-sm font-medium mb-1">
            Your Question
          </label>
          <Textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question about AI incidents..."
            className="bg-[#1C1F24] border-gray-700 text-white min-h-[120px]"
          />
        </div>

        <Button 
          type="submit" 
          disabled={isLoading || !question.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? "Searching..." : "Search Knowledge Base"}
        </Button>
      </form>

      {(result || isLoading || error) && (
        <ToolResult result={result} isLoading={isLoading} error={error} />
      )}
    </div>
  );
} 