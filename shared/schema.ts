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
  'migrated',
  'rescinded'
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
  'cover_design',
  'formatting',
  'agreement',
  'creation',
  'editing',
  'review',
  'modifications',
  'published',
  'marketing'
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

export const personaTypeEnum = pgEnum('persona_type', [
  'writer',
  'adult_student',
  'family_student'
]);

export const curriculumPathTypeEnum = pgEnum('curriculum_path_type', [
  'general',
  'literacy', 
  'family'
]);

export const curriculumAudienceTypeEnum = pgEnum('curriculum_audience_type', [
  'adult',
  'child',
  'shared'
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

export const cohortTypeEnum = pgEnum("cohort_type", ["writer", "grant"]);

export const cohorts = pgTable("cohorts", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  cohortType: cohortTypeEnum("cohort_type").default("writer").notNull(),
  capacity: integer("capacity").notNull().default(10),
  currentCount: integer("current_count").notNull().default(0),
  status: text("status").default("open"),
  grantId: integer("grant_id"),
  grantName: text("grant_name"),
  grantYear: integer("grant_year"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const familyUnits = pgTable("family_units", {
  id: serial("id").primaryKey(),
  name: text("family_name").notNull(),
  primaryContactId: integer("primary_contact_id"),
  cohortId: integer("cohort_id").references(() => cohorts.id),
  targetPactHours: integer("target_pact_hours").default(20),
  totalPactMinutes: integer("total_pact_minutes").default(0),
  anthologyTitle: text("anthology_title"),
  anthologyContent: text("anthology_content"),
  anthologyWordCount: integer("anthology_word_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("applicant"),
  secondaryRole: text("secondary_role"),
  indieQuillAuthorId: text("indie_quill_author_id"),
  vibeScribeId: text("vibe_scribe_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  internalId: text("internal_id"),
  cohortId: integer("cohort_id").references(() => cohorts.id),
  dateApproved: timestamp("date_approved"),
  dateMigrated: timestamp("date_migrated"),
  
  pseudonym: text("pseudonym"),
  dateOfBirth: text("date_of_birth"),
  isMinor: boolean("is_minor").default(false),
  
  guardianName: text("guardian_name"),
  guardianEmail: text("guardian_email"),
  guardianPhone: text("guardian_phone"),
  guardianRelationship: text("guardian_relationship"),
  guardianConsentMethod: text("guardian_consent_method"),
  guardianConsentVerified: boolean("guardian_consent_verified").default(false),
  dataRetentionUntil: timestamp("data_retention_until"),
  
  hasStoryToTell: boolean("has_story_to_tell").default(true),
  personalStruggles: text("personal_struggles"),
  expressionTypes: text("expression_types"),
  expressionOther: text("expression_other"),
  
  whyCollective: text("why_collective"),
  goals: text("goals"),
  hearAboutUs: text("hear_about_us"),
  
  status: applicationStatusEnum("status").default("pending").notNull(),
  reviewNotes: text("review_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  manuscriptWordCount: integer("manuscript_word_count").default(0),
  manuscriptTitle: text("manuscript_title"),
  publicIdentityEnabled: boolean("public_identity_enabled").default(false),
  personaType: personaTypeEnum("persona_type"),
});

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
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
  userId: varchar("user_id").references(() => users.id).notNull(),
  
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
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Grant & Donor Logistics - Foundation CRM
export const grantProspectStatusEnum = pgEnum('grant_prospect_status', [
  'active',
  'archived'
]);

export const foundations = pgTable("foundations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactRole: text("contact_role"),
  mission: text("mission"),
  website: text("website"),
  notes: text("notes"),
  category: text("category"),
  geographyScope: text("geography_scope"),
  acceptanceCriteria: text("acceptance_criteria"),
  fitRank: integer("fit_rank"),
  status: grantProspectStatusEnum("status").default("active").notNull(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Solicitation logs - prevents double-tapping foundations
export const solicitationLogs = pgTable("solicitation_logs", {
  id: serial("id").primaryKey(),
  foundationId: integer("foundation_id").references(() => foundations.id).notNull(),
  contactDate: timestamp("contact_date").notNull(),
  contactMethod: text("contact_method").notNull(), // email, phone, in-person, letter
  contactedBy: varchar("contacted_by", { length: 36 }).references(() => users.id).notNull(),
  purpose: text("purpose").notNull(),
  response: text("response"), // pending, interested, declined, funded
  responseDate: timestamp("response_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Foundation grants - linked to cohorts for impact tracking
export const foundationGrants = pgTable("foundation_grants", {
  id: serial("id").primaryKey(),
  foundationId: integer("foundation_id").references(() => foundations.id).notNull(),
  amount: integer("amount").notNull(), // In cents
  targetAuthorCount: integer("target_author_count").notNull(),
  assignedCohortId: integer("assigned_cohort_id").references(() => cohorts.id),
  grantDate: timestamp("grant_date").notNull(),
  grantPurpose: text("grant_purpose"),
  donorLockedAt: timestamp("donor_locked_at"), // When authors are locked to this grant for reporting
  recordedBy: varchar("recorded_by", { length: 36 }).references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const foundationsRelations = relations(foundations, ({ one, many }) => ({
  creator: one(users, {
    fields: [foundations.createdBy],
    references: [users.id],
  }),
  solicitationLogs: many(solicitationLogs),
  grants: many(foundationGrants),
  programs: many(grantPrograms),
}));

export const solicitationLogsRelations = relations(solicitationLogs, ({ one }) => ({
  foundation: one(foundations, {
    fields: [solicitationLogs.foundationId],
    references: [foundations.id],
  }),
  contacter: one(users, {
    fields: [solicitationLogs.contactedBy],
    references: [users.id],
  }),
}));

export const foundationGrantsRelations = relations(foundationGrants, ({ one }) => ({
  foundation: one(foundations, {
    fields: [foundationGrants.foundationId],
    references: [foundations.id],
  }),
  cohort: one(cohorts, {
    fields: [foundationGrants.assignedCohortId],
    references: [cohorts.id],
  }),
  recorder: one(users, {
    fields: [foundationGrants.recordedBy],
    references: [users.id],
  }),
}));

// Grant Programs - Individual programs within foundations (one-to-many)
export const grantProgramStatusEnum = pgEnum('grant_program_status', [
  'not_started',
  'preparing', 
  'submitted',
  'awarded',
  'declined',
  'ineligible'
]);

export const grantPrograms = pgTable("grant_programs", {
  id: serial("id").primaryKey(),
  foundationId: integer("foundation_id").references(() => foundations.id).notNull(),
  programName: text("program_name").notNull(),
  maxAmount: integer("max_amount").notNull(), // In cents
  openDate: timestamp("open_date"),
  deadline: timestamp("deadline"),
  fundedItems: text("funded_items"), // What they fund (software, computers, etc.)
  eligibilityNotes: text("eligibility_notes"), // 15-mile rule, NCES requirements, etc.
  twoYearRestriction: boolean("two_year_restriction").default(false).notNull(),
  lastAwardedYear: integer("last_awarded_year"), // For two-year rule tracking
  applicationStatus: grantProgramStatusEnum("application_status").default("not_started").notNull(),
  applicationUrl: text("application_url"),
  indieQuillAlignment: text("indie_quill_alignment"), // How we align with this program
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const grantProgramsRelations = relations(grantPrograms, ({ one, many }) => ({
  foundation: one(foundations, {
    fields: [grantPrograms.foundationId],
    references: [foundations.id],
  }),
  alerts: many(grantCalendarAlerts),
}));

// Organization Credentials - Pre-verified credentials for instant application
export const credentialTypeEnum = pgEnum('credential_type', [
  'tax_id',
  'nces_id', 
  'ipeds_id',
  'platform_registration',
  'ein',
  'duns',
  'sam_uei'
]);

export const organizationCredentials = pgTable("organization_credentials", {
  id: serial("id").primaryKey(),
  credentialType: credentialTypeEnum("credential_type").notNull(),
  credentialValue: text("credential_value").notNull(), // Encrypted/masked reference
  platformName: text("platform_name"), // "DGLF Portal", "Grants.gov"
  verifiedAt: timestamp("verified_at"),
  expiresAt: timestamp("expires_at"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const organizationCredentialsRelations = relations(organizationCredentials, ({ one }) => ({
  creator: one(users, {
    fields: [organizationCredentials.createdBy],
    references: [users.id],
  }),
}));

// Grant Calendar Alerts - Automated deadline tracking
export const alertTypeEnum = pgEnum('alert_type', [
  'opens_soon',
  'deadline_warning',
  'deadline_critical',
  'deadline_day'
]);

export const grantCalendarAlerts = pgTable("grant_calendar_alerts", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => grantPrograms.id).notNull(),
  alertType: alertTypeEnum("alert_type").notNull(),
  daysBefore: integer("days_before").notNull(), // 7, 3, 1, 0
  alertDate: timestamp("alert_date").notNull(),
  googleEventId: text("google_event_id"), // For sync
  dismissed: boolean("dismissed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const grantCalendarAlertsRelations = relations(grantCalendarAlerts, ({ one }) => ({
  program: one(grantPrograms, {
    fields: [grantCalendarAlerts.programId],
    references: [grantPrograms.id],
  }),
}));

// Flywheel Metrics - Operating costs tracking for grant reporting
export const operatingCosts = pgTable("operating_costs", {
  id: serial("id").primaryKey(),
  quarter: text("quarter").notNull(), // Format: "2026-Q1"
  year: integer("year").notNull(),
  quarterNum: integer("quarter_num").notNull(), // 1-4
  totalCost: integer("total_cost").notNull().default(0), // In cents
  description: text("description"),
  recordedBy: varchar("recorded_by", { length: 36 }).references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const operatingCostsRelations = relations(operatingCosts, ({ one }) => ({
  recorder: one(users, {
    fields: [operatingCosts.recordedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const ledgerTypeEnum = pgEnum('ledger_type', [
  'income',
  'expense'
]);

export const pilotLedger = pgTable("pilot_ledger", {
  id: serial("id").primaryKey(),
  transactionDate: timestamp("transaction_date").notNull(),
  type: ledgerTypeEnum("type").notNull(),
  amount: integer("amount").notNull(), // In cents
  description: text("description").notNull(),
  linkedAuthorId: integer("linked_author_id").references(() => applications.id),
  category: text("category"), // e.g., "sponsorship", "isbn", "copyright"
  recordedBy: integer("recorded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pilotLedgerRelations = relations(pilotLedger, ({ one }) => ({
  author: one(applications, {
    fields: [pilotLedger.linkedAuthorId],
    references: [applications.id],
  }),
  recorder: one(users, {
    fields: [pilotLedger.recordedBy],
    references: [users.id],
  }),
}));

export const emailTypeEnum = pgEnum('email_type', [
  'application_received',
  'application_accepted',
  'application_rejected',
  'active_author'
]);

export const emailStatusEnum = pgEnum('email_status', [
  'sent',
  'failed'
]);

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  emailType: emailTypeEnum("email_type").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  userId: integer("user_id"),
  applicationId: integer("application_id").references(() => applications.id),
  status: emailStatusEnum("status").notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id],
  }),
  application: one(applications, {
    fields: [emailLogs.applicationId],
    references: [applications.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Cohort = typeof cohorts.$inferSelect;
export type InsertCohort = typeof cohorts.$inferInsert;
export type FamilyUnit = typeof familyUnits.$inferSelect;
export type InsertFamilyUnit = typeof familyUnits.$inferInsert;
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
export type OperatingCost = typeof operatingCosts.$inferSelect;
export type InsertOperatingCost = typeof operatingCosts.$inferInsert;
export type Foundation = typeof foundations.$inferSelect;
export type InsertFoundation = typeof foundations.$inferInsert;
export type SolicitationLog = typeof solicitationLogs.$inferSelect;
export type InsertSolicitationLog = typeof solicitationLogs.$inferInsert;
export type FoundationGrant = typeof foundationGrants.$inferSelect;
export type InsertFoundationGrant = typeof foundationGrants.$inferInsert;
export type PilotLedgerEntry = typeof pilotLedger.$inferSelect;
export type InsertPilotLedgerEntry = typeof pilotLedger.$inferInsert;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;
export type GrantProgram = typeof grantPrograms.$inferSelect;
export type InsertGrantProgram = typeof grantPrograms.$inferInsert;
export type OrganizationCredential = typeof organizationCredentials.$inferSelect;
export type InsertOrganizationCredential = typeof organizationCredentials.$inferInsert;
export type GrantCalendarAlert = typeof grantCalendarAlerts.$inferSelect;
export type InsertGrantCalendarAlert = typeof grantCalendarAlerts.$inferInsert;

// ============================================
// FRICTIONLESS LITERACY - VIRTUAL CLASSROOM
// ============================================

// Accessibility preference enum for students
export const accessibilityModeEnum = pgEnum('accessibility_mode', [
  'standard',
  'high_contrast',
  'large_text',
  'screen_reader'
]);

// EFL (Educational Functioning Level) enum for TABE tracking
export const eflLevelEnum = pgEnum('efl_level', [
  'beginning_literacy',      // 0-1.9 grade equivalent
  'beginning_basic',         // 2.0-3.9 grade equivalent
  'low_intermediate',        // 4.0-5.9 grade equivalent
  'high_intermediate',       // 6.0-8.9 grade equivalent
  'low_adult_secondary',     // 9.0-10.9 grade equivalent
  'high_adult_secondary'     // 11.0-12.9 grade equivalent
]);

// Meeting provider enum
export const meetingProviderEnum = pgEnum('meeting_provider', [
  'google_meet',
  'zoom',
  'jitsi',
  'daily'
]);

// Family member role enum for Family Literacy program
export const familyRoleEnum = pgEnum('family_role', [
  'parent',
  'child',
  'guardian',
  'grandparent',
  'sibling'
]);


// PACT Sessions - Parent and Child Together time tracking for DGLF
export const pactSessions = pgTable("pact_sessions", {
  id: serial("id").primaryKey(),
  familyUnitId: integer("family_unit_id").references(() => familyUnits.id).notNull(),
  sessionTitle: text("session_title").notNull(),
  sessionType: text("session_type").default("writing").notNull(), // writing, reading, discussion
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes").default(0).notNull(),
  participantIds: text("participant_ids"), // JSON array of user IDs who participated
  activityDescription: text("activity_description"),
  wordsWritten: integer("words_written").default(0),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Student Profiles - extends users for student-specific data
export const studentProfiles = pgTable("student_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  cohortId: integer("cohort_id").references(() => cohorts.id),
  familyUnitId: integer("family_unit_id").references(() => familyUnits.id),
  familyRole: familyRoleEnum("family_role"),
  accessibilityMode: accessibilityModeEnum("accessibility_mode").default("standard").notNull(),
  preferredLanguage: text("preferred_language").default("en"),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Mentor Profiles - extends users for mentor-specific data
export const mentorProfiles = pgTable("mentor_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  specialties: text("specialties"), // JSON array of specialties
  bio: text("bio"),
  maxStudents: integer("max_students").default(10).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Mentor-Student assignments (many-to-many)
export const mentorStudentAssignments = pgTable("mentor_student_assignments", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").references(() => users.id).notNull(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Curriculum Modules - 120-hour "Architecture of Authorship" course
export const curriculumModules = pgTable("curriculum_modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
  durationHours: integer("duration_hours").notNull().default(1),
  contentType: text("content_type").default("lesson"), // lesson, video, exercise, assessment
  contentUrl: text("content_url"), // Link to video or content
  pathType: curriculumPathTypeEnum("path_type").default("general").notNull(),
  audienceType: curriculumAudienceTypeEnum("audience_type").default("adult").notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Student Curriculum Progress - tracks completion per module
export const studentCurriculumProgress = pgTable("student_curriculum_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  moduleId: integer("module_id").references(() => curriculumModules.id).notNull(),
  percentComplete: integer("percent_complete").default(0).notNull(),
  hoursSpent: integer("hours_spent").default(0).notNull(), // In minutes for precision
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// TABE Assessments - for EFL tracking and grant reporting
export const tabeAssessments = pgTable("tabe_assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  testType: text("test_type").notNull(), // reading, math, language
  scaleScore: integer("scale_score").notNull(),
  gradeEquivalent: text("grade_equivalent").notNull(), // e.g., "4.5"
  eflLevel: eflLevelEnum("efl_level").notNull(),
  isBaseline: boolean("is_baseline").default(false).notNull(),
  testDate: timestamp("test_date").notNull(),
  administeredBy: integer("administered_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Meetings - video sessions between mentors and students
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  mentorId: integer("mentor_id").references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  provider: meetingProviderEnum("provider").default("google_meet").notNull(),
  joinUrl: text("join_url"),
  meetingType: text("meeting_type").default("group"), // group, one-on-one, coaching
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurringPattern: text("recurring_pattern"), // weekly, biweekly
  googleEventId: text("google_event_id"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Meeting Attendees - who is invited to each meeting
export const meetingAttendees = pgTable("meeting_attendees", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  attended: boolean("attended"),
  attendedMinutes: integer("attended_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Activity Logs - tracks hours active and word count for grant metrics
export const studentActivityLogs = pgTable("student_activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionDate: timestamp("session_date").notNull(),
  minutesActive: integer("minutes_active").notNull().default(0),
  wordCountStart: integer("word_count_start").default(0),
  wordCountEnd: integer("word_count_end").default(0),
  modulesAccessed: text("modules_accessed"), // JSON array of module IDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Drafting Documents - "Legacy Work" manuscripts
export const draftingDocuments = pgTable("drafting_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  content: text("content"), // Markdown content
  wordCount: integer("word_count").default(0).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  lastEditedAt: timestamp("last_edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Student Work Vault - VibeScribe snippets and manuscript drafts from Game Engine
export const studentWork = pgTable("student_work", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  questId: integer("quest_id"), // Links to curriculum chapter/quest
  contentType: text("content_type").notNull(), // 'vibescribe_snippet' | 'manuscript_draft'
  contentBody: text("content_body").notNull(),
  wordCount: integer("word_count").default(0).notNull(),
  sourceDevice: text("source_device"), // 'ios' | 'android' | 'web'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type StudentWork = typeof studentWork.$inferSelect;
export type InsertStudentWork = typeof studentWork.$inferInsert;

// VibeScribe 2.0 - Live Quiz System
export const vibeQuizzes = pgTable("vibe_quizzes", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  options: text("options").notNull(), // JSON array of 4 options
  timeLimit: integer("time_limit").default(60).notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  startedAt: timestamp("started_at"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vibeQuizAnswers = pgTable("vibe_quiz_answers", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => vibeQuizzes.id).notNull(),
  userId: integer("user_id").notNull(),
  answer: text("answer").notNull(),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
});

export type VibeQuiz = typeof vibeQuizzes.$inferSelect;
export type InsertVibeQuiz = typeof vibeQuizzes.$inferInsert;
export type VibeQuizAnswer = typeof vibeQuizAnswers.$inferSelect;
export type InsertVibeQuizAnswer = typeof vibeQuizAnswers.$inferInsert;

// Relations for Virtual Classroom
// Family Units Relations
export const familyUnitsRelations = relations(familyUnits, ({ one, many }) => ({
  cohort: one(cohorts, {
    fields: [familyUnits.cohortId],
    references: [cohorts.id],
  }),
  members: many(users),
}));

// PACT Sessions Relations
export const pactSessionsRelations = relations(pactSessions, ({ one }) => ({
  familyUnit: one(familyUnits, {
    fields: [pactSessions.familyUnitId],
    references: [familyUnits.id],
  }),
  creator: one(users, {
    fields: [pactSessions.createdBy],
    references: [users.id],
  }),
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id],
  }),
  cohort: one(cohorts, {
    fields: [studentProfiles.cohortId],
    references: [cohorts.id],
  }),
  familyUnit: one(familyUnits, {
    fields: [studentProfiles.familyUnitId],
    references: [familyUnits.id],
  }),
}));

export const mentorProfilesRelations = relations(mentorProfiles, ({ one }) => ({
  user: one(users, {
    fields: [mentorProfiles.userId],
    references: [users.id],
  }),
}));

export const mentorStudentAssignmentsRelations = relations(mentorStudentAssignments, ({ one }) => ({
  mentor: one(users, {
    fields: [mentorStudentAssignments.mentorId],
    references: [users.id],
  }),
  student: one(users, {
    fields: [mentorStudentAssignments.studentId],
    references: [users.id],
  }),
}));

export const curriculumModulesRelations = relations(curriculumModules, ({ many }) => ({
  progress: many(studentCurriculumProgress),
}));

export const studentCurriculumProgressRelations = relations(studentCurriculumProgress, ({ one }) => ({
  user: one(users, {
    fields: [studentCurriculumProgress.userId],
    references: [users.id],
  }),
  module: one(curriculumModules, {
    fields: [studentCurriculumProgress.moduleId],
    references: [curriculumModules.id],
  }),
}));

export const tabeAssessmentsRelations = relations(tabeAssessments, ({ one }) => ({
  user: one(users, {
    fields: [tabeAssessments.userId],
    references: [users.id],
  }),
  administrator: one(users, {
    fields: [tabeAssessments.administeredBy],
    references: [users.id],
  }),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  mentor: one(users, {
    fields: [meetings.mentorId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [meetings.createdBy],
    references: [users.id],
  }),
  attendees: many(meetingAttendees),
}));

export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingAttendees.meetingId],
    references: [meetings.id],
  }),
  user: one(users, {
    fields: [meetingAttendees.userId],
    references: [users.id],
  }),
}));

export const studentActivityLogsRelations = relations(studentActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [studentActivityLogs.userId],
    references: [users.id],
  }),
}));

export const draftingDocumentsRelations = relations(draftingDocuments, ({ one }) => ({
  user: one(users, {
    fields: [draftingDocuments.userId],
    references: [users.id],
  }),
}));

// Wiki entries for Board of Directors notes and tips
export const wikiEntries = pgTable("wiki_entries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"),
  authorId: varchar("author_id", { length: 36 }).references(() => users.id),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wikiEntriesRelations = relations(wikiEntries, ({ one }) => ({
  author: one(users, {
    fields: [wikiEntries.authorId],
    references: [users.id],
  }),
}));

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

// Type exports for Virtual Classroom
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type InsertStudentProfile = typeof studentProfiles.$inferInsert;
export type MentorProfile = typeof mentorProfiles.$inferSelect;
export type InsertMentorProfile = typeof mentorProfiles.$inferInsert;
export type MentorStudentAssignment = typeof mentorStudentAssignments.$inferSelect;
export type InsertMentorStudentAssignment = typeof mentorStudentAssignments.$inferInsert;
export type CurriculumModule = typeof curriculumModules.$inferSelect;
export type InsertCurriculumModule = typeof curriculumModules.$inferInsert;
export type StudentCurriculumProgress = typeof studentCurriculumProgress.$inferSelect;
export type InsertStudentCurriculumProgress = typeof studentCurriculumProgress.$inferInsert;
export type TabeAssessment = typeof tabeAssessments.$inferSelect;
export type InsertTabeAssessment = typeof tabeAssessments.$inferInsert;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;
export type MeetingAttendee = typeof meetingAttendees.$inferSelect;
export type InsertMeetingAttendee = typeof meetingAttendees.$inferInsert;
export type StudentActivityLog = typeof studentActivityLogs.$inferSelect;
export type InsertStudentActivityLog = typeof studentActivityLogs.$inferInsert;
export type DraftingDocument = typeof draftingDocuments.$inferSelect;
export type InsertDraftingDocument = typeof draftingDocuments.$inferInsert;
export const boardMembers = pgTable("board_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  bio: text("bio").notNull(),
  photoFilename: text("photo_filename"),
  email: text("email"),
  linkedin: text("linkedin"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type BoardMember = typeof boardMembers.$inferSelect;
export type InsertBoardMember = typeof boardMembers.$inferInsert;

export const wikiAttachments = pgTable("wiki_attachments", {
  id: serial("id").primaryKey(),
  wikiEntryId: integer("wiki_entry_id").references(() => wikiEntries.id, { onDelete: "cascade" }).notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export type WikiEntry = typeof wikiEntries.$inferSelect;
export type InsertWikiEntry = typeof wikiEntries.$inferInsert;
export type WikiAttachment = typeof wikiAttachments.$inferSelect;
export type InsertWikiAttachment = typeof wikiAttachments.$inferInsert;

export * from "./models/chat";
