import { db } from "./db";
import { calendarEvents } from "@shared/schema";
import { eq, isNull, and } from "drizzle-orm";
import { getUncachableGoogleCalendarClient, isGoogleCalendarConnected } from "./google-calendar-client";

const PRIMARY_CALENDAR_ID = 'primary';

export interface SyncResult {
  success: boolean;
  error?: string;
  pushedToGoogle: number;
  pulledFromGoogle: number;
}

export async function syncCalendarEvents(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    pushedToGoogle: 0,
    pulledFromGoogle: 0,
  };

  try {
    const connected = await isGoogleCalendarConnected();
    if (!connected) {
      return { ...result, error: 'Google Calendar not connected' };
    }

    const calendar = await getUncachableGoogleCalendarClient();

    const pushResult = await pushEventsToGoogle(calendar);
    result.pushedToGoogle = pushResult.count;

    const pullResult = await pullEventsFromGoogle(calendar);
    result.pulledFromGoogle = pullResult.count;

    if (pushResult.errors.length > 0) {
      result.success = false;
      result.error = `Some events failed to sync: ${pushResult.errors.join('; ')}`;
    } else {
      result.success = true;
    }
    return result;
  } catch (error) {
    console.error('Calendar sync error:', error);
    return { ...result, error: error instanceof Error ? error.message : 'Sync failed' };
  }
}

function getNextDay(date: Date): string {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay.toISOString().split('T')[0];
}

async function pushEventsToGoogle(calendar: any): Promise<{ count: number; errors: string[] }> {
  let count = 0;
  const errors: string[] = [];

  const localEvents = await db.select().from(calendarEvents)
    .where(and(
      isNull(calendarEvents.googleCalendarEventId),
      eq(calendarEvents.isFromGoogle, false)
    ));

  for (const event of localEvents) {
    try {
      const startDateStr = event.startDate.toISOString().split('T')[0];
      const endDateStr = event.endDate 
        ? (event.allDay ? getNextDay(event.endDate) : event.endDate.toISOString())
        : (event.allDay ? getNextDay(event.startDate) : new Date(event.startDate.getTime() + 60 * 60 * 1000).toISOString());

      const googleEvent = {
        summary: event.title,
        description: event.description || undefined,
        location: event.location || undefined,
        start: event.allDay 
          ? { date: startDateStr }
          : { dateTime: event.startDate.toISOString() },
        end: event.allDay 
          ? { date: endDateStr }
          : { dateTime: endDateStr },
      };

      const response = await calendar.events.insert({
        calendarId: PRIMARY_CALENDAR_ID,
        requestBody: googleEvent,
      });

      if (response.data.id) {
        await db.update(calendarEvents)
          .set({
            googleCalendarEventId: response.data.id,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(calendarEvents.id, event.id));
        count++;
      }
    } catch (error) {
      console.error(`Failed to push event ${event.id} to Google:`, error);
      errors.push(`Event "${event.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { count, errors };
}

async function pullEventsFromGoogle(calendar: any): Promise<{ count: number }> {
  let count = 0;

  try {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAhead = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: PRIMARY_CALENDAR_ID,
      timeMin: threeMonthsAgo.toISOString(),
      timeMax: sixMonthsAhead.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });

    const googleEvents = response.data.items || [];

    const existingEvents = await db.select().from(calendarEvents);
    const existingGoogleIds = new Set(
      existingEvents
        .filter(e => e.googleCalendarEventId)
        .map(e => e.googleCalendarEventId)
    );

    for (const gEvent of googleEvents) {
      if (!gEvent.id || existingGoogleIds.has(gEvent.id)) {
        continue;
      }

      const isAllDay = !gEvent.start?.dateTime;
      const startDate = isAllDay 
        ? new Date(gEvent.start?.date + 'T00:00:00')
        : new Date(gEvent.start?.dateTime || gEvent.start?.date);
      
      const endDate = gEvent.end 
        ? (isAllDay 
            ? new Date(gEvent.end?.date + 'T00:00:00')
            : new Date(gEvent.end?.dateTime || gEvent.end?.date))
        : null;

      try {
        await db.insert(calendarEvents).values({
          title: gEvent.summary || 'Untitled Event',
          description: gEvent.description || null,
          startDate,
          endDate,
          allDay: isAllDay,
          eventType: 'meeting',
          location: gEvent.location || null,
          createdBy: null,
          googleCalendarEventId: gEvent.id,
          lastSyncedAt: new Date(),
          isFromGoogle: true,
        });
        count++;
      } catch (error) {
        console.error(`Failed to import Google event ${gEvent.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to pull events from Google:', error);
  }

  return { count };
}

export async function deleteGoogleCalendarEvent(googleEventId: string): Promise<boolean> {
  try {
    const connected = await isGoogleCalendarConnected();
    if (!connected) {
      return false;
    }

    const calendar = await getUncachableGoogleCalendarClient();
    await calendar.events.delete({
      calendarId: PRIMARY_CALENDAR_ID,
      eventId: googleEventId,
    });
    return true;
  } catch (error) {
    console.error('Failed to delete Google Calendar event:', error);
    return false;
  }
}

export async function updateGoogleCalendarEvent(
  googleEventId: string,
  eventData: {
    title: string;
    description?: string | null;
    startDate: Date;
    endDate?: Date | null;
    allDay: boolean;
    location?: string | null;
  }
): Promise<boolean> {
  try {
    const connected = await isGoogleCalendarConnected();
    if (!connected) {
      return false;
    }

    const calendar = await getUncachableGoogleCalendarClient();
    
    const googleEvent = {
      summary: eventData.title,
      description: eventData.description || undefined,
      location: eventData.location || undefined,
      start: eventData.allDay 
        ? { date: eventData.startDate.toISOString().split('T')[0] }
        : { dateTime: eventData.startDate.toISOString() },
      end: eventData.endDate 
        ? (eventData.allDay 
            ? { date: eventData.endDate.toISOString().split('T')[0] }
            : { dateTime: eventData.endDate.toISOString() })
        : (eventData.allDay 
            ? { date: eventData.startDate.toISOString().split('T')[0] }
            : { dateTime: new Date(eventData.startDate.getTime() + 60 * 60 * 1000).toISOString() }),
    };

    await calendar.events.update({
      calendarId: PRIMARY_CALENDAR_ID,
      eventId: googleEventId,
      requestBody: googleEvent,
    });
    return true;
  } catch (error) {
    console.error('Failed to update Google Calendar event:', error);
    return false;
  }
}

export async function getGoogleCalendarConnectionStatus(): Promise<{
  connected: boolean;
  email?: string;
}> {
  try {
    const connected = await isGoogleCalendarConnected();
    if (!connected) {
      return { connected: false };
    }

    const calendar = await getUncachableGoogleCalendarClient();
    const response = await calendar.calendarList.get({
      calendarId: PRIMARY_CALENDAR_ID,
    });

    return {
      connected: true,
      email: response.data.id || undefined,
    };
  } catch {
    return { connected: false };
  }
}
