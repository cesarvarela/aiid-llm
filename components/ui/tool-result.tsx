import { MarkdownRenderer } from "./markdown-renderer";

interface ToolResultProps {
  result: any;
  isLoading?: boolean;
  error?: string | null;
}

export function ToolResult({ result, isLoading, error }: ToolResultProps) {
  if (isLoading) {
    return (
      <div className="p-4 bg-[#1C1F24] rounded-lg animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-[#2A1A1A] text-red-400 rounded-lg border border-red-800">
        <h3 className="font-semibold mb-2">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const formattedResult = typeof result === 'string' 
    ? result 
    : '```json\n' + JSON.stringify(result, null, 2) + '\n```';

  return (
    <div className="p-4 bg-[#1C1F24] rounded-lg border border-gray-700">
      <h3 className="font-semibold mb-2">Result</h3>
      <div className="overflow-auto max-h-[500px] w-full">
        <MarkdownRenderer content={formattedResult} />
      </div>
    </div>
  );
} 