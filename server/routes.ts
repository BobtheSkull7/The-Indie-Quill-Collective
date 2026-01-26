import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { users, applications, contracts, publishingUpdates, calendarEvents, fundraisingCampaigns, donations, auditLogs, cohorts, familyUnits, operatingCosts, foundations, solicitationLogs, foundationGrants, pilotLedger, emailLogs, grantPrograms, organizationCredentials, grantCalendarAlerts } from "@shared/schema";
import { eq, desc, gte, sql, inArray, lt, and } from "drizzle-orm";
import { hash, compare } from "./auth";
import { migrateAuthorToIndieQuill, retryFailedMigrations, sendApplicationToLLC, sendStatusUpdateToLLC, sendContractSignatureToLLC, sendUserRoleUpdateToLLC } from "./indie-quill-integration";
import { sendApplicationReceivedEmail, sendApplicationAcceptedEmail, sendApplicationRejectedEmail, sendTestEmailSamples } from "./email";
import { logAuditEvent, logMinorDataAccess, getClientIp } from "./utils/auditLogger";
import { syncCalendarEvents, getGoogleCalendarConnectionStatus, deleteGoogleCalendarEvent } from "./google-calendar-sync";
import { renderToBuffer } from "@react-pdf/renderer";
import { ContractPDF } from "./pdf-templates/ContractTemplate";
import { processAcceptance } from "./services/cohort-service";
import { createSyncJob, processSyncJob, registerNpoAuthorWithLLC } from "./services/npo-sync-service";
import { assignAuthorId } from "./utils/authorId";

// Helper function to generate and store contract PDF
async function generateAndStorePDF(contractId: number): Promise<Buffer | null> {
  try {
    const [contract] = await db.select().from(contracts)
      .where(eq(contracts.id, contractId));
    
    if (!contract) return null;

    const [application] = await db.select().from(applications)
      .where(eq(applications.id, contract.applicationId));
    
    if (!application) return null;

    const [user] = await db.select().from(users)
      .where(eq(users.id, contract.userId));
    
    if (!user) return null;

    const pdfBuffer = await renderToBuffer(
      ContractPDF({
        contract: {
          id: contract.id,
          contractType: contract.contractType,
          contractContent: contract.contractContent,
          authorSignature: contract.authorSignature,
          authorSignedAt: contract.authorSignedAt?.toISOString() || null,
          guardianSignature: contract.guardianSignature,
          guardianSignedAt: contract.guardianSignedAt?.toISOString() || null,
          requiresGuardian: contract.requiresGuardian,
          status: contract.status,
          createdAt: contract.createdAt.toISOString(),
        },
        application: {
          pseudonym: application.pseudonym,
          dateOfBirth: application.dateOfBirth,
          isMinor: application.isMinor,
          guardianName: application.guardianName,
          guardianEmail: application.guardianEmail,
          guardianRelationship: application.guardianRelationship,
        },
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      })
    );

    // Store PDF as Base64 in database
    const pdfBase64 = pdfBuffer.toString('base64');
    await db.update(contracts)
      .set({ 
        pdfData: pdfBase64, 
        pdfGeneratedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(contracts.id, contractId));

    console.log(`[PDF Storage] Contract ${contractId} PDF generated and stored (${pdfBuffer.length} bytes)`);
    return pdfBuffer;
  } catch (error) {
    console.error(`[PDF Storage] Failed to generate/store PDF for contract ${contractId}:`, error);
    return null;
  }
}

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { message: "Too many attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

const contractSigningRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 signing attempts per window
  message: { message: "Too many signing attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

declare module "express-session" {
  interface SessionData {
    userId?: number;
    userRole?: string;
  }
}

export async function registerRoutes(app: Express) {
  app.post("/api/auth/register", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      const sanitizedEmail = email?.trim()?.toLowerCase() || "";
      const sanitizedFirstName = firstName?.trim() || "";
      const sanitizedLastName = lastName?.trim() || "";
      
      const existingUser = await db.select().from(users).where(sql`lower(${users.email}) = lower(${sanitizedEmail})`);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hash(password);
      const [newUser] = await db.insert(users).values({
        email: sanitizedEmail,
        password: hashedPassword,
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
        role: "applicant",
      }).returning();

      req.session.userId = newUser.id;
      req.session.userRole = newUser.role;

      return res.json({ 
        user: { 
          id: newUser.id, 
          email: newUser.email, 
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role 
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      // Use raw SQL to bypass Drizzle ORM column issue
      const result = await db.execute(sql`
        SELECT id, email, password, first_name as "firstName", last_name as "lastName", role
        FROM users 
        WHERE lower(email) = lower(${email})
      `);
      const user = result.rows[0] as any;
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      req.session.userRole = user.role;

      return res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role 
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      return res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Use raw SQL to bypass Drizzle ORM column issue
    const result = await db.execute(sql`
      SELECT id, email, first_name as "firstName", last_name as "lastName", role
      FROM users WHERE id = ${req.session.userId}
    `);
    const user = result.rows[0] as any;
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    return res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role 
      } 
    });
  });

  // GDPR Data Portability - Export all user data as JSON
  app.get("/api/auth/export-data", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.session.userId;

    try {
      // Fetch user profile (exclude password)
      const [user] = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt,
      }).from(users).where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Fetch all applications
      const userApplications = await db.select().from(applications)
        .where(eq(applications.userId, userId))
        .orderBy(desc(applications.createdAt));

      // Get application IDs for related data
      const applicationIds = userApplications.map(a => a.id);

      // Fetch all contracts for user's applications
      let userContracts: any[] = [];
      if (applicationIds.length > 0) {
        userContracts = await db.select().from(contracts)
          .where(inArray(contracts.applicationId, applicationIds))
          .orderBy(desc(contracts.createdAt));
      }

      // Fetch publishing updates for user's applications AND authored by user
      let userPublishingUpdates: any[] = [];
      if (applicationIds.length > 0) {
        userPublishingUpdates = await db.select().from(publishingUpdates)
          .where(inArray(publishingUpdates.applicationId, applicationIds))
          .orderBy(desc(publishingUpdates.createdAt));
      }
      // Also fetch any publishing updates authored by this user (for completeness)
      const authoredUpdates = await db.select().from(publishingUpdates)
        .where(eq(publishingUpdates.userId, userId))
        .orderBy(desc(publishingUpdates.createdAt));
      // Merge and deduplicate
      const allUpdateIds = new Set(userPublishingUpdates.map(u => u.id));
      for (const update of authoredUpdates) {
        if (!allUpdateIds.has(update.id)) {
          userPublishingUpdates.push(update);
        }
      }

      // Fetch audit logs for this user
      const userAuditLogs = await db.select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
      }).from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt));

      // Package all data
      const exportData = {
        exportedAt: new Date().toISOString(),
        dataSubject: "The Indie Quill Collective - GDPR Data Export",
        profile: user,
        applications: userApplications,
        contracts: userContracts.map(contract => ({
          id: contract.id,
          applicationId: contract.applicationId,
          contractType: contract.contractType,
          status: contract.status,
          authorSignedAt: contract.authorSignedAt,
          authorSignatureIp: contract.authorSignatureIp,
          guardianSignedAt: contract.guardianSignedAt,
          guardianSignatureIp: contract.guardianSignatureIp,
          requiresGuardian: contract.requiresGuardian,
          createdAt: contract.createdAt,
          updatedAt: contract.updatedAt,
        })),
        publishingUpdates: userPublishingUpdates,
        auditLogs: userAuditLogs,
      };

      // Set headers for JSON download
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="gdpr-export-${userId}-${Date.now()}.json"`);
      
      return res.json(exportData);
    } catch (error) {
      console.error("Data export error:", error);
      return res.status(500).json({ message: "Failed to export data" });
    }
  });

  // GDPR Right to Erasure - Delete user account and all associated data
  app.delete("/api/auth/account", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.session.userId;

    try {
      // STEP 1: Nullify external FK references that allow NULL
      await db.update(applications)
        .set({ reviewedBy: null })
        .where(eq(applications.reviewedBy, userId));
      
      await db.update(calendarEvents)
        .set({ createdBy: null })
        .where(eq(calendarEvents.createdBy, userId));
      
      // STEP 2: Delete records where user is required (NOT NULL FK constraints)
      // First get campaigns created by this user
      const userCampaigns = await db.select({ id: fundraisingCampaigns.id })
        .from(fundraisingCampaigns)
        .where(eq(fundraisingCampaigns.createdBy, userId));
      
      // Delete donations linked to user's campaigns
      for (const campaign of userCampaigns) {
        await db.delete(donations).where(eq(donations.campaignId, campaign.id));
      }
      
      // Delete donations recorded by the user (recordedBy is NOT NULL)
      await db.delete(donations).where(eq(donations.recordedBy, userId));
      
      // Delete campaigns created by the user (createdBy is NOT NULL)
      await db.delete(fundraisingCampaigns).where(eq(fundraisingCampaigns.createdBy, userId));

      // STEP 3: Get all applications for this user to cascade delete related data
      const userApplications = await db.select({ id: applications.id })
        .from(applications)
        .where(eq(applications.userId, userId));
      
      const applicationIds = userApplications.map(a => a.id);

      // STEP 4: Delete user's own data in order of dependencies (child tables first)
      if (applicationIds.length > 0) {
        // Delete publishing updates by applicationId (covers staff-created records too)
        await db.delete(publishingUpdates).where(inArray(publishingUpdates.applicationId, applicationIds));
        
        // Delete contracts by applicationId (covers all contracts for user's applications)
        await db.delete(contracts).where(inArray(contracts.applicationId, applicationIds));
        
        // Delete applications
        await db.delete(applications).where(eq(applications.userId, userId));
      }

      // Also delete any publishing updates where this user is the author (covers edge cases)
      await db.delete(publishingUpdates).where(eq(publishingUpdates.userId, userId));

      // Delete audit logs for this user (GDPR Right to Erasure)
      await db.delete(auditLogs).where(eq(auditLogs.userId, userId));

      // STEP 5: Finally, delete the user
      await db.delete(users).where(eq(users.id, userId));

      // Destroy the session
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
      });

      return res.json({ message: "Account and all associated data deleted successfully" });
    } catch (error) {
      console.error("Account deletion error:", error);
      return res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.post("/api/applications", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { dateOfBirth, personalStruggles, expressionTypes, whyCollective } = req.body;
      
      if (!dateOfBirth || !personalStruggles || !expressionTypes || !whyCollective) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      if (!personalStruggles.trim()) {
        return res.status(400).json({ message: "Please tell us about your story and struggles" });
      }
      
      if (!expressionTypes.trim()) {
        return res.status(400).json({ message: "Please select at least one expression type" });
      }
      
      const applicationData = {
        ...req.body,
        userId: req.session.userId,
        status: "pending",
        expressionTypes: Array.isArray(req.body.expressionTypes) 
          ? req.body.expressionTypes.join(",") 
          : req.body.expressionTypes,
        pseudonym: req.body.pseudonym?.trim() || null,
        guardianName: req.body.guardianName?.trim() || null,
        guardianEmail: req.body.guardianEmail?.trim()?.toLowerCase() || null,
        guardianPhone: req.body.guardianPhone?.trim() || null,
      };

      const [newApplication] = await db.insert(applications).values(applicationData).returning();
      
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
      if (user) {
        // Send confirmation email
        try {
          await sendApplicationReceivedEmail(user.email, user.firstName, user.id, newApplication.id);
        } catch (emailError) {
          console.error("Failed to send confirmation email:", emailError);
        }
        
        // Immediately sync application to The Indie Quill LLC
        try {
          const syncResult = await sendApplicationToLLC(
            newApplication.id,
            user.id,
            applicationData,
            { email: user.email, firstName: user.firstName, lastName: user.lastName }
          );
          if (syncResult.success) {
            console.log(`Application ${newApplication.id} synced to LLC: ${syncResult.llcApplicationId}`);
          } else {
            console.error(`Failed to sync application to LLC: ${syncResult.error}`);
          }
        } catch (syncError) {
          console.error("Failed to sync application to LLC:", syncError);
        }
      }
      
      return res.json(newApplication);
    } catch (error) {
      console.error("Application submission error:", error);
      return res.status(500).json({ message: "Failed to submit application" });
    }
  });

  app.get("/api/applications", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      if (req.session.userRole === "admin") {
        const allApplications = await db.select().from(applications).orderBy(desc(applications.createdAt));
        
        const appsWithUserDetails = await Promise.all(
          allApplications.map(async (app) => {
            const [user] = await db.select({
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName,
            }).from(users).where(eq(users.id, app.userId));
            
            return {
              ...app,
              authorName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
              authorEmail: user?.email,
            };
          })
        );
        
        const minorApps = allApplications.filter(app => app.isMinor);
        if (minorApps.length > 0) {
          await logMinorDataAccess(
            req.session.userId,
            "view",
            "applications",
            "bulk",
            getClientIp(req),
            { 
              viewedByRole: "admin",
              minorApplicationIds: minorApps.map(app => app.id),
              totalMinorsAccessed: minorApps.length
            }
          );
        }
        
        return res.json(appsWithUserDetails);
      } else {
        const userApplications = await db.select().from(applications)
          .where(eq(applications.userId, req.session.userId))
          .orderBy(desc(applications.createdAt));
        
        const appsWithSyncStatus = await Promise.all(
          userApplications.map(async (app) => {
            const [publishingUpdate] = await db.select({ syncStatus: publishingUpdates.syncStatus })
              .from(publishingUpdates)
              .where(eq(publishingUpdates.applicationId, app.id));
            return {
              ...app,
              syncStatus: publishingUpdate?.syncStatus || null,
            };
          })
        );
        
        return res.json(appsWithSyncStatus);
      }
    } catch (error) {
      console.error("Fetch applications error:", error);
      return res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get("/api/applications/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [application] = await db.select().from(applications)
        .where(eq(applications.id, parseInt(req.params.id)));

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (req.session.userRole !== "admin" && application.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (application.isMinor) {
        await logMinorDataAccess(
          req.session.userId,
          "view",
          "applications",
          application.id,
          getClientIp(req),
          { viewedByRole: req.session.userRole }
        );
      }

      return res.json(application);
    } catch (error) {
      console.error("Fetch application error:", error);
      return res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  // Author Kill Switch - Rescind Application (Soft-Delete with PII Wipe)
  app.post("/api/applications/:id/rescind", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const applicationId = parseInt(req.params.id);
      const [application] = await db.select().from(applications)
        .where(eq(applications.id, applicationId));

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Only the author can rescind their own application
      if (application.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to rescind this application" });
      }

      // Can only rescind pending or under_review applications
      if (application.status !== "pending" && application.status !== "under_review") {
        return res.status(400).json({ 
          message: "Cannot rescind an application that has already been accepted or processed" 
        });
      }

      // Soft-delete: Set status to rescinded and wipe PII fields
      // Keep: pen_name, created_at, id for audit trail
      const [updated] = await db.update(applications)
        .set({
          status: "rescinded",
          // Wipe guardian PII
          guardianName: null,
          guardianEmail: null,
          guardianPhone: null,
          guardianRelationship: null,
          // Clear sensitive data
          dateOfBirth: "RESCINDED",
          personalStruggles: "RESCINDED",
          whyCollective: "RESCINDED",
          goals: null,
          hearAboutUs: null,
          expressionOther: null,
          updatedAt: new Date(),
        })
        .where(eq(applications.id, applicationId))
        .returning();

      // Log the rescind action for audit trail
      await db.insert(auditLogs).values({
        userId: req.session.userId,
        action: "rescind",
        resourceType: "applications",
        resourceId: applicationId,
        ipAddress: getClientIp(req),
        metadata: { 
          reason: "author_initiated",
          pseudonymPreserved: application.pseudonym,
        },
      });

      return res.json({ message: "Application rescinded successfully", application: updated });
    } catch (error) {
      console.error("Rescind application error:", error);
      return res.status(500).json({ message: "Failed to rescind application" });
    }
  });

  app.patch("/api/applications/:id/status", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const { status, reviewNotes } = req.body;
      const applicationId = parseInt(req.params.id);
      
      const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      const [applicantUser] = await db.select().from(users).where(eq(users.id, application.userId));
      if (!applicantUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (status === "accepted") {
        const acceptanceResult = await processAcceptance(
          applicationId,
          application.userId,
          applicantUser.lastName,
          applicantUser.firstName,
          application.isMinor
        );

        const [updated] = await db.update(applications)
          .set({ 
            status, 
            reviewNotes,
            reviewedBy: req.session.userId,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(applications.id, applicationId))
          .returning();

        await db.insert(contracts).values({
          applicationId: updated.id,
          userId: updated.userId,
          contractType: "publishing_agreement",
          contractContent: generateContract(updated),
          requiresGuardian: updated.isMinor,
          status: "pending_signature",
        });

        // NOTE: Sync to LLC is deferred until contract is signed (see contract signing endpoint)
        // This ensures the Manual Ledger and Forensic Audit Trail are accurate before touching the Bookstore

        try {
          const identityMode = updated.publicIdentityEnabled ? 'public' : 'pseudonym';
          await sendApplicationAcceptedEmail(applicantUser.email, applicantUser.firstName, identityMode, applicantUser.id, updated.id);
          if (updated.isMinor && updated.guardianEmail) {
            await sendApplicationAcceptedEmail(updated.guardianEmail, applicantUser.firstName, identityMode, applicantUser.id, updated.id);
          }
        } catch (emailError) {
          console.error("Failed to send acceptance email:", emailError);
        }

        console.log(`Application ${applicationId} accepted: Internal ID=${acceptanceResult.internalId}, Cohort=${acceptanceResult.cohortLabel}`);

        if (updated.isMinor) {
          await logMinorDataAccess(
            req.session.userId,
            "status_change",
            "applications",
            updated.id,
            getClientIp(req),
            { 
              newStatus: status, 
              reviewNotes: reviewNotes || null,
              internalId: acceptanceResult.internalId,
              cohortId: acceptanceResult.cohortId,
            }
          );
        }

        return res.json({ ...updated, internalId: acceptanceResult.internalId, cohortLabel: acceptanceResult.cohortLabel });
      } else if (status === "rejected") {
        const [updated] = await db.update(applications)
          .set({ 
            status, 
            reviewNotes,
            reviewedBy: req.session.userId,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(applications.id, applicationId))
          .returning();

        try {
          await sendApplicationRejectedEmail(applicantUser.email, applicantUser.firstName, applicantUser.id, updated.id);
          if (updated.isMinor && updated.guardianEmail) {
            await sendApplicationRejectedEmail(updated.guardianEmail, applicantUser.firstName, applicantUser.id, updated.id);
          }
        } catch (emailError) {
          console.error("Failed to send rejection email:", emailError);
        }

        if (updated.isMinor) {
          await logMinorDataAccess(
            req.session.userId,
            "status_change",
            "applications",
            updated.id,
            getClientIp(req),
            { newStatus: status, reviewNotes: reviewNotes || null }
          );
        }

        return res.json(updated);
      } else {
        const [updated] = await db.update(applications)
          .set({ 
            status, 
            reviewNotes,
            reviewedBy: req.session.userId,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(applications.id, applicationId))
          .returning();

        if (updated.isMinor) {
          await logMinorDataAccess(
            req.session.userId,
            "status_change",
            "applications",
            updated.id,
            getClientIp(req),
            { newStatus: status, reviewNotes: reviewNotes || null }
          );
        }

        return res.json(updated);
      }
    } catch (error) {
      console.error("Update application status error:", error);
      return res.status(500).json({ message: "Failed to update application" });
    }
  });

  // COPPA Compliance - Update consent verification and data retention
  app.patch("/api/applications/:id/coppa-compliance", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const { guardianConsentMethod, guardianConsentVerified, dataRetentionUntil } = req.body;
      
      // Validate allowed consent method values (empty string normalized to null)
      const allowedConsentMethods = ["e-signature", "mail-in form", "verbal", "in-person", "video-call", null];
      const normalizedConsentMethod = guardianConsentMethod === "" ? null : guardianConsentMethod;
      if (guardianConsentMethod !== undefined && !allowedConsentMethods.includes(normalizedConsentMethod)) {
        return res.status(400).json({ message: "Invalid consent method value" });
      }
      
      // Validate guardianConsentVerified is boolean if provided
      if (guardianConsentVerified !== undefined && typeof guardianConsentVerified !== "boolean") {
        return res.status(400).json({ message: "guardianConsentVerified must be a boolean" });
      }
      
      // Validate dataRetentionUntil is a valid date if provided
      if (dataRetentionUntil !== undefined && dataRetentionUntil !== null && dataRetentionUntil !== "") {
        const parsedDate = new Date(dataRetentionUntil);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format for dataRetentionUntil" });
        }
      }
      
      // Validate that we're only updating minor applications
      const [existingApp] = await db.select().from(applications)
        .where(eq(applications.id, parseInt(req.params.id)));
      
      if (!existingApp) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      if (!existingApp.isMinor) {
        return res.status(400).json({ message: "COPPA compliance fields are only applicable to minor applications" });
      }

      const updateData: any = { updatedAt: new Date() };
      
      if (guardianConsentMethod !== undefined) {
        updateData.guardianConsentMethod = normalizedConsentMethod;
      }
      if (guardianConsentVerified !== undefined) {
        updateData.guardianConsentVerified = guardianConsentVerified;
      }
      if (dataRetentionUntil !== undefined) {
        updateData.dataRetentionUntil = dataRetentionUntil ? new Date(dataRetentionUntil) : null;
      }

      const [updated] = await db.update(applications)
        .set(updateData)
        .where(eq(applications.id, parseInt(req.params.id)))
        .returning();

      // Log this as a COPPA compliance action on minor data
      await logMinorDataAccess(
        req.session.userId,
        "update",
        "applications",
        updated.id,
        getClientIp(req),
        { 
          actionType: "coppa_compliance_update",
          guardianConsentMethod: normalizedConsentMethod ?? null,
          guardianConsentVerified: guardianConsentVerified ?? null,
          dataRetentionUntil: dataRetentionUntil || null
        }
      );

      // Return only sanitized COPPA fields to minimize data exposure
      return res.json({
        id: updated.id,
        guardianConsentMethod: updated.guardianConsentMethod,
        guardianConsentVerified: updated.guardianConsentVerified,
        dataRetentionUntil: updated.dataRetentionUntil,
        updatedAt: updated.updatedAt,
      });
    } catch (error) {
      console.error("Update COPPA compliance error:", error);
      return res.status(500).json({ message: "Failed to update COPPA compliance" });
    }
  });

  app.get("/api/contracts", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userContracts = await db.select().from(contracts)
        .where(eq(contracts.userId, req.session.userId))
        .orderBy(desc(contracts.createdAt));
      return res.json(userContracts);
    } catch (error) {
      console.error("Fetch contracts error:", error);
      return res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.get("/api/contracts/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [contract] = await db.select().from(contracts)
        .where(eq(contracts.id, parseInt(req.params.id)));

      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      if (req.session.userRole !== "admin" && contract.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const [application] = await db.select().from(applications)
        .where(eq(applications.id, contract.applicationId));
      
      const [user] = await db.select().from(users)
        .where(eq(users.id, contract.userId));

      if (contract.requiresGuardian) {
        await logMinorDataAccess(
          req.session.userId,
          "view",
          "contracts",
          contract.id,
          getClientIp(req),
          { contractType: contract.contractType, viewedByRole: req.session.userRole }
        );
      }

      return res.json({
        ...contract,
        authorLegalName: user ? `${user.firstName} ${user.lastName}` : null,
        guardianLegalName: application?.guardianName || null,
        pseudonym: application?.pseudonym || null,
        identityMode: application?.publicIdentityEnabled ? "public" : "safe",
      });
    } catch (error) {
      console.error("Fetch contract error:", error);
      return res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.get("/api/contracts/:id/pdf", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [contract] = await db.select().from(contracts)
        .where(eq(contracts.id, parseInt(req.params.id)));

      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      if (req.session.userRole !== "admin" && contract.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (contract.status !== "signed") {
        return res.status(403).json({ message: "PDF download is only available for fully signed contracts" });
      }

      const [application] = await db.select().from(applications)
        .where(eq(applications.id, contract.applicationId));

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (contract.requiresGuardian || application.isMinor) {
        await logMinorDataAccess(
          req.session.userId,
          "view",
          "contracts",
          contract.id,
          getClientIp(req),
          { 
            action: "pdf_download", 
            contractType: contract.contractType, 
            viewedByRole: req.session.userRole,
            applicationId: application.id,
            includesGuardianData: !!application.guardianName
          }
        );
      }

      let pdfBuffer: Buffer;
      const filename = `contract-${contract.id}-${contract.contractType.replace(/_/g, "-")}.pdf`;

      // Try to serve from database first (stored on signing)
      if (contract.pdfData) {
        console.log(`[PDF Download] Serving contract ${contract.id} from database storage`);
        pdfBuffer = Buffer.from(contract.pdfData, 'base64');
      } else {
        // Regenerate if missing (legacy contracts or failed storage)
        console.log(`[PDF Download] Regenerating PDF for contract ${contract.id} (not in database)`);
        const [user] = await db.select().from(users)
          .where(eq(users.id, contract.userId));

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        try {
          pdfBuffer = await renderToBuffer(
            ContractPDF({
              contract: {
                id: contract.id,
                contractType: contract.contractType,
                contractContent: contract.contractContent,
                authorSignature: contract.authorSignature,
                authorSignedAt: contract.authorSignedAt?.toISOString() || null,
                guardianSignature: contract.guardianSignature,
                guardianSignedAt: contract.guardianSignedAt?.toISOString() || null,
                requiresGuardian: contract.requiresGuardian,
                status: contract.status,
                createdAt: contract.createdAt.toISOString(),
              },
              application: {
                pseudonym: application.pseudonym,
                dateOfBirth: application.dateOfBirth,
                isMinor: application.isMinor,
                guardianName: application.guardianName,
                guardianEmail: application.guardianEmail,
                guardianRelationship: application.guardianRelationship,
              },
              user: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
              },
            })
          );

          // Store for future requests
          const pdfBase64 = pdfBuffer.toString('base64');
          await db.update(contracts)
            .set({ pdfData: pdfBase64, pdfGeneratedAt: new Date(), updatedAt: new Date() })
            .where(eq(contracts.id, contract.id));
          console.log(`[PDF Download] Stored regenerated PDF for contract ${contract.id}`);
        } catch (renderError) {
          console.error("PDF render error:", renderError);
          return res.status(500).json({ message: "Failed to render PDF document" });
        }
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);

      return res.send(pdfBuffer);
    } catch (error) {
      console.error("Generate contract PDF error:", error);
      return res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.post("/api/contracts/:id/sign", contractSigningRateLimiter, async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { signature, signatureType } = req.body;
      const [contract] = await db.select().from(contracts)
        .where(eq(contracts.id, parseInt(req.params.id)));

      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const [application] = await db.select().from(applications)
        .where(eq(applications.id, contract.applicationId));
      
      const [user] = await db.select().from(users)
        .where(eq(users.id, contract.userId));

      if (!application || !user) {
        return res.status(404).json({ message: "Application or user not found" });
      }

      const normalizeName = (name: string): string => {
        return name
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ');
      };

      const authorLegalName = `${user.firstName?.trim() || ''} ${user.lastName?.trim() || ''}`.trim();
      const guardianLegalName = application.guardianName?.trim() || "";

      const normalizedSignature = normalizeName(signature);

      if (signatureType === "author") {
        const normalizedAuthorName = normalizeName(authorLegalName);
        if (normalizedSignature !== normalizedAuthorName) {
          return res.status(400).json({ 
            message: `Identity Mismatch: The name entered does not match the Author's Legal Name. Please enter your name exactly as "${authorLegalName}". This is required to maintain the Zero-PII safety of your account.`
          });
        }
      } else if (signatureType === "guardian") {
        const normalizedGuardianName = normalizeName(guardianLegalName);
        if (normalizedSignature !== normalizedGuardianName) {
          return res.status(400).json({ 
            message: `Identity Mismatch: The name entered does not match the Guardian's Legal Name. Please enter your name exactly as "${guardianLegalName}". This is required to maintain the Zero-PII safety of your account.`
          });
        }
      }

      const clientIp = getClientIp(req) || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      let updateData: any = { updatedAt: new Date() };

      if (signatureType === "author") {
        updateData.authorSignature = signature;
        updateData.authorSignedAt = new Date();
        updateData.authorSignatureIp = clientIp;
        updateData.authorSignatureUserAgent = userAgent;
        
        if (!contract.requiresGuardian) {
          updateData.status = "signed";
        } else if (contract.guardianSignature) {
          updateData.status = "signed";
        } else {
          updateData.status = "pending_guardian";
        }
      } else if (signatureType === "guardian") {
        updateData.guardianSignature = signature;
        updateData.guardianSignedAt = new Date();
        updateData.guardianSignatureIp = clientIp;
        updateData.guardianSignatureUserAgent = userAgent;
        if (contract.authorSignature) {
          updateData.status = "signed";
        }
      }

      const [updated] = await db.update(contracts)
        .set(updateData)
        .where(eq(contracts.id, parseInt(req.params.id)))
        .returning();

      if (contract.requiresGuardian) {
        await logMinorDataAccess(
          req.session.userId,
          "sign",
          "contracts",
          contract.id,
          getClientIp(req),
          { signatureType, newStatus: updated.status }
        );
      }

      if (updated.status === "signed") {
        // Generate and store PDF immediately when contract is fully signed
        generateAndStorePDF(contract.id).catch(err => {
          console.error("Background PDF generation failed:", err);
        });

        await db.update(applications)
          .set({ status: "migrated", updatedAt: new Date() })
          .where(eq(applications.id, contract.applicationId));

        const [publishingUpdate] = await db.insert(publishingUpdates).values({
          applicationId: contract.applicationId,
          userId: contract.userId,
          status: "agreement",
          syncStatus: "pending",
          statusMessage: "Your application has been accepted and contract signed. Syncing with The Indie Quill LLC...",
        }).returning();

        migrateAuthorToIndieQuill(publishingUpdate.id).catch(err => {
          console.error("Background migration failed:", err);
        });
      }

      return res.json({
        ...updated,
        authorLegalName,
        guardianLegalName: application.guardianName || null,
        pseudonym: application.pseudonym || null,
        identityMode: application.publicIdentityEnabled ? "public" : "safe",
      });
    } catch (error) {
      console.error("Sign contract error:", error);
      return res.status(500).json({ message: "Failed to sign contract" });
    }
  });

  app.get("/api/publishing-updates", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const updates = await db.select().from(publishingUpdates)
        .where(eq(publishingUpdates.userId, req.session.userId))
        .orderBy(desc(publishingUpdates.updatedAt));
      return res.json(updates);
    } catch (error) {
      console.error("Fetch publishing updates error:", error);
      return res.status(500).json({ message: "Failed to fetch updates" });
    }
  });

  // User-accessible retry sync endpoint (for failed syncs only)
  app.post("/api/publishing-updates/:applicationId/retry-sync", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const applicationId = parseInt(req.params.applicationId);
      
      // Verify user owns this application
      const [application] = await db.select().from(applications)
        .where(eq(applications.id, applicationId));
      
      if (!application || application.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Find the publishing update for this application
      const [update] = await db.select().from(publishingUpdates)
        .where(eq(publishingUpdates.applicationId, applicationId));
      
      if (!update) {
        return res.status(404).json({ message: "No sync record found for this application" });
      }
      
      if (update.syncStatus === "synced") {
        return res.status(400).json({ message: "Already synced successfully" });
      }
      
      if (update.syncStatus === "syncing") {
        return res.status(400).json({ message: "Sync is already in progress" });
      }
      
      // Retry the sync
      const result = await processSyncJob(update.id);
      
      if (result.success) {
        return res.json({ message: "Sync successful", syncStatus: "synced" });
      } else {
        return res.status(500).json({ message: `Sync failed: ${result.error}`, syncStatus: "failed" });
      }
    } catch (error) {
      console.error("User retry sync error:", error);
      return res.status(500).json({ message: "Failed to retry sync" });
    }
  });

  app.get("/api/admin/stats", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const allApps = await db.select().from(applications);
      const allContracts = await db.select().from(contracts);
      const allUpdates = await db.select().from(publishingUpdates);
      
      const stats = {
        totalApplications: allApps.length,
        pendingApplications: allApps.filter(a => a.status === "pending" || a.status === "under_review").length,
        acceptedApplications: allApps.filter(a => a.status === "accepted").length,
        signedContracts: allContracts.filter(c => c.status === "signed").length,
        pendingContracts: allContracts.filter(c => c.status !== "signed" && c.status !== "rejected").length,
        syncedToLLC: allUpdates.filter(u => u.syncStatus === "synced").length,
        pendingSync: allUpdates.filter(u => u.syncStatus === "pending").length,
        failedSync: allUpdates.filter(u => u.syncStatus === "failed").length,
      };

      return res.json(stats);
    } catch (error) {
      console.error("Fetch stats error:", error);
      return res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/sync-status", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const allUpdates = await db.select({
        id: publishingUpdates.id,
        applicationId: publishingUpdates.applicationId,
        userId: publishingUpdates.userId,
        indieQuillAuthorId: publishingUpdates.indieQuillAuthorId,
        syncStatus: publishingUpdates.syncStatus,
        syncError: publishingUpdates.syncError,
        syncAttempts: publishingUpdates.syncAttempts,
        lastSyncAttempt: publishingUpdates.lastSyncAttempt,
        lastSyncedAt: publishingUpdates.lastSyncedAt,
        status: publishingUpdates.status,
      }).from(publishingUpdates).orderBy(desc(publishingUpdates.updatedAt));

      const updatesWithDetails = await Promise.all(
        allUpdates.map(async (update) => {
          const [app] = await db.select({
            expressionTypes: applications.expressionTypes,
            pseudonym: applications.pseudonym,
            isMinor: applications.isMinor,
          }).from(applications).where(eq(applications.id, update.applicationId));

          const [user] = await db.select({
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          }).from(users).where(eq(users.id, update.userId));

          return {
            ...update,
            expressionTypes: app?.expressionTypes,
            authorName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
            email: user?.email,
            isMinor: app?.isMinor,
          };
        })
      );

      const minorUpdates = updatesWithDetails.filter(u => u.isMinor);
      if (minorUpdates.length > 0) {
        await logMinorDataAccess(
          req.session.userId,
          "view",
          "publishing_updates",
          "bulk",
          getClientIp(req),
          {
            viewedByRole: "admin",
            minorUpdateIds: minorUpdates.map(u => u.id),
            totalMinorsAccessed: minorUpdates.length
          }
        );
      }

      return res.json(updatesWithDetails);
    } catch (error) {
      console.error("Fetch sync status error:", error);
      return res.status(500).json({ message: "Failed to fetch sync status" });
    }
  });

  app.get("/api/admin/email-logs", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const logs = await db.select({
        id: emailLogs.id,
        emailType: emailLogs.emailType,
        recipientEmail: emailLogs.recipientEmail,
        recipientName: emailLogs.recipientName,
        userId: emailLogs.userId,
        applicationId: emailLogs.applicationId,
        status: emailLogs.status,
        errorMessage: emailLogs.errorMessage,
        sentAt: emailLogs.sentAt,
      })
      .from(emailLogs)
      .orderBy(desc(emailLogs.sentAt))
      .limit(100);

      return res.json(logs);
    } catch (error) {
      console.error("Fetch email logs error:", error);
      return res.status(500).json({ message: "Failed to fetch email logs" });
    }
  });

  // Send test email samples to admin
  app.post("/api/admin/send-test-emails", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const adminEmail = "jon@theindiequill.com";
      const result = await sendTestEmailSamples(adminEmail);
      
      if (result.success) {
        return res.json({ message: "Test emails sent successfully", results: result.results });
      } else {
        return res.status(500).json({ message: "Some emails failed to send", results: result.results });
      }
    } catch (error) {
      console.error("Send test emails error:", error);
      return res.status(500).json({ message: "Failed to send test emails" });
    }
  });

  app.post("/api/admin/retry-sync/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const updateId = parseInt(req.params.id);
      const result = await processSyncJob(updateId);
      
      if (result.success) {
        return res.json({ message: "Sync successful" });
      } else {
        return res.status(500).json({ message: `Sync failed: ${result.error}` });
      }
    } catch (error) {
      console.error("Retry sync error:", error);
      return res.status(500).json({ message: "Failed to retry sync" });
    }
  });

  app.post("/api/admin/retry-all-failed", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const result = await retryFailedMigrations();
      return res.json(result);
    } catch (error) {
      console.error("Retry all failed error:", error);
      return res.status(500).json({ message: "Failed to retry migrations" });
    }
  });

  // Reset a publishing update for fresh sync (clears attempts, resets status to pending)
  app.post("/api/admin/reset-sync/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const updateId = parseInt(req.params.id);
      
      const [existingUpdate] = await db.select()
        .from(publishingUpdates)
        .where(eq(publishingUpdates.id, updateId));

      if (!existingUpdate) {
        return res.status(404).json({ message: "Publishing update not found" });
      }

      // Reset the sync state for a fresh attempt
      const [updated] = await db.update(publishingUpdates)
        .set({
          syncStatus: "pending",
          syncError: null,
          syncAttempts: 0,
          lastSyncAttempt: null,
          indieQuillAuthorId: null,
          statusMessage: "Reset for fresh sync attempt",
          updatedAt: new Date(),
        })
        .where(eq(publishingUpdates.id, updateId))
        .returning();

      await db.insert(auditLogs).values({
        userId: req.session.userId,
        action: "reset_sync",
        resourceType: "publishing_updates",
        resourceId: updateId.toString(),
        ipAddress: getClientIp(req),
        metadata: {
          previousSyncStatus: existingUpdate.syncStatus,
          previousAttempts: existingUpdate.syncAttempts,
          previousError: existingUpdate.syncError,
        },
      });

      console.log(`Sync reset for publishing update ${updateId} by admin ${req.session.userId}`);
      return res.json({ message: "Sync reset successfully", update: updated });
    } catch (error) {
      console.error("Reset sync error:", error);
      return res.status(500).json({ message: "Failed to reset sync" });
    }
  });

  app.put("/api/admin/publishing-status/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const updateId = parseInt(req.params.id);
      const { status } = req.body;

      const validStatuses = ['agreement', 'creation', 'editing', 'review', 'modifications', 'published', 'marketing'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const [existingUpdate] = await db.select()
        .from(publishingUpdates)
        .where(eq(publishingUpdates.id, updateId));

      if (!existingUpdate) {
        return res.status(404).json({ message: "Publishing update not found" });
      }

      const previousStatus = existingUpdate.status;

      const [updated] = await db.update(publishingUpdates)
        .set({ 
          status,
          statusMessage: `Stage updated to ${status} by admin`,
          updatedAt: new Date()
        })
        .where(eq(publishingUpdates.id, updateId))
        .returning();

      await db.insert(auditLogs).values({
        userId: req.session.userId,
        action: "update_publishing_stage",
        resourceType: "publishing_updates",
        resourceId: updateId.toString(),
        ipAddress: getClientIp(req),
        metadata: {
          previousStatus,
          newStatus: status,
          applicationId: existingUpdate.applicationId,
        },
      });

      return res.json({ message: "Status updated", status: updated.status });
    } catch (error) {
      console.error("Update publishing status error:", error);
      return res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Test endpoint to verify NPO can connect to LLC
  app.get("/api/admin/test-llc-connection", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const INDIE_QUILL_API_URL = process.env.INDIE_QUILL_API_URL || "";
    const INDIE_QUILL_API_KEY = process.env.INDIE_QUILL_API_KEY || "";
    const INDIE_QUILL_API_SECRET = process.env.INDIE_QUILL_API_SECRET || "";

    // Check if env vars are set
    if (!INDIE_QUILL_API_URL || !INDIE_QUILL_API_KEY || !INDIE_QUILL_API_SECRET) {
      return res.json({
        configured: false,
        error: "Missing environment variables",
        details: {
          hasUrl: !!INDIE_QUILL_API_URL,
          hasKey: !!INDIE_QUILL_API_KEY,
          hasSecret: !!INDIE_QUILL_API_SECRET,
        }
      });
    }

    // Normalize URL
    const baseUrl = INDIE_QUILL_API_URL.replace(/\/api\/?$/, '');
    const healthEndpoint = `${baseUrl}/api/collective/health`;

    console.log(`Testing LLC connection to: ${healthEndpoint}`);

    try {
      const response = await fetch(healthEndpoint);
      const data = await response.json();
      
      return res.json({
        configured: true,
        llcHealthCheck: data,
        npoConfig: {
          apiUrl: baseUrl,
          endpoint: healthEndpoint,
          hasKey: true,
          hasSecret: true,
        },
        status: response.ok ? "connected" : "error",
      });
    } catch (error) {
      console.error("LLC connection test failed:", error);
      return res.json({
        configured: true,
        status: "connection_failed",
        error: String(error),
        npoConfig: {
          apiUrl: baseUrl,
          endpoint: healthEndpoint,
        }
      });
    }
  });

  app.post("/api/admin/force-sync-all-migrated", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const migratedApps = await db.select()
        .from(applications)
        .where(eq(applications.status, "migrated"));

      const results = {
        total: migratedApps.length,
        queued: 0,
        alreadySynced: 0,
        failed: 0,
        idsGenerated: 0,
        errors: [] as string[],
      };

      for (const app of migratedApps) {
        try {
          const [existingUpdate] = await db.select()
            .from(publishingUpdates)
            .where(eq(publishingUpdates.applicationId, app.id));

          if (existingUpdate?.syncStatus === "synced") {
            results.alreadySynced++;
            continue;
          }

          if (!app.internalId && !app.cohortId) {
            const [user] = await db.select()
              .from(users)
              .where(eq(users.id, app.userId));
            
            if (user) {
              const acceptanceResult = await processAcceptance(
                app.id,
                app.userId,
                user.lastName,
                user.firstName,
                app.isMinor
              );
              console.log(`Generated internal ID for app ${app.id}: ${acceptanceResult.internalId}`);
              results.idsGenerated++;
            }
          } else if (!app.internalId && app.cohortId) {
            const [user] = await db.select()
              .from(users)
              .where(eq(users.id, app.userId));
            
            if (user) {
              const { generateInternalId } = await import("./services/cohort-service");
              const internalId = generateInternalId(
                user.lastName,
                user.firstName,
                app.isMinor,
                app.dateApproved || new Date()
              );
              await db.update(applications)
                .set({ internalId, updatedAt: new Date() })
                .where(eq(applications.id, app.id));
              console.log(`Generated internal ID for app ${app.id} (existing cohort): ${internalId}`);
              results.idsGenerated++;
            }
          }

          const jobId = await createSyncJob(app.id, app.userId);
          const syncResult = await processSyncJob(jobId);

          if (syncResult.success) {
            results.queued++;
          } else {
            results.failed++;
            results.errors.push(`App ${app.id}: ${syncResult.error}`);
          }
        } catch (err) {
          results.failed++;
          results.errors.push(`App ${app.id}: ${err}`);
        }
      }

      console.log(`Force sync completed: ${results.queued} synced, ${results.alreadySynced} already synced, ${results.failed} failed, ${results.idsGenerated} IDs generated`);
      return res.json(results);
    } catch (error) {
      console.error("Force sync all migrated error:", error);
      return res.status(500).json({ message: "Failed to force sync" });
    }
  });

  // Register NPO author from Supabase npo_applications table with LLC Bookstore
  // Currently hardcoded to only allow tiny@test.com for testing
  app.post("/api/admin/register-npo-author", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    try {
      console.log(`[Admin] Triggering NPO author registration for: ${email}`);
      const result = await registerNpoAuthorWithLLC(email);
      
      if (result.success) {
        return res.json({
          message: "Author registered successfully",
          bookstoreId: result.bookstoreId,
          fullResponse: result.fullResponse,
        });
      } else {
        return res.status(400).json({
          message: result.error,
          fullResponse: result.fullResponse,
        });
      }
    } catch (error) {
      console.error("Register NPO author error:", error);
      return res.status(500).json({ message: "Failed to register author" });
    }
  });

  // Resync initial application to LLC (in case it failed on first submission)
  app.post("/api/admin/resync-application/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const applicationId = parseInt(req.params.id);
      
      const [application] = await db.select().from(applications)
        .where(eq(applications.id, applicationId));
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const [user] = await db.select().from(users)
        .where(eq(users.id, application.userId));
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const syncResult = await sendApplicationToLLC(
        application.id,
        user.id,
        application,
        { email: user.email, firstName: user.firstName, lastName: user.lastName }
      );

      if (syncResult.success) {
        console.log(`Application ${applicationId} resynced to LLC: ${syncResult.llcApplicationId}`);
        return res.json({ message: "Application synced to LLC", llcApplicationId: syncResult.llcApplicationId });
      } else {
        console.error(`Failed to resync application ${applicationId}: ${syncResult.error}`);
        return res.status(500).json({ message: `Sync failed: ${syncResult.error}` });
      }
    } catch (error) {
      console.error("Resync application error:", error);
      return res.status(500).json({ message: "Failed to resync application" });
    }
  });

  // Resync just the status update to LLC (for when application exists but status wasn't synced)
  app.post("/api/admin/resync-status/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const applicationId = parseInt(req.params.id);
      
      const [application] = await db.select().from(applications)
        .where(eq(applications.id, applicationId));
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const syncResult = await sendStatusUpdateToLLC(
        application.id,
        application.status,
        application.reviewNotes
      );

      if (syncResult.success) {
        console.log(`Status for application ${applicationId} resynced to LLC`);
        return res.json({ message: "Status synced to LLC" });
      } else {
        console.error(`Failed to resync status for ${applicationId}: ${syncResult.error}`);
        return res.status(500).json({ message: `Status sync failed: ${syncResult.error}` });
      }
    } catch (error) {
      console.error("Resync status error:", error);
      return res.status(500).json({ message: "Failed to resync status" });
    }
  });

  // PII Bridge Master View - Admin Only
  app.get("/api/admin/pii-bridge", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const allApps = await db.select().from(applications)
        .orderBy(desc(applications.createdAt));
      const allContracts = await db.select().from(contracts);
      const allCohorts = await db.select().from(cohorts);

      const bridgeEntries = await Promise.all(
        allApps.map(async (app) => {
          const [user] = await db.select().from(users).where(eq(users.id, app.userId));
          const contract = allContracts.find(c => c.applicationId === app.id);
          const cohort = allCohorts.find(c => c.id === app.cohortId);

          return {
            applicationId: app.id,
            pseudonym: app.pseudonym,
            legalName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
            email: user?.email || "Unknown",
            identityMode: app.publicIdentityEnabled ? "public" : "safe",
            status: app.status,
            contractStatus: contract?.status || null,
            cohortLabel: cohort?.label || null,
            createdAt: app.createdAt.toISOString(),
          };
        })
      );

      // Log access to PII Bridge for audit
      await db.insert(auditLogs).values({
        userId: req.session.userId,
        action: "view",
        resourceType: "pii_bridge",
        resourceId: 0,
        ipAddress: getClientIp(req),
        metadata: { 
          entriesViewed: bridgeEntries.length,
          viewedByRole: "admin"
        },
      });

      return res.json(bridgeEntries);
    } catch (error) {
      console.error("Fetch PII bridge error:", error);
      return res.status(500).json({ message: "Failed to fetch PII bridge data" });
    }
  });

  app.get("/api/admin/users", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        shortId: users.shortId,
        familyUnitId: users.familyUnitId,
        createdAt: users.createdAt,
      }).from(users).orderBy(desc(users.createdAt));

      const allCohorts = await db.select().from(cohorts);
      const allGrants = await db.select().from(foundationGrants);
      const allFoundations = await db.select().from(foundations);
      const allFamilyUnits = await db.select().from(familyUnits);

      const usersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          const userApps = await db.select().from(applications)
            .where(eq(applications.userId, user.id));
          
          const activeApp = userApps.find(a => 
            a.status === "accepted" || a.status === "migrated" || a.cohortId
          ) || userApps[0];
          
          let grantLabel: string | null = null;
          if (activeApp?.cohortId) {
            const cohort = allCohorts.find(c => c.id === activeApp.cohortId);
            if (cohort?.grantId) {
              const grant = allGrants.find(g => g.id === cohort.grantId);
              if (grant) {
                const foundation = allFoundations.find(f => f.id === grant.foundationId);
                if (foundation) {
                  const year = new Date(grant.grantDate).getFullYear();
                  grantLabel = `${foundation.name.split(' ')[0].toUpperCase()}-${year}`;
                }
              }
            }
          }

          const familyUnit = user.familyUnitId 
            ? allFamilyUnits.find(f => f.id === user.familyUnitId)
            : null;

          return {
            ...user,
            cohortId: activeApp?.cohortId || null,
            grantLabel,
            familyName: familyUnit?.name || null,
            applicationCount: userApps.length,
            hasAcceptedApp: userApps.some(a => a.status === "accepted" || a.status === "migrated"),
            hasMinorApp: userApps.some(a => a.isMinor),
            status: activeApp?.status || null,
            pseudonym: activeApp?.pseudonym || null,
            dateOfBirth: activeApp?.dateOfBirth || null,
            isMinor: activeApp?.isMinor || false,
          };
        })
      );

      const usersWithMinorApps = usersWithStats.filter(u => u.hasMinorApp);
      if (usersWithMinorApps.length > 0) {
        await logMinorDataAccess(
          req.session.userId,
          "view",
          "users",
          "bulk",
          getClientIp(req),
          {
            viewedByRole: "admin",
            userIdsWithMinorApps: usersWithMinorApps.map(u => u.id),
            totalUsersWithMinorsAccessed: usersWithMinorApps.length
          }
        );
      }

      return res.json(usersWithStats);
    } catch (error) {
      console.error("Fetch users error:", error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/role", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const userId = req.params.id;
      const { role, cohortId, familyUnitId } = req.body;

      if (!["applicant", "admin", "board_member", "auditor", "student", "mentor"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const userApps = await db.select().from(applications)
        .where(eq(applications.userId, userId));
      const hasMinorApp = userApps.some(a => a.isMinor);

      let shortId: string | null = existingUser.shortId;
      let grantLabel: string | null = null;
      let familyName: string | null = null;

      if (role === "student") {
        if (!cohortId) {
          return res.status(400).json({ message: "Cohort assignment required for student role" });
        }

        if (!existingUser.shortId) {
          shortId = await assignAuthorId(userId);
        }

        const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId));
        if (cohort && cohort.grantId) {
          const [grant] = await db.select().from(foundationGrants).where(eq(foundationGrants.id, cohort.grantId));
          if (grant) {
            const [foundation] = await db.select().from(foundations).where(eq(foundations.id, grant.foundationId));
            if (foundation) {
              const year = new Date(grant.grantDate).getFullYear();
              grantLabel = `${foundation.name.split(' ')[0].toUpperCase()}-${year}`;
            }
          }
        }

        if (familyUnitId) {
          const [family] = await db.select().from(familyUnits).where(eq(familyUnits.id, familyUnitId));
          if (family) {
            familyName = family.name;
          }
        }

        if (userApps.length > 0) {
          await db.update(applications)
            .set({ cohortId, updatedAt: new Date() })
            .where(eq(applications.userId, userId));
        }
      }

      const [updated] = await db.update(users)
        .set({ 
          role,
          familyUnitId: familyUnitId || existingUser.familyUnitId,
        })
        .where(eq(users.id, userId))
        .returning();

      if (hasMinorApp) {
        await logMinorDataAccess(
          req.session.userId,
          "update",
          "users",
          Number(userId),
          getClientIp(req),
          {
            actionType: "role_change",
            previousRole: existingUser.role,
            newRole: role,
            cohortId: cohortId || null,
            shortId: shortId || null
          }
        );
      }

      try {
        await sendUserRoleUpdateToLLC(userId, existingUser.email, role);
      } catch (syncError) {
        console.error("Failed to sync role update to LLC:", syncError);
      }

      return res.json({
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        role: updated.role,
        shortId: updated.shortId,
        familyUnitId: updated.familyUnitId,
        familyName,
        grantLabel,
      });
    } catch (error) {
      console.error("Update user role error:", error);
      return res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Admin delete user endpoint
  app.delete("/api/admin/users/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const targetUserId = req.params.id;

    // Prevent admin from deleting themselves
    if (targetUserId === req.session.userId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    try {
      // Check if user exists
      const [existingUser] = await db.select().from(users).where(eq(users.id, targetUserId));
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has minor data for audit logging
      const userApps = await db.select().from(applications)
        .where(eq(applications.userId, targetUserId));
      const hasMinorApp = userApps.some(a => a.isMinor);

      // STEP 1: Nullify external FK references that allow NULL
      await db.update(applications)
        .set({ reviewedBy: null })
        .where(eq(applications.reviewedBy, targetUserId));
      
      await db.update(calendarEvents)
        .set({ createdBy: null })
        .where(eq(calendarEvents.createdBy, targetUserId));
      
      // STEP 2: Delete records where user is required (NOT NULL FK constraints)
      const userCampaigns = await db.select({ id: fundraisingCampaigns.id })
        .from(fundraisingCampaigns)
        .where(eq(fundraisingCampaigns.createdBy, targetUserId));
      
      for (const campaign of userCampaigns) {
        await db.delete(donations).where(eq(donations.campaignId, campaign.id));
      }
      
      await db.delete(donations).where(eq(donations.recordedBy, targetUserId));
      await db.delete(fundraisingCampaigns).where(eq(fundraisingCampaigns.createdBy, targetUserId));

      // STEP 3: Delete applications and related data
      const applicationIds = userApps.map(a => a.id);
      if (applicationIds.length > 0) {
        await db.delete(contracts).where(inArray(contracts.applicationId, applicationIds));
        await db.delete(applications).where(eq(applications.userId, targetUserId));
      }

      await db.delete(publishingUpdates).where(eq(publishingUpdates.userId, targetUserId));
      await db.delete(auditLogs).where(eq(auditLogs.userId, targetUserId));

      // STEP 4: Delete the user
      await db.delete(users).where(eq(users.id, targetUserId));

      // Log COPPA-related deletion if minor data was involved
      if (hasMinorApp) {
        await logMinorDataAccess(
          req.session.userId,
          "delete",
          "user",
          targetUserId,
          getClientIp(req),
          {
            deletedByRole: "admin",
            deletedUserEmail: existingUser.email,
            hadMinorApplications: true,
          }
        );
      }

      return res.json({ message: "User deleted successfully", deletedUserId: targetUserId });
    } catch (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ============================================
  // AUDITOR ENDPOINTS (Zero-PII Analytics)
  // ============================================

  app.get("/api/auditor/metrics", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Only auditors and admins can access this endpoint
    if (req.session.userRole !== "auditor" && req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized - Auditor access required" });
    }

    try {
      const allApps = await db.select().from(applications);
      const allContracts = await db.select().from(contracts);
      const allCohorts = await db.select().from(cohorts);

      // Status distribution
      const statusDistribution = {
        pending: allApps.filter(a => a.status === "pending").length,
        under_review: allApps.filter(a => a.status === "under_review").length,
        accepted: allApps.filter(a => a.status === "accepted").length,
        rejected: allApps.filter(a => a.status === "rejected").length,
        migrated: allApps.filter(a => a.status === "migrated").length,
        rescinded: allApps.filter(a => a.status === "rescinded").length,
      };

      // Identity mode distribution
      const nonRescinded = allApps.filter(a => a.status !== "rescinded");
      const identityModeDistribution = {
        safe: nonRescinded.filter(a => !a.publicIdentityEnabled).length,
        public: nonRescinded.filter(a => a.publicIdentityEnabled).length,
      };

      // Total approved (accepted + migrated + signed contracts)
      const signedContracts = allContracts.filter(c => c.status === "signed");
      const totalApps = allApps.filter(a => a.status !== "rescinded").length;
      const totalApproved = allApps.filter(a => 
        a.status === "accepted" || a.status === "migrated"
      ).length + signedContracts.length;

      // Active cohort health
      const activeCohort = allCohorts.find(c => c.status === "open");
      let cohortHealth = {
        activeCohortLabel: null as string | null,
        activeCohortSize: 0,
        totalCohorts: allCohorts.length,
        signedInActiveCohort: 0,
      };

      if (activeCohort) {
        const cohortApps = allApps.filter(a => a.cohortId === activeCohort.id);
        const cohortContractsSigned = cohortApps.filter(app => {
          const contract = allContracts.find(c => c.applicationId === app.id);
          return contract && contract.status === "signed";
        }).length;

        cohortHealth = {
          activeCohortLabel: activeCohort.label,
          activeCohortSize: cohortApps.length,
          totalCohorts: allCohorts.length,
          signedInActiveCohort: cohortContractsSigned,
        };
      }

      // Contract forensics (Zero-PII: only pseudonyms, timestamps, and IP verification status)
      // For minors or when pseudonym looks like a legal name, show masked identifier
      const contractForensics = await Promise.all(
        signedContracts.slice(0, 10).map(async (contract) => {
          const [app] = await db.select().from(applications)
            .where(eq(applications.id, contract.applicationId));
          
          // Determine if we should mask the identity
          // Mask if: no pseudonym set, or author is a minor (under 18), or pseudonym contains spaces (likely a legal name)
          let displayName = "Author #" + contract.id;
          if (app?.pseudonym) {
            // Check if this looks like a real pseudonym (single word or clearly pen name style)
            // If it has a space and matches firstName lastName pattern, mask it for safety
            const isMinor = app.dateOfBirth && 
              (new Date().getFullYear() - new Date(app.dateOfBirth).getFullYear()) < 18;
            
            if (isMinor || !app.publicIdentityEnabled) {
              // For minors or safe mode users, always use masked format
              const firstInitial = app.pseudonym.charAt(0).toUpperCase();
              displayName = `${firstInitial}. Author`;
            } else {
              // Adult in public mode - can show pseudonym
              displayName = app.pseudonym;
            }
          }
          
          return {
            id: contract.id,
            pseudonym: displayName,
            signedAt: contract.authorSignedAt?.toISOString() || null,
            hasIpVerification: !!contract.authorSignatureIp,
          };
        })
      );

      return res.json({
        totalApplications: totalApps,
        totalApproved,
        identityModeDistribution,
        statusDistribution,
        contractForensics,
        cohortHealth,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Fetch auditor metrics error:", error);
      return res.status(500).json({ message: "Failed to fetch auditor metrics" });
    }
  });

  app.get("/api/board/stats", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "board_member") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const allApps = await db.select().from(applications);
      const allContracts = await db.select().from(contracts);
      const allUpdates = await db.select().from(publishingUpdates);
      
      const stats = {
        totalApplications: allApps.length,
        pendingApplications: allApps.filter(a => a.status === "pending" || a.status === "under_review").length,
        acceptedApplications: allApps.filter(a => a.status === "accepted").length,
        signedContracts: allContracts.filter(c => c.status === "signed").length,
        pendingContracts: allContracts.filter(c => c.status !== "signed" && c.status !== "rejected").length,
        syncedToLLC: allUpdates.filter(u => u.syncStatus === "synced").length,
        pendingSync: allUpdates.filter(u => u.syncStatus === "pending").length,
        failedSync: allUpdates.filter(u => u.syncStatus === "failed").length,
      };

      return res.json(stats);
    } catch (error) {
      console.error("Fetch board stats error:", error);
      return res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/board/calendar", async (req: Request, res: Response) => {
    if (!req.session.userId || (req.session.userRole !== "board_member" && req.session.userRole !== "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const events = await db.select().from(calendarEvents)
        .where(gte(calendarEvents.startDate, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
        .orderBy(calendarEvents.startDate);
      return res.json(events);
    } catch (error) {
      console.error("Fetch calendar error:", error);
      return res.status(500).json({ message: "Failed to fetch calendar" });
    }
  });

  app.post("/api/board/calendar", async (req: Request, res: Response) => {
    if (!req.session.userId || (req.session.userRole !== "board_member" && req.session.userRole !== "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const { title, description, startDate, endDate, allDay, eventType, location } = req.body;
      const [newEvent] = await db.insert(calendarEvents).values({
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay,
        eventType,
        location,
        createdBy: req.session.userId,
      }).returning();
      return res.json(newEvent);
    } catch (error) {
      console.error("Create calendar event error:", error);
      return res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.delete("/api/board/calendar/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || (req.session.userRole !== "board_member" && req.session.userRole !== "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, parseInt(req.params.id)));
      
      if (event?.googleCalendarEventId) {
        await deleteGoogleCalendarEvent(event.googleCalendarEventId);
      }
      
      await db.delete(calendarEvents).where(eq(calendarEvents.id, parseInt(req.params.id)));
      return res.json({ message: "Event deleted" });
    } catch (error) {
      console.error("Delete calendar event error:", error);
      return res.status(500).json({ message: "Failed to delete event" });
    }
  });

  app.get("/api/board/calendar/sync-status", async (req: Request, res: Response) => {
    if (!req.session.userId || (req.session.userRole !== "board_member" && req.session.userRole !== "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const status = await getGoogleCalendarConnectionStatus();
      return res.json(status);
    } catch (error) {
      console.error("Get calendar sync status error:", error);
      return res.status(500).json({ message: "Failed to get sync status" });
    }
  });

  app.post("/api/board/calendar/sync", async (req: Request, res: Response) => {
    if (!req.session.userId || (req.session.userRole !== "board_member" && req.session.userRole !== "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const result = await syncCalendarEvents();
      return res.json(result);
    } catch (error) {
      console.error("Calendar sync error:", error);
      return res.status(500).json({ message: "Failed to sync calendar" });
    }
  });

  app.get("/api/board/campaigns", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "board_member") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const campaigns = await db.select().from(fundraisingCampaigns)
        .orderBy(desc(fundraisingCampaigns.createdAt));
      return res.json(campaigns);
    } catch (error) {
      console.error("Fetch campaigns error:", error);
      return res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/board/campaigns", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "board_member") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const { name, description, goalAmount, startDate, endDate } = req.body;
      const [newCampaign] = await db.insert(fundraisingCampaigns).values({
        name,
        description,
        goalAmount,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        createdBy: req.session.userId,
      }).returning();
      return res.json(newCampaign);
    } catch (error) {
      console.error("Create campaign error:", error);
      return res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.patch("/api/board/campaigns/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "board_member") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const { isActive } = req.body;
      const [updated] = await db.update(fundraisingCampaigns)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(fundraisingCampaigns.id, parseInt(req.params.id)))
        .returning();
      return res.json(updated);
    } catch (error) {
      console.error("Update campaign error:", error);
      return res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.get("/api/board/donations", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "board_member") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const allDonations = await db.select().from(donations)
        .orderBy(desc(donations.donatedAt));
      
      const donationsWithCampaign = await Promise.all(
        allDonations.map(async (donation) => {
          if (donation.campaignId) {
            const [campaign] = await db.select({ name: fundraisingCampaigns.name })
              .from(fundraisingCampaigns)
              .where(eq(fundraisingCampaigns.id, donation.campaignId));
            return { ...donation, campaignName: campaign?.name };
          }
          return { ...donation, campaignName: null };
        })
      );
      
      return res.json(donationsWithCampaign);
    } catch (error) {
      console.error("Fetch donations error:", error);
      return res.status(500).json({ message: "Failed to fetch donations" });
    }
  });

  app.post("/api/board/donations", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "board_member") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const { campaignId, donorName, donorEmail, amount, isAnonymous, notes } = req.body;
      
      const [newDonation] = await db.insert(donations).values({
        campaignId: campaignId || null,
        donorName,
        donorEmail,
        amount,
        isAnonymous,
        notes,
        recordedBy: req.session.userId,
      }).returning();

      if (campaignId) {
        const [campaign] = await db.select().from(fundraisingCampaigns)
          .where(eq(fundraisingCampaigns.id, campaignId));
        if (campaign) {
          await db.update(fundraisingCampaigns)
            .set({ 
              currentAmount: campaign.currentAmount + amount,
              updatedAt: new Date() 
            })
            .where(eq(fundraisingCampaigns.id, campaignId));
        }
      }

      return res.json(newDonation);
    } catch (error) {
      console.error("Create donation error:", error);
      return res.status(500).json({ message: "Failed to record donation" });
    }
  });

  // ============================================
  // PUBLIC IMPACT ENDPOINTS (Zero-PII)
  // Grant-Ready "Proof of Life" metrics
  // ============================================

  let impactCache: { data: any; timestamp: number } | null = null;
  const IMPACT_CACHE_TTL = 60000; // 60 seconds

  app.get("/api/public/impact", async (req: Request, res: Response) => {
    try {
      // Return cached data if fresh
      if (impactCache && Date.now() - impactCache.timestamp < IMPACT_CACHE_TTL) {
        return res.json(impactCache.data);
      }

      // Calculate aggregate metrics (Zero-PII)
      const allApps = await db.select().from(applications);
      const allUpdates = await db.select().from(publishingUpdates);
      const allContracts = await db.select().from(contracts);

      // Total words processed - from books that reached "published" or "marketing" stage
      // This aggregates wordsProcessed from publishingUpdates once a book is published
      const totalWordsProcessed = allUpdates
        .filter(u => u.status === 'published' || u.status === 'marketing')
        .reduce((sum, u) => sum + (u.wordsProcessed || 0), 0);
      
      // Books in pipeline - ONLY accepted/migrated authors who have submitted a manuscript
      // (manuscriptWordCount > 0 or manuscriptTitle set)
      // This counts actual manuscript submissions, not just synced/accepted authors
      const booksInPipeline = allApps.filter(a => 
        (a.status === 'accepted' || a.status === 'migrated') &&
        ((a.manuscriptWordCount && a.manuscriptWordCount > 0) || a.manuscriptTitle)
      ).length;

      // Authors actively publishing (in any stage between agreement and marketing, excluding published)
      const activeAuthors = allUpdates.filter(u => 
        u.status !== 'not_started' && u.status !== 'published' && u.status !== 'marketing'
      ).length;

      // Published books count (reached "published" or "marketing" stage)
      const publishedBooks = allUpdates.filter(u => 
        u.status === 'published' || u.status === 'marketing'
      ).length;

      // Contracts signed
      const signedContracts = allContracts.filter(c => c.status === 'signed').length;

      // Youth authors supported (minors with accepted/migrated status)
      const youthAuthorsSupported = allApps.filter(a => 
        a.isMinor && (a.status === 'accepted' || a.status === 'migrated')
      ).length;

      // NEW DONOR-FOCUSED METRICS
      // Total Authors Supported - all-time applications (any status except rescinded)
      const totalAuthorsSupported = allApps.filter(a => a.status !== 'rescinded').length;
      
      // Identity Protection Rate - % of authors in Safe Mode (publicIdentityEnabled = false)
      const safeModeCounts = allApps.filter(a => a.status !== 'rescinded');
      const safeModeAuthors = safeModeCounts.filter(a => !a.publicIdentityEnabled).length;
      const identityProtectionRate = safeModeCounts.length > 0 
        ? Math.round((safeModeAuthors / safeModeCounts.length) * 100) 
        : 100;
      
      // Active Cohort Size - currently accepted/migrated authors
      const activeCohortSize = allApps.filter(a => 
        a.status === 'accepted' || a.status === 'migrated'
      ).length;

      const impactData = {
        totalWordsProcessed,
        booksInPipeline,
        activeAuthors,
        publishedBooks,
        signedContracts,
        youthAuthorsSupported,
        // New donor metrics
        totalAuthorsSupported,
        identityProtectionRate,
        activeCohortSize,
        lastUpdated: new Date().toISOString(),
      };

      // Cache the result
      impactCache = { data: impactData, timestamp: Date.now() };

      return res.json(impactData);
    } catch (error) {
      console.error("Fetch impact metrics error:", error);
      return res.status(500).json({ message: "Failed to fetch impact metrics" });
    }
  });

  // Flywheel Metrics - Public endpoint for visualization
  let flywheelCache: { data: any; timestamp: number } | null = null;
  const FLYWHEEL_CACHE_TTL = 60000; // 60 seconds

  app.get("/api/public/flywheel", async (req: Request, res: Response) => {
    try {
      if (flywheelCache && Date.now() - flywheelCache.timestamp < FLYWHEEL_CACHE_TTL) {
        return res.json(flywheelCache.data);
      }

      const allApps = await db.select().from(applications);
      const allUpdates = await db.select().from(publishingUpdates);
      const allDonations = await db.select().from(donations);
      const allCosts = await db.select().from(operatingCosts);

      // Active authors (accepted or migrated)
      const activeAuthors = allApps.filter(a => 
        a.status === 'accepted' || a.status === 'migrated'
      ).length;

      // Calculate efficiency: Total Operating Cost / Active Authors
      const totalCosts = allCosts.reduce((sum, c) => sum + c.totalCost, 0);
      const efficiencyRatio = activeAuthors > 0 ? totalCosts / activeAuthors / 100 : 0;

      // Published this quarter
      const now = new Date();
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const quarterlyPublished = allUpdates.filter(u => 
        u.status === 'published' && u.updatedAt && u.updatedAt >= quarterStart
      ).length;

      // Total donations
      const totalDonations = allDonations.reduce((sum, d) => sum + d.amount, 0);

      const flywheelData = {
        efficiencyRatio,
        quarterlyPublished,
        activeAuthors,
        totalDonations,
        lastUpdated: new Date().toISOString(),
      };

      flywheelCache = { data: flywheelData, timestamp: Date.now() };
      return res.json(flywheelData);
    } catch (error) {
      console.error("Fetch flywheel metrics error:", error);
      return res.status(500).json({ message: "Failed to fetch flywheel metrics" });
    }
  });

  // ============================================
  // ADMIN OPERATIONS ENDPOINTS
  // Program Director Metrics Dashboard
  // ============================================

  app.get("/api/admin/operations/metrics", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const allApps = await db.select().from(applications);
      const allUpdates = await db.select().from(publishingUpdates);
      const allContracts = await db.select().from(contracts);
      const allCohorts = await db.select().from(cohorts);

      // Find current active cohort
      const activeCohort = allCohorts.find(c => c.status === 'open');
      
      // Cohort Velocity: % of cohort capacity with signed contracts
      let cohortVelocity = 0;
      let actualCohortCount = 0;
      let cohortSigned = 0;
      if (activeCohort) {
        const cohortApps = allApps.filter(a => a.cohortId === activeCohort.id);
        actualCohortCount = cohortApps.length;
        cohortSigned = cohortApps.filter(a => {
          const contract = allContracts.find(c => c.applicationId === a.id);
          return contract && contract.status === 'signed';
        }).length;
        // Velocity is signed contracts as % of cohort capacity (10), not current enrollment
        cohortVelocity = activeCohort.capacity > 0 ? Math.round((cohortSigned / activeCohort.capacity) * 100) : 0;
      }

      // Scale Indicator: Total Active Authors Managed
      const totalActiveAuthors = allApps.filter(a => 
        a.status !== 'rejected' && a.status !== 'pending'
      ).length;

      // Status distribution for throughput analysis
      const statusDistribution = {
        pending: allApps.filter(a => a.status === 'pending').length,
        under_review: allApps.filter(a => a.status === 'under_review').length,
        accepted: allApps.filter(a => a.status === 'accepted').length,
        migrated: allApps.filter(a => a.status === 'migrated').length,
        rejected: allApps.filter(a => a.status === 'rejected').length,
      };

      // Publishing pipeline status - New Chevron Path stages
      const publishingPipeline = {
        agreement: allUpdates.filter(u => u.status === 'agreement' || u.status === 'not_started').length,
        creation: allUpdates.filter(u => u.status === 'creation' || u.status === 'manuscript_received').length,
        editing: allUpdates.filter(u => u.status === 'editing' || u.status === 'cover_design' || u.status === 'formatting').length,
        review: allUpdates.filter(u => u.status === 'review').length,
        modifications: allUpdates.filter(u => u.status === 'modifications').length,
        published: allUpdates.filter(u => u.status === 'published').length,
        marketing: allUpdates.filter(u => u.status === 'marketing').length,
      };

      // Minor authors stats
      const minorStats = {
        total: allApps.filter(a => a.isMinor).length,
        withGuardianConsent: allApps.filter(a => a.isMinor && a.guardianConsentVerified).length,
        pendingConsent: allApps.filter(a => a.isMinor && !a.guardianConsentVerified).length,
      };

      // Sync health
      const syncStats = {
        synced: allUpdates.filter(u => u.syncStatus === 'synced').length,
        pending: allUpdates.filter(u => u.syncStatus === 'pending').length,
        failed: allUpdates.filter(u => u.syncStatus === 'failed').length,
      };

      // Flywheel Efficiency Metrics
      const allCosts = await db.select().from(operatingCosts);
      const totalOperatingCosts = allCosts.reduce((sum, c) => sum + c.totalCost, 0);
      const efficiencyRatio = totalActiveAuthors > 0 ? totalOperatingCosts / totalActiveAuthors / 100 : 0;

      // Quarterly throughput
      const now = new Date();
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const quarterlyPublished = allUpdates.filter(u => 
        u.status === 'published' && u.updatedAt && u.updatedAt >= quarterStart
      ).length;

      return res.json({
        cohortVelocity,
        activeCohort: activeCohort ? {
          label: activeCohort.label,
          currentCount: actualCohortCount,
          capacity: activeCohort.capacity,
          signedCount: cohortSigned,
        } : null,
        totalActiveAuthors,
        statusDistribution,
        publishingPipeline,
        minorStats,
        syncStats,
        totalApplications: allApps.length,
        totalContracts: allContracts.length,
        signedContracts: allContracts.filter(c => c.status === 'signed').length,
        efficiencyRatio,
        quarterlyPublished,
        totalOperatingCosts,
      });
    } catch (error) {
      console.error("Fetch operations metrics error:", error);
      return res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get("/api/admin/operations/history", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      // Get audit logs for status change history
      const statusLogs = await db.select().from(auditLogs)
        .where(sql`${auditLogs.action} LIKE '%status%'`)
        .orderBy(desc(auditLogs.createdAt))
        .limit(100);

      // Calculate average time in each status (simplified - using creation dates)
      const allApps = await db.select().from(applications);
      
      // Group by month for trend analysis
      const monthlyStats: Record<string, { applications: number; accepted: number; migrated: number }> = {};
      
      allApps.forEach(app => {
        const month = app.createdAt.toISOString().substring(0, 7); // YYYY-MM
        if (!monthlyStats[month]) {
          monthlyStats[month] = { applications: 0, accepted: 0, migrated: 0 };
        }
        monthlyStats[month].applications++;
        if (app.status === 'accepted' || app.status === 'migrated') {
          monthlyStats[month].accepted++;
        }
        if (app.status === 'migrated') {
          monthlyStats[month].migrated++;
        }
      });

      return res.json({
        recentActivity: statusLogs.slice(0, 20).map(log => ({
          action: log.action,
          resource: log.resourceType,
          timestamp: log.createdAt,
        })),
        monthlyTrends: Object.entries(monthlyStats).map(([month, stats]) => ({
          month,
          ...stats,
        })).sort((a, b) => a.month.localeCompare(b.month)),
      });
    } catch (error) {
      console.error("Fetch operations history error:", error);
      return res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  // ============================================
  // COMPLIANCE EXPORT ENDPOINT
  // Grant-Ready PDF Audit Report
  // ============================================

  app.post("/api/admin/compliance/export", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const { ComplianceReport } = await import("./pdf-templates/ComplianceReport");
      const { truncateName } = await import("./utils/minor-safety");

      // Get admin user info
      const [adminUser] = await db.select().from(users)
        .where(eq(users.id, req.session.userId));

      // Get all applications with minor data
      const allApps = await db.select().from(applications);
      const minorApps = allApps.filter(a => a.isMinor);

      // Get all contracts with forensic data
      const allContracts = await db.select().from(contracts);
      const signedContracts = allContracts.filter(c => c.status === 'signed');

      // Get recent audit logs
      const recentAuditLogs = await db.select().from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(20);

      // Get user info for display names
      const userIds = [...new Set(allApps.map(a => a.userId))];
      const appUsers = userIds.length > 0 
        ? await db.select().from(users).where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(appUsers.map(u => [u.id, u]));

      // Prepare minor records (sanitized)
      const minorRecords = minorApps.map(app => {
        const user = userMap.get(app.userId);
        return {
          id: app.id,
          displayName: user ? truncateName(user.firstName, user.lastName) : `Author ${app.id}`,
          guardianName: app.guardianName,
          guardianEmail: app.guardianEmail,
          consentMethod: app.guardianConsentMethod,
          consentVerified: app.guardianConsentVerified || false,
          dataRetentionUntil: app.dataRetentionUntil?.toISOString() || null,
          createdAt: app.createdAt.toISOString(),
        };
      });

      // Prepare contract forensics
      const contractForensics = signedContracts.map(contract => {
        const app = allApps.find(a => a.id === contract.applicationId);
        const user = app ? userMap.get(app.userId) : null;
        return {
          id: contract.id,
          displayName: user ? truncateName(user.firstName, user.lastName) : `Contract ${contract.id}`,
          signedAt: contract.authorSignedAt?.toISOString() || null,
          signatureIp: contract.authorSignatureIp,
          signatureUserAgent: contract.authorSignatureUserAgent?.substring(0, 50) || null,
          guardianSignedAt: contract.guardianSignedAt?.toISOString() || null,
          guardianSignatureIp: contract.guardianSignatureIp,
        };
      });

      // Prepare audit sample
      const auditSample = recentAuditLogs.map(log => ({
        id: log.id,
        action: log.action,
        resourceType: log.resourceType,
        userId: log.userId,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      }));

      // Prepare donor impact data
      const lockedGrants = await db.select()
        .from(foundationGrants)
        .where(sql`${foundationGrants.donorLockedAt} IS NOT NULL`);

      const donorImpacts = await Promise.all(
        lockedGrants.map(async (grant) => {
          const [foundation] = await db.select().from(foundations).where(eq(foundations.id, grant.foundationId));
          
          let authorsImpacted: { displayName: string; status: string }[] = [];
          let actualAuthors = 0;
          
          if (grant.assignedCohortId) {
            const cohortApps = await db.select({
              firstName: users.firstName,
              status: applications.status,
            })
            .from(applications)
            .leftJoin(users, eq(applications.userId, users.id))
            .where(eq(applications.cohortId, grant.assignedCohortId));
            
            actualAuthors = cohortApps.length;
            const emojis = ["✍️", "📚", "🌟", "📖", "🎭", "🖋️", "💫", "📝", "🎨", "🚀"];
            authorsImpacted = cohortApps.map((app, idx) => ({
              displayName: `${app.firstName?.charAt(0) || "A"}. ${emojis[idx % emojis.length]}`,
              status: app.status || "active",
            }));
          }

          // Calculate potential authors based on cost efficiency
          const latestCost = await db.select()
            .from(operatingCosts)
            .orderBy(desc(operatingCosts.year), desc(operatingCosts.quarterNum))
            .limit(1);

          const totalAuthors = allApps.filter(a => a.status === "accepted").length || 1;
          const totalCost = latestCost[0]?.totalCost || 0;
          const costPerAuthor = totalAuthors > 0 ? Math.round(totalCost / totalAuthors) : 0;
          const potentialAuthors = costPerAuthor > 0 
            ? Math.floor(grant.amount / costPerAuthor) 
            : grant.targetAuthorCount;

          return {
            foundationName: foundation?.name || "Unknown Foundation",
            grantAmount: grant.amount,
            targetAuthors: grant.targetAuthorCount,
            actualAuthors,
            potentialAuthors,
            exceededExpectations: actualAuthors > grant.targetAuthorCount,
            authorsImpacted,
          };
        })
      );

      // Generate PDF
      const pdfBuffer = await renderToBuffer(
        ComplianceReport({
          generatedAt: new Date().toISOString(),
          generatedBy: adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin',
          stats: {
            totalMinors: minorApps.length,
            verifiedConsent: minorApps.filter(a => a.guardianConsentVerified).length,
            pendingConsent: minorApps.filter(a => !a.guardianConsentVerified).length,
            totalContracts: allContracts.length,
            signedContracts: signedContracts.length,
          },
          minorRecords,
          contractForensics,
          auditSample,
          donorImpacts,
        })
      );

      // Log audit event
      await logAuditEvent(
        req.session.userId,
        "compliance_export",
        "audit_logs",
        0,
        getClientIp(req),
        { exportType: "compliance_report", recordCount: minorRecords.length }
      );

      const filename = `compliance-audit-${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);

      return res.send(pdfBuffer);
    } catch (error) {
      console.error("Compliance export error:", error);
      return res.status(500).json({ message: "Failed to generate compliance report" });
    }
  });

  app.get("/api/admin/cohorts", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { sanitizeAuthorProfile } = await import("./utils/minor-safety");
      
      const allCohorts = await db.select().from(cohorts).orderBy(cohorts.id);
      
      const cohortsWithMembers = await Promise.all(
        allCohorts.map(async (cohort) => {
          const cohortApplications = await db
            .select({
              id: applications.id,
              firstName: users.firstName,
              lastName: users.lastName,
              isMinor: applications.isMinor,
              pseudonym: applications.pseudonym,
              status: applications.status,
              dateApproved: applications.dateApproved,
            })
            .from(applications)
            .innerJoin(users, eq(applications.userId, users.id))
            .where(eq(applications.cohortId, cohort.id))
            .orderBy(applications.dateApproved);

          const members = cohortApplications.map((app) => {
            const sanitized = sanitizeAuthorProfile({
              id: app.id,
              firstName: app.firstName,
              lastName: app.lastName,
              isMinor: app.isMinor,
              pseudonym: app.pseudonym,
            });
            return {
              id: app.id,
              applicationId: app.id,
              displayName: sanitized.displayName,
              avatar: sanitized.avatar,
              isMinor: app.isMinor,
              status: app.status,
              joinedAt: app.dateApproved?.toISOString() || "",
            };
          });

          return {
            ...cohort,
            currentCount: members.length,
            members,
          };
        })
      );

      return res.json(cohortsWithMembers);
    } catch (error) {
      console.error("Failed to fetch cohorts:", error);
      return res.status(500).json({ message: "Failed to fetch cohorts" });
    }
  });

  app.get("/api/admin/cohorts/available", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const openCohorts = await db
        .select()
        .from(cohorts)
        .where(eq(cohorts.status, "open"))
        .orderBy(cohorts.id);

      return res.json(openCohorts);
    } catch (error) {
      console.error("Failed to fetch available cohorts:", error);
      return res.status(500).json({ message: "Failed to fetch available cohorts" });
    }
  });

  // Family Units API endpoints
  app.get("/api/admin/family-units", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const cohortIdParam = req.query.cohortId ? parseInt(req.query.cohortId as string) : null;
      
      let allFamilyUnits;
      if (cohortIdParam) {
        allFamilyUnits = await db.select().from(familyUnits)
          .where(eq(familyUnits.cohortId, cohortIdParam))
          .orderBy(familyUnits.name);
      } else {
        allFamilyUnits = await db.select().from(familyUnits).orderBy(familyUnits.name);
      }

      const familyUnitsWithMembers = await Promise.all(
        allFamilyUnits.map(async (family) => {
          const members = await db.select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            shortId: users.shortId,
            role: users.role,
          }).from(users).where(eq(users.familyUnitId, family.id));

          return {
            ...family,
            memberCount: members.length,
            members,
          };
        })
      );

      return res.json(familyUnitsWithMembers);
    } catch (error) {
      console.error("Failed to fetch family units:", error);
      return res.status(500).json({ message: "Failed to fetch family units" });
    }
  });

  app.post("/api/admin/family-units", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { name, cohortId } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "Family name is required" });
      }

      const [newFamily] = await db.insert(familyUnits).values({
        name: name.trim(),
        cohortId: cohortId || null,
      }).returning();

      return res.status(201).json(newFamily);
    } catch (error) {
      console.error("Failed to create family unit:", error);
      return res.status(500).json({ message: "Failed to create family unit" });
    }
  });

  app.post("/api/admin/applications/:id/assign-cohort", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const applicationId = parseInt(req.params.id);
    const { cohortId } = req.body;

    try {
      let targetCohortId = cohortId;

      if (!targetCohortId) {
        const firstAvailableCohort = await db
          .select()
          .from(cohorts)
          .where(and(eq(cohorts.status, "open"), lt(cohorts.currentCount, cohorts.capacity)))
          .orderBy(cohorts.id)
          .limit(1);

        if (firstAvailableCohort.length === 0) {
          const [{ maxId }] = await db.select({ maxId: sql<number>`COALESCE(MAX(${cohorts.id}), 0)` }).from(cohorts);
          const newLabel = `Cohort ${maxId + 1}`;
          const [newCohort] = await db
            .insert(cohorts)
            .values({
              label: newLabel,
              capacity: 10,
              currentCount: 0,
              status: "open",
            })
            .returning();
          targetCohortId = newCohort.id;
        } else {
          targetCohortId = firstAvailableCohort[0].id;
        }
      }

      await db
        .update(applications)
        .set({ cohortId: targetCohortId, dateApproved: new Date() })
        .where(eq(applications.id, applicationId));

      await db
        .update(cohorts)
        .set({ currentCount: sql`${cohorts.currentCount} + 1` })
        .where(eq(cohorts.id, targetCohortId));

      const [updatedCohort] = await db.select().from(cohorts).where(eq(cohorts.id, targetCohortId));
      if (updatedCohort && updatedCohort.currentCount >= updatedCohort.capacity) {
        await db.update(cohorts).set({ status: "closed" }).where(eq(cohorts.id, targetCohortId));
      }

      return res.json({ message: "Cohort assigned successfully", cohortId: targetCohortId });
    } catch (error) {
      console.error("Failed to assign cohort:", error);
      return res.status(500).json({ message: "Failed to assign cohort" });
    }
  });

  // Register Grant & Donor Logistics routes
  registerGrantRoutes(app);
  await registerDonationRoutes(app);
}

function formatExpressionTypes(types: string): string {
  const typeLabels: Record<string, string> = {
    novel: "Novel",
    short_story: "Short Story",
    poems: "Poems",
    graphic_novel: "Graphic Novel",
    other: "Other",
  };
  return types.split(",").map(t => typeLabels[t.trim()] || t.trim()).join(", ");
}

function generateContract(application: any): string {
  const guardianSection = application.isMinor ? `
The Guardian: [Required for all Minor Authors]` : "";

  const minorNotice = application.isMinor ? `
Note: This agreement requires guardian/parent consent and signature.` : "";

  const guardianConsentSection = application.isMinor ? `

GUARDIAN CONSENT FOR MINOR IDENTITY VISIBILITY:
As the guardian of a minor author, I understand that enabling "Public Mode" will 
allow the use of my child's full legal name and photograph for marketing and promotional 
purposes. I hereby consent to this use if elected above.` : "";

  return `
AUTHOR PUBLISHING AGREEMENT
Version: Friendly 4 Pilot (Frozen for Launch)

1. DEFINED TERMS & PARTIES
This Agreement is entered into between the following parties:

The Collective: The Indie Quill Collective, a 501(c)(3) non-profit organization.

The Publisher: The Indie Quill LLC, the authorized publishing partner of The Collective.

The Author (Legal Identity): [Full Legal Name - Stored in Forensic Vault Only]

The Author (Creative Identity): ${application.pseudonym || "[Pseudonym - Transmitted to The Publisher]"}
${guardianSection}

2. THE LITERACY LOGISTICS FRAMEWORK
The Collective agrees to mentor the Author through the following seven Value-Add Phases:

  1. Agreement: Legal onboarding, forensic identity verification, and pseudonym election.
  2. Creation: Supervised authorship facilitated by proprietary mentorship and formatting tools (Coming Soon).
  3. Editing: Professional manuscript development and official registration of ISBN and Copyright in the Author's legal name.
  4. Review: Quality assurance phase involving genre analysis and content evaluation.
  5. Modifications: Technical refinement stage to ensure the work meets professional market standards.
  6. Published: Official deployment into The Publisher's global bookstore.
  7. Marketing: Post-launch support including a launch event and dedicated promotional cycles.

3. IDENTITY VISIBILITY & SAFETY (COPPA COMPLIANCE)
We follow COPPA (Children's Online Privacy Protection Act) to ensure that all minors are protected at all times.

Default "Safe Mode": The Author's identity will be masked using a truncated name and emoji avatar in all public materials.

Pseudonym Bridge: Only the elected pseudonym (Creative Identity) will be shared with The Publisher for bookstore distribution.

Identity Opt-In:
[ ] Safe Mode: I elect to remain in "Safe Mode." Only my Pseudonym will be shared with the Bookstore.
[ ] Public Mode: I grant permission to use the Author's full legal name and photograph for marketing and promotional purposes.

Correction Protocol: If any legal PII appears incorrectly in a public area, please notify jon@theindiequill.com immediately.
${guardianConsentSection}

4. RIGHTS, OWNERSHIP & REFUSAL

100% Author Ownership: The Author shall retain one hundred percent (100%) of all copyrights and legal ownership of the Work.

Legal Registration: The Collective will facilitate the professional filing of the ISBN and Copyright on behalf of the Author; however, these legal identifiers will be registered exclusively in the Author's legal name, ensuring they remain the sole owner of record.

Non-Exclusive Publishing License: The Author grants The Collective and The Publisher a non-exclusive license to publish, distribute, and promote the Work in digital and physical formats.

Originality & AI Policy: The Author warrants the Work is their own original creation. The Collective scans all submissions for AI-generated content. Based on the results, The Collective reserves the right to either reject the work or require a mandatory "AI-Assisted" badge to be displayed on the published version.

Mission-Aligned Services: The Collective provides professional editing and filing services at no cost to the Author, supported by our donor-funded sponsorship model.

Right of Refusal & Editorial Discretion: The Collective reserves the absolute right to refuse any application or decline to publish any Work that does not align with our mission, safety standards, or quality guidelines.
${minorNotice}

5. FORENSIC SIGNATURES

Author Signature: ____________________ Date: __________

Guardian Signature (If Minor): ____________________ Date: __________

System Metadata: IP Address [Captured], Timestamp [UTC]

---

This contract is provided by The Indie Quill Collective, dedicated to empowering emerging authors.
  `.trim();
}

// ==================== GRANT & DONOR LOGISTICS API ====================

export function registerGrantRoutes(app: Express) {
  // --------- FOUNDATIONS CRM ---------
  
  // Get all foundations with last contact info
  app.get("/api/admin/grants/foundations", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const allFoundations = await db.select().from(foundations).orderBy(desc(foundations.createdAt));
      
      // Get last contact for each foundation
      const foundationsWithLastContact = await Promise.all(
        allFoundations.map(async (foundation) => {
          const lastLog = await db.select()
            .from(solicitationLogs)
            .where(eq(solicitationLogs.foundationId, foundation.id))
            .orderBy(desc(solicitationLogs.contactDate))
            .limit(1);
          
          const grants = await db.select()
            .from(foundationGrants)
            .where(eq(foundationGrants.foundationId, foundation.id));
          
          const totalGranted = grants.reduce((sum, g) => sum + g.amount, 0);
          
          return {
            ...foundation,
            lastContact: lastLog[0] || null,
            totalGranted,
            grantCount: grants.length,
          };
        })
      );
      
      return res.json(foundationsWithLastContact);
    } catch (error) {
      console.error("Failed to fetch foundations:", error);
      return res.status(500).json({ message: "Failed to fetch foundations" });
    }
  });

  // Create new foundation
  app.post("/api/admin/grants/foundations", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, contactPerson, contactEmail, contactPhone, contactRole, mission, website, notes, category, geographyScope, acceptanceCriteria, fitRank, status } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: "Foundation name is required" });
    }

    try {
      const [newFoundation] = await db.insert(foundations).values({
        name,
        contactPerson,
        contactEmail,
        contactPhone,
        contactRole,
        mission,
        website,
        notes,
        category,
        geographyScope,
        acceptanceCriteria,
        fitRank: fitRank ? parseInt(fitRank) : null,
        status: status || 'active',
        createdBy: req.session.userId,
      }).returning();

      await logAuditEvent(
        req.session.userId,
        "create_foundation",
        "foundations",
        newFoundation.id.toString(),
        `Created foundation: ${name}`,
        getClientIp(req),
      );

      return res.status(201).json(newFoundation);
    } catch (error) {
      console.error("Failed to create foundation:", error);
      return res.status(500).json({ message: "Failed to create foundation" });
    }
  });

  // Update foundation
  app.put("/api/admin/grants/foundations/:id", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const foundationId = parseInt(req.params.id);
    const { name, contactPerson, contactEmail, contactPhone, contactRole, mission, website, notes, category, geographyScope, acceptanceCriteria, fitRank, status } = req.body;

    try {
      const [updated] = await db.update(foundations)
        .set({
          name,
          contactPerson,
          contactEmail,
          contactPhone,
          contactRole,
          mission,
          website,
          notes,
          category,
          geographyScope,
          acceptanceCriteria,
          fitRank: fitRank ? parseInt(fitRank) : null,
          status: status || 'active',
          updatedAt: new Date(),
        })
        .where(eq(foundations.id, foundationId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Foundation not found" });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Failed to update foundation:", error);
      return res.status(500).json({ message: "Failed to update foundation" });
    }
  });

  // --------- SOLICITATION LOGS ---------

  // Get solicitation logs for a foundation
  app.get("/api/admin/grants/foundations/:id/logs", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const foundationId = parseInt(req.params.id);

    try {
      const logs = await db.select()
        .from(solicitationLogs)
        .where(eq(solicitationLogs.foundationId, foundationId))
        .orderBy(desc(solicitationLogs.contactDate));

      // Enrich with contacter info
      const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
          const [contacter] = await db.select({
            firstName: users.firstName,
            lastName: users.lastName,
          }).from(users).where(eq(users.id, log.contactedBy));
          return {
            ...log,
            contacterName: contacter ? `${contacter.firstName} ${contacter.lastName}` : "Unknown",
          };
        })
      );

      return res.json(enrichedLogs);
    } catch (error) {
      console.error("Failed to fetch solicitation logs:", error);
      return res.status(500).json({ message: "Failed to fetch solicitation logs" });
    }
  });

  // Add solicitation log
  app.post("/api/admin/grants/foundations/:id/logs", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const foundationId = parseInt(req.params.id);
    const { contactDate, contactMethod, purpose, response, responseDate, notes } = req.body;

    if (!contactDate || !contactMethod || !purpose) {
      return res.status(400).json({ message: "Contact date, method, and purpose are required" });
    }

    try {
      const [newLog] = await db.insert(solicitationLogs).values({
        foundationId,
        contactDate: new Date(contactDate),
        contactMethod,
        contactedBy: req.session.userId,
        purpose,
        response,
        responseDate: responseDate ? new Date(responseDate) : null,
        notes,
      }).returning();

      await logAuditEvent(
        req.session.userId,
        "log_solicitation",
        "solicitation_logs",
        newLog.id.toString(),
        `Logged contact with foundation ${foundationId}: ${contactMethod}`,
        getClientIp(req),
      );

      return res.status(201).json(newLog);
    } catch (error) {
      console.error("Failed to add solicitation log:", error);
      return res.status(500).json({ message: "Failed to add solicitation log" });
    }
  });

  // --------- FOUNDATION GRANTS ---------

  // Get all grants with efficiency calculations
  app.get("/api/admin/grants", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const allGrants = await db.select()
        .from(foundationGrants)
        .orderBy(desc(foundationGrants.grantDate));

      // Get cost per author from latest operating cost
      const latestCost = await db.select()
        .from(operatingCosts)
        .orderBy(desc(operatingCosts.year), desc(operatingCosts.quarterNum))
        .limit(1);

      // Get total authors for cost calculation
      const authorStats = await db.select({
        count: sql<number>`count(*)`.mapWith(Number),
      }).from(applications).where(eq(applications.status, "accepted"));

      const totalAuthors = authorStats[0]?.count || 1;
      const totalCost = latestCost[0]?.totalCost || 0;
      const costPerAuthor = totalAuthors > 0 ? Math.round(totalCost / totalAuthors) : 0;

      // Enrich grants with foundation info and efficiency metrics
      const enrichedGrants = await Promise.all(
        allGrants.map(async (grant) => {
          const [foundation] = await db.select({
            name: foundations.name,
          }).from(foundations).where(eq(foundations.id, grant.foundationId));

          let cohortInfo = null;
          let actualAuthorsServed = 0;
          
          if (grant.assignedCohortId) {
            const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, grant.assignedCohortId));
            if (cohort) {
              cohortInfo = {
                id: cohort.id,
                label: cohort.label,
                currentCount: cohort.currentCount,
              };
              actualAuthorsServed = cohort.currentCount;
            }
          }

          // Calculate efficiency surplus
          const potentialAuthors = costPerAuthor > 0 
            ? Math.floor(grant.amount / costPerAuthor) 
            : grant.targetAuthorCount;
          const surplusAuthors = potentialAuthors - grant.targetAuthorCount;
          const hasSurplus = surplusAuthors > 0;

          return {
            ...grant,
            foundationName: foundation?.name || "Unknown Foundation",
            cohort: cohortInfo,
            actualAuthorsServed,
            costPerAuthor,
            potentialAuthors,
            surplusAuthors,
            hasSurplus,
          };
        })
      );

      return res.json({
        grants: enrichedGrants,
        metrics: {
          costPerAuthor,
          totalAuthors,
          totalGrantsReceived: allGrants.reduce((sum, g) => sum + g.amount, 0),
        },
      });
    } catch (error) {
      console.error("Failed to fetch grants:", error);
      return res.status(500).json({ message: "Failed to fetch grants" });
    }
  });

  // Create new grant
  app.post("/api/admin/grants", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { foundationId, amount, targetAuthorCount, assignedCohortId, grantDate, grantPurpose } = req.body;

    if (!foundationId || !amount || !targetAuthorCount || !grantDate) {
      return res.status(400).json({ message: "Foundation, amount, target author count, and grant date are required" });
    }

    try {
      const [newGrant] = await db.insert(foundationGrants).values({
        foundationId,
        amount,
        targetAuthorCount,
        assignedCohortId: assignedCohortId || null,
        grantDate: new Date(grantDate),
        grantPurpose,
        recordedBy: req.session.userId,
      }).returning();

      // Update solicitation log to "funded" if there's a recent one
      await db.update(solicitationLogs)
        .set({ 
          response: "funded",
          responseDate: new Date(),
        })
        .where(
          and(
            eq(solicitationLogs.foundationId, foundationId),
            eq(solicitationLogs.response, "interested")
          )
        );

      await logAuditEvent(
        req.session.userId,
        "record_grant",
        "foundation_grants",
        newGrant.id.toString(),
        `Recorded grant of $${(amount / 100).toFixed(2)} from foundation ${foundationId} for ${targetAuthorCount} authors`,
        getClientIp(req),
      );

      return res.status(201).json(newGrant);
    } catch (error) {
      console.error("Failed to create grant:", error);
      return res.status(500).json({ message: "Failed to create grant" });
    }
  });

  // Lock authors to donor for impact reporting
  app.put("/api/admin/grants/:id/lock", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const grantId = parseInt(req.params.id);

    try {
      const [grant] = await db.select().from(foundationGrants).where(eq(foundationGrants.id, grantId));
      
      if (!grant) {
        return res.status(404).json({ message: "Grant not found" });
      }

      if (grant.donorLockedAt) {
        return res.status(400).json({ message: "Grant is already locked" });
      }

      if (!grant.assignedCohortId) {
        return res.status(400).json({ message: "Grant must be assigned to a cohort before locking" });
      }

      const [updated] = await db.update(foundationGrants)
        .set({
          donorLockedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(foundationGrants.id, grantId))
        .returning();

      await logAuditEvent(
        req.session.userId,
        "lock_grant_authors",
        "foundation_grants",
        grantId.toString(),
        `Locked authors to grant for donor impact reporting`,
        getClientIp(req),
      );

      return res.json(updated);
    } catch (error) {
      console.error("Failed to lock grant:", error);
      return res.status(500).json({ message: "Failed to lock grant" });
    }
  });

  // Get donor impact report for a specific grant
  app.get("/api/admin/grants/:id/impact", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const grantId = parseInt(req.params.id);

    try {
      const [grant] = await db.select().from(foundationGrants).where(eq(foundationGrants.id, grantId));
      
      if (!grant) {
        return res.status(404).json({ message: "Grant not found" });
      }

      const [foundation] = await db.select().from(foundations).where(eq(foundations.id, grant.foundationId));

      let authorsImpacted: any[] = [];
      let cohortInfo = null;

      if (grant.assignedCohortId) {
        const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, grant.assignedCohortId));
        cohortInfo = cohort;

        // Get authors in this cohort with sanitized names
        const cohortApplications = await db.select({
          id: applications.id,
          pseudonym: applications.pseudonym,
          isMinor: applications.isMinor,
          status: applications.status,
          firstName: users.firstName,
        })
        .from(applications)
        .leftJoin(users, eq(applications.userId, users.id))
        .where(eq(applications.cohortId, grant.assignedCohortId));

        // Sanitize author profiles for donor report
        const emojis = ["✍️", "📚", "🌟", "📖", "🎭", "🖋️", "💫", "📝", "🎨", "🚀"];
        authorsImpacted = cohortApplications.map((app, index) => ({
          displayName: `${app.firstName?.charAt(0) || "A"}. ${emojis[index % emojis.length]}`,
          pseudonym: app.pseudonym,
          isMinor: app.isMinor,
          status: app.status,
        }));
      }

      // Calculate efficiency
      const latestCost = await db.select()
        .from(operatingCosts)
        .orderBy(desc(operatingCosts.year), desc(operatingCosts.quarterNum))
        .limit(1);

      const authorStats = await db.select({
        count: sql<number>`count(*)`.mapWith(Number),
      }).from(applications).where(eq(applications.status, "accepted"));

      const totalAuthors = authorStats[0]?.count || 1;
      const totalCost = latestCost[0]?.totalCost || 0;
      const costPerAuthor = totalAuthors > 0 ? Math.round(totalCost / totalAuthors) : 0;

      const potentialAuthors = costPerAuthor > 0 
        ? Math.floor(grant.amount / costPerAuthor) 
        : grant.targetAuthorCount;
      const surplusAuthors = potentialAuthors - grant.targetAuthorCount;

      return res.json({
        grant: {
          id: grant.id,
          amount: grant.amount,
          grantDate: grant.grantDate,
          targetAuthorCount: grant.targetAuthorCount,
          grantPurpose: grant.grantPurpose,
          isLocked: !!grant.donorLockedAt,
          lockedAt: grant.donorLockedAt,
        },
        foundation: foundation ? {
          name: foundation.name,
          contactPerson: foundation.contactPerson,
        } : null,
        cohort: cohortInfo,
        authorsImpacted,
        metrics: {
          targetAuthors: grant.targetAuthorCount,
          actualAuthors: authorsImpacted.length,
          potentialAuthors,
          surplusAuthors,
          costPerAuthor,
          exceededExpectations: authorsImpacted.length > grant.targetAuthorCount,
        },
      });
    } catch (error) {
      console.error("Failed to generate impact report:", error);
      return res.status(500).json({ message: "Failed to generate impact report" });
    }
  });

  // ============================================
  // GRANT PROGRAMS ENDPOINTS
  // ============================================

  // Get all grant programs with foundation info
  app.get("/api/admin/grants/programs", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const allPrograms = await db.select().from(grantPrograms).orderBy(grantPrograms.deadline);
      
      // Enrich with foundation names
      const enrichedPrograms = await Promise.all(
        allPrograms.map(async (program) => {
          const [foundation] = await db.select().from(foundations).where(eq(foundations.id, program.foundationId));
          return {
            ...program,
            foundationName: foundation?.name || "Unknown",
            maxAmountFormatted: (program.maxAmount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }),
          };
        })
      );

      return res.json(enrichedPrograms);
    } catch (error) {
      console.error("Failed to fetch grant programs:", error);
      return res.status(500).json({ message: "Failed to fetch grant programs" });
    }
  });

  // Get programs for a specific foundation
  app.get("/api/admin/grants/foundations/:id/programs", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const foundationId = parseInt(req.params.id);

    try {
      const programs = await db.select()
        .from(grantPrograms)
        .where(eq(grantPrograms.foundationId, foundationId))
        .orderBy(grantPrograms.deadline);

      return res.json(programs);
    } catch (error) {
      console.error("Failed to fetch foundation programs:", error);
      return res.status(500).json({ message: "Failed to fetch foundation programs" });
    }
  });

  // Create a new grant program
  app.post("/api/admin/grants/programs", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { foundationId, programName, maxAmount, openDate, deadline, fundedItems, eligibilityNotes, twoYearRestriction, applicationUrl, indieQuillAlignment, notes } = req.body;

    if (!foundationId || !programName || !maxAmount) {
      return res.status(400).json({ message: "Foundation, program name, and max amount are required" });
    }

    try {
      const [newProgram] = await db.insert(grantPrograms).values({
        foundationId,
        programName,
        maxAmount: Math.round(maxAmount * 100), // Convert to cents
        openDate: openDate ? new Date(openDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        fundedItems,
        eligibilityNotes,
        twoYearRestriction: twoYearRestriction || false,
        applicationUrl,
        indieQuillAlignment,
        notes,
      }).returning();

      // Create calendar alerts for this program
      if (deadline) {
        const deadlineDate = new Date(deadline);
        const alertDays = [7, 3, 1, 0];
        const alertTypes = ['deadline_warning', 'deadline_warning', 'deadline_critical', 'deadline_day'] as const;
        
        for (let i = 0; i < alertDays.length; i++) {
          const alertDate = new Date(deadlineDate);
          alertDate.setDate(alertDate.getDate() - alertDays[i]);
          
          if (alertDate >= new Date()) {
            await db.insert(grantCalendarAlerts).values({
              programId: newProgram.id,
              alertType: alertTypes[i],
              daysBefore: alertDays[i],
              alertDate,
            });
          }
        }
      }

      await logAuditEvent(
        req.session.userId,
        "create_grant_program",
        "grant_programs",
        newProgram.id.toString(),
        `Created grant program: ${programName}`,
        getClientIp(req),
      );

      return res.status(201).json(newProgram);
    } catch (error) {
      console.error("Failed to create grant program:", error);
      return res.status(500).json({ message: "Failed to create grant program" });
    }
  });

  // Update grant program status
  app.patch("/api/admin/grants/programs/:id/status", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const programId = parseInt(req.params.id);
    const { applicationStatus, lastAwardedYear } = req.body;

    try {
      const updateData: any = { updatedAt: new Date() };
      if (applicationStatus) updateData.applicationStatus = applicationStatus;
      if (lastAwardedYear !== undefined) updateData.lastAwardedYear = lastAwardedYear;

      const [updated] = await db.update(grantPrograms)
        .set(updateData)
        .where(eq(grantPrograms.id, programId))
        .returning();

      await logAuditEvent(
        req.session.userId,
        "update_grant_program_status",
        "grant_programs",
        programId.toString(),
        `Updated program status to: ${applicationStatus}`,
        getClientIp(req),
      );

      return res.json(updated);
    } catch (error) {
      console.error("Failed to update program status:", error);
      return res.status(500).json({ message: "Failed to update program status" });
    }
  });

  // Update grant program details
  app.put("/api/admin/grants/programs/:id", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const programId = parseInt(req.params.id);
    const { programName, maxAmount, openDate, deadline, fundedItems, eligibilityNotes, twoYearRestriction, applicationUrl, indieQuillAlignment, notes } = req.body;

    try {
      const [updated] = await db.update(grantPrograms)
        .set({
          programName,
          maxAmount: maxAmount ? Math.round(maxAmount * 100) : undefined,
          openDate: openDate ? new Date(openDate) : null,
          deadline: deadline ? new Date(deadline) : null,
          fundedItems,
          eligibilityNotes,
          twoYearRestriction,
          applicationUrl,
          indieQuillAlignment,
          notes,
          updatedAt: new Date(),
        })
        .where(eq(grantPrograms.id, programId))
        .returning();

      return res.json(updated);
    } catch (error) {
      console.error("Failed to update grant program:", error);
      return res.status(500).json({ message: "Failed to update grant program" });
    }
  });

  // Get upcoming deadline alerts
  app.get("/api/admin/grants/alerts", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const upcomingAlerts = await db.select()
        .from(grantCalendarAlerts)
        .where(
          and(
            eq(grantCalendarAlerts.dismissed, false),
            gte(grantCalendarAlerts.alertDate, now),
            lt(grantCalendarAlerts.alertDate, thirtyDaysFromNow)
          )
        )
        .orderBy(grantCalendarAlerts.alertDate);

      // Enrich with program and foundation info
      const enrichedAlerts = await Promise.all(
        upcomingAlerts.map(async (alert) => {
          const [program] = await db.select().from(grantPrograms).where(eq(grantPrograms.id, alert.programId));
          const [foundation] = program ? await db.select().from(foundations).where(eq(foundations.id, program.foundationId)) : [null];
          
          return {
            ...alert,
            programName: program?.programName || "Unknown",
            foundationName: foundation?.name || "Unknown",
            deadline: program?.deadline,
            maxAmount: program?.maxAmount,
          };
        })
      );

      return res.json(enrichedAlerts);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      return res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  // Dismiss an alert
  app.patch("/api/admin/grants/alerts/:id/dismiss", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const alertId = parseInt(req.params.id);

    try {
      await db.update(grantCalendarAlerts)
        .set({ dismissed: true })
        .where(eq(grantCalendarAlerts.id, alertId));

      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
      return res.status(500).json({ message: "Failed to dismiss alert" });
    }
  });

  // ============================================
  // ORGANIZATION CREDENTIALS ENDPOINTS
  // ============================================

  // Get all credentials
  app.get("/api/admin/credentials", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const credentials = await db.select().from(organizationCredentials).orderBy(organizationCredentials.credentialType);
      
      // Mask sensitive values
      const maskedCredentials = credentials.map(cred => ({
        ...cred,
        credentialValue: cred.credentialValue.length > 4 
          ? `****${cred.credentialValue.slice(-4)}` 
          : "****",
      }));

      return res.json(maskedCredentials);
    } catch (error) {
      console.error("Failed to fetch credentials:", error);
      return res.status(500).json({ message: "Failed to fetch credentials" });
    }
  });

  // Add a credential
  app.post("/api/admin/credentials", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { credentialType, credentialValue, platformName, verifiedAt, expiresAt, notes } = req.body;

    if (!credentialType || !credentialValue) {
      return res.status(400).json({ message: "Credential type and value are required" });
    }

    try {
      const [newCredential] = await db.insert(organizationCredentials).values({
        credentialType,
        credentialValue,
        platformName,
        verifiedAt: verifiedAt ? new Date(verifiedAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes,
        createdBy: req.session.userId,
      }).returning();

      await logAuditEvent(
        req.session.userId,
        "add_credential",
        "organization_credentials",
        newCredential.id.toString(),
        `Added ${credentialType} credential`,
        getClientIp(req),
      );

      return res.status(201).json({
        ...newCredential,
        credentialValue: `****${newCredential.credentialValue.slice(-4)}`,
      });
    } catch (error) {
      console.error("Failed to add credential:", error);
      return res.status(500).json({ message: "Failed to add credential" });
    }
  });

  // ============================================
  // PILOT LEDGER ENDPOINTS
  // ============================================

  app.get("/api/admin/ledger", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const allEntries = await db.select().from(pilotLedger).orderBy(desc(pilotLedger.transactionDate));

      const entriesWithAuthors = await Promise.all(
        allEntries.map(async (entry) => {
          let authorName = null;
          if (entry.linkedAuthorId) {
            const [app] = await db.select({
              firstName: users.firstName,
              lastName: users.lastName,
            })
            .from(applications)
            .leftJoin(users, eq(applications.userId, users.id))
            .where(eq(applications.id, entry.linkedAuthorId));
            
            if (app) {
              authorName = `${app.firstName} ${app.lastName}`;
            }
          }
          
          return {
            id: entry.id,
            transactionDate: entry.transactionDate.toISOString(),
            type: entry.type,
            amount: entry.amount,
            description: entry.description,
            category: entry.category,
            linkedAuthorId: entry.linkedAuthorId,
            authorName,
            createdAt: entry.createdAt.toISOString(),
          };
        })
      );

      const totalIncome = allEntries
        .filter(e => e.type === "income")
        .reduce((sum, e) => sum + e.amount, 0);
      
      const totalExpenses = allEntries
        .filter(e => e.type === "expense")
        .reduce((sum, e) => sum + e.amount, 0);

      const isbnExpenses = allEntries.filter(e => e.category === "isbn").length;
      const isbnArbitrageSurplus = isbnExpenses * 11925;

      const authorBreakdown: Record<number, {
        authorId: number;
        authorName: string;
        pseudonym: string | null;
        sponsorshipReceived: number;
        totalSpent: number;
        transactions: typeof entriesWithAuthors;
      }> = {};

      for (const entry of entriesWithAuthors) {
        if (entry.linkedAuthorId) {
          if (!authorBreakdown[entry.linkedAuthorId]) {
            const [app] = await db.select({
              firstName: users.firstName,
              lastName: users.lastName,
              pseudonym: applications.pseudonym,
            })
            .from(applications)
            .leftJoin(users, eq(applications.userId, users.id))
            .where(eq(applications.id, entry.linkedAuthorId));

            authorBreakdown[entry.linkedAuthorId] = {
              authorId: entry.linkedAuthorId,
              authorName: app ? `${app.firstName} ${app.lastName}` : `Author ${entry.linkedAuthorId}`,
              pseudonym: app?.pseudonym || null,
              sponsorshipReceived: 0,
              totalSpent: 0,
              transactions: [],
            };
          }

          authorBreakdown[entry.linkedAuthorId].transactions.push(entry);
          if (entry.type === "income" && entry.category === "sponsorship") {
            authorBreakdown[entry.linkedAuthorId].sponsorshipReceived += entry.amount;
          } else if (entry.type === "expense") {
            authorBreakdown[entry.linkedAuthorId].totalSpent += entry.amount;
          }
        }
      }

      const authorBreakdownArray = Object.values(authorBreakdown).map(author => ({
        ...author,
        remaining: author.sponsorshipReceived - author.totalSpent,
      }));

      return res.json({
        entries: entriesWithAuthors,
        metrics: {
          totalIncome,
          totalExpenses,
          netBalance: totalIncome - totalExpenses,
          isbnArbitrageSurplus,
          reinvestableFunds: isbnArbitrageSurplus,
          authorBreakdown: authorBreakdownArray,
        },
      });
    } catch (error) {
      console.error("Failed to fetch ledger:", error);
      return res.status(500).json({ message: "Failed to fetch ledger data" });
    }
  });

  app.post("/api/admin/ledger", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId));
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { transactionDate, type, amount, description, category, linkedAuthorId } = req.body;

      if (!transactionDate || !type || !amount || !description) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const [newEntry] = await db.insert(pilotLedger).values({
        transactionDate: new Date(transactionDate),
        type,
        amount,
        description,
        category: category || null,
        linkedAuthorId: linkedAuthorId || null,
        recordedBy: req.session.userId,
      }).returning();

      await logAuditEvent(
        req.session.userId,
        "ledger_entry_created",
        "pilot_ledger",
        newEntry.id,
        getClientIp(req),
        { type, amount, description }
      );

      return res.json({ message: "Transaction recorded", entry: newEntry });
    } catch (error) {
      console.error("Failed to add ledger entry:", error);
      return res.status(500).json({ message: "Failed to add transaction" });
    }
  });
}

// ==================== DONATION API ====================

export async function registerDonationRoutes(app: Express) {
  const stripeClientModule = await import('./stripeClient');
  const { getUncachableStripeClient, getStripePublishableKey } = stripeClientModule;

  // Get Stripe publishable key for frontend
  app.get("/api/stripe/publishable-key", async (_req: Request, res: Response) => {
    try {
      const publishableKey = await getStripePublishableKey();
      return res.json({ publishableKey });
    } catch (error) {
      console.error("Failed to get Stripe publishable key:", error);
      return res.status(500).json({ message: "Stripe not configured" });
    }
  });

  // Create donation checkout session
  app.post("/api/donations/checkout", async (req: Request, res: Response) => {
    const { amount, donorName, donorEmail, message, tier } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ message: "Minimum donation is $1.00" });
    }

    // Server-side tier validation - enforce tier ranges
    const validTiers = ['micro', 'supporter', 'champion', 'sponsor'];
    const effectiveTier = validTiers.includes(tier) ? tier : 'micro';
    
    // Validate amount matches tier range (amounts in cents)
    const tierRanges: Record<string, { min: number; max: number }> = {
      micro: { min: 100, max: 2500 },        // $1 - $25
      supporter: { min: 2600, max: 10000 },  // $26 - $100
      champion: { min: 10100, max: 59900 },  // $101 - $599
      sponsor: { min: 77700, max: 77700 },   // $777 fixed
    };

    const range = tierRanges[effectiveTier];
    if (amount < range.min || amount > range.max) {
      return res.status(400).json({ 
        message: `Amount $${(amount / 100).toFixed(2)} is not valid for ${effectiveTier} tier. Expected range: $${(range.min / 100).toFixed(2)} - $${(range.max / 100).toFixed(2)}` 
      });
    }

    try {
      const stripe = await getUncachableStripeClient();
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: effectiveTier === 'sponsor' 
                  ? "Author's Kit Sponsorship ($777)" 
                  : `Donation to The Indie Quill Collective`,
                description: effectiveTier === 'sponsor'
                  ? "Sponsor one full publication cycle for an emerging author"
                  : "Support emerging authors in their publishing journey",
                images: [],
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${protocol}://${domain}/donations/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${protocol}://${domain}/donations`,
        customer_email: donorEmail || undefined,
        metadata: {
          donorName: donorName || 'Anonymous',
          message: message || '',
          tier: effectiveTier,
          source: 'indie_quill_collective',
        },
        billing_address_collection: 'required',
      });

      return res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("Failed to create checkout session:", error);
      return res.status(500).json({ message: error.message || "Failed to create checkout session" });
    }
  });

  // Create recurring subscription checkout session
  app.post("/api/donations/subscribe", async (req: Request, res: Response) => {
    const { amount, donorName, donorEmail, message, tier } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ message: "Minimum recurring donation is $1.00" });
    }

    // Validate tier range
    const validTiers = ['micro', 'supporter', 'champion', 'sponsor'];
    const effectiveTier = validTiers.includes(tier) ? tier : 'micro';
    
    const tierRanges: Record<string, { min: number; max: number }> = {
      micro: { min: 100, max: 2500 },
      supporter: { min: 2600, max: 10000 },
      champion: { min: 10100, max: 59900 },
      sponsor: { min: 60000, max: 60000 },
    };

    const range = tierRanges[effectiveTier];
    if (amount < range.min || amount > range.max) {
      return res.status(400).json({ 
        message: `Amount $${(amount / 100).toFixed(2)} is not valid for ${effectiveTier} tier` 
      });
    }

    try {
      const stripe = await getUncachableStripeClient();
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const protocol = domain.includes('localhost') ? 'http' : 'https';

      // Create a price object for the subscription
      const price = await stripe.prices.create({
        unit_amount: amount,
        currency: 'usd',
        recurring: { interval: 'month' },
        product_data: {
          name: `Monthly ${effectiveTier === 'sponsor' ? "Author's Kit Sponsorship" : "Donation"} - The Indie Quill Collective`,
        },
      });
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${protocol}://${domain}/donations/success?session_id={CHECKOUT_SESSION_ID}&recurring=true`,
        cancel_url: `${protocol}://${domain}/donations`,
        customer_email: donorEmail || undefined,
        metadata: {
          donorName: donorName || 'Anonymous',
          message: message || '',
          tier: effectiveTier,
          source: 'indie_quill_collective',
          recurring: 'true',
        },
        subscription_data: {
          metadata: {
            donorName: donorName || 'Anonymous',
            tier: effectiveTier,
            source: 'indie_quill_collective',
          },
        },
        billing_address_collection: 'required',
      });

      return res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("Failed to create subscription session:", error);
      return res.status(500).json({ message: error.message || "Failed to create subscription" });
    }
  });

  // Verify donation success (for thank you page)
  app.get("/api/donations/verify/:sessionId", async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID required" });
    }

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      const isSubscription = session.mode === 'subscription';
      
      // For subscriptions, check if the subscription is active
      if (isSubscription) {
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          return res.json({
            success: subscription.status === 'active' || subscription.status === 'trialing',
            amount: session.amount_total,
            donorName: session.metadata?.donorName || 'Anonymous',
            email: session.customer_details?.email,
            recurring: true,
            interval: 'month',
            status: subscription.status,
          });
        }
        return res.json({ success: false, status: 'pending', recurring: true });
      }

      // For one-time payments
      if (session.payment_status === 'paid') {
        return res.json({
          success: true,
          amount: session.amount_total,
          donorName: session.metadata?.donorName || 'Anonymous',
          email: session.customer_details?.email,
          recurring: false,
        });
      } else {
        return res.json({ success: false, status: session.payment_status, recurring: false });
      }
    } catch (error: any) {
      console.error("Failed to verify donation:", error);
      return res.status(500).json({ message: "Failed to verify donation" });
    }
  });

  // ============================================
  // STUDENT DASHBOARD API ROUTES
  // ============================================

  // Get curriculum modules
  app.get("/api/student/curriculum", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const modules = await db.execute(sql`
        SELECT id, title, description, order_index, duration_hours, content_type, is_published
        FROM curriculum_modules
        WHERE is_published = true
        ORDER BY order_index ASC
      `);
      res.json(modules.rows || []);
    } catch (error) {
      console.error("Error fetching curriculum:", error);
      res.status(500).json({ message: "Failed to fetch curriculum" });
    }
  });

  // Get student's progress on modules
  app.get("/api/student/progress", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const progress = await db.execute(sql`
        SELECT module_id, percent_complete, hours_spent, started_at, completed_at
        FROM student_curriculum_progress
        WHERE user_id = ${req.session.userId}
      `);
      res.json(progress.rows || []);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Get student's upcoming meetings
  app.get("/api/student/meetings", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const meetings = await db.execute(sql`
        SELECT m.id, m.title, m.description, m.start_time, m.end_time, m.join_url, m.meeting_type,
               u.first_name || ' ' || u.last_name as mentor_name
        FROM meetings m
        LEFT JOIN users u ON m.mentor_id = u.id
        LEFT JOIN meeting_attendees ma ON m.id = ma.meeting_id
        WHERE ma.user_id = ${req.session.userId}
           OR m.meeting_type = 'group'
        ORDER BY m.start_time ASC
      `);
      res.json(meetings.rows || []);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  // Get student's TABE scores
  app.get("/api/student/tabe-scores", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const scores = await db.execute(sql`
        SELECT id, test_type, scale_score, grade_equivalent, efl_level, is_baseline, test_date
        FROM tabe_assessments
        WHERE user_id = ${req.session.userId}
        ORDER BY test_date DESC
      `);
      res.json(scores.rows || []);
    } catch (error) {
      console.error("Error fetching TABE scores:", error);
      res.status(500).json({ message: "Failed to fetch TABE scores" });
    }
  });

  // Get student stats summary
  app.get("/api/student/curriculum/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const moduleId = parseInt(req.params.id);
    if (isNaN(moduleId)) {
      return res.status(400).json({ error: "Invalid module ID" });
    }

    try {
      const result = await db.execute(sql`
        SELECT id, title, description, content, order_index as "orderIndex", 
               duration_hours as "durationHours", content_type as "contentType"
        FROM curriculum_modules
        WHERE id = ${moduleId} AND is_published = true
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Module not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching module:", error);
      res.status(500).json({ error: "Failed to fetch module" });
    }
  });

  app.post("/api/student/progress", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { moduleId, percentComplete } = req.body;
    if (!moduleId || percentComplete === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const existingResult = await db.execute(sql`
        SELECT id FROM student_curriculum_progress
        WHERE user_id = ${req.session.userId} AND module_id = ${moduleId}
      `);

      const now = new Date().toISOString();
      const isComplete = percentComplete >= 100;

      if (existingResult.rows.length > 0) {
        await db.execute(sql`
          UPDATE student_curriculum_progress
          SET percent_complete = ${percentComplete},
              completed_at = ${isComplete ? now : null},
              updated_at = ${now}
          WHERE user_id = ${req.session.userId} AND module_id = ${moduleId}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO student_curriculum_progress (user_id, module_id, percent_complete, started_at, completed_at)
          VALUES (${req.session.userId}, ${moduleId}, ${percentComplete}, ${now}, ${isComplete ? now : null})
        `);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating progress:", error);
      res.status(500).json({ error: "Failed to update progress" });
    }
  });

  app.get("/api/student/drafts", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const result = await db.execute(sql`
        SELECT id, title, content, word_count as "wordCount", 
               is_published as "isPublished", published_at as "publishedAt",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM drafting_documents
        WHERE user_id = ${req.session.userId}
        ORDER BY updated_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      res.status(500).json({ error: "Failed to fetch drafts" });
    }
  });

  app.post("/api/student/drafts", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { title } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    try {
      const result = await db.execute(sql`
        INSERT INTO drafting_documents (user_id, title, content, word_count)
        VALUES (${req.session.userId}, ${title.trim()}, '', 0)
        RETURNING id, title, content, word_count as "wordCount", 
                  is_published as "isPublished", published_at as "publishedAt",
                  created_at as "createdAt", updated_at as "updatedAt"
      `);

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error creating draft:", error);
      res.status(500).json({ error: "Failed to create draft" });
    }
  });

  app.put("/api/student/drafts/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const draftId = parseInt(req.params.id);
    if (isNaN(draftId)) {
      return res.status(400).json({ error: "Invalid draft ID" });
    }

    const { title, content } = req.body;
    const wordCount = content ? content.trim().split(/\s+/).filter((w: string) => w.length > 0).length : 0;

    try {
      const result = await db.execute(sql`
        UPDATE drafting_documents
        SET title = COALESCE(${title}, title),
            content = COALESCE(${content}, content),
            word_count = ${wordCount},
            updated_at = NOW()
        WHERE id = ${draftId} AND user_id = ${req.session.userId}
        RETURNING id, title, content, word_count as "wordCount", 
                  is_published as "isPublished", published_at as "publishedAt",
                  created_at as "createdAt", updated_at as "updatedAt"
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Draft not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating draft:", error);
      res.status(500).json({ error: "Failed to update draft" });
    }
  });

  app.delete("/api/student/drafts/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const draftId = parseInt(req.params.id);
    if (isNaN(draftId)) {
      return res.status(400).json({ error: "Invalid draft ID" });
    }

    try {
      const result = await db.execute(sql`
        DELETE FROM drafting_documents
        WHERE id = ${draftId} AND user_id = ${req.session.userId}
        RETURNING id
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Draft not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting draft:", error);
      res.status(500).json({ error: "Failed to delete draft" });
    }
  });

  // ============ MENTOR ENDPOINTS ============

  app.get("/api/mentor/students", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const result = await db.execute(sql`
        SELECT 
          u.id, u.first_name as "firstName", u.last_name as "lastName", u.email,
          sp.enrolled_at as "enrolledAt",
          COALESCE(sal.total_hours, 0) as "hoursActive",
          COALESCE(dd.total_words, 0) as "wordCount",
          COALESCE(scp.avg_progress, 0) as "courseProgress",
          sal.last_activity as "lastActivity"
        FROM mentor_student_assignments msa
        JOIN users u ON u.id = msa.student_id
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN (
          SELECT user_id, SUM(hours_active) as total_hours, MAX(created_at) as last_activity
          FROM student_activity_logs GROUP BY user_id
        ) sal ON sal.user_id = u.id
        LEFT JOIN (
          SELECT user_id, SUM(word_count) as total_words FROM drafting_documents GROUP BY user_id
        ) dd ON dd.user_id = u.id
        LEFT JOIN (
          SELECT user_id, AVG(percent_complete) as avg_progress FROM student_curriculum_progress GROUP BY user_id
        ) scp ON scp.user_id = u.id
        WHERE msa.mentor_id = ${req.session.userId}
        ORDER BY u.first_name, u.last_name
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching mentor students:", error);
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  app.get("/api/mentor/meetings", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const result = await db.execute(sql`
        SELECT 
          m.id, m.title, m.description, m.start_time as "startTime", 
          m.end_time as "endTime", m.meeting_type as "meetingType",
          CONCAT(u.first_name, ' ', u.last_name) as "studentName"
        FROM meetings m
        JOIN meeting_attendees ma ON ma.meeting_id = m.id
        JOIN users u ON u.id = ma.user_id
        WHERE m.host_id = ${req.session.userId}
        ORDER BY m.start_time DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching mentor meetings:", error);
      res.status(500).json({ error: "Failed to fetch meetings" });
    }
  });

  app.post("/api/mentor/meetings", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { studentId, title, description, startTime, endTime, meetingType } = req.body;
    if (!studentId || !title || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Validate mentor-student assignment
      const assignmentCheck = await db.execute(sql`
        SELECT id FROM mentor_student_assignments 
        WHERE mentor_id = ${req.session.userId} AND student_id = ${parseInt(studentId)}
      `);

      if (assignmentCheck.rows.length === 0) {
        return res.status(403).json({ error: "You can only schedule meetings with your assigned students" });
      }

      const meetingResult = await db.execute(sql`
        INSERT INTO meetings (host_id, title, description, start_time, end_time, meeting_type, provider)
        VALUES (${req.session.userId}, ${title}, ${description || null}, ${startTime}, ${endTime}, ${meetingType || 'one_on_one'}, 'google_meet')
        RETURNING id, title, description, start_time as "startTime", end_time as "endTime", meeting_type as "meetingType"
      `);

      const meeting = meetingResult.rows[0];
      if (meeting) {
        await db.execute(sql`
          INSERT INTO meeting_attendees (meeting_id, user_id)
          VALUES (${(meeting as any).id}, ${parseInt(studentId)})
        `);
      }

      res.json(meeting);
    } catch (error) {
      console.error("Error creating meeting:", error);
      res.status(500).json({ error: "Failed to create meeting" });
    }
  });

  app.get("/api/mentor/stats", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const studentsResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM mentor_student_assignments WHERE mentor_id = ${req.session.userId}
      `);

      const progressResult = await db.execute(sql`
        SELECT AVG(scp.percent_complete) as avg_progress
        FROM mentor_student_assignments msa
        JOIN student_curriculum_progress scp ON scp.user_id = msa.student_id
        WHERE msa.mentor_id = ${req.session.userId}
      `);

      const hoursResult = await db.execute(sql`
        SELECT AVG(sal.total_hours) as avg_hours
        FROM mentor_student_assignments msa
        JOIN (SELECT user_id, SUM(hours_active) as total_hours FROM student_activity_logs GROUP BY user_id) sal
          ON sal.user_id = msa.student_id
        WHERE msa.mentor_id = ${req.session.userId}
      `);

      const meetingsResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM meetings 
        WHERE host_id = ${req.session.userId} AND start_time > NOW()
      `);

      res.json({
        totalStudents: Number((studentsResult.rows[0] as any)?.count) || 0,
        avgProgress: Math.round(Number((progressResult.rows[0] as any)?.avg_progress) || 0),
        avgHoursActive: Math.round(Number((hoursResult.rows[0] as any)?.avg_hours) || 0),
        upcomingMeetings: Number((meetingsResult.rows[0] as any)?.count) || 0
      });
    } catch (error) {
      console.error("Error fetching mentor stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ============ PUBLISH ENDPOINT ============

  app.post("/api/student/drafts/:id/publish", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const draftId = parseInt(req.params.id);
    if (isNaN(draftId)) {
      return res.status(400).json({ error: "Invalid draft ID" });
    }

    try {
      const draftResult = await db.execute(sql`
        SELECT id, title, content, word_count as "wordCount"
        FROM drafting_documents
        WHERE id = ${draftId} AND user_id = ${req.session.userId}
      `);

      if (draftResult.rows.length === 0) {
        return res.status(404).json({ error: "Draft not found" });
      }

      const draft = draftResult.rows[0] as any;
      
      if (draft.wordCount < 500) {
        return res.status(400).json({ error: "Manuscript must be at least 500 words to publish" });
      }

      await db.execute(sql`
        UPDATE drafting_documents
        SET is_published = true, published_at = NOW()
        WHERE id = ${draftId}
      `);

      res.json({ success: true, message: "Your Legacy Work has been submitted for review!" });
    } catch (error) {
      console.error("Error publishing draft:", error);
      res.status(500).json({ error: "Failed to publish draft" });
    }
  });

  app.get("/api/student/stats", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Get total hours active
      const hoursResult = await db.execute(sql`
        SELECT COALESCE(SUM(minutes_active), 0) / 60 as total_hours
        FROM student_activity_logs
        WHERE user_id = ${req.session.userId}
      `);

      // Get total word count from drafts
      const wordCountResult = await db.execute(sql`
        SELECT COALESCE(SUM(word_count), 0) as total_words
        FROM drafting_documents
        WHERE user_id = ${req.session.userId}
      `);

      // Get module completion stats
      const progressResult = await db.execute(sql`
        SELECT 
          COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed,
          (SELECT COUNT(*) FROM curriculum_modules WHERE is_published = true) as total
        FROM student_curriculum_progress
        WHERE user_id = ${req.session.userId}
      `);

      // Calculate overall progress
      const avgProgressResult = await db.execute(sql`
        SELECT COALESCE(AVG(percent_complete), 0) as avg_progress
        FROM student_curriculum_progress
        WHERE user_id = ${req.session.userId}
      `);

      const hours = hoursResult.rows?.[0] || { total_hours: 0 };
      const words = wordCountResult.rows?.[0] || { total_words: 0 };
      const progress = progressResult.rows?.[0] || { completed: 0, total: 0 };
      const avgProgress = avgProgressResult.rows?.[0] || { avg_progress: 0 };

      res.json({
        totalHoursActive: Math.round(Number(hours.total_hours) || 0),
        totalWordCount: Number(words.total_words) || 0,
        overallProgress: Math.round(Number(avgProgress.avg_progress) || 0),
        modulesCompleted: Number(progress.completed) || 0,
        totalModules: Number(progress.total) || 0
      });
    } catch (error) {
      console.error("Error fetching student stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ============ FAMILY LITERACY ENDPOINTS ============

  // Get family dashboard data
  app.get("/api/family/dashboard", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Get user's family unit
      const familyResult = await db.execute(sql`
        SELECT fu.*, sp.family_role
        FROM family_units fu
        JOIN student_profiles sp ON sp.family_unit_id = fu.id
        WHERE sp.user_id = ${req.session.userId}
      `);

      if (familyResult.rows.length === 0) {
        return res.json(null);
      }

      const family = familyResult.rows[0] as any;

      // Get family members with their stats
      const membersResult = await db.execute(sql`
        SELECT 
          u.id, u.first_name as "firstName", u.last_name as "lastName",
          sp.family_role as "familyRole",
          COALESCE((SELECT SUM(minutes_active) / 60 FROM student_activity_logs WHERE user_id = u.id), 0) as "hoursActive",
          COALESCE((SELECT SUM(word_count) FROM drafting_documents WHERE user_id = u.id), 0) as "wordCount",
          COALESCE((SELECT AVG(percent_complete) FROM student_curriculum_progress WHERE user_id = u.id), 0) as "courseProgress"
        FROM users u
        JOIN student_profiles sp ON sp.user_id = u.id
        WHERE sp.family_unit_id = ${family.id}
      `);

      // Calculate totals
      const totalHoursActive = membersResult.rows.reduce((sum: number, m: any) => sum + Number(m.hoursActive || 0), 0);
      const totalWordCount = membersResult.rows.reduce((sum: number, m: any) => sum + Number(m.wordCount || 0), 0);
      const avgCourseProgress = membersResult.rows.length > 0
        ? membersResult.rows.reduce((sum: number, m: any) => sum + Number(m.courseProgress || 0), 0) / membersResult.rows.length
        : 0;

      res.json({
        id: family.id,
        familyName: family.family_name,
        targetPactHours: family.target_pact_hours,
        totalPactMinutes: family.total_pact_minutes,
        anthologyTitle: family.anthology_title,
        anthologyContent: family.anthology_content,
        anthologyWordCount: family.anthology_word_count,
        members: membersResult.rows.map((m: any) => ({
          ...m,
          hoursActive: Math.round(Number(m.hoursActive) || 0),
          wordCount: Number(m.wordCount) || 0,
          courseProgress: Math.round(Number(m.courseProgress) || 0),
        })),
        totalHoursActive: Math.round(totalHoursActive),
        totalWordCount,
        avgCourseProgress: Math.round(avgCourseProgress),
      });
    } catch (error) {
      console.error("Error fetching family dashboard:", error);
      res.status(500).json({ error: "Failed to fetch family data" });
    }
  });

  // Get PACT sessions for family
  app.get("/api/family/pact-sessions", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const familyResult = await db.execute(sql`
        SELECT fu.id FROM family_units fu
        JOIN student_profiles sp ON sp.family_unit_id = fu.id
        WHERE sp.user_id = ${req.session.userId}
      `);

      if (familyResult.rows.length === 0) {
        return res.json([]);
      }

      const familyId = (familyResult.rows[0] as any).id;

      const sessions = await db.execute(sql`
        SELECT id, session_title as "sessionTitle", session_type as "sessionType",
               duration_minutes as "durationMinutes", words_written as "wordsWritten",
               created_at as "createdAt"
        FROM pact_sessions
        WHERE family_unit_id = ${familyId}
        ORDER BY created_at DESC
        LIMIT 20
      `);

      res.json(sessions.rows);
    } catch (error) {
      console.error("Error fetching PACT sessions:", error);
      res.status(500).json({ error: "Failed to fetch PACT sessions" });
    }
  });

  // Start PACT session
  app.post("/api/family/pact-sessions/start", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { title, type, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Session title is required" });
    }

    try {
      const familyResult = await db.execute(sql`
        SELECT fu.id FROM family_units fu
        JOIN student_profiles sp ON sp.family_unit_id = fu.id
        WHERE sp.user_id = ${req.session.userId}
      `);

      if (familyResult.rows.length === 0) {
        return res.status(404).json({ error: "No family unit found" });
      }

      const familyId = (familyResult.rows[0] as any).id;

      const result = await db.execute(sql`
        INSERT INTO pact_sessions (family_unit_id, session_title, session_type, activity_description, start_time, created_by)
        VALUES (${familyId}, ${title}, ${type || 'writing'}, ${description || null}, NOW(), ${req.session.userId})
        RETURNING id, session_title as "sessionTitle", start_time as "startTime"
      `);

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error starting PACT session:", error);
      res.status(500).json({ error: "Failed to start PACT session" });
    }
  });

  // End PACT session
  app.post("/api/family/pact-sessions/end", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { wordsWritten } = req.body;

    try {
      const familyResult = await db.execute(sql`
        SELECT fu.id FROM family_units fu
        JOIN student_profiles sp ON sp.family_unit_id = fu.id
        WHERE sp.user_id = ${req.session.userId}
      `);

      if (familyResult.rows.length === 0) {
        return res.status(404).json({ error: "No family unit found" });
      }

      const familyId = (familyResult.rows[0] as any).id;

      // Get the active session
      const activeSession = await db.execute(sql`
        SELECT id, start_time FROM pact_sessions
        WHERE family_unit_id = ${familyId} AND end_time IS NULL
        ORDER BY start_time DESC LIMIT 1
      `);

      if (activeSession.rows.length === 0) {
        return res.status(404).json({ error: "No active PACT session" });
      }

      const session = activeSession.rows[0] as any;
      const startTime = new Date(session.start_time);
      const durationMinutes = Math.round((Date.now() - startTime.getTime()) / 60000);

      // Update session with end time and duration
      await db.execute(sql`
        UPDATE pact_sessions
        SET end_time = NOW(), duration_minutes = ${durationMinutes}, words_written = ${wordsWritten || 0}
        WHERE id = ${session.id}
      `);

      // Update family's total PACT minutes
      await db.execute(sql`
        UPDATE family_units
        SET total_pact_minutes = total_pact_minutes + ${durationMinutes}, updated_at = NOW()
        WHERE id = ${familyId}
      `);

      res.json({ success: true, durationMinutes });
    } catch (error) {
      console.error("Error ending PACT session:", error);
      res.status(500).json({ error: "Failed to end PACT session" });
    }
  });
}
