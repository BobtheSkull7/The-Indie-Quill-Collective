import { registerNpoAuthorWithLLC } from './server/services/npo-sync-service';
import { db } from './server/db';
import { npoApplications } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testTinySync() {
  console.log('========================================');
  console.log('Starting registration for tiny@test.com');
  console.log('========================================\n');
  
  const result = await registerNpoAuthorWithLLC('tiny@test.com');
  
  console.log('\n========== SYNC RESULT ==========');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success && result.bookstoreId) {
    // Verify it was saved by fetching the record
    const [author] = await db.select()
      .from(npoApplications)
      .where(eq(npoApplications.email, 'tiny@test.com'));
    
    console.log('\n========== TINY\'S FINAL RECORD IN SUPABASE ==========');
    console.log({
      id: author.id,
      email: author.email,
      firstName: author.firstName,
      lastName: author.lastName,
      status: author.status,
      bookstoreId: author.bookstoreId,
      createdAt: author.createdAt,
    });
    console.log('\n✓ Identity Bridge Complete! Tiny is now linked to both systems.');
    console.log(`  - Collective UUID: ${author.id}`);
    console.log(`  - Bookstore UUID: ${author.bookstoreId}`);
  } else {
    console.log('\n✗ Sync failed. Check the error above.');
  }
  
  process.exit(result.success ? 0 : 1);
}

testTinySync();
