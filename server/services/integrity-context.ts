export interface IntegrityMetadata {
  pasteCount: number;
  totalCharacters: number;
  pasteRatio: number;
  isFlagged: boolean;
}

export function buildIntegrityMetadata(
  pasteCount: number,
  totalCharacters: number
): IntegrityMetadata {
  const pasteRatio = totalCharacters > 0 ? pasteCount / totalCharacters : 0;
  return {
    pasteCount,
    totalCharacters,
    pasteRatio: Math.round(pasteRatio * 100) / 100,
    isFlagged: pasteRatio > 0.5,
  };
}

export function buildAIReviewPrompt(
  cardTask: string,
  manuscriptContent: string,
  integrity: IntegrityMetadata
): string {
  const lines: string[] = [
    "You are reviewing a student's writing submission for The Indie Quill Collective.",
    "",
    `## Card Task`,
    cardTask,
    "",
    `## Submission Content`,
    manuscriptContent,
    "",
    `## Integrity Metadata`,
    `- Pasted characters: ${integrity.pasteCount}`,
    `- Total characters: ${integrity.totalCharacters}`,
    `- Paste ratio: ${Math.round(integrity.pasteRatio * 100)}%`,
    `- Flagged for review: ${integrity.isFlagged ? "Yes" : "No"}`,
  ];

  if (integrity.isFlagged) {
    lines.push(
      "",
      "## Integrity Alert",
      "This submission has been automatically flagged because more than 50% of the content appears to be pasted.",
      "Pay extra attention to whether this text feels like an original response or a generic copy-paste.",
      "Look for signs of: AI-generated text, content copied from external sources, or text that doesn't directly address the card task.",
      "Provide your assessment of originality alongside your normal feedback."
    );
  }

  return lines.join("\n");
}
