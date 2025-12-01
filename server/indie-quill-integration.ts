import crypto from "crypto";
import { db } from "./db";
import { publishingUpdates, applications, users, contracts } from "@shared/schema";
import { eq } from "drizzle-orm";

const INDIE_QUILL_API_URL = process.env.INDIE_QUILL_API_URL || "";
const INDIE_QUILL_API_KEY = process.env.INDIE_QUILL_API_KEY || "";
const INDIE_QUILL_API_SECRET = process.env.INDIE_QUILL_API_SECRET || "";

interface AuthorPayload {
  collectiveAuthorId: number;
  email: string;
  firstName: string;
  lastName: string;
  penName: string | null;
  dateOfBirth: string;
  isMinor: boolean;
  guardianName: string | null;
  guardianEmail: string | null;
  bookTitle: string;
  genre: string;
  bookSummary: string;
  manuscriptStatus: string;
  contractSignedAt: Date;
  role: "npo_author";
}

function generateHmacSignature(payload: string, timestamp: number): string {
  const message = `${timestamp}.${payload}`;
  return crypto
    .createHmac("sha256", INDIE_QUILL_API_SECRET)
    .update(message)
    .digest("hex");
}

async function sendToIndieQuill(payload: AuthorPayload): Promise<{ success: boolean; authorId?: string; error?: string }> {
  if (!INDIE_QUILL_API_URL || !INDIE_QUILL_API_KEY || !INDIE_QUILL_API_SECRET) {
    console.log("Indie Quill integration not configured - skipping sync");
    return { success: false, error: "Integration not configured" };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const payloadJson = JSON.stringify(payload);
  const signature = generateHmacSignature(payloadJson, timestamp);

  try {
    const response = await fetch(`${INDIE_QUILL_API_URL}/api/internal/npo-authors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": INDIE_QUILL_API_KEY,
        "X-Timestamp": timestamp.toString(),
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
    return { success: true, authorId: data.authorId };
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
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      penName: application.penName,
      dateOfBirth: application.dateOfBirth,
      isMinor: application.isMinor,
      guardianName: application.guardianName,
      guardianEmail: application.guardianEmail,
      bookTitle: application.bookTitle,
      genre: application.genre,
      bookSummary: application.bookSummary,
      manuscriptStatus: application.manuscriptStatus,
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
