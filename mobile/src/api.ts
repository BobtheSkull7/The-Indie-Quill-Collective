import { API_BASE_URL } from "./config";
import { User } from "./types";

export async function verifyVibeId(vibeScribeId: string): Promise<User | null> {
  const res = await fetch(`${API_BASE_URL}/api/vibe/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vibeScribeId }),
  });
  
  if (!res.ok) return null;
  
  const data = await res.json();
  return data.user || null;
}

export async function transcribeAudio(fileUri: string): Promise<string> {
  const targetUrl = `${API_BASE_URL}/api/vibe/transcribe`;
  console.log("[VibeScribe] Starting transcription to:", targetUrl);
  console.log("[VibeScribe] File URI:", fileUri);
  
  const formData = new FormData();
  
  const extension = fileUri.split('.').pop()?.toLowerCase() || 'm4a';
  const mimeTypes: Record<string, string> = {
    'm4a': 'audio/m4a',
    'caf': 'audio/x-caf',
    'wav': 'audio/wav',
    'mp4': 'audio/mp4',
    '3gp': 'audio/3gpp',
    'aac': 'audio/aac',
  };
  const mimeType = mimeTypes[extension] || 'audio/mpeg';
  
  console.log("[VibeScribe] MIME type:", mimeType, "extension:", extension);
  
  formData.append("audio", {
    uri: fileUri,
    type: mimeType,
    name: `recording.${extension}`,
  } as any);

  try {
    console.log("[VibeScribe] Calling fetch now...");
    const res = await fetch(targetUrl, {
      method: "POST",
      body: formData,
    });
    
    console.log("[VibeScribe] Got response:", res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server error ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    console.log("[VibeScribe] Transcript received:", data.transcript?.substring(0, 50));
    return data.transcript || "";
  } catch (err: any) {
    console.error("[VibeScribe] Fetch failed:", err.message);
    throw new Error(`Network error: ${err.message}`);
  }
}

export async function saveDraft(
  vibeScribeId: string, 
  content: string
): Promise<{ success: boolean; familyWordCount: number }> {
  const res = await fetch(`${API_BASE_URL}/api/vibe/save-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vibeScribeId, content }),
  });
  
  if (!res.ok) throw new Error("Failed to save");
  
  return res.json();
}

export async function checkActiveQuiz(vibeScribeId: string) {
  const res = await fetch(
    `${API_BASE_URL}/api/vibe/quiz/active?vibeScribeId=${vibeScribeId}`
  );
  
  if (!res.ok) return null;
  
  const data = await res.json();
  return data.quiz || null;
}

export async function submitQuizAnswer(
  quizId: number,
  vibeScribeId: string,
  answer: string
) {
  const res = await fetch(`${API_BASE_URL}/api/vibe/quiz/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quizId, vibeScribeId, answer }),
  });
  
  return res.json();
}
