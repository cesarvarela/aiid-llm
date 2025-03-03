-- Add the pgvector extension to enable vector operations in PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "public"."source_type" AS ENUM('incident', 'report');--> statement-breakpoint
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
CREATE TABLE "entities" (
	"entityId" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"dateModified" timestamp
);
--> statement-breakpoint
CREATE TABLE "implicatedSystems" (
	"incidentId" integer,
	"entityId" text
);
--> statement-breakpoint
CREATE TABLE "incidentDeployers" (
	"incidentId" integer,
	"entityId" text
);
--> statement-breakpoint
CREATE TABLE "incidentDevelopers" (
	"incidentId" integer,
	"entityId" text
);
--> statement-breakpoint
CREATE TABLE "incidentEditors" (
	"incidentId" integer,
	"userId" text
);
--> statement-breakpoint
CREATE TABLE "incidentHarmedParties" (
	"incidentId" integer,
	"entityId" text
);
--> statement-breakpoint
CREATE TABLE "incidentReports" (
	"incidentId" integer,
	"reportNumber" integer
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"incidentId" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" timestamp NOT NULL,
	"editorNotes" text,
	"epochDateModified" integer,
	"editorSimilarIncidents" integer[],
	"editorDissimilarIncidents" integer[],
	"tsneX" real,
	"tsneY" real
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"reportNumber" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL,
	"plainText" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"sourceDomain" text NOT NULL,
	"imageUrl" text NOT NULL,
	"cloudinaryId" text NOT NULL,
	"language" text NOT NULL,
	"dateDownloaded" timestamp NOT NULL,
	"dateModified" timestamp NOT NULL,
	"datePublished" timestamp NOT NULL,
	"dateSubmitted" timestamp NOT NULL,
	"epochDateDownloaded" integer NOT NULL,
	"epochDateModified" integer NOT NULL,
	"epochDatePublished" integer NOT NULL,
	"epochDateSubmitted" integer NOT NULL,
	"authors" text[],
	"submitters" text[],
	"tags" text[],
	"inputsOutputs" text[],
	"flag" boolean,
	"isIncidentReport" boolean,
	"editorNotes" text,
	"quiet" boolean,
	"userId" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"userId" text PRIMARY KEY NOT NULL,
	"firstName" text,
	"lastName" text,
	"roles" text[]
);
--> statement-breakpoint
ALTER TABLE "implicatedSystems" ADD CONSTRAINT "implicatedSystems_incidentId_incidents_incidentId_fk" FOREIGN KEY ("incidentId") REFERENCES "public"."incidents"("incidentId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "implicatedSystems" ADD CONSTRAINT "implicatedSystems_entityId_entities_entityId_fk" FOREIGN KEY ("entityId") REFERENCES "public"."entities"("entityId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidentDeployers" ADD CONSTRAINT "incidentDeployers_incidentId_incidents_incidentId_fk" FOREIGN KEY ("incidentId") REFERENCES "public"."incidents"("incidentId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidentDeployers" ADD CONSTRAINT "incidentDeployers_entityId_entities_entityId_fk" FOREIGN KEY ("entityId") REFERENCES "public"."entities"("entityId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidentDevelopers" ADD CONSTRAINT "incidentDevelopers_incidentId_incidents_incidentId_fk" FOREIGN KEY ("incidentId") REFERENCES "public"."incidents"("incidentId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidentDevelopers" ADD CONSTRAINT "incidentDevelopers_entityId_entities_entityId_fk" FOREIGN KEY ("entityId") REFERENCES "public"."entities"("entityId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidentEditors" ADD CONSTRAINT "incidentEditors_incidentId_incidents_incidentId_fk" FOREIGN KEY ("incidentId") REFERENCES "public"."incidents"("incidentId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidentEditors" ADD CONSTRAINT "incidentEditors_userId_users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidentHarmedParties" ADD CONSTRAINT "incidentHarmedParties_incidentId_incidents_incidentId_fk" FOREIGN KEY ("incidentId") REFERENCES "public"."incidents"("incidentId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidentHarmedParties" ADD CONSTRAINT "incidentHarmedParties_entityId_entities_entityId_fk" FOREIGN KEY ("entityId") REFERENCES "public"."entities"("entityId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidentReports" ADD CONSTRAINT "incidentReports_incidentId_incidents_incidentId_fk" FOREIGN KEY ("incidentId") REFERENCES "public"."incidents"("incidentId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidentReports" ADD CONSTRAINT "incidentReports_reportNumber_reports_reportNumber_fk" FOREIGN KEY ("reportNumber") REFERENCES "public"."reports"("reportNumber") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sourceIdx" ON "embeddings" USING btree ("sourceType","sourceId","chunkIndex");--> statement-breakpoint
CREATE UNIQUE INDEX "entityIdIdx" ON "entities" USING btree ("entityId");--> statement-breakpoint
CREATE UNIQUE INDEX "implicatedSystemsPkey" ON "implicatedSystems" USING btree ("incidentId","entityId");--> statement-breakpoint
CREATE UNIQUE INDEX "incidentDeployersPkey" ON "incidentDeployers" USING btree ("incidentId","entityId");--> statement-breakpoint
CREATE UNIQUE INDEX "incidentDevelopersPkey" ON "incidentDevelopers" USING btree ("incidentId","entityId");--> statement-breakpoint
CREATE UNIQUE INDEX "incidentEditorsPkey" ON "incidentEditors" USING btree ("incidentId","userId");--> statement-breakpoint
CREATE UNIQUE INDEX "incidentHarmedPartiesPkey" ON "incidentHarmedParties" USING btree ("incidentId","entityId");--> statement-breakpoint
CREATE UNIQUE INDEX "incidentReportsPkey" ON "incidentReports" USING btree ("incidentId","reportNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "incidentIdIdx" ON "incidents" USING btree ("incidentId");--> statement-breakpoint
CREATE UNIQUE INDEX "reportNumberIdx" ON "reports" USING btree ("reportNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "userIdIdx" ON "users" USING btree ("userId");