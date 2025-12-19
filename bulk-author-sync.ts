import { registerNpoAuthorWithLLC } from './server/services/npo-sync-service';
import { db } from './server/db';
import { npoApplications } from './shared/schema';
import { eq, isNull, and, or } from 'drizzle-orm';

interface SyncResult {
  email: string;
  success: boolean;
  bookstoreId?: string;
  error?: string;
}

function getStatusFilter(): string | null {
  const statusArg = process.argv.find(arg => arg.startsWith('--status='));
  if (statusArg) {
    return statusArg.split('=')[1];
  }
  return null;
}

async function bulkAuthorSync() {
  const isDryRun = process.argv.includes('--dry-run');
  const statusFilter = getStatusFilter();
  const startTime = Date.now();
  
  console.log('========================================');
  console.log('BULK AUTHOR SYNC TO BOOKSTORE');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE SYNC'}`);
  console.log(`Status Filter: ${statusFilter || 'approved (default)'}`);
  console.log('========================================\n');

  // Build the query based on status filter
  let statusCondition;
  if (statusFilter === 'migrated') {
    statusCondition = eq(npoApplications.status, 'migrated');
  } else if (statusFilter === 'both') {
    statusCondition = or(
      eq(npoApplications.status, 'approved'),
      eq(npoApplications.status, 'migrated')
    );
  } else {
    statusCondition = eq(npoApplications.status, 'approved');
  }

  // Query for authors that need syncing: status matches AND bookstore_id IS NULL
  const pendingAuthors = await db.select()
    .from(npoApplications)
    .where(
      and(
        statusCondition,
        isNull(npoApplications.bookstoreId)
      )
    );

  console.log(`Found ${pendingAuthors.length} author(s) pending sync:\n`);

  if (pendingAuthors.length === 0) {
    console.log('No authors to sync. All approved authors already have a bookstore_id.');
    process.exit(0);
  }

  // List all pending authors
  console.log('PENDING AUTHORS:');
  console.log('----------------');
  pendingAuthors.forEach((author, i) => {
    console.log(`${i + 1}. ${author.firstName} ${author.lastName}`);
    console.log(`   Email: ${author.email}`);
    console.log(`   Collective UUID: ${author.id}`);
    console.log(`   Status: ${author.status}`);
    console.log('');
  });

  // If dry run, stop here
  if (isDryRun) {
    console.log('========================================');
    console.log('DRY RUN COMPLETE');
    console.log(`${pendingAuthors.length} author(s) would be synced.`);
    console.log('Run without --dry-run flag to perform actual sync.');
    console.log('========================================');
    process.exit(0);
  }

  // Live sync mode
  console.log('Starting live sync...\n');
  
  const results: SyncResult[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const author of pendingAuthors) {
    console.log(`Syncing: ${author.email}...`);
    
    try {
      const result = await registerNpoAuthorWithLLC(author.email);
      
      if (result.success && result.bookstoreId) {
        successCount++;
        results.push({
          email: author.email,
          success: true,
          bookstoreId: result.bookstoreId,
        });
        console.log(`  ✓ Success - Bookstore ID: ${result.bookstoreId}`);
      } else {
        failCount++;
        results.push({
          email: author.email,
          success: false,
          error: result.error,
        });
        console.log(`  ✗ Failed - ${result.error}`);
      }
    } catch (error) {
      failCount++;
      results.push({
        email: author.email,
        success: false,
        error: String(error),
      });
      console.log(`  ✗ Error - ${error}`);
    }
    
    console.log('');
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('========================================');
  console.log('SYNC COMPLETE');
  console.log('========================================');
  console.log(`Total processed: ${pendingAuthors.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Time elapsed: ${elapsed}s`);
  console.log('');

  if (failCount > 0) {
    console.log('FAILED SYNCS:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.email}: ${r.error}`);
    });
  }

  process.exit(failCount > 0 ? 1 : 0);
}

bulkAuthorSync();
