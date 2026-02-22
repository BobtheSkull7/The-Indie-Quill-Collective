import { Pool } from 'pg';

function encodePasswordInUrl(url: string): string {
  const match = url.match(/^(postgresql:\/\/[^:]+:)([^@]+)(@.+)$/);
  if (!match) return url;
  const [_, prefix, password, suffix] = match;
  return prefix + encodeURIComponent(password) + suffix;
}

const rawUrl = process.env.SUPABASE_DEV_URL;
if (!rawUrl) {
  console.error("SUPABASE_DEV_URL not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: encodePasswordInUrl(rawUrl),
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log("[Seed] Connected to Supabase dev database");

    await client.query("BEGIN");

    await client.query(`
      UPDATE curriculums SET title = 'The Art of Storytelling', description = 'Master the craft of narrative fiction from character to climax', is_published = true, updated_at = NOW() WHERE id = 1
    `);

    const cur2 = await client.query(`SELECT id FROM curriculums WHERE id = 2`);
    if (cur2.rowCount === 0) {
      await client.query(`
        INSERT INTO curriculums (id, title, description, order_index, is_published, created_at, updated_at)
        VALUES (2, 'The Indie Publisher', 'Learn the business side of independent publishing', 2, true, NOW(), NOW())
      `);
    } else {
      await client.query(`
        UPDATE curriculums SET title = 'The Indie Publisher', description = 'Learn the business side of independent publishing', is_published = true, updated_at = NOW() WHERE id = 2
      `);
    }

    const existingDecks = await client.query("SELECT id, curriculum_id, title FROM vibe_decks ORDER BY id");
    console.log("[Seed] Existing decks:", existingDecks.rows);

    const storyDeckRow = existingDecks.rows.find((d: any) => d.curriculum_id === 1);
    const storyDeckId = storyDeckRow ? storyDeckRow.id : null;

    if (storyDeckId) {
      await client.query(`
        UPDATE vibe_decks SET 
          title = 'The Story Engine',
          description = 'Build compelling narratives from the ground up',
          tome_title = 'The Story Engine',
          tome_content = $1,
          is_published = true,
          updated_at = NOW()
        WHERE id = $2
      `, [`Every story worth telling begins with a character who wants something badly and is having trouble getting it. That single sentence is the engine of all narrative fiction. Before you write a single scene, you must know what your protagonist desires at a soul-deep level—not just what they say they want, but the aching, unspoken need that drives every choice they make.

In this deck you will build your story from the inside out. You will start with your character's Deepest Want, construct the world that stands in their way, and engineer the escalating conflicts that force them to grow or break. Each card is a building block: complete them in order and you will have the skeleton of a complete narrative arc, from Ordinary World to triumphant (or tragic) New Normal.

Write with specificity. "She wanted to be happy" is weak; "She wanted her mother to say, just once, that she was proud" is the kind of detail that makes readers lean in. Bring that level of precision to every card, and by the end of this deck you will hold a living, breathing story outline in your hands.`, storyDeckId]);

      await client.query(`DELETE FROM vibe_cards WHERE deck_id = $1`, [storyDeckId]);
    } else {
      const res = await client.query(`
        INSERT INTO vibe_decks (curriculum_id, title, description, tome_title, tome_content, order_index, is_published, created_at, updated_at)
        VALUES (1, 'The Story Engine', 'Build compelling narratives from the ground up', 'The Story Engine', $1, 1, true, NOW(), NOW())
        RETURNING id
      `, [`Every story worth telling begins with a character who wants something badly and is having trouble getting it. That single sentence is the engine of all narrative fiction. Before you write a single scene, you must know what your protagonist desires at a soul-deep level—not just what they say they want, but the aching, unspoken need that drives every choice they make.

In this deck you will build your story from the inside out. You will start with your character's Deepest Want, construct the world that stands in their way, and engineer the escalating conflicts that force them to grow or break. Each card is a building block: complete them in order and you will have the skeleton of a complete narrative arc, from Ordinary World to triumphant (or tragic) New Normal.

Write with specificity. "She wanted to be happy" is weak; "She wanted her mother to say, just once, that she was proud" is the kind of detail that makes readers lean in. Bring that level of precision to every card, and by the end of this deck you will hold a living, breathing story outline in your hands.`]);
    }

    const finalStoryDeckId = storyDeckId || (await client.query(`SELECT id FROM vibe_decks WHERE curriculum_id = 1 AND title = 'The Story Engine'`)).rows[0].id;

    const storyCards = [
      { task: 'The Breaking Point', qualifications: 'Write the single worst moment your protagonist will face in the entire story. Make it vivid. Make it personal. This is the crisis that everything else builds toward. Minimum 200 words of raw, emotional scene-writing.', min_word_count: 200, xp_value: 150 },
      { task: 'The First Ghost', qualifications: 'Every hero is haunted. Write a 150-word memory—the moment from your character\'s past that still whispers to them at 3 a.m. Show, don\'t tell: use sensory details (sound, smell, texture) to bring the memory alive.', min_word_count: 150, xp_value: 100 },
      { task: 'The Impossible Choice', qualifications: 'Place your character at a fork where both paths cost something precious. Describe the two options and why neither is safe. Write the internal monologue as they decide. No easy outs.', min_word_count: 200, xp_value: 150 },
      { task: 'Ordinary World', qualifications: 'Paint a single "day in the life" scene before the adventure begins. Show routine, relationships, and one small detail that hints the status quo is fragile. Engage at least three senses.', min_word_count: 200, xp_value: 100 },
      { task: 'The Hidden Talent', qualifications: 'Your character has a skill or trait they don\'t yet know will save them. Show it in action during an everyday moment—don\'t label it heroic, just let the reader see it.', min_word_count: 150, xp_value: 100 },
      { task: 'Fatal Flaw', qualifications: 'Name your character\'s fatal flaw (e.g., pride, distrust, recklessness). Then write a scene where that flaw causes a small but real consequence. The reader should wince.', min_word_count: 150, xp_value: 100 },
      { task: 'The Deepest Want', qualifications: 'State your protagonist\'s surface goal in one sentence. Then dig deeper: what is the emotional need underneath? Write a journal entry in their voice revealing what they truly crave.', min_word_count: 150, xp_value: 100 },
      { task: 'Threshold Guardian', qualifications: 'Create the character or force that blocks the entrance to the new world. Give them a name, a motive, and a warning speech. Write the confrontation scene.', min_word_count: 200, xp_value: 150 },
      { task: 'The First Step', qualifications: 'Write the moment your protagonist commits—crosses the threshold—and cannot go back. What do they leave behind? What do they carry? Keep it under 250 words for punch.', min_word_count: 150, xp_value: 100 },
      { task: 'New Rules', qualifications: 'The new world has different rules. List five and then write a short scene where your character breaks one by accident, learning the hard way.', min_word_count: 200, xp_value: 150 },
      { task: 'The Mentor\'s Toll', qualifications: 'Introduce a mentor figure. What wisdom do they offer? What price do they demand or what secret are they hiding? Write a dialogue-heavy scene.', min_word_count: 200, xp_value: 150 },
      { task: 'Trial by Fire', qualifications: 'Design a test that targets your character\'s Fatal Flaw. They should almost fail. Write the scene with rising tension—short sentences, strong verbs.', min_word_count: 200, xp_value: 150 },
      { task: 'Shared Burden', qualifications: 'Your protagonist cannot do this alone. Introduce an ally and write the scene where trust is forged. Show vulnerability from both sides.', min_word_count: 200, xp_value: 150 },
      { task: 'False Victory', qualifications: 'Write a scene where everything seems to go right. The goal feels within reach. Let the reader (and character) breathe—then plant one subtle seed of disaster in the final line.', min_word_count: 200, xp_value: 150 },
      { task: 'The Shadow Grows', qualifications: 'The antagonist makes a move that changes everything. Write it from the antagonist\'s point of view—make the reader understand (not excuse) their logic.', min_word_count: 200, xp_value: 150 },
      { task: 'Broken Tools', qualifications: 'Strip away your character\'s most relied-upon resource (weapon, ally, belief). Write the moment they realize it\'s gone and their first reaction.', min_word_count: 150, xp_value: 100 },
      { task: 'Whispers of Betrayal', qualifications: 'Someone the protagonist trusted reveals a hidden agenda. Write the confrontation. Focus on dialogue subtext—what is said vs. what is meant.', min_word_count: 200, xp_value: 150 },
      { task: 'The Belly of the Whale', qualifications: 'Your character hits absolute rock bottom. Write the darkest moment—internal and external. Let silence, isolation, and doubt dominate the page. No rescues yet.', min_word_count: 200, xp_value: 150 },
      { task: 'The Final Plan', qualifications: 'Your battered hero rallies. Write the "gathering of resources" scene: who\'s left, what they have, and the plan they cobble together. It should feel desperate but possible.', min_word_count: 200, xp_value: 150 },
      { task: 'Last Night\'s Peace', qualifications: 'The calm before the storm. Write a quiet moment of reflection or connection the night before the climax. Let it be bittersweet.', min_word_count: 150, xp_value: 100 },
      { task: 'Face Your Fear', qualifications: 'Write the climactic confrontation. The Fatal Flaw is tested one last time. This time your character must choose differently than they would have at the start.', min_word_count: 250, xp_value: 200 },
      { task: 'Sacrifice Play', qualifications: 'Victory demands a cost. Write what your protagonist gives up to win. It should echo The Deepest Want—they sacrifice something intimately connected to that need.', min_word_count: 200, xp_value: 150 },
      { task: 'The New Normal', qualifications: 'The adventure is over. Write the final scene: your character in their new ordinary world. Mirror the first Ordinary World card—same setting, different person. Show the change without stating it.', min_word_count: 200, xp_value: 150 },
    ];

    for (let i = 0; i < storyCards.length; i++) {
      const card = storyCards[i];
      await client.query(`
        INSERT INTO vibe_cards (deck_id, task, qualifications, min_word_count, xp_value, order_index, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [finalStoryDeckId, card.task, card.qualifications, card.min_word_count, card.xp_value, i + 1]);
    }
    console.log(`[Seed] Inserted ${storyCards.length} Story Engine cards into deck ${finalStoryDeckId}`);

    // Handle other decks under curriculum 1 - update if they exist
    const otherDecks = existingDecks.rows.filter((d: any) => d.curriculum_id === 1 && d.id !== finalStoryDeckId);
    if (otherDecks.length > 0) {
      const deck2 = otherDecks[0];
      await client.query(`
        UPDATE vibe_decks SET title = 'The Writer''s Polish', description = 'Refine your prose and develop your unique voice', is_published = true, updated_at = NOW() WHERE id = $1
      `, [deck2.id]);
      console.log(`[Seed] Updated deck ${deck2.id} to The Writer's Polish`);
    }

    // Legal Foundations deck under curriculum 2
    const legalDeckRow = existingDecks.rows.find((d: any) => d.curriculum_id === 2);
    let legalDeckId: number;

    if (legalDeckRow) {
      legalDeckId = legalDeckRow.id;
      await client.query(`
        UPDATE vibe_decks SET 
          title = 'Legal Foundations',
          description = 'Protect your intellectual property and understand the business of being an indie author.',
          tome_title = 'The Architect''s Shield',
          tome_content = $1,
          is_published = true,
          updated_at = NOW()
        WHERE id = $2
      `, [`Welcome to the Architect's corner. Writing a book is an act of creation; publishing it is an act of business. To thrive as an Indie Author, you must understand that your words are "Intellectual Property"—assets that have value, rights, and protections. This Tome is designed to strip away the mystery of copyrights and contracts.

Before you share your stories with the world, you must know how to guard them. From understanding the "Work for Hire" trap to mastering the basics of an LLC, this deck provides the legal shield every modern author needs. We aren't just writing for fun; we are building a legacy.

In the tasks ahead, you will define the boundaries of your creative business. You will learn how to read a contract like a hawk and how to ensure that your characters and worlds belong solely to you, forever. Let the creative work be wild, but let the legal work be precise.`, legalDeckId]);
      await client.query(`DELETE FROM vibe_cards WHERE deck_id = $1`, [legalDeckId]);
    } else {
      const res = await client.query(`
        INSERT INTO vibe_decks (curriculum_id, title, description, tome_title, tome_content, order_index, is_published, created_at, updated_at)
        VALUES (2, 'Legal Foundations', 'Protect your intellectual property and understand the business of being an indie author.', 'The Architect''s Shield', $1, 1, true, NOW(), NOW())
        RETURNING id
      `, [`Welcome to the Architect's corner. Writing a book is an act of creation; publishing it is an act of business. To thrive as an Indie Author, you must understand that your words are "Intellectual Property"—assets that have value, rights, and protections. This Tome is designed to strip away the mystery of copyrights and contracts.

Before you share your stories with the world, you must know how to guard them. From understanding the "Work for Hire" trap to mastering the basics of an LLC, this deck provides the legal shield every modern author needs. We aren't just writing for fun; we are building a legacy.

In the tasks ahead, you will define the boundaries of your creative business. You will learn how to read a contract like a hawk and how to ensure that your characters and worlds belong solely to you, forever. Let the creative work be wild, but let the legal work be precise.`]);
      legalDeckId = res.rows[0].id;
    }

    const legalCards = [
      { task: 'Copyright Claim', qualifications: 'Draft a one-paragraph summary of your story and state your intent to register the copyright. Explain why this specific world is unique to you.', min_word_count: 100, xp_value: 100 },
      { task: 'The LLC Shield', qualifications: 'Research and list the name you would choose for your publishing LLC. Write 3 sentences explaining why a separate business entity protects your personal assets.', min_word_count: 100, xp_value: 100 },
      { task: 'Contract Red Flags', qualifications: 'List 3 "Red Flag" phrases you would look for in a traditional publishing contract (e.g., "Life of Copyright"). Explain why they are dangerous.', min_word_count: 150, xp_value: 150 },
    ];

    for (let i = 0; i < legalCards.length; i++) {
      const card = legalCards[i];
      await client.query(`
        INSERT INTO vibe_cards (deck_id, task, qualifications, min_word_count, xp_value, order_index, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [legalDeckId, card.task, card.qualifications, card.min_word_count, card.xp_value, i + 1]);
    }
    console.log(`[Seed] Inserted ${legalCards.length} Legal Foundations cards into deck ${legalDeckId}`);

    await client.query("COMMIT");
    console.log("[Seed] All changes committed!");

    // Verification
    const finalC = await client.query("SELECT id, title, is_published FROM curriculums ORDER BY id");
    console.log("[Seed] Curriculums:", finalC.rows);

    const finalD = await client.query("SELECT id, curriculum_id, title, tome_title, is_published FROM vibe_decks ORDER BY curriculum_id, id");
    console.log("[Seed] Decks:", finalD.rows);

    const finalCards = await client.query("SELECT deck_id, COUNT(*) as count, SUM(xp_value) as total_xp FROM vibe_cards GROUP BY deck_id ORDER BY deck_id");
    console.log("[Seed] Card counts:", finalCards.rows);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Seed] Error:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().then(() => { console.log("[Seed] Done!"); process.exit(0); }).catch((err) => { console.error("[Seed] Failed:", err); process.exit(1); });
