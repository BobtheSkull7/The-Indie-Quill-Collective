import cron from "node-cron";
import { db } from "./db";
import { publishingUpdates } from "@shared/schema";
import { eq, and, lt, or } from "drizzle-orm";
import { migrateAuthorToIndieQuill } from "./indie-quill-integration";

const MAX_SYNC_ATTEMPTS = 5;
const SYNC_SCHEDULE = "*/5 * * * *"; // Every 5 minutes

interface SyncStats {
  pending: number;
  failed: number;
  retried: number;
  succeeded: number;
}

async function getRetryableRecords() {
  return await db.select().from(publishingUpdates)
    .where(
      and(
        or(
          eq(publishingUpdates.syncStatus, "pending"),
          eq(publishingUpdates.syncStatus, "failed")
        ),
        lt(publishingUpdates.syncAttempts, MAX_SYNC_ATTEMPTS)
      )
    );
}

async function runSyncJob(): Promise<SyncStats> {
  const stats: SyncStats = {
    pending: 0,
    failed: 0,
    retried: 0,
    succeeded: 0,
  };

  try {
    const records = await getRetryableRecords();
    
    stats.pending = records.filter(r => r.syncStatus === "pending").length;
    stats.failed = records.filter(r => r.syncStatus === "failed").length;
    stats.retried = records.length;

    if (records.length === 0) {
      return stats;
    }

    console.log(`[Sync Worker] Processing ${records.length} records (${stats.pending} pending, ${stats.failed} failed)`);

    for (const record of records) {
      try {
        const success = await migrateAuthorToIndieQuill(record.id);
        if (success) {
          stats.succeeded++;
          console.log(`[Sync Worker] Successfully synced record ${record.id}`);
        } else {
          console.log(`[Sync Worker] Failed to sync record ${record.id} (attempt ${record.syncAttempts + 1}/${MAX_SYNC_ATTEMPTS})`);
        }
      } catch (error) {
        console.error(`[Sync Worker] Error processing record ${record.id}:`, error);
      }
    }

    console.log(`[Sync Worker] Completed: ${stats.succeeded}/${stats.retried} succeeded`);
  } catch (error) {
    console.error("[Sync Worker] Job failed:", error);
  }

  return stats;
}

export function startSyncWorker(): void {
  console.log(`[Sync Worker] Starting scheduled sync job (${SYNC_SCHEDULE})`);
  
  cron.schedule(SYNC_SCHEDULE, async () => {
    console.log(`[Sync Worker] Running scheduled sync at ${new Date().toISOString()}`);
    await runSyncJob();
  });

  console.log("[Sync Worker] Sync worker initialized - will run every 5 minutes");
}

export async function runSyncJobManually(): Promise<SyncStats> {
  console.log("[Sync Worker] Manual sync triggered");
  return await runSyncJob();
}

export { getRetryableRecords, MAX_SYNC_ATTEMPTS };
