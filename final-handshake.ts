import { registerNpoAuthorWithLLC } from './server/services/npo-sync-service';
import { db } from './server/db';
import { npoApplications } from './shared/schema';
import { eq } from 'drizzle-orm';

async function finalHandshake() {
  console.log('Running final handshake for tiny@test.com...\n');
  
  const result = await registerNpoAuthorWithLLC('tiny@test.com');
  
  if (result.success && result.bookstoreId) {
    const [author] = await db.select()
      .from(npoApplications)
      .where(eq(npoApplications.email, 'tiny@test.com'));
    
    console.log(`SUCCESS: Tiny is synced. Bookstore ID: ${result.bookstoreId}`);
    console.log(`\nVerification - Supabase record:`);
    console.log(`  Collective UUID: ${author.id}`);
    console.log(`  Bookstore ID: ${author.bookstoreId}`);
  } else {
    console.log(`FAILED: ${result.error}`);
    if (result.fullResponse) {
      console.log('Full response:', JSON.stringify(result.fullResponse, null, 2));
    }
  }
  
  process.exit(result.success ? 0 : 1);
}

finalHandshake();
