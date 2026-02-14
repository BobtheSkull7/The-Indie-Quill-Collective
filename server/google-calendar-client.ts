import { google } from 'googleapis';
import { db } from './db';
import { systemSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(session: any): string {
  const state = crypto.randomBytes(32).toString('hex');
  session.googleOAuthState = state;
  
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

export function validateOAuthState(session: any, state: string): boolean {
  const expected = session.googleOAuthState;
  delete session.googleOAuthState;
  return !!expected && expected === state;
}

export async function handleAuthCallback(code: string): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  const existingTokens = await getStoredTokens();

  const refreshToken = tokens.refresh_token || existingTokens?.refresh_token;

  if (!refreshToken) {
    console.warn('[Google Calendar] No refresh token available. User may need to re-authorize with prompt=consent.');
  }

  const tokenData = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: refreshToken,
    expiry_date: tokens.expiry_date,
    token_type: tokens.token_type,
    scope: tokens.scope,
  });

  const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, 'google_calendar_tokens'));

  if (existing.length > 0) {
    await db.update(systemSettings)
      .set({ value: tokenData, updatedAt: new Date() })
      .where(eq(systemSettings.key, 'google_calendar_tokens'));
  } else {
    await db.insert(systemSettings).values({
      key: 'google_calendar_tokens',
      value: tokenData,
    });
  }

  console.log('[Google Calendar] OAuth tokens saved successfully.');
}

async function getStoredTokens(): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  scope: string;
} | null> {
  try {
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'google_calendar_tokens'));
    if (!row) return null;
    return JSON.parse(row.value);
  } catch (error) {
    console.error('[Google Calendar] Failed to read stored tokens:', error);
    return null;
  }
}

async function saveTokens(tokens: any): Promise<void> {
  const tokenData = JSON.stringify(tokens);
  await db.update(systemSettings)
    .set({ value: tokenData, updatedAt: new Date() })
    .where(eq(systemSettings.key, 'google_calendar_tokens'));
}

async function getAuthenticatedClient() {
  const storedTokens = await getStoredTokens();
  if (!storedTokens || !storedTokens.refresh_token) {
    throw new Error('Google Calendar not connected. Please authorize via the admin dashboard.');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: storedTokens.access_token,
    refresh_token: storedTokens.refresh_token,
    expiry_date: storedTokens.expiry_date,
    token_type: storedTokens.token_type,
  });

  const now = Date.now();
  const expiryDate = storedTokens.expiry_date || 0;
  const bufferMs = 5 * 60 * 1000;

  if (now >= expiryDate - bufferMs) {
    console.log('[Google Calendar] Access token expired or expiring soon, refreshing...');
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      await saveTokens({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || storedTokens.refresh_token,
        expiry_date: credentials.expiry_date,
        token_type: credentials.token_type,
        scope: storedTokens.scope,
      });

      console.log('[Google Calendar] Access token refreshed successfully.');
    } catch (refreshError) {
      console.error('[Google Calendar] Token refresh failed:', refreshError);
      throw new Error('Failed to refresh Google Calendar token. Please re-authorize.');
    }
  }

  return oauth2Client;
}

export async function getUncachableGoogleCalendarClient() {
  const auth = await getAuthenticatedClient();
  return google.calendar({ version: 'v3', auth });
}

export async function isGoogleCalendarConnected(): Promise<boolean> {
  try {
    const tokens = await getStoredTokens();
    return !!(tokens && tokens.refresh_token);
  } catch {
    return false;
  }
}

export async function disconnectGoogleCalendar(): Promise<void> {
  try {
    await db.delete(systemSettings).where(eq(systemSettings.key, 'google_calendar_tokens'));
    console.log('[Google Calendar] Disconnected successfully.');
  } catch (error) {
    console.error('[Google Calendar] Failed to disconnect:', error);
    throw error;
  }
}
