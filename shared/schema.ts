import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("applicant"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  penName: text("pen_name"),
  dateOfBirth: text("date_of_birth").notNull(),
  isMinor: boolean("is_minor").notNull().default(false),
  
  guardianName: text("guardian_name"),
  guardianEmail: text("guardian_email"),
  guardianPhone: text("guardian_phone"),
  guardianRelationship: text("guardian_relationship"),
  
  bookTitle: text("book_title").notNull(),
  genre: text("genre").notNull(),
  wordCount: integer("word_count"),
  bookSummary: text("book_summary").notNull(),
  manuscriptStatus: text("manuscript_status").notNull(),
  
  previouslyPublished: boolean("previously_published").default(false),
  publishingDetails: text("publishing_details"),
  
  whyCollective: text("why_collective").notNull(),
  goals: text("goals"),
  hearAboutUs: text("hear_about_us"),
  
  status: applicationStatusEnum("status").default("pending").notNull(),
  reviewNotes: text("review_notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  contractType: text("contract_type").notNull(),
  contractContent: text("contract_content").notNull(),
  
  authorSignature: text("author_signature"),
  authorSignedAt: timestamp("author_signed_at"),
  
  guardianSignature: text("guardian_signature"),
  guardianSignedAt: timestamp("guardian_signed_at"),
  requiresGuardian: boolean("requires_guardian").default(false).notNull(),
  
  status: contractStatusEnum("status").default("pending_signature").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const publishingUpdates = pgTable("publishing_updates", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  indieQuillAuthorId: text("indie_quill_author_id"),
  
  status: publishingStatusEnum("status").default("not_started").notNull(),
  statusMessage: text("status_message"),
  estimatedCompletion: text("estimated_completion"),
  
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;
export type PublishingUpdate = typeof publishingUpdates.$inferSelect;
export type InsertPublishingUpdate = typeof publishingUpdates.$inferInsert;
