CREATE TABLE "embeddings_subset" (
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
CREATE UNIQUE INDEX "trainingSourceIdx" ON "embeddings_subset" USING btree ("sourceType","sourceId","chunkIndex");