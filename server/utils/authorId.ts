import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";

function generateRandomDigits(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

function formatAuthorId(digits: string): string {
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}`;
}

export async function generateAuthorId(): Promise<string> {
  const maxAttempts = 100;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const digits = generateRandomDigits(6);
    const shortId = formatAuthorId(digits);
    
    const existing = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.indieQuillAuthorId, shortId))
      .limit(1);
    
    if (existing.length === 0) {
      return shortId;
    }
  }
  
  throw new Error("Unable to generate unique Author ID after maximum attempts");
}

export async function assignAuthorId(userId: string): Promise<string> {
  const shortId = await generateAuthorId();
  
  await db.update(users)
    .set({ indieQuillAuthorId: shortId })
    .where(eq(users.id, userId));
  
  return shortId;
}
