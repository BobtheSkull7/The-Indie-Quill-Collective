import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, varchar, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const applicationStatusEnum = pgEnum('application_status', [
  'pending',
  'under_review', 
  'accepted',
  'rejected',
  'migrated'
]);

export const contractStatusEnum = pgEnum('contract_status', [
  'pending_signature',
  'pending_guardian',
  'signed',
  'rejected'
]);

export const publishingStatusEnum = pgEnum('publishing_status', [
  'not_started',
  'manuscript_received',
  'editing',
  'cover_design',
  'formatting',
  'review',
  'published'
]);

export const syncStatusEnum = pgEnum('sync_status', [
  'pending',
  'syncing',
  'synced',
  'failed'
]);

export const cohortStatusEnum = pgEnum('cohort_status', [
  'open',
  'closed'
]);

// NPO Applications table - maps to existing Supabase table
export const npoApplications = pgTable("npo_applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  status: text("status").default("migrated"),
  bookstoreId: uuid("bookstore_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type NpoApplication = typeof npoApplications.$inferSelect;
export type InsertNpoApplication = typeof npoApplications.$inferInsert;

export const cohorts = pgTable("cohorts", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  capacity: integer("capacity").notNull().default(10),
  currentCount: integer("current_count").notNull().default(0),
  status: cohortStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("applicant"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  
  internalId: text("internal_id"),
  cohortId: integer("cohort_id").references(() => cohorts.id),
  dateApproved: timestamp("date_approved"),
  dateMigrated: timestamp("date_migrated"),
  
  penName: text("pen_name"),
  dateOfBirth: text("date_of_birth").notNull(),
  isMinor: boolean("is_minor").notNull().default(false),
  
  guardianName: text("guardian_name"),
  guardianEmail: text("guardian_email"),
  guardianPhone: text("guardian_phone"),
  guardianRelationship: text("guardian_relationship"),
  
  guardianConsentMethod: text("guardian_consent_method"),
  guardianConsentVerified: boolean("guardian_consent_verified").default(false),
  dataRetentionUntil: timestamp("data_retention_until"),
  
  hasStoryToTell: boolean("has_story_to_tell").notNull().default(true),
  personalStruggles: text("personal_struggles").notNull(),
  expressionTypes: text("expression_types").notNull(),
  expressionOther: text("expression_other"),
  
  whyCollective: text("why_collective").notNull(),
  goals: text("goals"),
  hearAboutUs: text("hear_about_us"),
  
  status: applicationStatusEnum("status").default("pending").notNull(),
  reviewNotes: text("review_notes"),
  reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id).notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  
  contractType: text("contract_type").notNull(),
  contractContent: text("contract_content").notNull(),
  
  authorSignature: text("author_signature"),
  authorSignedAt: timestamp("author_signed_at"),
  authorSignatureIp: text("author_signature_ip"),
  authorSignatureUserAgent: text("author_signature_user_agent"),
  
  guardianSignature: text("guardian_signature"),
  guardianSignedAt: timestamp("guardian_signed_at"),
  guardianSignatureIp: text("guardian_signature_ip"),
  guardianSignatureUserAgent: text("guardian_signature_user_agent"),
  requiresGuardian: boolean("requires_guardian").default(false).notNull(),
  
  status: contractStatusEnum("status").default("pending_signature").notNull(),
  
  // PDF storage - base64 encoded PDF generated on signing
  pdfData: text("pdf_data"),
  pdfGeneratedAt: timestamp("pdf_generated_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const publishingUpdates = pgTable("publishing_updates", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id).notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  
  indieQuillAuthorId: text("indie_quill_author_id"),
  
  status: publishingStatusEnum("status").default("not_started").notNull(),
  statusMessage: text("status_message"),
  estimatedCompletion: text("estimated_completion"),
  
  syncStatus: syncStatusEnum("sync_status").default("pending").notNull(),
  syncError: text("sync_error"),
  syncAttempts: integer("sync_attempts").default(0).notNull(),
  lastSyncAttempt: timestamp("last_sync_attempt"),
  
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cohortsRelations = relations(cohorts, ({ many }) => ({
  applications: many(applications),
}));

export const usersRelations = relations(users, ({ many }) => ({
  applications: many(applications),
  contracts: many(contracts),
  publishingUpdates: many(publishingUpdates),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [applications.reviewedBy],
    references: [users.id],
  }),
  cohort: one(cohorts, {
    fields: [applications.cohortId],
    references: [cohorts.id],
  }),
  contracts: many(contracts),
  publishingUpdates: many(publishingUpdates),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  application: one(applications, {
    fields: [contracts.applicationId],
    references: [applications.id],
  }),
  user: one(users, {
    fields: [contracts.userId],
    references: [users.id],
  }),
}));

export const publishingUpdatesRelations = relations(publishingUpdates, ({ one }) => ({
  application: one(applications, {
    fields: [publishingUpdates.applicationId],
    references: [applications.id],
  }),
  user: one(users, {
    fields: [publishingUpdates.userId],
    references: [users.id],
  }),
}));

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  allDay: boolean("all_day").default(false).notNull(),
  eventType: text("event_type").notNull().default("meeting"),
  location: text("location"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  googleCalendarEventId: text("google_calendar_event_id"),
  lastSyncedAt: timestamp("last_synced_at"),
  isFromGoogle: boolean("is_from_google").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fundraisingCampaigns = pgTable("fundraising_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  goalAmount: integer("goal_amount").notNull(),
  currentAmount: integer("current_amount").default(0).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => fundraisingCampaigns.id),
  donorName: text("donor_name").notNull(),
  donorEmail: text("donor_email"),
  amount: integer("amount").notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  notes: text("notes"),
  donatedAt: timestamp("donated_at").defaultNow().notNull(),
  recordedBy: varchar("recorded_by", { length: 36 }).references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  creator: one(users, {
    fields: [calendarEvents.createdBy],
    references: [users.id],
  }),
}));

export const fundraisingCampaignsRelations = relations(fundraisingCampaigns, ({ one, many }) => ({
  creator: one(users, {
    fields: [fundraisingCampaigns.createdBy],
    references: [users.id],
  }),
  donations: many(donations),
}));

export const donationsRelations = relations(donations, ({ one }) => ({
  campaign: one(fundraisingCampaigns, {
    fields: [donations.campaignId],
    references: [fundraisingCampaigns.id],
  }),
  recorder: one(users, {
    fields: [donations.recordedBy],
    references: [users.id],
  }),
}));

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  action: text("action").notNull(),
  targetTable: text("target_table").notNull(),
  targetId: text("target_id").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Cohort = typeof cohorts.$inferSelect;
export type InsertCohort = typeof cohorts.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;
export type PublishingUpdate = typeof publishingUpdates.$inferSelect;
export type InsertPublishingUpdate = typeof publishingUpdates.$inferInsert;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;
export type FundraisingCampaign = typeof fundraisingCampaigns.$inferSelect;
export type InsertFundraisingCampaign = typeof fundraisingCampaigns.$inferInsert;
export type Donation = typeof donations.$inferSelect;
export type InsertDonation = typeof donations.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
