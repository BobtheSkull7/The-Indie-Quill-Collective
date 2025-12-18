CREATE TYPE "public"."application_status" AS ENUM('pending', 'under_review', 'accepted', 'rejected', 'migrated');--> statement-breakpoint
CREATE TYPE "public"."cohort_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('pending_signature', 'pending_guardian', 'signed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."publishing_status" AS ENUM('not_started', 'manuscript_received', 'editing', 'cover_design', 'formatting', 'review', 'published');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'syncing', 'synced', 'failed');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"internal_id" text,
	"cohort_id" integer,
	"date_approved" timestamp,
	"date_migrated" timestamp,
	"pen_name" text,
	"date_of_birth" text NOT NULL,
	"is_minor" boolean DEFAULT false NOT NULL,
	"guardian_name" text,
	"guardian_email" text,
	"guardian_phone" text,
	"guardian_relationship" text,
	"guardian_consent_method" text,
	"guardian_consent_verified" boolean DEFAULT false,
	"data_retention_until" timestamp,
	"has_story_to_tell" boolean DEFAULT true NOT NULL,
	"personal_struggles" text NOT NULL,
	"expression_types" text NOT NULL,
	"expression_other" text,
	"why_collective" text NOT NULL,
	"goals" text,
	"hear_about_us" text,
	"status" "application_status" DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"target_table" text NOT NULL,
	"target_id" text NOT NULL,
	"details" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"all_day" boolean DEFAULT false NOT NULL,
	"event_type" text DEFAULT 'meeting' NOT NULL,
	"location" text,
	"created_by" integer,
	"google_calendar_event_id" text,
	"last_synced_at" timestamp,
	"is_from_google" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cohorts" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"capacity" integer DEFAULT 10 NOT NULL,
	"current_count" integer DEFAULT 0 NOT NULL,
	"status" "cohort_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"contract_type" text NOT NULL,
	"contract_content" text NOT NULL,
	"author_signature" text,
	"author_signed_at" timestamp,
	"author_signature_ip" text,
	"author_signature_user_agent" text,
	"guardian_signature" text,
	"guardian_signed_at" timestamp,
	"guardian_signature_ip" text,
	"guardian_signature_user_agent" text,
	"requires_guardian" boolean DEFAULT false NOT NULL,
	"status" "contract_status" DEFAULT 'pending_signature' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer,
	"donor_name" text NOT NULL,
	"donor_email" text,
	"amount" integer NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"notes" text,
	"donated_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fundraising_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"goal_amount" integer NOT NULL,
	"current_amount" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishing_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"indie_quill_author_id" text,
	"status" "publishing_status" DEFAULT 'not_started' NOT NULL,
	"status_message" text,
	"estimated_completion" text,
	"sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"sync_error" text,
	"sync_attempts" integer DEFAULT 0 NOT NULL,
	"last_sync_attempt" timestamp,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" text DEFAULT 'applicant' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_campaign_id_fundraising_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."fundraising_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_campaigns" ADD CONSTRAINT "fundraising_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_updates" ADD CONSTRAINT "publishing_updates_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishing_updates" ADD CONSTRAINT "publishing_updates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;