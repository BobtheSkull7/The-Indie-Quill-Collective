import crypto from "crypto";
import { db } from "./db";
import { publishingUpdates, applications, users, contracts } from "@shared/schema";
import { eq } from "drizzle-orm";

const INDIE_QUILL_API_URL = process.env.INDIE_QUILL_API_URL || "";
const INDIE_QUILL_API_KEY = process.env.INDIE_QUILL_API_KEY || "";
const INDIE_QUILL_API_SECRET = process.env.INDIE_QUILL_API_SECRET || "";

interface ApplicationPayload {
  source: "npo_collective";
  collectiveApplicationId: string;
  collectiveUserId: number;
  email: string;
  firstName: string;
  lastName: string;
  author: {
    email: string;
    firstName: string;
    lastName: string;
    penName: string | null;
    dateOfBirth: string;
    isMinor: boolean;
  };
  guardian: {
    name: string | null;
    email: string | null;
    phone: string | null;
    relationship: string | null;
  } | null;
  story: {
    hasStoryToTell: boolean;
    personalStruggles: string;
    expressionTypes: string;
    expressionOther: string | null;
  };
  motivation: {
    whyCollective: string;
    goals: string | null;
    hearAboutUs: string | null;
  };
  submittedAt: Date;
}

interface AuthorPayload {
  collectiveAuthorId: number;
  collectiveApplicationId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  penName: string | null;
  dateOfBirth: string;
  isMinor: boolean;
  guardianName: string | null;
  guardianEmail: string | null;
  hasStoryToTell: boolean;
  personalStruggles: string;
  expressionTypes: string;
  expressionOther: string | null;
  contractSignedAt: Date;
  role: "npo_author";
}

function generateSecureTemporaryPassword(): string {
  // Generate password with letters, numbers, and special character for complexity requirements
  const hex = crypto.randomBytes(12).toString("hex");
  return `${hex}!Aa1`;
}

function generateHmacSignature(payload: string, timestampMs: string): string {
  // LLC expects: timestamp_in_ms + "." + json_body
  const message = `${timestampMs}.${payload}`;
  return crypto
    .createHmac("sha256", INDIE_QUILL_API_SECRET)
    .update(message)
    .digest("hex");
}

// Send application data to LLC immediately upon submission
export async function sendApplicationToLLC(
  applicationId: number,
  userId: number,
  applicationData: any,
  userData: { email: string; firstName: string; lastName: string }
): Promise<{ success: boolean; llcApplicationId?: string; error?: string }> {
  if (!INDIE_QUILL_API_URL || !INDIE_QUILL_API_KEY || !INDIE_QUILL_API_SECRET) {
    console.log("Indie Quill integration not configured - skipping immediate sync");
    return { success: false, error: "Integration not configured" };
  }

  const payload: ApplicationPayload = {
    source: "npo_collective",
    collectiveApplicationId: applicationId.toString(),
    collectiveUserId: userId,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    author: {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      penName: applicationData.penName || null,
      dateOfBirth: applicationData.dateOfBirth,
      isMinor: applicationData.isMinor,
    },
    guardian: applicationData.isMinor ? {
      name: applicationData.guardianName || null,
      email: applicationData.guardianEmail || null,
      phone: applicationData.guardianPhone || null,
      relationship: applicationData.guardianRelationship || null,
    } : null,
    story: {
      hasStoryToTell: applicationData.hasStoryToTell,
      personalStruggles: applicationData.personalStruggles,
      expressionTypes: applicationData.expressionTypes,
      expressionOther: applicationData.expressionOther || null,
    },
    motivation: {
      whyCollective: applicationData.whyCollective,
      goals: applicationData.goals || null,
      hearAboutUs: applicationData.hearAboutUs || null,
    },
    submittedAt: new Date(),
  };

  const timestampMs = Date.now().toString();
  const payloadJson = JSON.stringify(payload);
  const signature = generateHmacSignature(payloadJson, timestampMs);

  try {
    const response = await fetch(`${INDIE_QUILL_API_URL}/api/internal/npo-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": INDIE_QUILL_API_KEY,
        "X-Timestamp": timestampMs,
        "X-Signature": signature,
      },
      body: payloadJson,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Indie Quill API error:", response.status, errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`Application ${applicationId} synced to LLC with ID: ${data.applicationId}`);
    return { success: true, llcApplicationId: data.applicationId };
  } catch (error) {
    console.error("Failed to send application to Indie Quill:", error);
    return { success: false, error: `Connection failed: ${error}` };
  }
}

// Send contract signature update to LLC
export async function sendContractSignatureToLLC(
  applicationId: number,
  signatureType: "author" | "guardian",
  signature: string
): Promise<{ success: boolean; error?: string }> {
  if (!INDIE_QUILL_API_URL || !INDIE_QUILL_API_KEY || !INDIE_QUILL_API_SECRET) {
    console.log("Indie Quill integration not configured - skipping signature sync");
    return { success: false, error: "Integration not configured" };
  }

  const payload = {
    source: "npo_collective",
    collectiveApplicationId: applicationId,
    signatureType,
    signature,
    signedAt: new Date(),
  };

  const timestampMs = Date.now().toString();
  const payloadJson = JSON.stringify(payload);
  const signatureHash = generateHmacSignature(payloadJson, timestampMs);

  try {
    const response = await fetch(`${INDIE_QUILL_API_URL}/api/internal/npo-applications/${applicationId}/signature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": INDIE_QUILL_API_KEY,
        "X-Timestamp": timestampMs,
        "X-Signature": signatureHash,
      },
      body: payloadJson,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Indie Quill signature sync error:", response.status, errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    console.log(`Contract signature for application ${applicationId} synced to LLC`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send signature to Indie Quill:", error);
    return { success: false, error: `Connection failed: ${error}` };
  }
}

// Send application status update to LLC (when admin accepts/rejects)
// Uses collectiveApplicationId in body so LLC can lookup the correct record
export async function sendStatusUpdateToLLC(
  applicationId: number,
  status: string,
  reviewNotes: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!INDIE_QUILL_API_URL || !INDIE_QUILL_API_KEY || !INDIE_QUILL_API_SECRET) {
    console.log("Indie Quill integration not configured - skipping status sync");
    return { success: false, error: "Integration not configured" };
  }

  const payload = {
    source: "npo_collective",
    collectiveApplicationId: applicationId.toString(),
    status,
    reviewNotes,
    updatedAt: new Date(),
  };

  const timestampMs = Date.now().toString();
  const payloadJson = JSON.stringify(payload);
  const signature = generateHmacSignature(payloadJson, timestampMs);

  try {
    // Use status endpoint that looks up by collectiveApplicationId in body
    const response = await fetch(`${INDIE_QUILL_API_URL}/api/internal/npo-applications/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": INDIE_QUILL_API_KEY,
        "X-Timestamp": timestampMs,
        "X-Signature": signature,
      },
      body: payloadJson,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Indie Quill status sync error:", response.status, errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    console.log(`Status update for application ${applicationId} synced to LLC`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send status to Indie Quill:", error);
    return { success: false, error: `Connection failed: ${error}` };
  }
}

async function sendToIndieQuill(payload: AuthorPayload): Promise<{ success: boolean; authorId?: string; error?: string }> {
  if (!INDIE_QUILL_API_URL || !INDIE_QUILL_API_KEY || !INDIE_QUILL_API_SECRET) {
    console.log("Indie Quill integration not configured - skipping sync");
    return { success: false, error: "Integration not configured" };
  }

  // Build payload for LLC's /api/collective/migrate-author endpoint
  const migratePayload = {
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    password: payload.password,
    collectiveUserId: payload.collectiveApplicationId, // LLC expects collectiveUserId
    guardianName: payload.guardianName || null,
    guardianEmail: payload.guardianEmail || null,
    dateOfBirth: payload.dateOfBirth || null,
  };

  const timestampMs = Date.now().toString();
  const payloadJson = JSON.stringify(migratePayload);
  const signature = generateHmacSignature(payloadJson, timestampMs);

  // Normalize URL - remove trailing /api if present to avoid double /api/api
  const baseUrl = INDIE_QUILL_API_URL.replace(/\/api\/?$/, '');
  const endpoint = `${baseUrl}/api/collective/migrate-author`;

  console.log(`Sending author to LLC: ${payload.email}`);
  console.log(`Endpoint: POST ${endpoint}`);

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Indie Quill API error:", response.status, errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    // LLC returns: { message: "...", user: { id, email, ... } }
    const authorId = data.user?.id || data.authorId || data.id;
    console.log(`Author synced successfully. LLC Author ID: ${authorId}`);
    return { success: true, authorId: authorId?.toString() };
  } catch (error) {
    console.error("Failed to connect to Indie Quill API:", error);
    return { success: false, error: `Connection failed: ${error}` };
  }
}

export async function migrateAuthorToIndieQuill(publishingUpdateId: number): Promise<boolean> {
  try {
    const [update] = await db.select().from(publishingUpdates)
      .where(eq(publishingUpdates.id, publishingUpdateId));

    if (!update) {
      console.error("Publishing update not found:", publishingUpdateId);
      return false;
    }

    if (update.syncStatus === "synced") {
      console.log("Author already synced:", publishingUpdateId);
      return true;
    }

    await db.update(publishingUpdates)
      .set({
        syncStatus: "syncing",
        syncAttempts: update.syncAttempts + 1,
        lastSyncAttempt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(publishingUpdates.id, publishingUpdateId));

    const [application] = await db.select().from(applications)
      .where(eq(applications.id, update.applicationId));

    if (!application) {
      throw new Error("Application not found");
    }

    const [user] = await db.select().from(users)
      .where(eq(users.id, application.userId));

    if (!user) {
      throw new Error("User not found");
    }

    const [contract] = await db.select().from(contracts)
      .where(eq(contracts.applicationId, application.id));

    const payload: AuthorPayload = {
      collectiveAuthorId: user.id,
      collectiveApplicationId: application.id.toString(),
      email: user.email,
      password: generateSecureTemporaryPassword(),
      firstName: user.firstName,
      lastName: user.lastName,
      penName: application.penName,
      dateOfBirth: application.dateOfBirth,
      isMinor: application.isMinor,
      guardianName: application.guardianName,
      guardianEmail: application.guardianEmail,
      hasStoryToTell: application.hasStoryToTell,
      personalStruggles: application.personalStruggles,
      expressionTypes: application.expressionTypes,
      expressionOther: application.expressionOther,
      contractSignedAt: contract?.authorSignedAt || new Date(),
      role: "npo_author",
    };

    const result = await sendToIndieQuill(payload);

    if (result.success && result.authorId) {
      await db.update(publishingUpdates)
        .set({
          syncStatus: "synced",
          indieQuillAuthorId: result.authorId,
          lastSyncedAt: new Date(),
          syncError: null,
          statusMessage: "Successfully synced with The Indie Quill LLC. Your publishing journey begins!",
          updatedAt: new Date(),
        })
        .where(eq(publishingUpdates.id, publishingUpdateId));

      console.log(`Author ${user.email} successfully migrated to Indie Quill as ${result.authorId}`);
      return true;
    } else {
      await db.update(publishingUpdates)
        .set({
          syncStatus: "failed",
          syncError: result.error || "Unknown error",
          updatedAt: new Date(),
        })
        .where(eq(publishingUpdates.id, publishingUpdateId));

      console.error(`Failed to migrate author ${user.email}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error("Migration error:", error);
    
    await db.update(publishingUpdates)
      .set({
        syncStatus: "failed",
        syncError: String(error),
        updatedAt: new Date(),
      })
      .where(eq(publishingUpdates.id, publishingUpdateId));

    return false;
  }
}

export async function retryFailedMigrations(): Promise<{ retried: number; succeeded: number }> {
  const failedUpdates = await db.select().from(publishingUpdates)
    .where(eq(publishingUpdates.syncStatus, "failed"));

  let succeeded = 0;
  
  for (const update of failedUpdates) {
    if (update.syncAttempts < 5) {
      const success = await migrateAuthorToIndieQuill(update.id);
      if (success) succeeded++;
    }
  }

  return { retried: failedUpdates.length, succeeded };
}

export async function getPendingMigrations(): Promise<number> {
  const pending = await db.select().from(publishingUpdates)
    .where(eq(publishingUpdates.syncStatus, "pending"));
  return pending.length;
}

export async function sendUserRoleUpdateToLLC(
  userId: number,
  email: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  if (!INDIE_QUILL_API_URL || !INDIE_QUILL_API_KEY || !INDIE_QUILL_API_SECRET) {
    console.log("Indie Quill integration not configured - skipping user role sync");
    return { success: false, error: "Integration not configured" };
  }

  const payload = {
    source: "npo_collective",
    collectiveUserId: userId,
    email,
    role,
    updatedAt: new Date(),
  };

  const timestampMs = Date.now().toString();
  const payloadJson = JSON.stringify(payload);
  const signature = generateHmacSignature(payloadJson, timestampMs);

  try {
    const response = await fetch(`${INDIE_QUILL_API_URL}/api/internal/npo-users/${userId}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": INDIE_QUILL_API_KEY,
        "X-Timestamp": timestampMs,
        "X-Signature": signature,
      },
      body: payloadJson,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Indie Quill user role sync error:", response.status, errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    console.log(`User role update for ${email} synced to LLC: ${role}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send user role to Indie Quill:", error);
    return { success: false, error: `Connection failed: ${error}` };
  }
}
