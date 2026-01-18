/**
 * Minor-Safety Utilities
 * 
 * Zero-PII protection for minor authors in public-facing displays.
 * These utilities ensure COPPA compliance and grant-ready safety.
 */

// Emoji pool for consistent minor author avatars
const AUTHOR_EMOJIS = ['✍️', '📚', '📖', '🖊️', '📝', '🎭', '🌟', '💫', '🦋', '🌈'];

/**
 * Generates a consistent emoji avatar for an author based on their ID
 * Uses a hash of the ID to ensure the same author always gets the same emoji
 */
export function assignMinorEmoji(authorId: string | number): string {
  const idStr = String(authorId);
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    const char = idStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % AUTHOR_EMOJIS.length;
  return AUTHOR_EMOJIS[index];
}

/**
 * Truncates a name to "First + Last Initial" format
 * Example: "Jonathan Smith" → "Jonathan S."
 */
export function truncateName(firstName: string, lastName: string): string {
  const first = firstName?.trim() || 'Author';
  const lastInitial = lastName?.trim()?.charAt(0)?.toUpperCase() || '';
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

/**
 * Sanitizes an author profile for public display
 * If the author is a minor, applies Zero-PII protections
 */
export interface AuthorProfile {
  id: string | number;
  firstName: string;
  lastName: string;
  email?: string;
  dateOfBirth?: string;
  isMinor: boolean;
  penName?: string | null;
  profilePhoto?: string | null;
}

export interface SanitizedAuthorProfile {
  id: string | number;
  displayName: string;
  avatar: string;
  ageDisplay: string;
  isMinor: boolean;
  penName: string | null;
}

export function sanitizeAuthorProfile(author: AuthorProfile): SanitizedAuthorProfile {
  if (author.isMinor) {
    return {
      id: author.id,
      displayName: truncateName(author.firstName, author.lastName),
      avatar: assignMinorEmoji(author.id),
      ageDisplay: 'Youth Author',
      isMinor: true,
      penName: author.penName || null,
    };
  }

  // Adult authors get full display (still no email in public)
  return {
    id: author.id,
    displayName: `${author.firstName} ${author.lastName}`,
    avatar: author.profilePhoto || '👤',
    ageDisplay: 'Author',
    isMinor: false,
    penName: author.penName || null,
  };
}

/**
 * Batch sanitize multiple author profiles
 */
export function sanitizeAuthorProfiles(authors: AuthorProfile[]): SanitizedAuthorProfile[] {
  return authors.map(sanitizeAuthorProfile);
}

/**
 * Calculate age category for display (never shows actual age for minors)
 */
export function getAgeCategory(dateOfBirth: string, isMinor: boolean): string {
  if (isMinor) {
    return 'Youth Author';
  }
  return 'Author';
}
