import { db } from "../db";
import { sql } from "drizzle-orm";

const LEVEL_THRESHOLDS = [
  0,     // Level 1: 0 XP
  100,   // Level 2: 100 XP
  250,   // Level 3: 250 XP
  500,   // Level 4: 500 XP
  800,   // Level 5: 800 XP
  1200,  // Level 6: 1,200 XP
  1700,  // Level 7: 1,700 XP
  2300,  // Level 8: 2,300 XP
  3000,  // Level 9: 3,000 XP
  3800,  // Level 10: 3,800 XP
  4700,  // Level 11: 4,700 XP
  5700,  // Level 12: 5,700 XP
  6800,  // Level 13: 6,800 XP
  8000,  // Level 14: 8,000 XP
  9300,  // Level 15: 9,300 XP
  10700, // Level 16: 10,700 XP
  12200, // Level 17: 12,200 XP
  13800, // Level 18: 13,800 XP
  15500, // Level 19: 15,500 XP
  17300, // Level 20: 17,300 XP
  19200, // Level 21: 19,200 XP
  21200, // Level 22: 21,200 XP
  23300, // Level 23: 23,300 XP
  25500, // Level 24: 25,500 XP
];

const LEVEL_NAMES: Record<number, string> = {
  1: "the Novice",
  2: "the Scribbler",
  3: "the Dreamer",
  4: "the Storyteller",
  5: "the Visionary",
  6: "the Wordsmith",
  7: "the Architect",
  8: "the Ink-Slinger",
  9: "the Storysmith",
  10: "the Word-Weaver",
  11: "the Journeyman",
  12: "the Polisher",
  13: "the Perfectionist",
  14: "the Detail-Master",
  15: "the Page-Turner",
  16: "the Chapter-Crafter",
  17: "the Narrative-Knight",
  18: "the Prose-Paladin",
  19: "the Lore-Keeper",
  20: "the Epic-Forger",
  21: "the Myth-Maker",
  22: "the Legend-Scribe",
  23: "the Grand Author",
  24: "the Master Scribe",
};

interface RewardUnlock {
  level: number;
  item_id: string;
  item_name: string;
  slot: string;
}

const ITEM_REWARDS: RewardUnlock[] = [
  { level: 5, item_id: "travelers_satchel", item_name: "Traveler's Satchel", slot: "off_hand" },
  { level: 9, item_id: "golden_quill", item_name: "Golden Quill", slot: "main_hand" },
  { level: 14, item_id: "editors_monocle", item_name: "Editor's Monocle", slot: "head" },
  { level: 18, item_id: "authors_coat", item_name: "Author's Coat", slot: "body" },
  { level: 21, item_id: "scribes_gloves", item_name: "Scribe's Gloves", slot: "hands" },
  { level: 24, item_id: "masters_boots", item_name: "Master's Boots", slot: "feet" },
];

function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, 24);
}

function getXpIntoCurrentLevel(xp: number, level: number): number {
  const threshold = LEVEL_THRESHOLDS[level - 1] || 0;
  return xp - threshold;
}

function getXpNeededForNextLevel(level: number): number {
  if (level >= 24) return 0;
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold;
  return nextThreshold - currentThreshold;
}

export interface AwardXPResult {
  success: boolean;
  newXp: number;
  newLevel: number;
  oldLevel: number;
  leveledUp: boolean;
  ding?: string;
  newTitles?: string[];
  unlockedItem?: string | null;
}

export async function ensureGameCharacter(userId: string): Promise<any> {
  const existing = await db.execute(sql`
    SELECT * FROM game_characters WHERE user_id = ${userId} LIMIT 1
  `);
  
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const userResult = await db.execute(sql`
    SELECT first_name, vibe_scribe_id FROM users WHERE id = ${userId} LIMIT 1
  `);
  const userData = userResult.rows[0] as any;

  const result = await db.execute(sql`
    INSERT INTO game_characters (user_id, xp, level, active_title, unlocked_titles, equipped_items, unlocked_items, created_at, updated_at)
    VALUES (
      ${userId}, 0, 1, 'the Novice', '["the Novice"]'::jsonb,
      '{"main_hand": null, "off_hand": null, "head": null, "body": null, "hands": null, "feet": null}'::jsonb,
      '[]'::jsonb, NOW(), NOW()
    )
    ON CONFLICT (user_id) DO NOTHING
    RETURNING *
  `);

  if (result.rows.length > 0) {
    console.log(`[Game Engine] Created native character for user ${userId}`);
    return result.rows[0];
  }

  const refetch = await db.execute(sql`
    SELECT * FROM game_characters WHERE user_id = ${userId} LIMIT 1
  `);
  return refetch.rows[0];
}

export async function awardXP(userId: string, amount: number, source?: string): Promise<AwardXPResult> {
  await ensureGameCharacter(userId);
  
  const updated = await db.execute(sql`
    UPDATE game_characters SET xp = xp + ${amount}, updated_at = NOW()
    WHERE user_id = ${userId}
    RETURNING *
  `);

  if (updated.rows.length === 0) {
    return { success: false, newXp: 0, newLevel: 1, oldLevel: 1, leveledUp: false };
  }

  const character = updated.rows[0] as any;
  const newXp = character.xp;
  const oldLevel = character.level;
  const newLevel = calculateLevel(newXp);
  const leveledUp = newLevel > oldLevel;

  let newTitles: string[] = [];
  let unlockedItem: string | null = null;
  let currentUnlockedTitles: string[] = Array.isArray(character.unlocked_titles) ? character.unlocked_titles : ["the Novice"];
  let currentUnlockedItems: string[] = Array.isArray(character.unlocked_items) ? character.unlocked_items : [];
  let currentEquipped = character.equipped_items || { main_hand: null, off_hand: null, head: null, body: null, hands: null, feet: null };

  if (leveledUp) {
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      const titleForLevel = LEVEL_NAMES[lvl];
      if (titleForLevel && !currentUnlockedTitles.includes(titleForLevel)) {
        currentUnlockedTitles.push(titleForLevel);
        newTitles.push(titleForLevel);
      }

      const itemReward = ITEM_REWARDS.find(r => r.level === lvl);
      if (itemReward && !currentUnlockedItems.includes(itemReward.item_id)) {
        currentUnlockedItems.push(itemReward.item_id);
        unlockedItem = itemReward.item_name;
        currentEquipped = { ...currentEquipped, [itemReward.slot]: itemReward.item_id };
      }
    }

    const activeTitle = LEVEL_NAMES[newLevel] || character.active_title;

    await db.execute(sql`
      UPDATE game_characters SET
        level = ${newLevel},
        active_title = ${activeTitle},
        unlocked_titles = ${JSON.stringify(currentUnlockedTitles)}::jsonb,
        equipped_items = ${JSON.stringify(currentEquipped)}::jsonb,
        unlocked_items = ${JSON.stringify(currentUnlockedItems)}::jsonb,
        updated_at = NOW()
      WHERE user_id = ${userId}
    `);
  }

  const logSource = source || "unknown";
  const finalTitle = leveledUp ? (LEVEL_NAMES[newLevel] || "the Novice") : character.active_title;
  console.log(`[Game Engine] Awarded ${amount} XP to user ${userId} (${logSource}). Total: ${newXp}, Level: ${newLevel}${leveledUp ? " LEVEL UP!" : ""}`);

  return {
    success: true,
    newXp,
    newLevel,
    oldLevel,
    leveledUp,
    ding: leveledUp ? `Level Up! You are now Level ${newLevel} — ${finalTitle}!` : undefined,
    newTitles: newTitles.length > 0 ? newTitles : undefined,
    unlockedItem,
  };
}

export function getCharacterDisplayData(character: any) {
  const xp = character.xp || 0;
  const level = character.level || 1;
  const xpIntoLevel = getXpIntoCurrentLevel(xp, level);
  const xpNeeded = getXpNeededForNextLevel(level);

  const userResult = character.username || character.user_id;

  return {
    user_id: character.user_id,
    username: userResult,
    display_name: userResult,
    full_name: `${userResult} ${character.active_title || "the Novice"}`,
    total_xp: xp,
    current_level: level,
    xp_into_current_level: xpIntoLevel,
    xp_needed_for_next_level: xpNeeded,
    proxy_hours_earned: Math.round((xp / 166.67) * 10) / 10,
    active_title: character.active_title || "the Novice",
    unlocked_titles: character.unlocked_titles || ["the Novice"],
    equipped_items: character.equipped_items || { main_hand: null, off_hand: null, head: null, body: null, hands: null, feet: null },
    unlocked_items: character.unlocked_items || [],
    quests_completed: 0,
    total_quests: 24,
    claimable_quests: [],
    completed_quests: [],
  };
}

export const TOME_XP_BONUS = 10;
export const LEVEL_INFO = { thresholds: LEVEL_THRESHOLDS, names: LEVEL_NAMES, items: ITEM_REWARDS };
