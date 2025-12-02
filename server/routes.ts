import type { Express, Request, Response } from "express";
import { db } from "./db";
import { users, applications, contracts, publishingUpdates, calendarEvents, fundraisingCampaigns, donations } from "@shared/schema";
import { eq, desc, gte } from "drizzle-orm";
import { hash, compare } from "./auth";
import { migrateAuthorToIndieQuill, retryFailedMigrations, sendApplicationToLLC, sendStatusUpdateToLLC, sendContractSignatureToLLC, sendUserRoleUpdateToLLC } from "./indie-quill-integration";
import { sendApplicationReceivedEmail, sendApplicationAcceptedEmail, sendApplicationRejectedEmail } from "./email";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    userRole?: string;
  }
}

export function registerRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      const existingUser = await db.select().from(users).where(eq(users.email, email));
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hash(password);
      const [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
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

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      const [user] = await db.select().from(users).where(eq(users.email, email));
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

    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
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

  app.post("/api/applications", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const applicationData = {
        ...req.body,
        userId: req.session.userId,
        status: "pending",
      };

      const [newApplication] = await db.insert(applications).values(applicationData).returning();
      
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
      if (user) {
        // Send confirmation email
        try {
          await sendApplicationReceivedEmail(user.email, user.firstName, newApplication.bookTitle);
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
        
        return res.json(appsWithUserDetails);
      } else {
        const userApplications = await db.select().from(applications)
          .where(eq(applications.userId, req.session.userId))
          .orderBy(desc(applications.createdAt));
        return res.json(userApplications);
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

      return res.json(application);
    } catch (error) {
      console.error("Fetch application error:", error);
      return res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  app.patch("/api/applications/:id/status", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const { status, reviewNotes } = req.body;
      const [updated] = await db.update(applications)
        .set({ 
          status, 
          reviewNotes,
          reviewedBy: req.session.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(applications.id, parseInt(req.params.id)))
        .returning();

      const [applicantUser] = await db.select().from(users).where(eq(users.id, updated.userId));

      // Sync status update to LLC immediately
      try {
        await sendStatusUpdateToLLC(updated.id, status, reviewNotes || null);
      } catch (syncError) {
        console.error("Failed to sync status to LLC:", syncError);
      }

      if (status === "accepted") {
        await db.insert(contracts).values({
          applicationId: updated.id,
          userId: updated.userId,
          contractType: "publishing_agreement",
          contractContent: generateContract(updated),
          requiresGuardian: updated.isMinor,
          status: "pending_signature",
        });
        
        if (applicantUser) {
          try {
            await sendApplicationAcceptedEmail(applicantUser.email, applicantUser.firstName, updated.bookTitle);
          } catch (emailError) {
            console.error("Failed to send acceptance email:", emailError);
          }
        }
      } else if (status === "rejected") {
        if (applicantUser) {
          try {
            await sendApplicationRejectedEmail(applicantUser.email, applicantUser.firstName, updated.bookTitle);
          } catch (emailError) {
            console.error("Failed to send rejection email:", emailError);
          }
        }
      }

      return res.json(updated);
    } catch (error) {
      console.error("Update application status error:", error);
      return res.status(500).json({ message: "Failed to update application" });
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

      return res.json(contract);
    } catch (error) {
      console.error("Fetch contract error:", error);
      return res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.post("/api/contracts/:id/sign", async (req: Request, res: Response) => {
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

      let updateData: any = { updatedAt: new Date() };

      if (signatureType === "author") {
        updateData.authorSignature = signature;
        updateData.authorSignedAt = new Date();
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
        if (contract.authorSignature) {
          updateData.status = "signed";
        }
      }

      const [updated] = await db.update(contracts)
        .set(updateData)
        .where(eq(contracts.id, parseInt(req.params.id)))
        .returning();

      // Sync signature to LLC immediately
      try {
        await sendContractSignatureToLLC(contract.applicationId, signatureType, signature);
      } catch (syncError) {
        console.error("Failed to sync signature to LLC:", syncError);
      }

      if (updated.status === "signed") {
        await db.update(applications)
          .set({ status: "migrated", updatedAt: new Date() })
          .where(eq(applications.id, contract.applicationId));

        const [publishingUpdate] = await db.insert(publishingUpdates).values({
          applicationId: contract.applicationId,
          userId: contract.userId,
          status: "not_started",
          syncStatus: "pending",
          statusMessage: "Your application has been accepted and contract signed. Syncing with The Indie Quill LLC...",
        }).returning();

        migrateAuthorToIndieQuill(publishingUpdate.id).catch(err => {
          console.error("Background migration failed:", err);
        });
      }

      return res.json(updated);
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
        pendingApplications: allApps.filter(a => a.status === "pending").length,
        acceptedApplications: allApps.filter(a => a.status === "accepted").length,
        migratedAuthors: allApps.filter(a => a.status === "migrated").length,
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
      }).from(publishingUpdates).orderBy(desc(publishingUpdates.updatedAt));

      const updatesWithDetails = await Promise.all(
        allUpdates.map(async (update) => {
          const [app] = await db.select({
            bookTitle: applications.bookTitle,
            penName: applications.penName,
          }).from(applications).where(eq(applications.id, update.applicationId));

          const [user] = await db.select({
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          }).from(users).where(eq(users.id, update.userId));

          return {
            ...update,
            bookTitle: app?.bookTitle,
            authorName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
            email: user?.email,
          };
        })
      );

      return res.json(updatesWithDetails);
    } catch (error) {
      console.error("Fetch sync status error:", error);
      return res.status(500).json({ message: "Failed to fetch sync status" });
    }
  });

  app.post("/api/admin/retry-sync/:id", async (req: Request, res: Response) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      const updateId = parseInt(req.params.id);
      const success = await migrateAuthorToIndieQuill(updateId);
      
      if (success) {
        return res.json({ message: "Sync successful" });
      } else {
        return res.status(500).json({ message: "Sync failed - check error details" });
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
        createdAt: users.createdAt,
      }).from(users).orderBy(desc(users.createdAt));

      const usersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          const userApps = await db.select().from(applications)
            .where(eq(applications.userId, user.id));
          
          return {
            ...user,
            applicationCount: userApps.length,
            hasAcceptedApp: userApps.some(a => a.status === "accepted" || a.status === "migrated"),
          };
        })
      );

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
      const userId = parseInt(req.params.id);
      const { role } = req.body;

      if (!["applicant", "admin", "board_member"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const [updated] = await db.update(users)
        .set({ role })
        .where(eq(users.id, userId))
        .returning();

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
      });
    } catch (error) {
      console.error("Update user role error:", error);
      return res.status(500).json({ message: "Failed to update user role" });
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
        pendingApplications: allApps.filter(a => a.status === "pending").length,
        acceptedApplications: allApps.filter(a => a.status === "accepted").length,
        migratedAuthors: allApps.filter(a => a.status === "migrated").length,
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
    if (!req.session.userId || req.session.userRole !== "board_member") {
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
    if (!req.session.userId || req.session.userRole !== "board_member") {
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
    if (!req.session.userId || req.session.userRole !== "board_member") {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      await db.delete(calendarEvents).where(eq(calendarEvents.id, parseInt(req.params.id)));
      return res.json({ message: "Event deleted" });
    } catch (error) {
      console.error("Delete calendar event error:", error);
      return res.status(500).json({ message: "Failed to delete event" });
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
}

function generateContract(application: any): string {
  return `
THE INDIE QUILL COLLECTIVE
AUTHOR PUBLISHING AGREEMENT

This Agreement is entered into as of ${new Date().toLocaleDateString()} between:

THE INDIE QUILL COLLECTIVE (a 501(c)(3) non-profit organization)
and
AUTHOR: ${application.penName || "Author"}

REGARDING THE WORK:
Title: "${application.bookTitle}"
Genre: ${application.genre}

TERMS AND CONDITIONS:

1. GRANT OF RIGHTS
The Author grants to The Indie Quill Collective and its publishing partner, The Indie Quill LLC, 
the non-exclusive right to publish, distribute, and promote the Work in all formats.

2. AUTHOR ROYALTIES
The Author shall receive royalties as per the standard Indie Quill publishing agreement, 
with special provisions for NPO-supported authors.

3. EDITORIAL SERVICES
The Collective will provide professional editing, cover design, and formatting services 
at no cost to the Author as part of our mission to support emerging writers.

4. AUTHOR OBLIGATIONS
The Author warrants that the Work is original and does not infringe on any copyrights.

5. MINOR AUTHORS
${application.isMinor ? "This agreement requires guardian/parent consent and signature." : "N/A - Author is of legal age."}

6. TERM
This agreement shall remain in effect for a period of three (3) years from the date of publication.

7. TERMINATION
Either party may terminate this agreement with 30 days written notice.

By signing below, all parties agree to the terms and conditions set forth in this agreement.

---

This contract is provided by The Indie Quill Collective, dedicated to empowering emerging authors.
  `.trim();
}
