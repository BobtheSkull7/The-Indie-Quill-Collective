import { db } from "../db";
import { cohorts, applications } from "@shared/schema";
import { eq, and } from "drizzle-orm";

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

export async function getOrCreateOpenCohort(): Promise<{ id: number; label: string }> {
  const [openCohort] = await db.select()
    .from(cohorts)
    .where(and(
      eq(cohorts.status, 'open'),
    ))
    .limit(1);

  if (openCohort && openCohort.currentCount < openCohort.capacity) {
    return { id: openCohort.id, label: openCohort.label };
  }

  if (openCohort) {
    await db.update(cohorts)
      .set({ status: 'closed' })
      .where(eq(cohorts.id, openCohort.id));
  }

  const allCohorts = await db.select().from(cohorts);
  const nextNumber = allCohorts.length + 1;
  const newLabel = `Cohort ${nextNumber}`;

  const [newCohort] = await db.insert(cohorts)
    .values({
      label: newLabel,
      capacity: COHORT_CAPACITY,
      currentCount: 0,
      status: 'open',
    })
    .returning();

  return { id: newCohort.id, label: newCohort.label };
}

export async function assignToCohort(applicationId: number): Promise<{ cohortId: number; cohortLabel: string }> {
  const cohort = await getOrCreateOpenCohort();
  
  const [updatedCohort] = await db.select()
    .from(cohorts)
    .where(eq(cohorts.id, cohort.id));
  
  const newCount = (updatedCohort?.currentCount || 0) + 1;
  
  await db.update(cohorts)
    .set({ currentCount: newCount })
    .where(eq(cohorts.id, cohort.id));
  
  if (newCount >= COHORT_CAPACITY) {
    await db.update(cohorts)
      .set({ status: 'closed' })
      .where(eq(cohorts.id, cohort.id));
  }
  
  return { cohortId: cohort.id, cohortLabel: cohort.label };
}

export async function processAcceptance(
  applicationId: number,
  userId: number,
  lastName: string,
  firstName: string,
  isMinor: boolean
): Promise<{
  internalId: string;
  cohortId: number;
  cohortLabel: string;
  dateApproved: Date;
}> {
  const dateApproved = new Date();
  
  const internalId = generateInternalId(lastName, firstName, isMinor, dateApproved);
  
  const { cohortId, cohortLabel } = await assignToCohort(applicationId);
  
  await db.update(applications)
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
}
