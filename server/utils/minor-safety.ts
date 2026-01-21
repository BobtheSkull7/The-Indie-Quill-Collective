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
 * Applies Zero-PII protections based on publicIdentityEnabled and minor status
 * 
 * Default (Safe Mode): Uses Emoji + Truncated Name for minors only
 * Opt-In (Public Mode): Uses full Pen Name or full name with photo upload slot
 * 
 * For minors, Public Mode requires guardian counter-signature in the contract
 */
export interface AuthorProfile {
  id: string | number;
  firstName: string;
  lastName: string;
  email?: string;
  dateOfBirth?: string;
  isMinor: boolean;
  pseudonym?: string | null;
  profilePhoto?: string | null;
  publicIdentityEnabled?: boolean;
}

export interface SanitizedAuthorProfile {
  id: string | number;
  displayName: string;
  avatar: string;
  ageDisplay: string;
  isMinor: boolean;
  pseudonym: string | null;
  canShowPhoto: boolean;
}

export function sanitizeAuthorProfile(author: AuthorProfile): SanitizedAuthorProfile {
  // Check if public identity is enabled (opt-in to show full name/photo)
  const isPublicMode = author.publicIdentityEnabled === true;
  
  if (author.isMinor) {
    // Minors ALWAYS get protected display unless explicitly opted-in with guardian consent
    if (isPublicMode) {
      // Public Mode for minors (requires guardian counter-signature)
      return {
        id: author.id,
        displayName: author.pseudonym || `${author.firstName} ${author.lastName}`,
        avatar: author.profilePhoto || assignMinorEmoji(author.id),
        ageDisplay: 'Youth Author',
        isMinor: true,
        pseudonym: author.pseudonym || null,
        canShowPhoto: true,
      };
    }
    // Safe Mode (default for minors) - Zero-PII protection
    return {
      id: author.id,
      displayName: truncateName(author.firstName, author.lastName),
      avatar: assignMinorEmoji(author.id),
      ageDisplay: 'Youth Author',
      isMinor: true,
      pseudonym: author.pseudonym || null,
      canShowPhoto: false,
    };
  }

  // Adult authors - default to showing full name (existing behavior)
  // Only use safe mode if explicitly opted out
  return {
    id: author.id,
    displayName: author.pseudonym || `${author.firstName} ${author.lastName}`,
    avatar: author.profilePhoto || '👤',
    ageDisplay: 'Author',
    isMinor: false,
    pseudonym: author.pseudonym || null,
    canShowPhoto: true,
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
