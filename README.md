# AIID Database Tool

## Getting Started

Follow these steps to set up and run the project:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   - Create a PostgreSQL database for the project
   - Create a `.env` file in the root directory with your database connection:
     ```
     DATABASE_URL=postgres://<user>:<password>@localhost:5432/aiid
     ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Generate embeddings**
   ```bash
   npm run embeddings
   ```

6. **Run the application**
   - For development:
     ```bash
     npm run dev
     ```
   - For production:
     ```bash
     npm run build
     npm run start
     ```

## Tools

- `npm run codegen` - Generate TypeScript types from GraphQL schema
- `npm run search` - Run the search functionality for querying data

## Technologies

- TypeScript
- PostgreSQL with Drizzle ORM
- Node.js

## License

MIT