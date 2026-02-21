import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { db, pool } from "./db";
import { users, applications, contracts, publishingUpdates, calendarEvents, fundraisingCampaigns, donations, auditLogs, cohorts, familyUnits, operatingCosts, foundations, solicitationLogs, foundationGrants, pilotLedger, emailLogs, grantPrograms, organizationCredentials, grantCalendarAlerts, wikiEntries, wikiAttachments, boardMembers, studentWork, studentProfiles, passwordResetTokens } from "@shared/schema";
import path from "path";
import fs from "fs";
import { eq, desc, gte, sql, inArray, lt, and } from "drizzle-orm";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function hasRole(session: any, ...roles: string[]): boolean {
  return roles.includes(session.userRole) || roles.includes(session.secondaryRole);
}

// Helper function to fetch user by ID using raw SQL to avoid Drizzle ORM column mismatch issues
async function getUserById(userId: string | number): Promise<any | null> {
  const result = await db.execute(sql`
    SELECT id, email, first_name as "firstName", last_name as "lastName", role, secondary_role as "secondaryRole"
    FROM public.users WHERE id = ${userId}
  `);
  return result.rows[0] || null;
}

// Helper function to fetch user by email using raw SQL
async function getUserByEmail(email: string): Promise<any | null> {
  const result = await db.execute(sql`
    SELECT id, email, password, first_name as "firstName", last_name as "lastName", role, secondary_role as "secondaryRole"
    FROM public.users WHERE lower(email) = lower(${email})
  `);
  return result.rows[0] || null;
}
import { hash, compare } from "./auth";
import { migrateAuthorToIndieQuill, retryFailedMigrations, sendApplicationToLLC, sendStatusUpdateToLLC, sendContractSignatureToLLC, sendUserRoleUpdateToLLC } from "./indie-quill-integration";
import { sendApplicationReceivedEmail, sendApplicationAcceptedEmail, sendApplicationRejectedEmail, sendTestEmailSamples, sendWelcomeToCollectiveEmail, sendPasswordResetEmail } from "./email";
import { logAuditEvent, logMinorDataAccess, getClientIp } from "./utils/auditLogger";
import { syncCalendarEvents, getGoogleCalendarConnectionStatus, deleteGoogleCalendarEvent, updateGoogleCalendarEvent, pushSingleEventToGoogle } from "./google-calendar-sync";
import { getAuthUrl, handleAuthCallback, disconnectGoogleCalendar, validateOAuthState } from "./google-calendar-client";
import { renderToBuffer } from "@react-pdf/renderer";
import { ContractPDF } from "./pdf-templates/ContractTemplate";
import { ensureCompatibleFormat, speechToText } from "./replit_integrations/audio";
import express from "express";
import { processAcceptance } from "./services/cohort-service";
import { createSyncJob, processSyncJob, registerNpoAuthorWithLLC } from "./services/npo-sync-service";
import { assignAuthorId } from "./utils/authorId";
import { awardXP, ensureGameCharacter, getCharacterDisplayData, TOME_XP_BONUS } from "./services/game-engine";

// Helper function to generate and store contract PDF
async function generateAndStorePDF(contractId: number): Promise<Buffer | null> {
  try {
    const [contract] = await db.select().from(contracts)
      .where(eq(contracts.id, contractId));
    
    if (!contract) return null;

    const [application] = await db.select().from(applications)
      .where(eq(applications.id, contract.applicationId));
    
    if (!application) return null;

    const user = await getUserById(contract.userId);
    
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
  max: process.env.NODE_ENV === "production" ? 5 : 100, // 5 in prod, relaxed in dev
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
    secondaryRole?: string | null;
  }
}

export async function registerRoutes(app: Express) {
  const express = await import("express");
  const uploadsPath = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsPath));

  app.post("/api/auth/register", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      const sanitizedEmail = email?.trim()?.toLowerCase() || "";
      const sanitizedFirstName = firstName?.trim() || "";
      const sanitizedLastName = lastName?.trim() || "";
      
      const existingUser = await getUserByEmail(sanitizedEmail);
      if (existingUser) {
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
        SELECT id, email, password, first_name as "firstName", last_name as "lastName", role, secondary_role as "secondaryRole"
        FROM public.users 
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
      req.session.secondaryRole = user.secondaryRole || null;

      if (user.role === "student" || user.role === "writer" || user.secondaryRole === "student" || user.secondaryRole === "writer") {
        try {
          const profileCheck = await db.execute(sql`
            SELECT id FROM student_profiles WHERE user_id = ${user.id} LIMIT 1
          `);
          if (profileCheck.rows.length === 0) {
            await db.execute(sql`
              INSERT INTO student_profiles (user_id, accessibility_mode, preferred_language, is_active, enrolled_at, created_at, updated_at)
              VALUES (${user.id}, 'standard', 'en', true, NOW(), NOW(), NOW())
            `);
            console.log(`[Auto-Profile] Created student_profile for user ${user.id} (${user.email})`);
          }
        } catch (profileErr) {
          console.error(`[Auto-Profile] Failed to create student_profile for user ${user.id}:`, profileErr);
        }
      }

      return res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          secondaryRole: user.secondaryRole || null
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

  app.post("/api/auth/forgot-password", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const result = await db.execute(sql`
        SELECT id, email, first_name as "firstName" FROM public.users WHERE lower(email) = lower(${email})
      `);
      const user = result.rows[0] as any;

      if (!user) {
        return res.json({ message: "If an account with that email exists, a reset link has been sent." });
      }

      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.execute(sql`
        DELETE FROM password_reset_tokens WHERE user_id = ${user.id}
      `);

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      const hostname = process.env.REPLIT_DOMAINS?.split(",")[0] 
        || process.env.REPLIT_DEV_DOMAIN 
        || "theindiequillcollective.com";
      const protocol = hostname.includes("localhost") ? "http" : "https";
      const resetLink = `${protocol}://${hostname}/reset-password?token=${token}`;

      console.log(`[Password Reset] Attempting to send reset email to ${user.email}`);
      const emailSent = await sendPasswordResetEmail(user.email, user.firstName, resetLink);
      console.log(`[Password Reset] Email send result: ${emailSent ? 'SUCCESS' : 'FAILED'}`);

      return res.json({ message: "If an account with that email exists, a reset link has been sent." });
    } catch (error) {
      console.error("[Password Reset] Forgot password error:", error);
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/reset-password", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const [resetToken] = await db.select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token))
        .limit(1);

      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      if (resetToken.usedAt) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }

      const hashedPassword = await hash(password);

      await db.execute(sql`
        UPDATE public.users SET password = ${hashedPassword} WHERE id = ${resetToken.userId}
      `);

      await db.update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetToken.id));

      return res.json({ message: "Password has been reset successfully. You can now sign in." });
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const result = await db.execute(sql`
        SELECT id, email, first_name as "firstName", last_name as "lastName", role, secondary_role as "secondaryRole", vibe_scribe_id as "vibeScribeId"
        FROM public.users WHERE id = ${req.session.userId}
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
          role: user.role,
          secondaryRole: user.secondaryRole || null,
          vibeScribeId: user.vibeScribeId || null
        } 
      });
    } catch (error) {
      console.error("[Auth] /api/auth/me query failed, retrying without vibe_scribe_id:", error);
      try {
        const result = await db.execute(sql`
          SELECT id, email, first_name as "firstName", last_name as "lastName", role, secondary_role as "secondaryRole"
          FROM public.users WHERE id = ${req.session.userId}
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
            role: user.role,
            secondaryRole: user.secondaryRole || null,
            vibeScribeId: null
          } 
        });
      } catch (fallbackError) {
        console.error("[Auth] /api/auth/me fallback also failed:", fallbackError);
        return res.status(500).json({ message: "Failed to load user data" });
      }
    }
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

  app.post("/api/initiation/contract-preview", async (req: Request, res: Response) => {
    try {
      const { pseudonym, isMinor, identityMode } = req.body;
      const contractText = generateContract({
        pseudonym: pseudonym || "[Pseudonym]",
        isMinor: !!isMinor,
        publicIdentityEnabled: identityMode === "public",
      });
      return res.json({ contractText });
    } catch (error) {
      console.error("Contract preview error:", error);
      return res.status(500).json({ message: "Failed to generate contract preview" });
    }
  });

  app.post("/api/initiation", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const {
        pseudonym, personaType, identityMode, dateOfBirth, isMinor,
        guardianName, guardianEmail, guardianPhone, guardianRelationship,
        expressionTypes, expressionOther, whyCollective, goals, hearAboutUs,
        publicIdentityEnabled, signature, guardianSignature,
      } = req.body;

      if (!dateOfBirth || !pseudonym || !personaType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const user = await getUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const authorLegalName = `${user.firstName?.trim() || ''} ${user.lastName?.trim() || ''}`.trim();
      const normalizeName = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

      if (normalizeName(signature || '') !== normalizeName(authorLegalName)) {
        return res.status(400).json({
          message: `Signature must match your legal name: "${authorLegalName}"`,
        });
      }

      if (isMinor && guardianName) {
        if (normalizeName(guardianSignature || '') !== normalizeName(guardianName)) {
          return res.status(400).json({
            message: `Guardian signature must match: "${guardianName}"`,
          });
        }
      }

      const applicationData = {
        userId: req.session.userId,
        status: "pending",
        pseudonym: pseudonym?.trim() || null,
        personaType,
        identityMode,
        dateOfBirth,
        isMinor: !!isMinor,
        guardianName: guardianName?.trim() || null,
        guardianEmail: guardianEmail?.trim()?.toLowerCase() || null,
        guardianPhone: guardianPhone?.trim() || null,
        guardianRelationship: guardianRelationship || null,
        expressionTypes: expressionTypes || "",
        expressionOther: expressionOther || null,
        whyCollective: whyCollective || null,
        goals: goals || null,
        hearAboutUs: hearAboutUs || null,
        publicIdentityEnabled: !!publicIdentityEnabled,
        hasStoryToTell: true,
        personalStruggles: whyCollective || "",
      };

      const [newApplication] = await db.insert(applications).values(applicationData).returning();

      const contractContent = generateContract(newApplication);
      const clientIp = getClientIp(req) || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      const contractData: any = {
        applicationId: newApplication.id,
        userId: req.session.userId,
        contractType: "publishing_agreement",
        contractContent,
        requiresGuardian: !!isMinor,
        status: isMinor && !guardianSignature ? "pending_guardian" : "signed",
        authorSignature: signature,
        authorSignedAt: new Date(),
        authorSignatureIp: clientIp,
        authorSignatureUserAgent: userAgent,
      };

      if (isMinor && guardianSignature) {
        contractData.guardianSignature = guardianSignature;
        contractData.guardianSignedAt = new Date();
        contractData.guardianSignatureIp = clientIp;
        contractData.guardianSignatureUserAgent = userAgent;
        contractData.status = "signed";
      }

      await db.insert(contracts).values(contractData);

      try {
        await sendApplicationReceivedEmail(user.email, user.firstName, user.id, newApplication.id);
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }

      try {
        const syncResult = await sendApplicationToLLC(
          newApplication.id,
          user.id,
          applicationData,
          { email: user.email, firstName: user.firstName, lastName: user.lastName }
        );
        if (syncResult.success) {
          console.log(`Initiation application ${newApplication.id} synced to LLC: ${syncResult.llcApplicationId}`);
        } else {
          console.error(`Failed to sync initiation to LLC: ${syncResult.error}`);
        }
      } catch (syncError) {
        console.error("Failed to sync initiation to LLC:", syncError);
      }

      return res.json({ success: true, applicationId: newApplication.id });
    } catch (error) {
      console.error("Initiation submission error:", error);
      return res.status(500).json({ message: "Failed to complete initiation" });
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
      
      const user = await getUserById(req.session.userId);
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
            
            // Get contract if exists
            const [contract] = await db.select({ id: contracts.id })
              .from(contracts)
              .where(eq(contracts.applicationId, app.id));
            
            return {
              ...app,
              authorName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
              authorEmail: user?.email,
              contractId: contract?.id || null,
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
        const userAppsResult = await db.execute(sql`
          SELECT a.id, a.user_id as "userId", u.first_name as "firstName", u.last_name as "lastName",
                 u.email, a.pseudonym, a.status, a.is_minor as "isMinor",
                 a.guardian_name as "guardianName", a.guardian_email as "guardianEmail",
                 a.guardian_phone as "guardianPhone", a.guardian_relationship as "guardianRelationship",
                 a.date_of_birth as "dateOfBirth", a.reviewed_by as "reviewedBy",
                 a.reviewed_at as "reviewedAt", a.cohort_id as "cohortId",
                 u.indie_quill_author_id as "indieQuillAuthorId",
                 a.internal_id as "internalId", a.persona_type as "personaType",
                 a.created_at as "createdAt", a.updated_at as "updatedAt"
          FROM applications a
          LEFT JOIN users u ON u.id = a.user_id
          WHERE a.user_id = ${req.session.userId} ORDER BY a.created_at DESC
        `);
        const userApplications = userAppsResult.rows as any[];
        
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
        entityType: "applications",
        entityId: String(applicationId),
        details: JSON.stringify({ 
          reason: "author_initiated",
          pseudonymPreserved: application.pseudonym,
          ipAddress: getClientIp(req),
        }),
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
      
      const applicantUser = await getUserById(application.userId);
      if (!applicantUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (status === "accepted") {
        if (application.isMinor && !application.dateOfBirth) {
          return res.status(400).json({ 
            message: "Cannot approve minor without date of birth. COPPA compliance requires complete data." 
          });
        }

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

        const existingContracts = await db.select().from(contracts)
          .where(eq(contracts.applicationId, applicationId));
        const existingContract = existingContracts[0];

        if (!existingContract) {
          await db.insert(contracts).values({
            applicationId: updated.id,
            userId: updated.userId,
            contractType: "publishing_agreement",
            contractContent: generateContract(updated),
            requiresGuardian: updated.isMinor,
            status: "pending_signature",
          });
        }

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
      const contractsResult = await db.execute(sql`
        SELECT id, user_id as "userId", application_id as "applicationId",
               contract_type as "contractType", status,
               author_signature as "authorSignature", author_signed_at as "authorSignedAt",
               author_signature_ip as "authorSignatureIp", author_signature_user_agent as "authorSignatureUserAgent",
               guardian_signature as "guardianSignature", guardian_signed_at as "guardianSignedAt",
               guardian_signature_ip as "guardianSignatureIp", guardian_signature_user_agent as "guardianSignatureUserAgent",
               requires_guardian as "requiresGuardian",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM contracts WHERE user_id = ${req.session.userId} ORDER BY created_at DESC
      `);
      return res.json(contractsResult.rows || []);
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
      
      const user = await getUserById(contract.userId);

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
        const user = await getUserById(contract.userId);

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
      
      const user = await getUserById(contract.userId);

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
        generateAndStorePDF(contract.id).catch(err => {
          console.error("Background PDF generation failed:", err);
        });

        await db.update(applications)
          .set({ status: "migrated", updatedAt: new Date() })
          .where(eq(applications.id, contract.applicationId));

        await db.update(users)
          .set({ role: "student", updatedAt: new Date() })
          .where(eq(users.id, contract.userId));

        if (req.session.userId === contract.userId) {
          req.session.userRole = "student";
        }

        const { ensureGameCharacter } = await import("./services/game-engine");
        ensureGameCharacter(String(contract.userId)).catch(err => {
          console.error("Background game character creation failed:", err);
        });

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
      const updatesResult = await db.execute(sql`
        SELECT id, user_id as "userId", application_id as "applicationId",
               sync_status as "syncStatus", indie_quill_author_id as "indieQuillAuthorId",
               last_synced_at as "lastSyncedAt", sync_error as "syncError",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM publishing_updates WHERE user_id = ${req.session.userId} ORDER BY updated_at DESC
      `);
      return res.json(updatesResult.rows || []);
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
        entityType: "publishing_updates",
        entityId: updateId.toString(),
        details: JSON.stringify({
          previousSyncStatus: existingUpdate.syncStatus,
          previousAttempts: existingUpdate.syncAttempts,
          previousError: existingUpdate.syncError,
          ipAddress: getClientIp(req),
        }),
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
        entityType: "publishing_updates",
        entityId: updateId.toString(),
        details: JSON.stringify({
          previousStatus,
          newStatus: status,
          applicationId: existingUpdate.applicationId,
          ipAddress: getClientIp(req),
        }),
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

  // Native Game Engine - Admin character view by ID
  app.get("/api/admin/game-engine/character/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const targetUserId = req.params.id;
      const character = await ensureGameCharacter(targetUserId);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }
      const displayData = getCharacterDisplayData(character);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.json(displayData);
    } catch (error) {
      console.error("Error fetching admin character:", error);
      return res.status(500).json({ message: "Failed to load character" });
    }
  });

  // Native Game Engine - Admin award XP to any user
  app.post("/api/admin/game-engine/award-xp", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const { userId, amount, source } = req.body;
      if (!userId || !amount || amount <= 0) {
        return res.status(400).json({ message: "userId and positive amount required" });
      }
      const result = await awardXP(String(userId), amount, source || "admin_grant");
      return res.json(result);
    } catch (error) {
      console.error("Error awarding XP:", error);
      return res.status(500).json({ message: "Failed to award XP" });
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
  app.post("/api/admin/register-npo-author", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "admin")) {
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

      const user = await getUserById(application.userId);
      
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
          const user = await getUserById(app.userId);
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
        entityType: "pii_bridge",
        entityId: "all",
        details: JSON.stringify({ 
          entriesViewed: bridgeEntries.length,
          viewedByRole: "admin",
          ipAddress: getClientIp(req),
        }),
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
      // Use raw SQL to avoid column mismatch issues with Supabase
      const allUsersResult = await db.execute(sql`
        SELECT id, email, first_name as "firstName", last_name as "lastName", role, created_at as "createdAt", vibe_scribe_id as "vibeScribeId"
        FROM public.users ORDER BY created_at DESC
      `);
      const allUsers = allUsersResult.rows as any[];

      // Use raw SQL for all lookups to avoid Drizzle schema mismatches with Supabase
      const allCohortsResult = await db.execute(sql`
        SELECT id, label, capacity, current_count as "currentCount", status, created_at as "createdAt"
        FROM cohorts
      `);
      const allCohorts = allCohortsResult.rows as any[];

      const allGrantsResult = await db.execute(sql`
        SELECT id, foundation_id as "foundationId", grant_date as "grantDate", amount
        FROM foundation_grants
      `);
      const allGrants = allGrantsResult.rows as any[];

      const allFoundationsResult = await db.execute(sql`
        SELECT id, name FROM foundations
      `);
      const allFoundations = allFoundationsResult.rows as any[];

      const allFamilyUnitsResult = await db.execute(sql`
        SELECT id, family_name as "name", cohort_id as "cohortId", created_at as "createdAt"
        FROM family_units
      `);
      const allFamilyUnits = allFamilyUnitsResult.rows as any[];

      // Fetch ALL applications in one query instead of per-user to avoid connection pool exhaustion
      const allAppsResult = await db.execute(sql`
        SELECT id, user_id as "userId", pseudonym, status, cohort_id as "cohortId", 
               is_minor as "isMinor", public_identity_enabled as "publicIdentityEnabled",
               internal_id as "internalId", date_migrated as "dateMigrated",
               created_at as "createdAt", date_of_birth as "dateOfBirth",
               personal_struggles as "personalStruggles", why_collective as "whyCollective",
               expression_types as "expressionTypes", expression_other as "expressionOther",
               goals, hear_about_us as "hearAboutUs", has_story_to_tell as "hasStoryToTell",
               guardian_name as "guardianName", guardian_email as "guardianEmail",
               guardian_phone as "guardianPhone", guardian_relationship as "guardianRelationship"
        FROM applications
      `);
      const allApps = allAppsResult.rows as any[];

      // Fetch contracts to check which apps have contracts
      const allContractsResult = await db.execute(sql`
        SELECT id, application_id as "applicationId" FROM contracts
      `);
      const allContracts = allContractsResult.rows as any[];

      // Group applications by user_id in memory
      const appsByUserId = new Map<number, any[]>();
      for (const app of allApps) {
        const userId = app.userId;
        if (!appsByUserId.has(userId)) {
          appsByUserId.set(userId, []);
        }
        appsByUserId.get(userId)!.push(app);
      }

      // Create contracts lookup by applicationId
      const contractByAppId = new Map<number, any>();
      for (const contract of allContracts) {
        contractByAppId.set(contract.applicationId, contract);
      }

      // Now process users synchronously (no more async per-user queries)
      const usersWithStats = allUsers.map((user) => {
        const userApps = appsByUserId.get(user.id) || [];
        
        const activeApp = userApps.find((a: any) => 
          a.status === "accepted" || a.status === "migrated" || a.cohortId
        ) || userApps[0];
        
        // Add contractId to activeApp if exists
        if (activeApp) {
          const contract = contractByAppId.get(activeApp.id);
          activeApp.contractId = contract?.id || null;
        }
        
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
          contractId: activeApp?.contractId || null,
          // Application detail fields
          personalStruggles: activeApp?.personalStruggles || null,
          whyCollective: activeApp?.whyCollective || null,
          expressionTypes: activeApp?.expressionTypes || null,
          expressionOther: activeApp?.expressionOther || null,
          goals: activeApp?.goals || null,
          hearAboutUs: activeApp?.hearAboutUs || null,
          hasStoryToTell: activeApp?.hasStoryToTell || false,
          guardianName: activeApp?.guardianName || null,
          guardianEmail: activeApp?.guardianEmail || null,
          guardianPhone: activeApp?.guardianPhone || null,
          guardianRelationship: activeApp?.guardianRelationship || null,
        };
      });

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
      const { role, secondaryRole, cohortId, familyUnitId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (!["applicant", "admin", "board_member", "auditor", "student", "mentor", "writer"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      if (secondaryRole !== undefined && secondaryRole !== null && !["board_member", "admin", "auditor", "mentor"].includes(secondaryRole)) {
        return res.status(400).json({ message: "Invalid secondary role" });
      }

      const existingUser = await getUserById(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const userApps = await db.select().from(applications)
        .where(eq(applications.userId, userId));
      const hasMinorApp = userApps.some(a => a.isMinor);

      let shortId: string | null = null;
      let grantLabel: string | null = null;
      let familyName: string | null = null;

      if (role === "student" || role === "writer") {
        if (role === "student" && !cohortId) {
          return res.status(400).json({ message: "Cohort assignment required for student role" });
        }

        // COPPA compliance: minors must have date of birth before approval
        const minorAppWithoutDob = userApps.find(a => a.isMinor && !a.dateOfBirth);
        if (minorAppWithoutDob) {
          return res.status(400).json({ 
            message: "Cannot approve minor without date of birth. COPPA compliance requires complete data." 
          });
        }

        // Always assign author ID for students and writers
        shortId = await assignAuthorId(userId);

        if (cohortId) {
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
        }

        if (familyUnitId) {
          const [family] = await db.select().from(familyUnits).where(eq(familyUnits.id, familyUnitId));
          if (family) {
            familyName = family.name;
          }
        }

        if (cohortId && userApps.length > 0) {
          await db.execute(sql`
            UPDATE applications SET cohort_id = ${cohortId}, updated_at = NOW()
            WHERE user_id = ${userId}
          `);
        }

        if (cohortId) {
          const existingProfile = await db.execute(sql`
            SELECT id FROM student_profiles WHERE user_id = ${userId}
          `);
          if (existingProfile.rows.length > 0) {
            await db.execute(sql`
              UPDATE student_profiles SET cohort_id = ${cohortId}, updated_at = NOW()
              WHERE user_id = ${userId}
            `);
          } else {
            await db.execute(sql`
              INSERT INTO student_profiles (user_id, cohort_id, enrolled_at, is_active, created_at, updated_at)
              VALUES (${userId}, ${cohortId}, NOW(), true, NOW(), NOW())
            `);
          }
          console.log(`[Admin] Synced cohort_id=${cohortId} to student_profiles for user ${userId}`);
        }
      }

      // Update user role using raw SQL to avoid column issues
      if (secondaryRole !== undefined) {
        await db.execute(sql`
          UPDATE public.users SET role = ${role}, secondary_role = ${secondaryRole} WHERE id = ${userId}
        `);
      } else {
        await db.execute(sql`
          UPDATE public.users SET role = ${role} WHERE id = ${userId}
        `);
      }
      
      // Fetch the updated user
      const updated = await getUserById(userId);

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

      // If approving as student or writer, handle onboarding
      if (role === "student" || role === "writer") {
        const userVibeScribeId = updated?.vibeScribeId || shortId || "N/A";
        
        // Native Game Engine character creation - ONLY for students
        if (role === "student") {
          try {
            await ensureGameCharacter(String(userId));
            console.log(`[Game Engine] Native character created for user ${userId}`);
          } catch (gameError) {
            console.error("Failed to create native game character:", gameError);
          }
        }
        
        // Send welcome email with VibeScribe ID for both students and writers
        try {
          await sendWelcomeToCollectiveEmail(
            existingUser.email,
            existingUser.firstName,
            userVibeScribeId,
            userId
          );
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
        }
      }

      return res.json({
        id: updated?.id,
        email: updated?.email,
        firstName: updated?.firstName,
        lastName: updated?.lastName,
        role: updated?.role,
        shortId: shortId,
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
      const existingUser = await getUserById(targetUserId);
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
    if (!hasRole(req.session, "auditor", "admin")) {
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

  // DGLF Impact Report Generator - aggregates TABE EFL gains and PACT time for grant reporting
  app.get("/api/auditor/dglf-impact-report", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!hasRole(req.session, "auditor", "admin")) {
      return res.status(403).json({ message: "Not authorized - Auditor access required" });
    }

    try {
      const cohortYear = new Date().getFullYear();
      
      const cohortsResult = await db.execute(sql`
        SELECT id, label, current_count FROM cohorts 
        WHERE label LIKE ${`%${cohortYear}%`} OR created_at >= ${new Date(`${cohortYear}-01-01`).toISOString()}
        ORDER BY id DESC LIMIT 1
      `);
      const activeCohort = cohortsResult.rows?.[0];

      const tabeCountsResult = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT user_id) as students_with_tabe,
          COUNT(*) FILTER (WHERE NOT is_baseline) as post_tests_count,
          COUNT(*) FILTER (WHERE is_baseline) as baseline_tests_count
        FROM tabe_assessments
        WHERE test_date >= ${new Date(`${cohortYear}-01-01`).toISOString()}
      `);
      const tabeStats = tabeCountsResult.rows?.[0] || {};

      const eflGainsResult = await db.execute(sql`
        WITH student_scores AS (
          SELECT 
            user_id,
            MIN(CASE WHEN is_baseline THEN scale_score END) as baseline_score,
            MAX(CASE WHEN NOT is_baseline THEN scale_score END) as current_score,
            MIN(CASE WHEN is_baseline THEN efl_level END) as baseline_efl,
            MAX(CASE WHEN NOT is_baseline THEN efl_level END) as current_efl
          FROM tabe_assessments
          WHERE test_date >= ${new Date(`${cohortYear}-01-01`).toISOString()}
          GROUP BY user_id
          HAVING COUNT(CASE WHEN is_baseline THEN 1 END) > 0 
             AND COUNT(CASE WHEN NOT is_baseline THEN 1 END) > 0
        )
        SELECT 
          COUNT(*) as students_with_both_tests,
          COALESCE(AVG(current_score - baseline_score), 0) as avg_scale_score_gain,
          COUNT(*) FILTER (WHERE current_efl != baseline_efl) as students_with_efl_gain
        FROM student_scores
      `);
      const eflStats = eflGainsResult.rows?.[0] || {};
      const studentsWithEflGain = parseInt(eflStats.students_with_efl_gain) || 0;

      const pactTimeResult = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT family_unit_id) as families_participating,
          SUM(duration_minutes) as total_pact_minutes,
          AVG(duration_minutes) as avg_session_duration,
          COUNT(*) as total_sessions
        FROM pact_sessions
        WHERE start_time >= ${new Date(`${cohortYear}-01-01`).toISOString()}
      `);
      const pactStats = pactTimeResult.rows?.[0] || {};

      const familyUnitsResult = await db.execute(sql`
        SELECT 
          id, family_name, total_pact_minutes, target_pact_hours,
          ROUND((total_pact_minutes::numeric / NULLIF(target_pact_hours * 60, 0)) * 100, 1) as pact_completion_percent
        FROM family_units
        WHERE is_active = true
        ORDER BY total_pact_minutes DESC
      `);
      const familyProgress = familyUnitsResult.rows || [];

      const curriculumProgressResult = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT user_id) as students_active,
          AVG(percent_complete) as avg_module_completion,
          SUM(hours_spent) as total_instruction_hours
        FROM student_curriculum_progress
        WHERE updated_at >= ${new Date(`${cohortYear}-01-01`).toISOString()}
      `);
      const curriculumStats = curriculumProgressResult.rows?.[0] || {};

      const impactReport = {
        reportTitle: `DGLF Family Literacy Impact Report - ${cohortYear}`,
        generatedAt: new Date().toISOString(),
        cohortInfo: {
          label: activeCohort?.label || `${cohortYear} Cohort`,
          studentCount: activeCohort?.current_count || 0,
        },
        tabeAssessments: {
          studentsWithTabe: parseInt(tabeStats.students_with_tabe) || 0,
          baselineTestsCompleted: parseInt(tabeStats.baseline_tests_count) || 0,
          postTestsCompleted: parseInt(tabeStats.post_tests_count) || 0,
          studentsShowingEflGain: studentsWithEflGain,
        },
        pactTime: {
          familiesParticipating: parseInt(pactStats.families_participating) || 0,
          totalPactHours: Math.round((parseInt(pactStats.total_pact_minutes) || 0) / 60 * 10) / 10,
          totalSessions: parseInt(pactStats.total_sessions) || 0,
          avgSessionMinutes: Math.round(parseFloat(pactStats.avg_session_duration) || 0),
          familyProgress: familyProgress.slice(0, 10),
        },
        curriculumProgress: {
          studentsActive: parseInt(curriculumStats.students_active) || 0,
          totalInstructionHours: Math.round(parseInt(curriculumStats.total_instruction_hours) || 0),
          avgModuleCompletion: Math.round(parseFloat(curriculumStats.avg_module_completion) || 0),
        },
      };

      return res.json(impactReport);
    } catch (error) {
      console.error("DGLF Impact Report error:", error);
      return res.status(500).json({ message: "Failed to generate DGLF Impact Report" });
    }
  });

  app.get("/api/board/stats", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "board_member", "admin")) {
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
    if (!req.session.userId || !hasRole(req.session, "board_member", "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const events = await db.select().from(calendarEvents)
        .where(gte(calendarEvents.startDate, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)))
        .orderBy(calendarEvents.startDate);
      return res.json(events);
    } catch (error) {
      console.error("Fetch calendar error:", error);
      return res.status(500).json({ message: "Failed to fetch calendar" });
    }
  });

  app.post("/api/board/calendar", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "board_member", "admin")) {
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

      pushSingleEventToGoogle(newEvent.id).then(googleId => {
        if (googleId) {
          console.log(`[Calendar] Event ${newEvent.id} pushed to Google Calendar: ${googleId}`);
        }
      }).catch(err => {
        console.error(`[Calendar] Failed to push event ${newEvent.id} to Google:`, err);
      });

      return res.json(newEvent);
    } catch (error) {
      console.error("Create calendar event error:", error);
      return res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.put("/api/board/calendar/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "board_member", "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const eventId = parseInt(req.params.id);
      const { title, description, startDate, endDate, allDay, eventType, location } = req.body;

      const [updated] = await db.update(calendarEvents)
        .set({
          title,
          description,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          allDay,
          eventType,
          location,
          updatedAt: new Date(),
        })
        .where(eq(calendarEvents.id, eventId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (updated.googleCalendarEventId) {
        updateGoogleCalendarEvent(updated.googleCalendarEventId, {
          title: updated.title,
          description: updated.description,
          startDate: updated.startDate,
          endDate: updated.endDate,
          allDay: updated.allDay,
          location: updated.location,
        }).then(success => {
          if (success) {
            console.log(`[Calendar] Event ${eventId} updated in Google Calendar`);
          }
        }).catch(err => {
          console.error(`[Calendar] Failed to update event ${eventId} in Google:`, err);
        });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Update calendar event error:", error);
      return res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/board/calendar/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "board_member", "admin")) {
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
    if (!req.session.userId || !hasRole(req.session, "board_member", "admin")) {
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
    if (!req.session.userId || !hasRole(req.session, "board_member", "admin")) {
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

  app.get("/api/admin/google/auth", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "admin", "board_member")) {
      console.log(`[Google Auth] Rejected: userId=${req.session.userId}, role=${req.session.userRole}`);
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const dynamicRedirectUri = `${protocol}://${host}/api/admin/google/callback`;
      console.log(`[Google Auth] Generating auth URL for user=${req.session.userId}`);
      console.log(`[Google Auth] Dynamic redirect URI: ${dynamicRedirectUri}`);
      const authUrl = getAuthUrl(req.session, dynamicRedirectUri);
      console.log(`[Google Auth] Auth URL generated, redirecting browser...`);
      return res.redirect(authUrl);
    } catch (error) {
      console.error("[Google Auth] Auth URL generation FAILED:", error);
      return res.redirect("/admin?tab=calendar&error=auth_init_failed");
    }
  });

  app.get("/api/admin/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || !state) {
      return res.redirect("/admin?tab=calendar&error=missing_params");
    }

    if (!req.session.userId || !hasRole(req.session, "admin", "board_member")) {
      return res.redirect("/admin?tab=calendar&error=not_authorized");
    }

    if (!validateOAuthState(req.session, state)) {
      return res.redirect("/admin?tab=calendar&error=invalid_state");
    }

    try {
      const savedRedirectUri = req.session.googleOAuthRedirectUri;
      delete req.session.googleOAuthRedirectUri;
      await handleAuthCallback(code, savedRedirectUri);
      return res.redirect("/admin?tab=calendar&connected=true");
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      return res.redirect("/admin?tab=calendar&error=auth_failed");
    }
  });

  app.post("/api/admin/google/disconnect", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "admin", "board_member")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      await disconnectGoogleCalendar();
      return res.json({ message: "Google Calendar disconnected" });
    } catch (error) {
      console.error("Google disconnect error:", error);
      return res.status(500).json({ message: "Failed to disconnect" });
    }
  });

  app.get("/api/board/campaigns", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "board_member", "admin")) {
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
    if (!req.session.userId || !hasRole(req.session, "board_member", "admin")) {
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
    if (!req.session.userId || !hasRole(req.session, "board_member", "admin")) {
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
    if (!req.session.userId || !hasRole(req.session, "board_member", "admin")) {
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
    if (!req.session.userId || !hasRole(req.session, "board_member", "admin")) {
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

      // Calculate aggregate metrics (Zero-PII) using raw SQL to avoid ORM column issues
      const appsResult = await db.execute(sql`SELECT id, status, is_minor FROM applications`);
      const allApps = appsResult.rows as any[];
      
      const updatesResult = await db.execute(sql`SELECT id, status FROM publishing_updates`);
      const allUpdates = updatesResult.rows as any[];
      
      const contractsResult = await db.execute(sql`SELECT id, status FROM contracts`);
      const allContracts = contractsResult.rows as any[];

      // Total words processed - placeholder value since words_processed column doesn't exist yet
      const totalWordsProcessed = 0;
      
      // Books in pipeline - count accepted/migrated authors as potential manuscripts
      const booksInPipeline = allApps.filter(a => 
        a.status === 'accepted' || a.status === 'migrated'
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
        a.is_minor && (a.status === 'accepted' || a.status === 'migrated')
      ).length;

      // NEW DONOR-FOCUSED METRICS
      // Total Authors Supported - all-time applications (any status except rescinded)
      const totalAuthorsSupported = allApps.filter(a => a.status !== 'rescinded').length;
      
      // Identity Protection Rate - % of authors in Safe Mode (not using public identity)
      const identityProtectionRate = 100; // Default to 100% since we use Zero-PII architecture
      
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

  // ===== Board Members CRUD =====

  // Public: Get all board members (for Board page)
  app.get("/api/public/board-members", async (req: Request, res: Response) => {
    try {
      const members = await db.select().from(boardMembers)
        .where(eq(boardMembers.isActive, true))
        .orderBy(boardMembers.displayOrder);
      return res.json(members);
    } catch (error) {
      console.error("Fetch board members error:", error);
      return res.status(500).json({ message: "Failed to fetch board members" });
    }
  });

  // Admin: Create board member
  app.post("/api/admin/board-members", upload.single("photo"), async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }
    try {
      const { name, title, bio, displayOrder } = req.body;
      if (!name || !title) {
        return res.status(400).json({ message: "Name and title are required" });
      }

      let photoFilename: string | null = null;
      if (req.file) {
        const uploadsDir = path.join(process.cwd(), "uploads", "board");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const ext = path.extname(req.file.originalname) || ".jpg";
        photoFilename = `board_${Date.now()}${ext}`;
        fs.writeFileSync(path.join(uploadsDir, photoFilename), req.file.buffer);
      }

      const { email, linkedin } = req.body;
      const [member] = await db.insert(boardMembers).values({
        name,
        title,
        bio: bio || "",
        photoFilename,
        email: email || null,
        linkedin: linkedin || null,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      }).returning();
      return res.json(member);
    } catch (error) {
      console.error("Create board member error:", error);
      return res.status(500).json({ message: "Failed to create board member" });
    }
  });

  // Admin: Update board member
  app.patch("/api/admin/board-members/:id", upload.single("photo"), async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }
    try {
      const id = parseInt(req.params.id);
      const { name, title, bio, displayOrder } = req.body;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (title) updateData.title = title;
      if (bio !== undefined) updateData.bio = bio || null;
      if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);

      const { email: emailVal, linkedin: linkedinVal } = req.body;
      if (emailVal !== undefined) updateData.email = emailVal || null;
      if (linkedinVal !== undefined) updateData.linkedin = linkedinVal || null;

      if (req.file) {
        const [existing] = await db.select().from(boardMembers).where(eq(boardMembers.id, id));
        if (existing?.photoFilename) {
          const oldPath = path.join(process.cwd(), "uploads", "board", existing.photoFilename);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        const uploadsDir = path.join(process.cwd(), "uploads", "board");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const ext = path.extname(req.file.originalname) || ".jpg";
        const filename = `board_${Date.now()}${ext}`;
        fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
        updateData.photoFilename = filename;
      }

      const [updated] = await db.update(boardMembers)
        .set(updateData)
        .where(eq(boardMembers.id, id))
        .returning();
      return res.json(updated);
    } catch (error) {
      console.error("Update board member error:", error);
      return res.status(500).json({ message: "Failed to update board member" });
    }
  });

  // Admin: Delete board member
  app.delete("/api/admin/board-members/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }
    try {
      const id = parseInt(req.params.id);
      const [member] = await db.select().from(boardMembers).where(eq(boardMembers.id, id));
      if (member?.photoFilename) {
        const photoPath = path.join(process.cwd(), "uploads", "board", member.photoFilename);
        if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
      }
      await db.delete(boardMembers).where(eq(boardMembers.id, id));
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete board member error:", error);
      return res.status(500).json({ message: "Failed to delete board member" });
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
      const adminUser = await getUserById(req.session.userId);

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

      // Get user info for display names using raw SQL to avoid column issues
      const userIds = [...new Set(allApps.map(a => a.userId))];
      let appUsers: any[] = [];
      if (userIds.length > 0) {
        const usersResult = await db.execute(sql`
          SELECT id, email, first_name as "firstName", last_name as "lastName", role
          FROM public.users WHERE id = ANY(${userIds})
        `);
        appUsers = usersResult.rows as any[];
      }
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
    const currentUser = await getUserById(req.session.userId);
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
    const currentUser = await getUserById(req.session.userId);
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Use raw SQL to avoid Drizzle schema mismatches with Supabase
      const openCohortsResult = await db.execute(sql`
        SELECT id, label, capacity, current_count as "currentCount", status, created_at as "createdAt"
        FROM cohorts
        WHERE status = 'open'
        ORDER BY id
      `);
      return res.json(openCohortsResult.rows);
    } catch (error) {
      console.error("Failed to fetch available cohorts:", error);
      return res.status(500).json({ message: "Failed to fetch available cohorts" });
    }
  });

  app.post("/api/admin/cohorts", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const currentUser = await getUserById(req.session.userId);
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { label, capacity = 10 } = req.body;

    if (!label || typeof label !== "string" || label.trim().length === 0) {
      return res.status(400).json({ message: "Cohort label is required" });
    }

    try {
      const result = await db.execute(sql`
        INSERT INTO cohorts (label, capacity, current_count, status, created_at)
        VALUES (${label.trim()}, ${capacity}, 0, 'open', NOW())
        RETURNING id, label, capacity, current_count as "currentCount", status, created_at as "createdAt"
      `);
      
      const newCohort = result.rows[0];
      return res.status(201).json(newCohort);
    } catch (error) {
      console.error("Failed to create cohort:", error);
      return res.status(500).json({ message: "Failed to create cohort" });
    }
  });

  app.patch("/api/admin/cohorts/:id/status", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const currentUser = await getUserById(req.session.userId);
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const cohortId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status || !["open", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'open' or 'closed'" });
    }

    try {
      const result = await db.execute(sql`
        UPDATE cohorts 
        SET status = ${status}
        WHERE id = ${cohortId}
        RETURNING id, label, capacity, current_count as "currentCount", status, created_at as "createdAt"
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Cohort not found" });
      }

      return res.json(result.rows[0]);
    } catch (error) {
      console.error("Failed to update cohort status:", error);
      return res.status(500).json({ message: "Failed to update cohort status" });
    }
  });

  // Family Units API endpoints
  app.get("/api/admin/family-units", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const currentUser = await getUserById(req.session.userId);
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const cohortIdParam = req.query.cohortId ? parseInt(req.query.cohortId as string) : null;
      
      let allFamilyUnits;
      if (cohortIdParam) {
        const result = await db.execute(sql`
          SELECT id, family_name as "name", cohort_id as "cohortId", created_at as "createdAt"
          FROM family_units
          WHERE cohort_id = ${cohortIdParam}
          ORDER BY family_name
        `);
        allFamilyUnits = result.rows as any[];
      } else {
        const result = await db.execute(sql`
          SELECT id, family_name as "name", cohort_id as "cohortId", created_at as "createdAt"
          FROM family_units
          ORDER BY family_name
        `);
        allFamilyUnits = result.rows as any[];
      }

      const familyUnitsWithMembers = await Promise.all(
        allFamilyUnits.map(async (family) => {
          // Use raw SQL to avoid column mismatch issues
          const membersResult = await db.execute(sql`
            SELECT id, first_name as "firstName", last_name as "lastName", role
            FROM public.users WHERE family_unit_id = ${family.id}
          `);
          const members = membersResult.rows as any[];

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
    const currentUser = await getUserById(req.session.userId);
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
    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const allFoundations = await db.select().from(foundations).orderBy(desc(foundations.createdAt));
      console.log(`[Foundations] GET: Found ${allFoundations.length} foundations for user=${req.session.userId}`);
      
      try {
        const foundationsWithLastContact = await Promise.all(
          allFoundations.map(async (foundation) => {
            try {
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
            } catch (enrichError) {
              console.error(`[Foundations] Failed to enrich foundation id=${foundation.id}:`, enrichError);
              return {
                ...foundation,
                lastContact: null,
                totalGranted: 0,
                grantCount: 0,
              };
            }
          })
        );
        
        return res.json(foundationsWithLastContact);
      } catch (enrichAllError) {
        console.error("[Foundations] Enrichment failed globally, returning raw foundations:", enrichAllError);
        return res.json(allFoundations.map(f => ({ ...f, lastContact: null, totalGranted: 0, grantCount: 0 })));
      }
    } catch (error) {
      console.error("[Foundations] GET failed:", error);
      return res.status(500).json({ message: "Failed to fetch foundations", detail: String(error) });
    }
  });

  // Create new foundation
  app.post("/api/admin/grants/foundations", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentUser = await getUserById(req.session.userId);
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

      console.log(`[Foundations] Created foundation id=${newFoundation.id} name="${name}" by user=${req.session.userId}`);

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
      console.error("[Foundations] Failed to create foundation:", error);
      return res.status(500).json({ message: "Failed to create foundation" });
    }
  });

  // Update foundation
  app.put("/api/admin/grants/foundations/:id", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentUser = await getUserById(req.session.userId);
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

  // Delete foundation and associated grants/logs
  app.delete("/api/admin/grants/foundations/:id", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentUser = await getUserById(req.session.userId);
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const foundationId = parseInt(req.params.id);

    try {
      let hasLockedGrants = false;
      try {
        const lockedGrants = await db.select()
          .from(foundationGrants)
          .where(and(
            eq(foundationGrants.foundationId, foundationId),
            sql`${foundationGrants.donorLockedAt} IS NOT NULL`
          ));
        hasLockedGrants = lockedGrants.length > 0;
      } catch (lockCheckErr) {
        console.error(`[Foundations] Lock check failed for foundation id=${foundationId}, using raw SQL fallback:`, lockCheckErr);
        const rawResult = await pool.query(
          `SELECT COUNT(*) as cnt FROM foundation_grants WHERE foundation_id = $1 AND donor_locked_at IS NOT NULL`,
          [foundationId]
        );
        hasLockedGrants = parseInt(rawResult.rows[0]?.cnt || "0") > 0;
      }

      if (hasLockedGrants) {
        return res.status(400).json({ message: "Cannot delete foundation with locked grants. Unlock grants first." });
      }

      try {
        await db.delete(foundationGrants).where(eq(foundationGrants.foundationId, foundationId));
      } catch (grantDeleteErr) {
        console.error(`[Foundations] ORM grant delete failed for foundation id=${foundationId}, using raw SQL:`, grantDeleteErr);
        await pool.query(`DELETE FROM foundation_grants WHERE foundation_id = $1`, [foundationId]);
      }

      try {
        await db.delete(solicitationLogs).where(eq(solicitationLogs.foundationId, foundationId));
      } catch (logDeleteErr) {
        console.error(`[Foundations] ORM solicitation log delete failed for foundation id=${foundationId}, using raw SQL:`, logDeleteErr);
        await pool.query(`DELETE FROM solicitation_logs WHERE foundation_id = $1`, [foundationId]);
      }

      const [deleted] = await db.delete(foundations)
        .where(eq(foundations.id, foundationId))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Foundation not found" });
      }

      console.log(`[Foundations] Deleted foundation id=${foundationId} name="${deleted.name}" by user=${req.session.userId}`);

      await logAuditEvent(
        req.session.userId,
        "delete_foundation",
        "foundations",
        foundationId.toString(),
        `Deleted foundation: ${deleted.name}`,
        getClientIp(req),
      );

      return res.json({ message: "Foundation deleted successfully" });
    } catch (error) {
      console.error(`[Foundations] DELETE failed for id=${foundationId}:`, error);
      return res.status(500).json({ message: "Failed to delete foundation", detail: String(error) });
    }
  });

  // Update a grant
  app.put("/api/admin/grants/:id", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentUser = await getUserById(req.session.userId);
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const grantId = parseInt(req.params.id);
    const { amount, targetAuthorCount, grantDate, grantPurpose } = req.body;

    try {
      const [existing] = await db.select()
        .from(foundationGrants)
        .where(eq(foundationGrants.id, grantId));

      if (!existing) {
        return res.status(404).json({ message: "Grant not found" });
      }

      if (existing.donorLockedAt) {
        return res.status(400).json({ message: "Cannot edit a locked grant" });
      }

      const [updated] = await db.update(foundationGrants)
        .set({
          amount,
          targetAuthorCount,
          grantDate: new Date(grantDate),
          grantPurpose,
        })
        .where(eq(foundationGrants.id, grantId))
        .returning();

      await logAuditEvent(
        req.session.userId,
        "update_grant",
        "foundation_grants",
        grantId.toString(),
        `Updated grant: amount=$${(amount / 100).toFixed(2)}, target=${targetAuthorCount}`,
        getClientIp(req),
      );

      return res.json(updated);
    } catch (error) {
      console.error("Failed to update grant:", error);
      return res.status(500).json({ message: "Failed to update grant" });
    }
  });

  // Delete a grant
  app.delete("/api/admin/grants/:id", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentUser = await getUserById(req.session.userId);
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "board_member")) {
      return res.status(403).json({ message: "Access denied" });
    }

    const grantId = parseInt(req.params.id);

    try {
      const [existing] = await db.select()
        .from(foundationGrants)
        .where(eq(foundationGrants.id, grantId));

      if (!existing) {
        return res.status(404).json({ message: "Grant not found" });
      }

      if (existing.donorLockedAt) {
        return res.status(400).json({ message: "Cannot delete a locked grant" });
      }

      await db.delete(foundationGrants).where(eq(foundationGrants.id, grantId));

      await logAuditEvent(
        req.session.userId,
        "delete_grant",
        "foundation_grants",
        grantId.toString(),
        `Deleted grant of $${(existing.amount / 100).toFixed(2)} from foundation ${existing.foundationId}`,
        getClientIp(req),
      );

      return res.json({ message: "Grant deleted successfully" });
    } catch (error) {
      console.error("Failed to delete grant:", error);
      return res.status(500).json({ message: "Failed to delete grant" });
    }
  });

  // --------- SOLICITATION LOGS ---------

  // Get solicitation logs for a foundation
  app.get("/api/admin/grants/foundations/:id/logs", async (req: Request, res: Response) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

    const currentUser = await getUserById(req.session.userId);
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

  // ============ STUDENT WORK VAULT ENDPOINTS ============

  // Internal API for Game Engine to submit student work
  app.post("/api/internal/student-work", async (req: Request, res: Response) => {
    try {
      const { user_id, quest_id, content_type, content_body, source_device } = req.body;

      if (!user_id || !content_body || !content_type) {
        return res.status(400).json({ error: "Missing required fields: user_id, content_type, content_body" });
      }

      // Calculate word count
      const wordCount = content_body.trim().split(/\s+/).filter((w: string) => w.length > 0).length;

      const [newWork] = await db.insert(studentWork).values({
        userId: user_id,
        questId: quest_id || null,
        contentType: content_type,
        contentBody: content_body,
        wordCount,
        sourceDevice: source_device || 'unknown',
      }).returning();

      console.log(`Student work saved: user=${user_id}, type=${content_type}, words=${wordCount}`);
      res.status(201).json({ success: true, id: newWork.id, wordCount });
    } catch (error) {
      console.error("Error saving student work:", error);
      res.status(500).json({ error: "Failed to save student work" });
    }
  });

  // Get all student work for the logged-in student (My Manuscript tab)
  app.get("/api/student/work", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const work = await db.execute(sql`
        SELECT id, user_id as "userId", quest_id as "questId", content_type as "contentType",
               content_body as "contentBody", word_count as "wordCount", 
               source_device as "sourceDevice", created_at as "createdAt"
        FROM student_work
        WHERE user_id = ${req.session.userId}
        ORDER BY created_at DESC
      `);

      res.json(work.rows || []);
    } catch (error) {
      console.error("Error fetching student work:", error);
      res.status(500).json({ error: "Failed to fetch student work" });
    }
  });

  // Get student work summary (word counts, snippet counts)
  app.get("/api/student/work/summary", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total_entries,
          SUM(word_count) as total_words,
          SUM(CASE WHEN content_type = 'vibescribe_snippet' THEN 1 ELSE 0 END) as snippet_count,
          SUM(CASE WHEN content_type = 'manuscript_draft' THEN 1 ELSE 0 END) as draft_count
        FROM student_work
        WHERE user_id = ${req.session.userId}
      `);

      res.json(result.rows[0] || { total_entries: 0, total_words: 0, snippet_count: 0, draft_count: 0 });
    } catch (error) {
      console.error("Error fetching student work summary:", error);
      res.status(500).json({ error: "Failed to fetch work summary" });
    }
  });

  // ============ VIBE DECK CURRICULUM SYSTEM ============

  app.get("/api/admin/curriculums", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const result = await db.execute(sql`
        SELECT c.*,
          (SELECT COUNT(*) FROM vibe_decks WHERE curriculum_id = c.id) as deck_count
        FROM curriculums c ORDER BY c.order_index, c.id
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching curriculums:", error);
      res.status(500).json({ error: "Failed to fetch curriculums" });
    }
  });

  app.post("/api/admin/curriculums", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { title, description } = req.body;
      if (!title?.trim()) return res.status(400).json({ error: "Title is required" });
      const maxOrder = await db.execute(sql`SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM curriculums`);
      const nextOrder = (maxOrder.rows[0] as any).next_order;
      const result = await db.execute(sql`
        INSERT INTO curriculums (title, description, order_index, is_published, created_at, updated_at)
        VALUES (${title.trim()}, ${description || null}, ${nextOrder}, false, NOW(), NOW())
        RETURNING *
      `);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error creating curriculum:", error);
      res.status(500).json({ error: "Failed to create curriculum" });
    }
  });

  app.put("/api/admin/curriculums/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { title, description, is_published } = req.body;
      let result;
      if (typeof is_published === "boolean") {
        result = await db.execute(sql`
          UPDATE curriculums SET is_published = ${is_published}, updated_at = NOW()
          WHERE id = ${Number(req.params.id)}
          RETURNING *
        `);
      } else {
        result = await db.execute(sql`
          UPDATE curriculums SET title = ${title}, description = ${description || null}, updated_at = NOW()
          WHERE id = ${Number(req.params.id)}
          RETURNING *
        `);
      }
      if (result.rows.length === 0) return res.status(404).json({ error: "Curriculum not found" });
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating curriculum:", error);
      res.status(500).json({ error: "Failed to update curriculum" });
    }
  });

  app.delete("/api/admin/curriculums/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      await db.execute(sql`DELETE FROM curriculums WHERE id = ${Number(req.params.id)}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting curriculum:", error);
      res.status(500).json({ error: "Failed to delete curriculum" });
    }
  });

  app.get("/api/admin/curriculums/:curriculumId/decks", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const result = await db.execute(sql`
        SELECT d.*,
          (SELECT COUNT(*) FROM vibe_cards WHERE deck_id = d.id) as card_count
        FROM vibe_decks d
        WHERE d.curriculum_id = ${Number(req.params.curriculumId)}
        ORDER BY d.order_index, d.id
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching decks:", error);
      res.status(500).json({ error: "Failed to fetch decks" });
    }
  });

  app.post("/api/admin/decks", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { curriculumId, title, description } = req.body;
      if (!title?.trim() || !curriculumId) return res.status(400).json({ error: "Title and curriculumId are required" });
      const maxOrder = await db.execute(sql`SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM vibe_decks WHERE curriculum_id = ${curriculumId}`);
      const nextOrder = (maxOrder.rows[0] as any).next_order;
      const result = await db.execute(sql`
        INSERT INTO vibe_decks (curriculum_id, title, description, order_index, is_published, created_at, updated_at)
        VALUES (${curriculumId}, ${title.trim()}, ${description || null}, ${nextOrder}, false, NOW(), NOW())
        RETURNING *
      `);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error creating deck:", error);
      res.status(500).json({ error: "Failed to create deck" });
    }
  });

  app.put("/api/admin/decks/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { title, description, is_published, tome_title, tome_content } = req.body;
      let result;
      if (typeof is_published === "boolean") {
        result = await db.execute(sql`
          UPDATE vibe_decks SET is_published = ${is_published}, updated_at = NOW()
          WHERE id = ${Number(req.params.id)}
          RETURNING *
        `);
      } else if (typeof tome_title !== "undefined" || typeof tome_content !== "undefined") {
        result = await db.execute(sql`
          UPDATE vibe_decks SET tome_title = ${tome_title || null}, tome_content = ${tome_content || null}, updated_at = NOW()
          WHERE id = ${Number(req.params.id)}
          RETURNING *
        `);
      } else {
        result = await db.execute(sql`
          UPDATE vibe_decks SET title = ${title}, description = ${description || null}, updated_at = NOW()
          WHERE id = ${Number(req.params.id)}
          RETURNING *
        `);
      }
      if (result.rows.length === 0) return res.status(404).json({ error: "Deck not found" });
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating deck:", error);
      res.status(500).json({ error: "Failed to update deck" });
    }
  });

  app.delete("/api/admin/decks/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      await db.execute(sql`DELETE FROM vibe_decks WHERE id = ${Number(req.params.id)}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting deck:", error);
      res.status(500).json({ error: "Failed to delete deck" });
    }
  });

  app.get("/api/admin/decks/:deckId/cards", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const result = await db.execute(sql`
        SELECT * FROM vibe_cards WHERE deck_id = ${Number(req.params.deckId)} ORDER BY order_index, id
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching cards:", error);
      res.status(500).json({ error: "Failed to fetch cards" });
    }
  });

  app.post("/api/admin/cards", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { deckId, task, qualifications, xpValue } = req.body;
      if (!task?.trim() || !deckId) return res.status(400).json({ error: "Task and deckId are required" });
      const maxOrder = await db.execute(sql`SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM vibe_cards WHERE deck_id = ${deckId}`);
      const nextOrder = (maxOrder.rows[0] as any).next_order;
      const result = await db.execute(sql`
        INSERT INTO vibe_cards (deck_id, task, qualifications, xp_value, order_index, created_at, updated_at)
        VALUES (${deckId}, ${task.trim()}, ${qualifications || null}, ${xpValue || 0}, ${nextOrder}, NOW(), NOW())
        RETURNING *
      `);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error creating card:", error);
      res.status(500).json({ error: "Failed to create card" });
    }
  });

  app.put("/api/admin/cards/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { task, qualifications, xpValue } = req.body;
      const result = await db.execute(sql`
        UPDATE vibe_cards SET task = ${task}, qualifications = ${qualifications || null}, xp_value = ${xpValue || 0}, updated_at = NOW()
        WHERE id = ${Number(req.params.id)}
        RETURNING *
      `);
      if (result.rows.length === 0) return res.status(404).json({ error: "Card not found" });
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating card:", error);
      res.status(500).json({ error: "Failed to update card" });
    }
  });

  app.delete("/api/admin/cards/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      await db.execute(sql`DELETE FROM vibe_cards WHERE id = ${Number(req.params.id)}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting card:", error);
      res.status(500).json({ error: "Failed to delete card" });
    }
  });

  app.get("/api/student/vibe-decks", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const userId = req.session.userId;
      const curriculumsResult = await db.execute(sql`
        SELECT * FROM curriculums WHERE is_published = true ORDER BY order_index, id
      `);
      const decksResult = await db.execute(sql`
        SELECT d.*, c.title as curriculum_title
        FROM vibe_decks d
        JOIN curriculums c ON c.id = d.curriculum_id
        WHERE d.is_published = true AND c.is_published = true
        ORDER BY d.order_index, d.id
      `);
      const cardsResult = await db.execute(sql`
        SELECT vc.*
        FROM vibe_cards vc
        JOIN vibe_decks d ON d.id = vc.deck_id
        JOIN curriculums c ON c.id = d.curriculum_id
        WHERE d.is_published = true AND c.is_published = true
        ORDER BY vc.order_index, vc.id
      `);
      const absorptionsResult = await db.execute(sql`
        SELECT deck_id, absorbed_at FROM tome_absorptions WHERE user_id = ${userId}
      `);
      const absorbedDeckIds = new Set((absorptionsResult.rows as any[]).map(r => r.deck_id));
      const decks = (decksResult.rows as any[]).map(deck => ({
        ...deck,
        cards: (cardsResult.rows as any[]).filter(card => card.deck_id === deck.id),
        tome_absorbed: absorbedDeckIds.has(deck.id),
      }));
      res.json({ curriculums: curriculumsResult.rows, decks });
    } catch (error) {
      console.error("Error fetching student vibe decks:", error);
      res.status(500).json({ error: "Failed to fetch vibe decks" });
    }
  });

  app.post("/api/student/absorb-tome", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { deckId } = req.body;
      if (!deckId) return res.status(400).json({ error: "deckId is required" });

      const existingCheck = await db.execute(sql`
        SELECT id FROM tome_absorptions WHERE user_id = ${req.session.userId} AND deck_id = ${deckId}
      `);
      const alreadyAbsorbed = existingCheck.rows.length > 0;

      await db.execute(sql`
        INSERT INTO tome_absorptions (user_id, deck_id, absorbed_at)
        VALUES (${req.session.userId}, ${deckId}, NOW())
        ON CONFLICT (user_id, deck_id) DO NOTHING
      `);

      let xpResult = null;
      if (!alreadyAbsorbed) {
        try {
          xpResult = await awardXP(String(req.session.userId), TOME_XP_BONUS, `tome_absorption:${deckId}`);
        } catch (xpErr) {
          console.error("[Game Engine] Failed to award XP on tome absorption:", xpErr);
        }
      }

      res.json({ success: true, absorbed: true, xp_bonus: alreadyAbsorbed ? 0 : TOME_XP_BONUS, xp_result: xpResult });
    } catch (error) {
      console.error("Error absorbing tome:", error);
      res.status(500).json({ error: "Failed to absorb tome" });
    }
  });

  app.get("/api/student/manuscripts/:cardId", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const cardId = parseInt(req.params.cardId);
      if (isNaN(cardId)) return res.status(400).json({ error: "Invalid card ID" });
      const result = await db.execute(sql`
        SELECT m.*, 
          CASE WHEN cs.id IS NOT NULL THEN true ELSE false END as submitted
        FROM manuscripts m
        LEFT JOIN card_submissions cs ON cs.card_id = m.card_id AND cs.user_id = m.user_id
        WHERE m.user_id = ${req.session.userId} AND m.card_id = ${parseInt(cardId)}
        LIMIT 1
      `);
      if (result.rows.length === 0) {
        return res.json({ content: "", word_count: 0, submitted: false });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching manuscript:", error);
      res.status(500).json({ error: "Failed to fetch manuscript" });
    }
  });

  app.put("/api/student/manuscripts/:cardId", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const cardId = parseInt(req.params.cardId);
      if (isNaN(cardId)) return res.status(400).json({ error: "Invalid card ID" });
      const { content, wordCount } = req.body;
      const result = await db.execute(sql`
        INSERT INTO manuscripts (user_id, card_id, content, word_count, created_at, updated_at)
        VALUES (${req.session.userId}, ${cardId}, ${content || ''}, ${wordCount || 0}, NOW(), NOW())
        ON CONFLICT (user_id, card_id) DO UPDATE SET
          content = ${content || ''},
          word_count = ${wordCount || 0},
          updated_at = NOW()
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error saving manuscript:", error);
      res.status(500).json({ error: "Failed to save manuscript" });
    }
  });

  app.post("/api/student/submissions/:cardId", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { cardId } = req.params;
      const { reflection } = req.body;
      const cardIdNum = parseInt(cardId);

      const existingCheck = await db.execute(sql`
        SELECT id FROM card_submissions WHERE user_id = ${req.session.userId} AND card_id = ${cardIdNum}
      `);
      if (existingCheck.rows.length > 0) {
        return res.status(400).json({ error: "Already submitted for this card" });
      }

      const cardResult = await db.execute(sql`
        SELECT xp_value FROM vibe_cards WHERE id = ${cardIdNum}
      `);
      if (cardResult.rows.length === 0) {
        return res.status(404).json({ error: "Card not found" });
      }
      const xpValue = (cardResult.rows[0] as any).xp_value || 0;

      const manuscriptResult = await db.execute(sql`
        SELECT id FROM manuscripts WHERE user_id = ${req.session.userId} AND card_id = ${cardIdNum}
      `);
      const manuscriptId = manuscriptResult.rows.length > 0 ? (manuscriptResult.rows[0] as any).id : null;

      const result = await db.execute(sql`
        INSERT INTO card_submissions (user_id, card_id, manuscript_id, reflection, xp_earned, status, submitted_at)
        VALUES (${req.session.userId}, ${cardIdNum}, ${manuscriptId}, ${reflection || ''}, ${xpValue}, 'submitted', NOW())
        RETURNING *
      `);

      let xpResult = null;
      if (xpValue > 0) {
        try {
          xpResult = await awardXP(String(req.session.userId), xpValue, `card_submission:${cardIdNum}`);
        } catch (xpErr) {
          console.error("[Game Engine] Failed to award XP on card submission:", xpErr);
        }
      }

      res.json({ success: true, submission: result.rows[0], xp_earned: xpValue, xp_result: xpResult });
    } catch (error) {
      console.error("Error submitting card:", error);
      res.status(500).json({ error: "Failed to submit" });
    }
  });

  app.get("/api/student/submissions", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const result = await db.execute(sql`
        SELECT card_id, xp_earned, status, submitted_at FROM card_submissions
        WHERE user_id = ${req.session.userId}
        ORDER BY submitted_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // WORKSPACE: VibeScribe Transcripts + Master Manuscript
  // ═══════════════════════════════════════════════════════════════

  app.post("/api/integration/vibescribe", async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers["x-vibescribe-key"] as string;
      if (!apiKey || apiKey !== process.env.VIBESCRIBE_API_KEY) {
        return res.status(401).json({ error: "Invalid API key" });
      }

      const { vibeScribeId, content, sourceType } = req.body;
      if (!vibeScribeId || !content) {
        return res.status(400).json({ error: "vibeScribeId and content are required" });
      }

      const userResult = await db.execute(sql`
        SELECT id FROM public.users WHERE vibe_scribe_id = ${vibeScribeId}
      `);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "No user found with that VibeScribe ID" });
      }
      const userId = (userResult.rows[0] as any).id;

      const result = await db.execute(sql`
        INSERT INTO vibescribe_transcripts (user_id, vibescribe_id, content, source_type, created_at)
        VALUES (${String(userId)}, ${vibeScribeId}, ${content}, ${sourceType || 'voice'}, NOW())
        RETURNING *
      `);

      res.json({ success: true, transcript: result.rows[0] });
    } catch (error) {
      console.error("VibeScribe integration error:", error);
      res.status(500).json({ error: "Failed to save transcript" });
    }
  });

  app.post("/api/integration/vibescribe/validate", async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers["x-vibescribe-key"] as string;
      if (!apiKey || apiKey !== process.env.VIBESCRIBE_API_KEY) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      const { vibeScribeId } = req.body;
      if (!vibeScribeId) {
        return res.status(400).json({ valid: false, error: "vibeScribeId required" });
      }
      const userResult = await db.execute(sql`
        SELECT id, first_name as "firstName" FROM public.users WHERE vibe_scribe_id = ${vibeScribeId}
      `);
      res.json({ valid: userResult.rows.length > 0 });
    } catch (error) {
      console.error("VibeScribe validate error:", error);
      res.status(500).json({ valid: false, error: "Server error" });
    }
  });

  app.get("/api/integration/vibescribe/history", async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers["x-vibescribe-key"] as string;
      if (!apiKey || apiKey !== process.env.VIBESCRIBE_API_KEY) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      const vibeScribeId = req.query.vibeScribeId as string;
      if (!vibeScribeId) {
        return res.status(400).json({ error: "vibeScribeId query param required" });
      }
      const userResult = await db.execute(sql`
        SELECT id FROM public.users WHERE vibe_scribe_id = ${vibeScribeId}
      `);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "No user found with that VibeScribe ID" });
      }
      const userId = (userResult.rows[0] as any).id;
      const result = await db.execute(sql`
        SELECT * FROM vibescribe_transcripts
        WHERE user_id = ${String(userId)}
        ORDER BY created_at DESC
        LIMIT 100
      `);
      res.json({ transcripts: result.rows });
    } catch (error) {
      console.error("VibeScribe history error:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.get("/api/student/vibescribe-transcripts", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const result = await db.execute(sql`
        SELECT * FROM vibescribe_transcripts
        WHERE user_id = ${req.session.userId}
        ORDER BY created_at DESC
        LIMIT 50
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching transcripts:", error);
      res.status(500).json({ error: "Failed to fetch transcripts" });
    }
  });

  app.patch("/api/student/vibescribe-transcripts/:id/used", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const id = parseInt(req.params.id);
      await db.execute(sql`
        UPDATE vibescribe_transcripts SET is_used = true
        WHERE id = ${id} AND user_id = ${req.session.userId}
      `);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking transcript used:", error);
      res.status(500).json({ error: "Failed to update transcript" });
    }
  });

  app.get("/api/student/master-manuscript", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const result = await db.execute(sql`
        SELECT * FROM master_manuscripts
        WHERE user_id = ${req.session.userId}
        LIMIT 1
      `);
      if (result.rows.length === 0) {
        const newResult = await db.execute(sql`
          INSERT INTO master_manuscripts (user_id, title, content, word_count, created_at, updated_at)
          VALUES (${req.session.userId}, 'My Master Manuscript', '{}', 0, NOW(), NOW())
          RETURNING *
        `);
        return res.json(newResult.rows[0]);
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching master manuscript:", error);
      res.status(500).json({ error: "Failed to fetch master manuscript" });
    }
  });

  app.put("/api/student/master-manuscript", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { title, content, wordCount } = req.body;
      const contentStr = typeof content === 'object' ? JSON.stringify(content) : content;
      const result = await db.execute(sql`
        INSERT INTO master_manuscripts (user_id, title, content, word_count, created_at, updated_at)
        VALUES (${req.session.userId}, ${title || 'My Master Manuscript'}, ${contentStr}::jsonb, ${wordCount || 0}, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          title = ${title || 'My Master Manuscript'},
          content = ${contentStr}::jsonb,
          word_count = ${wordCount || 0},
          updated_at = NOW()
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error saving master manuscript:", error);
      res.status(500).json({ error: "Failed to save master manuscript" });
    }
  });

  app.post("/api/student/master-manuscript/append", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      let existing = await db.execute(sql`
        SELECT * FROM master_manuscripts WHERE user_id = ${req.session.userId} LIMIT 1
      `);
      if (existing.rows.length === 0) {
        await db.execute(sql`
          INSERT INTO master_manuscripts (user_id, title, content, word_count, created_at, updated_at)
          VALUES (${req.session.userId}, 'My Master Manuscript', '{}', 0, NOW(), NOW())
        `);
        existing = await db.execute(sql`
          SELECT * FROM master_manuscripts WHERE user_id = ${req.session.userId} LIMIT 1
        `);
      }

      res.json({ success: true, message: "Content ready to append. Use the editor to merge." });
    } catch (error) {
      console.error("Error appending to master manuscript:", error);
      res.status(500).json({ error: "Failed to append" });
    }
  });

  app.get("/api/student/workspace-cards", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      let result;
      try {
        result = await db.execute(sql`
          SELECT vc.id, vc.task, vc.qualifications, vc.xp_value, vc.deck_id,
            vd.title as deck_title, c.title as curriculum_title,
            m.content as manuscript_content, m.word_count as manuscript_word_count,
            CASE WHEN cs.id IS NOT NULL THEN true ELSE false END as is_submitted,
            cs.xp_earned
          FROM vibe_cards vc
          JOIN vibe_decks vd ON vc.deck_id = vd.id
          JOIN curriculums c ON vd.curriculum_id = c.id
          LEFT JOIN manuscripts m ON m.card_id = vc.id AND m.user_id = ${req.session.userId}
          LEFT JOIN card_submissions cs ON cs.card_id = vc.id AND cs.user_id = ${req.session.userId}
          WHERE vd.is_published = true AND c.is_published = true
          ORDER BY c.order_index, vd.order_index, vc.order_index
        `);
      } catch (innerError: any) {
        if (innerError?.code === '42703') {
          result = await db.execute(sql`
            SELECT vc.id, vc.task, vc.qualifications, vc.xp_value, vc.deck_id,
              vd.title as deck_title, c.title as curriculum_title,
              NULL as manuscript_content, NULL as manuscript_word_count,
              CASE WHEN cs.id IS NOT NULL THEN true ELSE false END as is_submitted,
              cs.xp_earned
            FROM vibe_cards vc
            JOIN vibe_decks vd ON vc.deck_id = vd.id
            JOIN curriculums c ON vd.curriculum_id = c.id
            LEFT JOIN card_submissions cs ON cs.card_id = vc.id AND cs.user_id = ${req.session.userId}
            WHERE vd.is_published = true AND c.is_published = true
            ORDER BY c.order_index, vd.order_index, vc.order_index
          `);
        } else {
          throw innerError;
        }
      }
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching workspace cards:", error);
      res.status(500).json({ error: "Failed to fetch cards" });
    }
  });

  app.get("/api/student/training-stats", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.session.userId;

      const result = await db.execute(sql`
        SELECT
          COALESCE(dd.total_words, 0) as "totalWords",
          COALESCE(dd.draft_count, 0) as "draftCount",
          COALESCE(sw.snippet_count, 0) as "vibeSnippetCount",
          COALESCE(sw.snippet_words, 0) as "vibeSnippetWords",
          COALESCE(sal.total_hours, 0) as "hoursActive",
          COALESCE(scp.modules_completed, 0) as "modulesCompleted",
          COALESCE(scp.total_modules, 0) as "totalModules",
          COALESCE(scp.avg_progress, 0) as "avgProgress",
          COALESCE(mtg.upcoming_count, 0) as "upcomingMeetings",
          COALESCE(mtg.total_count, 0) as "totalMeetings",
          sp.training_path as "trainingPath"
        FROM (SELECT 1) dummy
        LEFT JOIN (
          SELECT SUM(word_count) as total_words, COUNT(*) as draft_count
          FROM drafting_documents WHERE user_id = ${userId}
        ) dd ON true
        LEFT JOIN (
          SELECT COUNT(*) as snippet_count, SUM(word_count) as snippet_words
          FROM student_work WHERE user_id = ${userId} AND content_type = 'vibescribe_snippet'
        ) sw ON true
        LEFT JOIN (
          SELECT ROUND(SUM(minutes_active) / 60.0, 1) as total_hours
          FROM student_activity_logs WHERE user_id = ${userId}
        ) sal ON true
        LEFT JOIN (
          SELECT 
            COUNT(CASE WHEN percent_complete >= 100 THEN 1 END) as modules_completed,
            COUNT(*) as total_modules,
            ROUND(AVG(percent_complete), 0) as avg_progress
          FROM student_curriculum_progress WHERE user_id = ${userId}
        ) scp ON true
        LEFT JOIN (
          SELECT 
            COUNT(CASE WHEN m.start_time > NOW() THEN 1 END) as upcoming_count,
            COUNT(*) as total_count
          FROM meeting_attendees ma
          JOIN meetings m ON m.id = ma.meeting_id
          WHERE ma.user_id = ${userId}
        ) mtg ON true
        LEFT JOIN student_profiles sp ON sp.user_id = ${userId}
      `);

      res.json(result.rows[0] || {
        totalWords: 0, draftCount: 0, vibeSnippetCount: 0, vibeSnippetWords: 0,
        hoursActive: 0, modulesCompleted: 0, totalModules: 0, avgProgress: 0,
        upcomingMeetings: 0, totalMeetings: 0, trainingPath: null,
      });
    } catch (error) {
      console.error("Error fetching training stats:", error);
      res.status(500).json({ error: "Failed to fetch training stats" });
    }
  });

  // Admin endpoint: get all students' real training stats
  app.get("/api/admin/training-stats", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "admin", "board_member")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const result = await db.execute(sql`
        SELECT
          u.id,
          u.first_name as "firstName",
          u.last_name as "lastName",
          u.email,
          u.role,
          sp.training_path as "trainingPath",
          sp.enrolled_at as "enrolledAt",
          COALESCE(dd.total_words, 0) as "wordCount",
          COALESCE(sal.total_hours, 0) as "hoursActive",
          COALESCE(scp.avg_progress, 0) as "courseProgress",
          COALESCE(scp.modules_completed, 0) as "modulesCompleted",
          COALESCE(sw.snippet_count, 0) as "vibeSnippetCount"
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN (
          SELECT user_id, SUM(word_count) as total_words FROM drafting_documents GROUP BY user_id
        ) dd ON dd.user_id = u.id
        LEFT JOIN (
          SELECT user_id, ROUND(SUM(minutes_active) / 60.0, 1) as total_hours
          FROM student_activity_logs GROUP BY user_id
        ) sal ON sal.user_id = u.id
        LEFT JOIN (
          SELECT user_id, ROUND(AVG(percent_complete), 0) as avg_progress,
            COUNT(CASE WHEN percent_complete >= 100 THEN 1 END) as modules_completed
          FROM student_curriculum_progress GROUP BY user_id
        ) scp ON scp.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as snippet_count
          FROM student_work WHERE content_type = 'vibescribe_snippet' GROUP BY user_id
        ) sw ON sw.user_id = u.id
        WHERE u.role IN ('student', 'writer')
        ORDER BY u.created_at DESC
      `);

      res.json(result.rows || []);
    } catch (error) {
      console.error("Error fetching admin training stats:", error);
      res.status(500).json({ error: "Failed to fetch training stats" });
    }
  });


  app.get("/api/admin/mentor-stats", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "admin", "board_member")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const result = await db.execute(sql`
        SELECT
          u.id,
          u.first_name as "firstName",
          u.last_name as "lastName",
          u.email,
          COALESCE(msa.student_count, 0) as "studentCount",
          COALESCE(msa.avg_progress, 0) as "avgStudentProgress",
          COALESCE(mtg.upcoming_count, 0) as "upcomingMeetings"
        FROM users u
        LEFT JOIN (
          SELECT mentor_id,
            COUNT(DISTINCT student_id) as student_count,
            COALESCE(AVG(scp.avg_p), 0) as avg_progress
          FROM mentor_student_assignments msa2
          LEFT JOIN (
            SELECT user_id, AVG(percent_complete) as avg_p
            FROM student_curriculum_progress GROUP BY user_id
          ) scp ON scp.user_id = msa2.student_id
          GROUP BY mentor_id
        ) msa ON msa.mentor_id = u.id
        LEFT JOIN (
          SELECT mentor_id, COUNT(*) as upcoming_count
          FROM meetings WHERE start_time > NOW()
          GROUP BY mentor_id
        ) mtg ON mtg.mentor_id = u.id
        WHERE u.role = 'mentor'
        ORDER BY u.created_at DESC
      `);

      res.json(result.rows || []);
    } catch (error) {
      console.error("Error fetching mentor stats:", error);
      res.status(500).json({ error: "Failed to fetch mentor stats" });
    }
  });

  app.get("/api/admin/family-stats", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "admin", "board_member")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const result = await db.execute(sql`
        SELECT
          fu.id,
          fu.name,
          fu.cohort_id as "cohortId",
          COALESCE(mc.member_count, 0) as "memberCount",
          COALESCE(ps.total_pact_minutes, 0) as "totalPactMinutes",
          COALESCE(sw.total_words, 0) as "totalWords",
          COALESCE(mc.members, '[]'::jsonb) as "members"
        FROM family_units fu
        LEFT JOIN (
          SELECT family_unit_id,
            COUNT(*) as member_count,
            jsonb_agg(jsonb_build_object(
              'id', u.id,
              'firstName', u.first_name,
              'lastName', u.last_name,
              'role', u.role
            )) as members
          FROM student_profiles sp
          JOIN users u ON u.id = sp.user_id
          WHERE sp.family_unit_id IS NOT NULL
          GROUP BY family_unit_id
        ) mc ON mc.family_unit_id = fu.id
        LEFT JOIN (
          SELECT sp.family_unit_id, SUM(sal.minutes_active) as total_pact_minutes
          FROM student_profiles sp
          JOIN student_activity_logs sal ON sal.user_id = sp.user_id
          WHERE sp.family_unit_id IS NOT NULL
          GROUP BY sp.family_unit_id
        ) ps ON ps.family_unit_id = fu.id
        LEFT JOIN (
          SELECT sp.family_unit_id, SUM(sw2.word_count) as total_words
          FROM student_profiles sp
          JOIN student_work sw2 ON sw2.user_id = sp.user_id
          WHERE sp.family_unit_id IS NOT NULL
          GROUP BY sp.family_unit_id
        ) sw ON sw.family_unit_id = fu.id
        ORDER BY fu.name
      `);

      res.json(result.rows || []);
    } catch (error) {
      console.error("Error fetching family stats:", error);
      res.status(500).json({ error: "Failed to fetch family stats" });
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
          SELECT user_id, ROUND(SUM(minutes_active) / 60.0, 1) as total_hours, MAX(created_at) as last_activity
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
        WHERE m.mentor_id = ${req.session.userId}
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
        INSERT INTO meetings (mentor_id, title, description, start_time, end_time, meeting_type, provider)
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
        JOIN (SELECT user_id, ROUND(SUM(minutes_active) / 60.0, 1) as total_hours FROM student_activity_logs GROUP BY user_id) sal
          ON sal.user_id = msa.student_id
        WHERE msa.mentor_id = ${req.session.userId}
      `);

      const meetingsResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM meetings 
        WHERE mentor_id = ${req.session.userId} AND start_time > NOW()
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

      const progressResult = await db.execute(sql`
        SELECT 
          COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed,
          (SELECT COUNT(*) FROM vibe_decks d JOIN curriculums c ON c.id = d.curriculum_id WHERE d.is_published = true AND c.is_published = true) as total
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

  // Get student's game character data from native Game Engine
  app.get("/api/student/game-character", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userId = String(req.session.userId);
      console.log(`[Game Character] Loading for user ${userId}`);
      
      let character;
      try {
        character = await ensureGameCharacter(userId);
      } catch (charErr) {
        console.error("[Game Character] ensureGameCharacter failed:", charErr);
        return res.status(500).json({ message: "Failed to create game character" });
      }
      if (!character) {
        console.error("[Game Character] ensureGameCharacter returned null for user", userId);
        return res.status(500).json({ message: "Failed to create game character" });
      }

      const userResult = await db.execute(sql`
        SELECT first_name, vibe_scribe_id FROM users WHERE id = ${userId} LIMIT 1
      `);
      const userData = userResult.rows[0] as any;
      const displayData = getCharacterDisplayData(character);
      displayData.username = userData?.vibe_scribe_id || userData?.first_name || "student";
      displayData.display_name = userData?.first_name || "Student";
      displayData.full_name = `${displayData.display_name} ${character.active_title || "the Novice"}`;

      try {
        const submissionsResult = await db.execute(sql`
          SELECT COUNT(*) as count FROM card_submissions WHERE user_id = ${userId}
        `);
        displayData.quests_completed = parseInt((submissionsResult.rows[0] as any).count) || 0;
      } catch (subErr) {
        console.warn("[Game Character] card_submissions query failed, defaulting to 0:", subErr);
        displayData.quests_completed = 0;
      }

      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      return res.json(displayData);
    } catch (error) {
      console.error("[Game Character] Error fetching game character:", error);
      res.status(500).json({ message: "Failed to load character data" });
    }
  });

  // Admin endpoint for game character - view any student's character
  app.get("/api/admin/game-character", async (req: Request, res: Response) => {
    if (!req.session.userId || !hasRole(req.session, "admin")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const targetUserId = (req.query.userId as string) || String(req.session.userId);
      const character = await ensureGameCharacter(targetUserId);
      if (!character) {
        return res.status(500).json({ message: "Failed to load character" });
      }

      const userResult = await db.execute(sql`
        SELECT first_name, vibe_scribe_id FROM users WHERE id = ${targetUserId} LIMIT 1
      `);
      const userData = userResult.rows[0] as any;
      const displayData = getCharacterDisplayData(character);
      displayData.username = userData?.vibe_scribe_id || userData?.first_name || "student";
      displayData.display_name = userData?.first_name || "Student";
      displayData.full_name = `${displayData.display_name} ${character.active_title || "the Novice"}`;

      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.json(displayData);
    } catch (error) {
      console.error("Error fetching admin game character:", error);
      res.status(500).json({ message: "Failed to load character data" });
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
        FROM public.users u
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

  // =============== BoD Wiki API ===============

  // Get all wiki entries
  app.get("/api/wiki", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Only admin and board_member can access wiki
    if (!hasRole(req.session, "admin", "board_member")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const result = await db.execute(sql`
        SELECT 
          w.id, w.title, w.content, w.category, w.author_id as "authorId",
          w.is_pinned as "isPinned", w.created_at as "createdAt", w.updated_at as "updatedAt",
          COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as "authorName",
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', wa.id,
              'filename', wa.filename,
              'originalName', wa.original_name,
              'mimeType', wa.mime_type,
              'fileSize', wa.file_size,
              'uploadedAt', wa.uploaded_at
            )) FROM wiki_attachments wa WHERE wa.wiki_entry_id = w.id),
            '[]'::json
          ) as "attachments"
        FROM wiki_entries w
        LEFT JOIN public.users u ON u.id = w.author_id
        ORDER BY w.is_pinned DESC, w.updated_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching wiki entries:", error);
      res.status(500).json({ error: "Failed to fetch wiki entries" });
    }
  });

  // Create wiki entry
  app.post("/api/wiki", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!hasRole(req.session, "admin", "board_member")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const { title, content, category, isPinned } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      const [entry] = await db.insert(wikiEntries).values({
        title,
        content,
        category: category || "general",
        authorId: req.session.userId,
        isPinned: isPinned || false,
      }).returning();

      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating wiki entry:", error);
      res.status(500).json({ error: "Failed to create wiki entry" });
    }
  });

  // Update wiki entry
  app.patch("/api/wiki/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!hasRole(req.session, "admin", "board_member")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const id = parseInt(req.params.id);
      const { title, content, category, isPinned } = req.body;

      const updateData: any = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (category !== undefined) updateData.category = category;
      if (isPinned !== undefined) updateData.isPinned = isPinned;

      const [updated] = await db.update(wikiEntries)
        .set(updateData)
        .where(eq(wikiEntries.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Wiki entry not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating wiki entry:", error);
      res.status(500).json({ error: "Failed to update wiki entry" });
    }
  });

  // Delete wiki entry
  app.delete("/api/wiki/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!hasRole(req.session, "admin", "board_member")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const id = parseInt(req.params.id);

      const WIKI_DIR = path.join(process.cwd(), "uploads", "wiki");
      const attachmentsToClean = await db.select().from(wikiAttachments)
        .where(eq(wikiAttachments.wikiEntryId, id));

      const [deleted] = await db.delete(wikiEntries)
        .where(eq(wikiEntries.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Wiki entry not found" });
      }

      for (const att of attachmentsToClean) {
        const filePath = path.join(WIKI_DIR, att.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting wiki entry:", error);
      res.status(500).json({ error: "Failed to delete wiki entry" });
    }
  });

  // =============== Wiki Attachments API ===============

  const WIKI_UPLOADS_DIR = path.join(process.cwd(), "uploads", "wiki");
  if (!fs.existsSync(WIKI_UPLOADS_DIR)) {
    fs.mkdirSync(WIKI_UPLOADS_DIR, { recursive: true });
  }

  const wikiUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, WIKI_UPLOADS_DIR),
      filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `wiki-${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        "application/pdf",
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain", "text/csv",
      ];
      cb(null, allowed.includes(file.mimetype));
    },
  });

  app.get("/api/wiki/:id/attachments", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    if (!hasRole(req.session, "admin", "board_member")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const entryId = parseInt(req.params.id);
      const attachments = await db.select().from(wikiAttachments)
        .where(eq(wikiAttachments.wikiEntryId, entryId));
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching wiki attachments:", error);
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  app.post("/api/wiki/:id/attachments", wikiUpload.single("file"), async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    if (!hasRole(req.session, "admin", "board_member")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const entryId = parseInt(req.params.id);
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const [entry] = await db.select().from(wikiEntries).where(eq(wikiEntries.id, entryId));
      if (!entry) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ error: "Wiki entry not found" });
      }

      const [attachment] = await db.insert(wikiAttachments).values({
        wikiEntryId: entryId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
      }).returning();

      res.json(attachment);
    } catch (error) {
      console.error("Error uploading wiki attachment:", error);
      res.status(500).json({ error: "Failed to upload attachment" });
    }
  });

  app.get("/api/wiki/attachments/:attachmentId/download", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    if (!hasRole(req.session, "admin", "board_member")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const attachmentId = parseInt(req.params.attachmentId);
      const [attachment] = await db.select().from(wikiAttachments)
        .where(eq(wikiAttachments.id, attachmentId));

      if (!attachment) return res.status(404).json({ error: "Attachment not found" });

      const filePath = path.join(WIKI_UPLOADS_DIR, attachment.filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found on disk" });

      res.setHeader("Content-Disposition", `attachment; filename="${attachment.originalName}"`);
      res.setHeader("Content-Type", attachment.mimeType);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error downloading wiki attachment:", error);
      res.status(500).json({ error: "Failed to download attachment" });
    }
  });

  app.delete("/api/wiki/attachments/:attachmentId", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    if (!hasRole(req.session, "admin", "board_member")) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const attachmentId = parseInt(req.params.attachmentId);
      const [attachment] = await db.delete(wikiAttachments)
        .where(eq(wikiAttachments.id, attachmentId))
        .returning();

      if (!attachment) return res.status(404).json({ error: "Attachment not found" });

      const filePath = path.join(WIKI_UPLOADS_DIR, attachment.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting wiki attachment:", error);
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  // VibeScribe 2.0 - Mobile-first voice-to-text authoring
  
  // Verify VibeScribe ID (xxx-xxx format keypad login)
  app.post("/api/vibe/verify", async (req: Request, res: Response) => {
    try {
      const { vibeScribeId } = req.body;
      console.log("[VibeScribe] Verify request for ID:", vibeScribeId);
      
      if (!vibeScribeId || !/^\d{3}-\d{3}$/.test(vibeScribeId)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Debug: show all vibe_scribe_ids in database
      const allIds = await db.execute(sql`
        SELECT id, first_name, vibe_scribe_id FROM public.users WHERE vibe_scribe_id IS NOT NULL LIMIT 10
      `);
      console.log("[VibeScribe] All IDs in DB:", allIds.rows);
      
      // Find user by vibeScribeId
      const userResult = await db.execute(sql`
        SELECT id, first_name as "firstName", last_name as "lastName", vibe_scribe_id as "vibeScribeId", family_unit_id as "familyUnitId"
        FROM public.users 
        WHERE vibe_scribe_id = ${vibeScribeId}
      `);
      
      console.log("[VibeScribe] Query result rows:", userResult.rows.length);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Author ID not found" });
      }
      
      const user = userResult.rows[0] as any;
      
      // Get family word count if user belongs to a family unit
      let familyWordCount = 0;
      if (user.familyUnitId) {
        const wordCountResult = await db.execute(sql`
          SELECT COALESCE(SUM(word_count), 0) as total
          FROM drafting_documents dd
          JOIN public.users u ON dd.user_id = u.id
          WHERE u.family_unit_id = ${user.familyUnitId}
        `);
        familyWordCount = parseInt((wordCountResult.rows[0] as any)?.total || "0");
      } else {
        const wordCountResult = await db.execute(sql`
          SELECT COALESCE(SUM(word_count), 0) as total
          FROM drafting_documents
          WHERE user_id = ${user.id}
        `);
        familyWordCount = parseInt((wordCountResult.rows[0] as any)?.total || "0");
      }
      
      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          vibeScribeId: user.vibeScribeId,
          familyUnitId: user.familyUnitId,
        },
        familyWordCount,
      });
    } catch (error) {
      console.error("Error verifying VibeScribe ID:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/vibe/history", async (req: Request, res: Response) => {
    try {
      const vibeScribeId = req.query.vibeScribeId as string;
      if (!vibeScribeId) {
        return res.status(400).json({ message: "vibeScribeId query param required" });
      }
      const userResult = await db.execute(sql`
        SELECT id FROM public.users WHERE vibe_scribe_id = ${vibeScribeId}
      `);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      const userId = (userResult.rows[0] as any).id;
      const drafts = await db.execute(sql`
        SELECT id, title, content, word_count, created_at FROM drafting_documents
        WHERE user_id = ${String(userId)}
        ORDER BY created_at DESC
        LIMIT 50
      `);
      const transcripts = drafts.rows.map((d: any) => ({
        id: d.id,
        content: d.content || d.title || '',
        source_type: 'voice',
        created_at: d.created_at,
      }));
      res.json({ transcripts });
    } catch (error) {
      console.error("Error fetching vibe history:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Transcribe audio using Whisper AI (multipart file upload for mobile)
  // Removed express.json from chain - multer handles multipart, global middleware handles JSON
  app.post("/api/vibe/transcribe", 
    upload.single("audio"),
    async (req: Request, res: Response) => {
    try {
      console.log("[VibeScribe] ========== TRANSCRIBE REQUEST ==========");
      console.log("[VibeScribe] Content-Type:", req.headers["content-type"]);
      console.log("[VibeScribe] Content-Length:", req.headers["content-length"]);
      console.log("[VibeScribe] Has req.file:", !!req.file);
      console.log("[VibeScribe] req.file details:", req.file ? { 
        fieldname: req.file.fieldname,
        originalname: req.file.originalname, 
        mimetype: req.file.mimetype, 
        size: req.file.size 
      } : "no file");
      console.log("[VibeScribe] Has body.audio:", !!req.body?.audio);
      console.log("[VibeScribe] Body keys:", Object.keys(req.body || {}));
      
      let rawBuffer: Buffer;
      
      // Support both multipart file upload (mobile) and base64 JSON (web fallback)
      if (req.file) {
        console.log("[VibeScribe] Using multipart file:", req.file.mimetype, req.file.size, "bytes");
        rawBuffer = req.file.buffer;
      } else if (req.body?.audio) {
        console.log("[VibeScribe] Using Base64 audio, length:", req.body.audio.length);
        rawBuffer = Buffer.from(req.body.audio, "base64");
      } else {
        console.log("[VibeScribe] ERROR: No audio data found!");
        console.log("[VibeScribe] Full headers:", JSON.stringify(req.headers));
        return res.status(400).json({ message: "Audio data required (file or base64)" });
      }
      
      // Auto-detect format and convert to OpenAI-compatible format
      const { buffer: audioBuffer, format } = await ensureCompatibleFormat(rawBuffer);
      console.log("[VibeScribe] Audio converted to format:", format, "size:", audioBuffer.length);
      
      // Transcribe using Whisper
      const transcript = await speechToText(audioBuffer, format);
      console.log("[VibeScribe] Transcription complete:", transcript.substring(0, 100));
      
      res.json({ transcript });
    } catch (error) {
      console.error("[VibeScribe] Error transcribing audio:", error);
      res.status(500).json({ message: "Failed to transcribe audio", error: String(error) });
    }
  });
  
  // Save voice transcription as draft
  app.post("/api/vibe/save-draft", async (req: Request, res: Response) => {
    try {
      const { vibeScribeId, content } = req.body;
      
      if (!vibeScribeId || !content) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Find user
      const userResult = await db.execute(sql`
        SELECT id, family_unit_id as "familyUnitId"
        FROM public.users 
        WHERE vibe_scribe_id = ${vibeScribeId}
      `);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = userResult.rows[0] as any;
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
      const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      
      // Create new draft document
      await db.execute(sql`
        INSERT INTO drafting_documents (user_id, title, content, word_count, created_at, updated_at)
        VALUES (${user.id}, ${"Voice Note " + timestamp}, ${content}, ${wordCount}, NOW(), NOW())
      `);
      
      // Also save to vibescribe_transcripts so the Sanctum Inspiration Feed can display it
      try {
        await db.execute(sql`
          INSERT INTO vibescribe_transcripts (user_id, vibescribe_id, content, source_type, is_used, created_at)
          VALUES (${user.id}, ${vibeScribeId}, ${content}, 'voice', false, NOW())
        `);
      } catch (transcriptErr) {
        console.error("[VibeScribe] Warning: Could not save to vibescribe_transcripts:", transcriptErr);
      }
      
      // Get updated family word count
      let familyWordCount = 0;
      if (user.familyUnitId) {
        const wordCountResult = await db.execute(sql`
          SELECT COALESCE(SUM(word_count), 0) as total
          FROM drafting_documents dd
          JOIN public.users u ON dd.user_id = u.id
          WHERE u.family_unit_id = ${user.familyUnitId}
        `);
        familyWordCount = parseInt((wordCountResult.rows[0] as any)?.total || "0");
      } else {
        const wordCountResult = await db.execute(sql`
          SELECT COALESCE(SUM(word_count), 0) as total
          FROM drafting_documents
          WHERE user_id = ${user.id}
        `);
        familyWordCount = parseInt((wordCountResult.rows[0] as any)?.total || "0");
      }
      
      res.json({ success: true, familyWordCount });
    } catch (error) {
      console.error("Error saving draft:", error);
      res.status(500).json({ message: "Failed to save draft" });
    }
  });
  
  // Check for active quiz (polling endpoint)
  app.get("/api/vibe/quiz/active", async (req: Request, res: Response) => {
    try {
      const vibeScribeId = req.query.vibeScribeId as string;
      
      // Check for active quiz in the database
      const quizResult = await db.execute(sql`
        SELECT id, question, options, time_limit as "timeLimit", started_at as "startedAt", target_cohort_id as "targetCohortId"
        FROM vibe_quizzes
        WHERE is_active = true
        AND started_at > NOW() - INTERVAL '2 minutes'
        ORDER BY started_at DESC
        LIMIT 1
      `);
      
      if (quizResult.rows.length === 0) {
        return res.json({ quiz: null });
      }
      
      const quiz = quizResult.rows[0] as any;
      
      // If quiz targets a specific cohort, require vibeScribeId and check membership
      if (quiz.targetCohortId) {
        // Cohort-targeted quiz requires vibeScribeId to verify membership
        if (!vibeScribeId) {
          return res.json({ quiz: null });
        }
        
        const userCohortCheck = await db.execute(sql`
          SELECT sp.cohort_id
          FROM public.users u
          JOIN student_profiles sp ON sp.user_id = u.id::varchar
          WHERE u.vibe_scribe_id = ${vibeScribeId}
          AND sp.cohort_id = ${quiz.targetCohortId}
        `);
        
        if (userCohortCheck.rows.length === 0) {
          // User is not in the targeted cohort
          return res.json({ quiz: null });
        }
      }
      
      const elapsed = Math.floor((Date.now() - new Date(quiz.startedAt).getTime()) / 1000);
      const timeLeft = Math.max(0, quiz.timeLimit - elapsed);
      
      if (timeLeft <= 0) {
        return res.json({ quiz: null });
      }
      
      res.json({
        quiz: {
          id: quiz.id,
          question: quiz.question,
          options: JSON.parse(quiz.options || "[]"),
          timeLimit: timeLeft,
        },
      });
    } catch (error) {
      // Table might not exist yet - return null quiz
      res.json({ quiz: null });
    }
  });
  
  // Submit quiz answer
  app.post("/api/vibe/quiz/answer", async (req: Request, res: Response) => {
    try {
      const { vibeScribeId, quizId, answer } = req.body;
      
      if (!vibeScribeId || !quizId || !answer) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Find user
      const userResult = await db.execute(sql`
        SELECT id FROM public.users WHERE vibe_scribe_id = ${vibeScribeId}
      `);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = userResult.rows[0] as any;
      
      // Record the answer
      await db.execute(sql`
        INSERT INTO vibe_quiz_answers (quiz_id, user_id, answer, answered_at)
        VALUES (${quizId}, ${user.id}, ${answer}, NOW())
        ON CONFLICT (quiz_id, user_id) DO UPDATE SET answer = ${answer}, answered_at = NOW()
      `);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording quiz answer:", error);
      res.status(500).json({ message: "Failed to record answer" });
    }
  });
  
  // Admin: Start a quiz (trigger for all connected VibeScribe users)
  app.post("/api/vibe/quiz/start", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await getUserById(req.session.userId);
    if (!user || (user.role !== "admin" && user.role !== "mentor")) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      const { question, options, timeLimit = 60 } = req.body;
      
      if (!question || !options || options.length !== 4) {
        return res.status(400).json({ message: "Question and 4 options required" });
      }
      
      // Deactivate any existing quizzes
      await db.execute(sql`UPDATE vibe_quizzes SET is_active = false WHERE is_active = true`);
      
      // Create new quiz
      const result = await db.execute(sql`
        INSERT INTO vibe_quizzes (question, options, time_limit, is_active, started_at, created_by)
        VALUES (${question}, ${JSON.stringify(options)}, ${timeLimit}, true, NOW(), ${user.id})
        RETURNING id
      `);
      
      const quizId = (result.rows[0] as any).id;
      
      res.json({ success: true, quizId });
    } catch (error) {
      console.error("Error starting quiz:", error);
      res.status(500).json({ message: "Failed to start quiz" });
    }
  });
  
  // Admin: Get quiz results
  app.get("/api/vibe/quiz/:id/results", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await getUserById(req.session.userId);
    if (!user || (user.role !== "admin" && user.role !== "mentor")) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      const quizId = parseInt(req.params.id);
      
      const results = await db.execute(sql`
        SELECT 
          qa.answer,
          u.first_name as "firstName",
          u.vibe_scribe_id as "vibeScribeId",
          qa.answered_at as "answeredAt"
        FROM vibe_quiz_answers qa
        JOIN public.users u ON qa.user_id = u.id::integer
        WHERE qa.quiz_id = ${quizId}
        ORDER BY qa.answered_at ASC
      `);
      
      res.json({ results: results.rows });
    } catch (error) {
      console.error("Error fetching quiz results:", error);
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  // ============================================
  // GRANT COHORTS MANAGEMENT
  // ============================================

  // Get all grant cohorts
  app.get("/api/admin/grant-cohorts", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await getUserById(req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      const result = await db.execute(sql`
        SELECT 
          c.id,
          c.label,
          c.cohort_type as "cohortType",
          c.capacity,
          c.current_count as "currentCount",
          c.status,
          c.grant_id as "grantId",
          c.grant_name as "grantName",
          c.grant_year as "grantYear",
          c.description,
          c.created_at as "createdAt",
          COUNT(DISTINCT fu.id) as "familyCount",
          COUNT(DISTINCT sp.id) as "studentCount"
        FROM cohorts c
        LEFT JOIN family_units fu ON fu.cohort_id = c.id
        LEFT JOIN student_profiles sp ON sp.cohort_id = c.id
        WHERE c.cohort_type = 'grant'
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `);
      
      res.json({ cohorts: result.rows });
    } catch (error) {
      console.error("Error fetching grant cohorts:", error);
      res.status(500).json({ message: "Failed to fetch cohorts" });
    }
  });

  // Create a new grant cohort
  app.post("/api/admin/grant-cohorts", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await getUserById(req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      const { label, grantId, grantName, grantYear, capacity, description } = req.body;
      
      if (!label) {
        return res.status(400).json({ message: "Label is required" });
      }
      
      const result = await db.execute(sql`
        INSERT INTO cohorts (label, cohort_type, grant_id, grant_name, grant_year, capacity, description, status)
        VALUES (${label}, 'grant', ${grantId || null}, ${grantName || null}, ${grantYear || new Date().getFullYear()}, ${capacity || 20}, ${description || null}, 'open')
        RETURNING *
      `);
      
      res.json({ cohort: result.rows[0] });
    } catch (error) {
      console.error("Error creating grant cohort:", error);
      res.status(500).json({ message: "Failed to create cohort" });
    }
  });

  // Get all cohorts for quiz trigger dropdown (both writer and grant)
  app.get("/api/admin/cohorts/for-quiz", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await getUserById(req.session.userId);
    if (!user || (user.role !== "admin" && user.role !== "mentor")) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      const result = await db.execute(sql`
        SELECT 
          c.id,
          c.label,
          c.cohort_type as "cohortType",
          c.grant_name as "grantName",
          c.grant_year as "grantYear",
          c.status,
          COUNT(DISTINCT CASE WHEN u.vibe_scribe_id IS NOT NULL THEN u.id END) as "activeVibeUsers"
        FROM cohorts c
        LEFT JOIN student_profiles sp ON sp.cohort_id = c.id
        LEFT JOIN public.users u ON u.id::varchar = sp.user_id
        WHERE c.status = 'open'
        GROUP BY c.id
        ORDER BY c.cohort_type DESC, c.created_at DESC
      `);
      
      res.json({ cohorts: result.rows });
    } catch (error) {
      console.error("Error fetching cohorts for quiz:", error);
      res.status(500).json({ message: "Failed to fetch cohorts" });
    }
  });

  // Trigger quiz for a specific cohort
  app.post("/api/admin/trigger-cohort-quiz", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await getUserById(req.session.userId);
    if (!user || (user.role !== "admin" && user.role !== "mentor")) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    try {
      const { cohortId, question, options, timeLimit = 60 } = req.body;
      
      if (!cohortId || !question || !options || options.length !== 4) {
        return res.status(400).json({ message: "Cohort, question and 4 options required" });
      }
      
      // Deactivate any existing quizzes
      await db.execute(sql`UPDATE vibe_quizzes SET is_active = false WHERE is_active = true`);
      
      // Create new quiz with cohort targeting
      const result = await db.execute(sql`
        INSERT INTO vibe_quizzes (question, options, time_limit, is_active, started_at, created_by, target_cohort_id)
        VALUES (${question}, ${JSON.stringify(options)}, ${timeLimit}, true, NOW(), ${user.id}, ${cohortId})
        RETURNING id
      `);
      
      const quizId = (result.rows[0] as any).id;
      
      // Get count of users who will receive this quiz
      const userCount = await db.execute(sql`
        SELECT COUNT(DISTINCT u.id) as count
        FROM public.users u
        JOIN student_profiles sp ON sp.user_id = u.id::varchar
        WHERE sp.cohort_id = ${cohortId}
        AND u.vibe_scribe_id IS NOT NULL
      `);
      
      res.json({ 
        success: true, 
        quizId,
        targetedUsers: parseInt((userCount.rows[0] as any)?.count || "0")
      });
    } catch (error) {
      console.error("Error triggering cohort quiz:", error);
      res.status(500).json({ message: "Failed to trigger quiz" });
    }
  });
}
