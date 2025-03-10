CREATE TYPE "public"."source_type" AS ENUM('incident', 'report', 'classification');--> statement-breakpoint
CREATE TABLE "embeddings" (
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
CREATE UNIQUE INDEX "sourceIdx" ON "embeddings" USING btree ("sourceType","sourceId","chunkIndex");