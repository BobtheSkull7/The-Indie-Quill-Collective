import { db } from "../db";
import { cohorts, applications } from "@shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";

const COHORT_CAPACITY = 10;

export function generateInternalId(
  lastName: string,
  firstName: string,
  isMinor: boolean,
  dateApproved: Date
): string {
  const lastNameClean = lastName.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const firstInitial = firstName.charAt(0).toUpperCase();
  const minorAdult = isMinor ? 'M' : 'A';
  const year = dateApproved.getFullYear();
  const month = String(dateApproved.getMonth() + 1).padStart(2, '0');
  const day = String(dateApproved.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  return `${lastNameClean}${firstInitial}${minorAdult}${dateStr}`;
}

async function createNewCohort(tx: any): Promise<{ id: number; label: string; currentCount: number; capacity: number }> {
  const allCohorts = await tx.select().from(cohorts);
  const nextNumber = allCohorts.length + 1;
  const newLabel = `Cohort ${nextNumber}`;

  const [newCohort] = await tx.insert(cohorts)
    .values({
      label: newLabel,
      capacity: COHORT_CAPACITY,
      currentCount: 0,
      status: 'open',
    })
    .returning();

  return { 
    id: newCohort.id, 
    label: newCohort.label, 
    currentCount: newCohort.currentCount,
    capacity: newCohort.capacity 
  };
}

async function assignToCohortWithLock(tx: any): Promise<{ cohortId: number; cohortLabel: string }> {
  const result = await tx.execute(sql`
    SELECT id, label, current_count, capacity
    FROM cohorts
    WHERE status = 'open'
    ORDER BY id
    LIMIT 1
    FOR UPDATE
  `);
  
  let cohort = result.rows[0] as { id: number; label: string; current_count: number; capacity: number } | undefined;
  
  if (!cohort || cohort.current_count >= cohort.capacity) {
    if (cohort) {
      await tx.update(cohorts)
        .set({ status: 'closed' })
        .where(eq(cohorts.id, cohort.id));
    }
    const newCohort = await createNewCohort(tx);
    cohort = { 
      id: newCohort.id, 
      label: newCohort.label, 
      current_count: newCohort.currentCount,
      capacity: newCohort.capacity 
    };
  }
  
  const updated = await tx.update(cohorts)
    .set({ currentCount: sql`${cohorts.currentCount} + 1` })
    .where(and(
      eq(cohorts.id, cohort.id),
      lt(cohorts.currentCount, cohort.capacity)
    ))
    .returning({ currentCount: cohorts.currentCount });
  
  if (!updated.length) {
    await tx.update(cohorts)
      .set({ status: 'closed' })
      .where(eq(cohorts.id, cohort.id));
    return assignToCohortWithLock(tx);
  }
  
  if (updated[0].currentCount >= cohort.capacity) {
    await tx.update(cohorts)
      .set({ status: 'closed' })
      .where(eq(cohorts.id, cohort.id));
  }
  
  return { cohortId: cohort.id, cohortLabel: cohort.label };
}

export async function processAcceptance(
  applicationId: number,
  userId: string,
  lastName: string,
  firstName: string,
  isMinor: boolean
): Promise<{
  internalId: string;
  cohortId: number;
  cohortLabel: string;
  dateApproved: Date;
}> {
  return await db.transaction(async (tx) => {
    const dateApproved = new Date();
    
    const internalId = generateInternalId(lastName, firstName, isMinor, dateApproved);
    
    const { cohortId, cohortLabel } = await assignToCohortWithLock(tx);
    
    await tx.update(applications)
      .set({
        internalId,
        cohortId,
        dateApproved,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));

    return {
      internalId,
      cohortId,
      cohortLabel,
      dateApproved,
    };
  });
}
