export interface IntegrityMetadata {
  pasteCount: number;
  totalCharacters: number;
  pasteRatio: number;
  isFlagged: boolean;
}

export function calculateIntegrity(pasteCount: number, totalCharacters: number): IntegrityMetadata {
  const pasteRatio = totalCharacters > 0 ? pasteCount / totalCharacters : 0;
  return {
    pasteCount,
    totalCharacters,
    pasteRatio: Math.round(pasteRatio * 100) / 100,
    isFlagged: pasteRatio > 0.5,
  };
}

export function buildAIReviewPrompt(cardTask: string, manuscriptText: string, integrity: IntegrityMetadata): string {
  const integrityNote = integrity.isFlagged
    ? `\n\nINTEGRITY NOTE: This submission has a high paste ratio (${Math.round(integrity.pasteRatio * 100)}% of content was pasted). Pay extra attention to whether this text feels like an original response to the prompt or a generic copy-paste. Look for signs of authentic voice and personal engagement with the task.`
    : "";

  return `You are reviewing a student's writing submission for the following task:

Task: ${cardTask}

Student's Submission:
${manuscriptText}
${integrityNote}

Please evaluate:
1. Does the writing directly address the task prompt?
2. Is there evidence of original thought and personal voice?
3. What specific strengths does this submission demonstrate?
4. What constructive suggestions would help the student improve?`;
}
