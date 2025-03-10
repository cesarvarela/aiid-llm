import Link from 'next/link';

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D1117] text-white">
      <header className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">AI Incident Database Tools</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Back to Chat
          </Link>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="min-w-64 w-64 flex-shrink-0 border-r border-gray-700 p-4 overflow-y-auto">
          <h2 className="font-semibold mb-4">Available Tools</h2>
          <ul className="space-y-2">
            <li>
              <Link
                href="/tools/get-classifications"
                className="block p-2 rounded hover:bg-[#1C1F24] transition-colors"
              >
                Get Classifications
              </Link>
            </li>
            <li>
              <Link
                href="/tools/get-information"
                className="block p-2 rounded hover:bg-[#1C1F24] transition-colors"
              >
                Search Knowledge Base
              </Link>
            </li>
          </ul>
        </nav>
        <main className="flex-1 p-6 overflow-x-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 