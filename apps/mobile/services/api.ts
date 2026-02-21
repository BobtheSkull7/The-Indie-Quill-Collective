import { API_BASE_URL } from '../constants/config';

export interface Transcript {
  id: number;
  user_id: string;
  vibescribe_id: string;
  content: string;
  source_type: string;
  created_at: string;
}

export interface VerifyResult {
  user: {
    id: string;
    firstName: string;
    vibeScribeId: string;
    familyUnitId: string | null;
  };
  familyWordCount: number;
}

export async function verifyScribeId(
  vibeScribeId: string
): Promise<{ success: boolean; data?: VerifyResult; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vibe/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vibeScribeId }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.message || 'Invalid Scribe ID' };
    }
    const data = await response.json();
    return { success: true, data };
  } catch {
    return { success: false, error: 'Network error. Check your connection.' };
  }
}

export async function sendTranscript(
  vibeScribeId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vibe/save-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vibeScribeId, content }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.message || 'Failed to send transcript' };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Network error. Check your connection.' };
  }
}

export async function getTranscriptHistory(
  vibeScribeId: string
): Promise<{ success: boolean; transcripts?: Transcript[]; error?: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/vibe/history?vibeScribeId=${encodeURIComponent(vibeScribeId)}`
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to load history' };
    }
    const data = await response.json();
    return { success: true, transcripts: data.transcripts || [] };
  } catch {
    return { success: false, error: 'Network error. Check your connection.' };
  }
}
