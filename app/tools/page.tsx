export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AI Incident Database Tools</h1>
      
      <p className="text-gray-300">
        Welcome to the AI Incident Database Tools section. Here you can directly use individual tools 
        to query the database without going through the chat interface. Select a tool from the sidebar 
        to get started.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-[#1C1F24] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Get Incident by ID</h2>
          <p className="text-gray-300">
            Retrieve detailed information about a specific incident using its ID.
          </p>
        </div>
        
        <div className="bg-[#1C1F24] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Find Similar Incidents by ID</h2>
          <p className="text-gray-300">
            Find incidents that are similar to a specific incident using its ID.
          </p>
        </div>
        
        <div className="bg-[#1C1F24] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Find Similar Incidents by Text</h2>
          <p className="text-gray-300">
            Search for incidents that are semantically similar to a text description.
          </p>
        </div>
        
        <div className="bg-[#1C1F24] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Get Incidents by Report IDs</h2>
          <p className="text-gray-300">
            Retrieve incidents that are associated with specific report IDs.
          </p>
        </div>
        
        <div className="bg-[#1C1F24] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Search Knowledge Base</h2>
          <p className="text-gray-300">
            Search the knowledge base for information related to your query.
          </p>
        </div>
      </div>
    </div>
  );
} 