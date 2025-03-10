CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type') THEN
        CREATE TYPE "public"."source_type" AS ENUM('incident', 'report', 'classification');
    END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"sourceType" "source_type" NOT NULL,
	"sourceId" text NOT NULL,
	"chunkIndex" integer NOT NULL,
	"chunkText" text NOT NULL,
	"embedding" vector(1536),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"model" text NOT NULL,
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sourceIdx') THEN
        CREATE UNIQUE INDEX "sourceIdx" ON "embeddings" USING btree ("sourceType","sourceId","chunkIndex");
    END IF;
END $$;