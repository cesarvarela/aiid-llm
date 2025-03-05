ALTER TYPE "public"."source_type" ADD VALUE 'classification';--> statement-breakpoint
CREATE TABLE "classifications" (
	"classificationId" text PRIMARY KEY NOT NULL,
	"namespace" text NOT NULL,
	"notes" text,
	"publish" boolean,
	"attributes" jsonb DEFAULT '[]' NOT NULL,
	"incidents" integer[],
	"reports" integer[],
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"dateModified" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "namespaceIdx" ON "classifications" USING btree ("namespace");