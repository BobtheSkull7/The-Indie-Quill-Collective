import crypto from "crypto";
import { db } from "../db";
import { applications, users, publishingUpdates, cohorts, npoApplications } from "@shared/schema";
import { eq } from "drizzle-orm";

const INDIE_QUILL_API_URL = process.env.INDIE_QUILL_API_URL || "";
const INDIE_QUILL_API_KEY = process.env.INDIE_QUILL_API_KEY || "";
const INDIE_QUILL_API_SECRET = process.env.INDIE_QUILL_API_SECRET || "";

interface NPOAuthorPayload {
  source: "npo_collective";
  collectiveApplicationId: string;
  bookstoreAuthorId?: string;
  password: string;
  internalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  minorAdultDesignation: "M" | "A";
  guardian: {
    name: string | null;
    email: string | null;
    phone: string | null;
    relationship: string | null;
  } | null;
  dateApplied: string;
  dateApproved: string;
  dateMigrated: string;
  cohortLabel: string;
  profileAnswers: {
    penName: string | null;
    hasStoryToTell: boolean;
    personalStruggles: string;
    expressionTypes: string;
    expressionOther: string | null;
    whyCollective: string;
    goals: string | null;
    hearAboutUs: string | null;
  };
}

function generateSecureTemporaryPassword(): string {
  const hex = crypto.randomBytes(12).toString("hex");
  return `${hex}!Aa1`;
}

function generateHmacSignature(payload: string, timestampMs: string): string {
  const message = `${timestampMs}.${payload}`;
  return crypto
    .createHmac("sha256", INDIE_QUILL_API_SECRET)
    .update(message)
    .digest("hex");
}

export async function buildNPOAuthorPayload(applicationId: number): Promise<NPOAuthorPayload | null> {
  const [application] = await db.select()
    .from(applications)
    .where(eq(applications.id, applicationId));

  if (!application) {
    console.error(`Application ${applicationId} not found`);
    return null;
  }

  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, application.userId));

  if (!user) {
    console.error(`User for application ${applicationId} not found`);
    return null;
  }

  let cohortLabel = "Unknown";
  if (application.cohortId) {
    const [cohort] = await db.select()
      .from(cohorts)
      .where(eq(cohorts.id, application.cohortId));
    if (cohort) {
      cohortLabel = cohort.label;
    }
  }

  const payload: NPOAuthorPayload = {
    source: "npo_collective",
    collectiveApplicationId: application.id.toString(),
    password: generateSecureTemporaryPassword(),
    internalId: application.internalId || "",
    firstName: user.firstName,
    lastName: user.lastName,
    dateOfBirth: application.dateOfBirth,
    minorAdultDesignation: application.isMinor ? "M" : "A",
    guardian: application.isMinor ? {
      name: application.guardianName,
      email: application.guardianEmail,
      phone: application.guardianPhone,
      relationship: application.guardianRelationship,
    } : null,
    dateApplied: application.createdAt.toISOString(),
    dateApproved: application.dateApproved?.toISOString() || new Date().toISOString(),
    dateMigrated: new Date().toISOString(),
    cohortLabel,
    profileAnswers: {
      penName: application.penName,
      hasStoryToTell: application.hasStoryToTell,
      personalStruggles: application.personalStruggles,
      expressionTypes: application.expressionTypes,
      expressionOther: application.expressionOther,
      whyCollective: application.whyCollective,
      goals: application.goals,
      hearAboutUs: application.hearAboutUs,
    },
  };

  return payload;
}

async function registerAuthorWithLLC(
  applicationId: number,
  payload: NPOAuthorPayload,
  userEmail: string
): Promise<{ success: boolean; authorId?: string; error?: string }> {
  const registrationPayload = {
    source: "npo_collective",
    collectiveApplicationId: payload.collectiveApplicationId,
    email: userEmail,
    password: payload.password,
    firstName: payload.firstName,
    lastName: payload.lastName,
    penName: payload.profileAnswers.penName,
    dateOfBirth: payload.dateOfBirth,
    isMinor: payload.minorAdultDesignation === "M",
    guardianName: payload.guardian?.name || null,
    guardianEmail: payload.guardian?.email || null,
    guardianPhone: payload.guardian?.phone || null,
    internalId: payload.internalId,
    cohortLabel: payload.cohortLabel,
    role: "npo_author",
  };

  const timestampMs = Date.now().toString();
  const payloadJson = JSON.stringify(registrationPayload);
  const signature = generateHmacSignature(payloadJson, timestampMs);

  console.log(`Registering new author with LLC: ${userEmail} (App ID: ${applicationId})`);

  try {
    const response = await fetch(`${INDIE_QUILL_API_URL}/api/authors/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": INDIE_QUILL_API_KEY,
        "X-Timestamp": timestampMs,
        "X-Signature": signature,
      },
      body: payloadJson,
    });

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    if (!response.ok) {
      console.error("LLC registration error:", response.status, responseData);
      return { success: false, error: `Registration failed: ${response.status} - ${responseData.message || responseText}` };
    }

    console.log(`Author registered with LLC successfully. Author ID: ${responseData.authorId || responseData.id}`);
    return { success: true, authorId: responseData.authorId || responseData.id };
  } catch (error) {
    console.error("LLC registration connection error:", error);
    return { success: false, error: `Registration connection failed: ${error}` };
  }
}

export async function syncNPOAuthorToLLC(applicationId: number): Promise<{
  success: boolean;
  authorId?: string;
  error?: string;
}> {
  if (!INDIE_QUILL_API_URL || !INDIE_QUILL_API_KEY || !INDIE_QUILL_API_SECRET) {
    console.log("Indie Quill integration not configured - skipping sync");
    return { success: false, error: "Integration not configured" };
  }

  const [existingUpdate] = await db.select()
    .from(publishingUpdates)
    .where(eq(publishingUpdates.applicationId, applicationId));

  const payload = await buildNPOAuthorPayload(applicationId);
  if (!payload) {
    return { success: false, error: "Failed to build payload" };
  }

  const [application] = await db.select()
    .from(applications)
    .where(eq(applications.id, applicationId));
  
  if (!application) {
    return { success: false, error: "Application not found" };
  }

  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, application.userId));

  if (!user) {
    return { success: false, error: "User not found" };
  }

  let bookstoreAuthorId = existingUpdate?.indieQuillAuthorId || undefined;

  if (!bookstoreAuthorId) {
    console.log(`No LLC author ID found for app ${applicationId} - registering new author`);
    const registrationResult = await registerAuthorWithLLC(applicationId, payload, user.email);
    
    if (!registrationResult.success) {
      return registrationResult;
    }

    bookstoreAuthorId = registrationResult.authorId;

    if (existingUpdate) {
      await db.update(publishingUpdates)
        .set({
          indieQuillAuthorId: bookstoreAuthorId,
          updatedAt: new Date(),
        })
        .where(eq(publishingUpdates.id, existingUpdate.id));
    } else {
      await db.insert(publishingUpdates)
        .values({
          applicationId,
          userId: application.userId,
          status: 'not_started',
          syncStatus: 'syncing',
          indieQuillAuthorId: bookstoreAuthorId,
          statusMessage: 'Registered with LLC, syncing profile...',
        })
        .onConflictDoUpdate({
          target: publishingUpdates.applicationId,
          set: {
            indieQuillAuthorId: bookstoreAuthorId,
            updatedAt: new Date(),
          },
        });
    }

    console.log(`Author registered with ID ${bookstoreAuthorId}, now syncing full profile data...`);
  }

  payload.bookstoreAuthorId = bookstoreAuthorId;

  const timestampMs = Date.now().toString();
  const payloadJson = JSON.stringify(payload);
  const signature = generateHmacSignature(payloadJson, timestampMs);

  try {
    const response = await fetch(`${INDIE_QUILL_API_URL}/api/internal/npo-authors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": INDIE_QUILL_API_KEY,
        "X-Timestamp": timestampMs,
        "X-Signature": signature,
      },
      body: payloadJson,
    });

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    if (!response.ok) {
      console.error("LLC sync error:", response.status, responseData);
      return { success: false, error: `API error: ${response.status} - ${responseData.message || responseText}` };
    }

    if (responseData.status === "success" || response.status === 200 || response.status === 201) {
      await db.update(applications)
        .set({ 
          dateMigrated: new Date(),
          status: 'migrated',
          updatedAt: new Date(),
        })
        .where(eq(applications.id, applicationId));

      console.log(`NPO Author ${payload.internalId} synced to LLC successfully`);
      return { success: true, authorId: bookstoreAuthorId || responseData.authorId };
    }

    return { success: false, error: responseData.message || "Unknown error" };
  } catch (error) {
    console.error("LLC sync connection error:", error);
    return { success: false, error: `Connection failed: ${error}` };
  }
}

export async function createSyncJob(applicationId: number, userId: string): Promise<number> {
  const [existingJob] = await db.select()
    .from(publishingUpdates)
    .where(eq(publishingUpdates.applicationId, applicationId));

  if (existingJob) {
    await db.update(publishingUpdates)
      .set({
        syncStatus: 'pending',
        syncError: null,
        syncAttempts: 0,
        statusMessage: 'Queued for sync to The Indie Quill LLC...',
        updatedAt: new Date(),
      })
      .where(eq(publishingUpdates.id, existingJob.id));
    return existingJob.id;
  }

  const [newJob] = await db.insert(publishingUpdates)
    .values({
      applicationId,
      userId,
      status: 'not_started',
      syncStatus: 'pending',
      statusMessage: 'Queued for sync to The Indie Quill LLC...',
    })
    .returning();

  return newJob.id;
}

/**
 * Register an author from npo_applications table with the LLC Bookstore.
 * This function is specifically for migrated authors in Supabase.
 * 
 * CONSTRAINT: Currently hardcoded to only sync tiny@test.com for first test run.
 */
export async function registerNpoAuthorWithLLC(email: string): Promise<{
  success: boolean;
  bookstoreId?: string;
  error?: string;
  fullResponse?: any;
}> {
  // CONSTRAINT: Only allow tiny@test.com for this first test run
  if (email !== "tiny@test.com") {
    return { 
      success: false, 
      error: `Sync currently restricted to tiny@test.com only. Received: ${email}` 
    };
  }

  if (!INDIE_QUILL_API_URL || !INDIE_QUILL_API_KEY || !INDIE_QUILL_API_SECRET) {
    console.log("Indie Quill integration not configured - skipping sync");
    return { success: false, error: "Integration not configured" };
  }

  // Fetch the author from npo_applications
  const [author] = await db.select()
    .from(npoApplications)
    .where(eq(npoApplications.email, email));

  if (!author) {
    return { success: false, error: `Author with email ${email} not found in npo_applications` };
  }

  // Check if already synced
  if (author.bookstoreId) {
    console.log(`Author ${email} already has bookstoreId: ${author.bookstoreId}`);
    return { success: true, bookstoreId: author.bookstoreId, error: "Already synced" };
  }

  // Build the registration payload using the UUID from npo_applications.id
  const registrationPayload = {
    source: "npo_collective",
    collectiveApplicationId: author.id, // This is the UUID from Supabase
    email: author.email,
    password: generateSecureTemporaryPassword(),
    firstName: author.firstName || "",
    lastName: author.lastName || "",
    status: author.status || "migrated",
    role: "npo_author",
  };

  const timestampMs = Date.now().toString();
  const payloadJson = JSON.stringify(registrationPayload);
  const signature = generateHmacSignature(payloadJson, timestampMs);

  // Normalize URL - remove trailing /api if present to avoid double /api/api
  const baseUrl = INDIE_QUILL_API_URL.replace(/\/api\/?$/, '');
  const endpoint = `${baseUrl}/api/authors/register`;

  console.log(`\n========== NPO AUTHOR REGISTRATION ==========`);
  console.log(`Registering: ${email}`);
  console.log(`Collective Application ID (UUID): ${author.id}`);
  console.log(`Endpoint: POST ${endpoint}`);
  console.log(`Payload:`, JSON.stringify(registrationPayload, null, 2));

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": INDIE_QUILL_API_KEY,
        "X-Timestamp": timestampMs,
        "X-Signature": signature,
      },
      body: payloadJson,
    });

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawText: responseText };
    }

    console.log(`\n---------- BOOKSTORE RESPONSE ----------`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Full Response:`, JSON.stringify(responseData, null, 2));
    console.log(`==========================================\n`);

    if (!response.ok) {
      return { 
        success: false, 
        error: `Registration failed: ${response.status} - ${responseData.message || responseText}`,
        fullResponse: responseData 
      };
    }

    // Extract the bookstore author ID from the response
    const bookstoreId = responseData.authorId || responseData.id || responseData.userId;

    if (!bookstoreId) {
      console.error("No author ID returned from Bookstore API");
      return { 
        success: false, 
        error: "No author ID in response",
        fullResponse: responseData 
      };
    }

    // Save the bookstoreId back to npo_applications
    await db.update(npoApplications)
      .set({ bookstoreId: bookstoreId })
      .where(eq(npoApplications.id, author.id));

    console.log(`✓ Successfully saved bookstoreId ${bookstoreId} to npo_applications for ${email}`);

    return { 
      success: true, 
      bookstoreId,
      fullResponse: responseData 
    };

  } catch (error) {
    console.error("LLC registration connection error:", error);
    return { 
      success: false, 
      error: `Connection failed: ${error}`,
    };
  }
}

export async function processSyncJob(jobId: number): Promise<{ success: boolean; error?: string }> {
  const [job] = await db.select()
    .from(publishingUpdates)
    .where(eq(publishingUpdates.id, jobId));

  if (!job) {
    return { success: false, error: "Job not found" };
  }

  await db.update(publishingUpdates)
    .set({
      syncStatus: 'syncing',
      lastSyncAttempt: new Date(),
      syncAttempts: (job.syncAttempts || 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(publishingUpdates.id, jobId));

  const result = await syncNPOAuthorToLLC(job.applicationId);

  if (result.success) {
    await db.update(publishingUpdates)
      .set({
        syncStatus: 'synced',
        syncError: null,
        indieQuillAuthorId: result.authorId,
        lastSyncedAt: new Date(),
        statusMessage: 'Successfully synced to The Indie Quill LLC',
        updatedAt: new Date(),
      })
      .where(eq(publishingUpdates.id, jobId));
  } else {
    await db.update(publishingUpdates)
      .set({
        syncStatus: 'failed',
        syncError: result.error,
        statusMessage: `Sync failed: ${result.error}`,
        updatedAt: new Date(),
      })
      .where(eq(publishingUpdates.id, jobId));
  }

  return result;
}
