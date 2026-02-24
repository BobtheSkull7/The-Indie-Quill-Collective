import { Pool } from 'pg';

function encodePasswordInUrl(url: string): string {
  const match = url.match(/^(postgresql:\/\/[^:]+:)([^@]+)(@.+)$/);
  if (!match) return url;
  const [_, prefix, password, suffix] = match;
  return prefix + encodeURIComponent(password) + suffix;
}

async function seedCatalog04(pool: Pool, label: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let deckResult = await client.query(
      `SELECT id FROM vibe_decks WHERE title = 'The Storyteller''s Art'`
    );

    if (deckResult.rows.length === 0) {
      const currResult = await client.query(
        `SELECT id FROM curriculums WHERE title = 'Published Writer' LIMIT 1`
      );
      if (currResult.rows.length === 0) {
        console.error(`[${label}] No 'Published Writer' curriculum found. Skipping.`);
        await client.query('ROLLBACK');
        return;
      }
      const currId = currResult.rows[0].id;
      const insertDeck = await client.query(
        `INSERT INTO vibe_decks (curriculum_id, title, description, order_index, is_published, specialization)
         VALUES ($1, 'The Storyteller''s Art', 'Mastering the art of the short form. Learn to capture a whole world in just a few pages.', 5, true, 'storyteller')
         RETURNING id`,
        [currId]
      );
      console.log(`[${label}] Created 'The Storyteller''s Art' deck with id ${insertDeck.rows[0].id}`);
      deckResult = { rows: [{ id: insertDeck.rows[0].id }] };
    }

    const deckId = deckResult.rows[0].id;
    console.log(`[${label}] Using deck id ${deckId}, cleaning old data...`);

    await client.query(
      `DELETE FROM card_submissions WHERE card_id IN (
         SELECT vc.id FROM vibe_cards vc
         JOIN tomes t ON t.id = vc.tome_id
         WHERE t.deck_id = $1
       )`, [deckId]
    );
    await client.query(
      `DELETE FROM manuscripts WHERE card_id IN (
         SELECT vc.id FROM vibe_cards vc
         JOIN tomes t ON t.id = vc.tome_id
         WHERE t.deck_id = $1
       )`, [deckId]
    );
    await client.query(
      `DELETE FROM vibe_cards WHERE tome_id IN (
         SELECT id FROM tomes WHERE deck_id = $1
       )`, [deckId]
    );
    await client.query(
      `DELETE FROM tome_absorptions WHERE tome_id IN (
         SELECT id FROM tomes WHERE deck_id = $1
       )`, [deckId]
    );
    await client.query(`DELETE FROM tomes WHERE deck_id = $1`, [deckId]);

    await client.query(
      `UPDATE vibe_decks SET
         description = 'Mastering the art of the short form. Learn to capture a whole world in just a few pages.',
         specialization = 'storyteller'
       WHERE id = $1`, [deckId]
    );

    const lessons = [
      {
        title: "The Single Spark",
        order_index: 1,
        content: `[Foundation: "A short story is the map of a single moment."]

In a long novel, you have time to wander. But in Short Form storytelling, you need a Single Spark. This is one specific idea or "What If?" that starts and ends quickly. Ray Bradbury used to say a short story should be like a "firecracker"\u2014one bright flash that leaves the reader thinking.

Instead of a whole life story, we focus on a Sliver of Time. Maybe it's just one dinner, one walk, or one difficult conversation. By keeping the time short, you make the emotions feel much stronger. You aren't building a whole mountain; you are polishing a single diamond.

Your goal is to find the Emotional Core. What is the one feeling you want the reader to have when they finish? If you know the "Spark," you won't get lost in too many details. You will stay focused on the heart of the moment.`,
        tasks: [
          { title: "The Spark", type: "speaking", task: "What is the 'What If?' for your short story? Tell me the one specific moment or event that the whole story is about." },
          { title: "The Firecracker", type: "comprehension", task: "Why is it better to focus on a 'Sliver of Time' rather than a character's whole life in a short story?" },
          { title: "The Core Feeling", type: "writing", task: "Type one word that describes how you want your reader to feel at the very end (e.g., 'Hopeful,' 'Chilled,' or 'Relieved')." },
        ],
      },
      {
        title: "Starting in the Middle",
        order_index: 2,
        content: `[Foundation: "Don't clear your throat; just start singing."]

In a short story, we don't have time for long introductions. We use a trick called In Media Res. This is just a fancy way of saying "Starting in the middle of the action." You want to drop your reader right into the messiest part of the story on page one.

Imagine a character is already running, or an argument is already happening. You don't need to explain how they got there yet. The reader's brain is very smart\u2014they will catch up! By skipping the "boring parts" at the beginning, you grab the reader's attention and never let go.

We call this Economy of Language. It means using the smallest number of words to make the biggest impact. Every sentence has to earn its place in a short story. If a sentence doesn't move the story forward or show us who the character is, we let it go.`,
        tasks: [
          { title: "The Jump", type: "speaking", task: "Describe a scene where your character is already doing something exciting. Don't explain why\u2014just tell me what is happening right now." },
          { title: "The Boring Parts", type: "comprehension", task: "What does 'Economy of Language' mean, and why is it important when you only have a few pages to tell a story?" },
          { title: "The First Line", type: "writing", task: "Write a first line for a story that starts right in the middle of the action. (Example: 'The third time the phone rang, I knew I shouldn't have answered.')" },
        ],
      },
      {
        title: "The Power of One",
        order_index: 3,
        content: `[Foundation: "One hero, one goal, one obstacle."]

Because we have limited space, we follow the Rule of One. A great short story usually has One Main Character, One Clear Goal, and One Big Obstacle. If you try to add too many people or too many problems, the story gets "blurry."

We focus on the Internal Shift. In a novel, a character might change their whole life. In a short story, they might just change their mind about one thing. That small shift is where the magic happens. It's the "Aha!" moment that the reader is waiting for.

By keeping the focus tight, you make the ending much more powerful. You are shining a bright spotlight on one specific truth. When you master the "Rule of One," your stories will feel sharp, professional, and unforgettable.`,
        tasks: [
          { title: "The Goal", type: "speaking", task: "Who is your 'One Hero' and what is the 'One Goal' they are trying to reach in this short story?" },
          { title: "The Spotlight", type: "comprehension", task: "Why does adding too many characters make a short story feel 'blurry'?" },
          { title: "The Small Shift", type: "writing", task: "Type one sentence describing how your character's thinking will change by the end of the story." },
        ],
      },
      {
        title: "The Sharp Twist",
        order_index: 4,
        content: `[Foundation: "A great twist isn't a trick; it's a new way of seeing the truth."]

In short stories, we often use a Twist. This is a moment near the end where something happens that the reader didn't expect. But a good twist isn't just a random surprise. It should make the reader look back at the whole story and say, "Oh! Now I understand everything!"

We call this the Hidden Hint. Throughout the story, you drop tiny clues that the reader might not notice at first. When the twist happens, those clues finally make sense. This makes the reader feel smart for figuring it out, and it makes your story feel "tight" and well-planned.

Using VibeScribe is a great way to test your twist. Try telling your story out loud to yourself. If the ending makes you smile or gives you a little chill, you've found the right moment. The twist is the "Firecracker" finally going off.`,
        tasks: [
          { title: "The Surprise", type: "speaking", task: "What is the 'Twist' in your story? What is the one thing the reader thinks they know, but is actually different at the end?" },
          { title: "The Hidden Hint", type: "comprehension", task: "Why is it important to drop tiny clues before the twist actually happens?" },
          { title: "The Clue", type: "writing", task: "Write one sentence that could be a 'hidden hint' in your story\u2014something that seems normal at first but becomes important later." },
        ],
      },
      {
        title: "The Echo",
        order_index: 5,
        content: `[Foundation: "The best stories don't end on the page; they end in the reader's mind."]

The last sentence of a short story is the most important one. We call this the Echo. It is the final thought or image that "rings" in the reader's head after they finish. In short form writing, you don't need to wrap everything up in a neat bow. Sometimes, leaving a little bit of mystery is even better.

We aim for Resonance. This is a big word that just means the story stays with the reader. You achieve this by ending on a strong Visual Image or a powerful line of dialogue. You want the reader to sit in silence for a moment after they close the "Folio."

Finishing a short story is a masterclass in discipline. You've learned how to be fast, how to be sharp, and how to make every word count. You are now a Storyteller, capable of capturing lightning in a bottle.`,
        tasks: [
          { title: "The Final Ring", type: "speaking", task: "Speak the very last sentence of your story out loud. How does it make you feel to say it?" },
          { title: "The Mystery", type: "comprehension", task: "In a short story, why is it sometimes better to leave a little mystery instead of explaining every single detail at the end?" },
          { title: "The Echo", type: "writing", task: "Type the final image you want your reader to see (for example: 'An empty swing still moving,' or 'A single light turning off')." },
        ],
      },
    ];

    for (const lesson of lessons) {
      const tomeResult = await client.query(
        `INSERT INTO tomes (deck_id, title, content, order_index)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [deckId, lesson.title, lesson.content, lesson.order_index]
      );
      const tomeId = tomeResult.rows[0].id;
      console.log(`[${label}] Lesson ${lesson.order_index}: "${lesson.title}" \u2192 tome_id ${tomeId}`);

      for (let i = 0; i < lesson.tasks.length; i++) {
        const t = lesson.tasks[i];
        const minWordCount = t.type === 'writing' ? 10 : 0;
        await client.query(
          `INSERT INTO vibe_cards (tome_id, task, qualifications, task_type, xp_value, min_word_count, order_index)
           VALUES ($1, $2, $3, $4, 0, $5, $6)`,
          [tomeId, `${t.title}: ${t.task}`, null, t.type, minWordCount, i + 1]
        );
      }
      console.log(`[${label}]   \u2192 3 tasks seeded (speaking, comprehension, writing)`);
    }

    await client.query('COMMIT');
    console.log(`[${label}] Catalog 04 seed complete: 5 lessons, 15 tasks.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[${label}] Seed failed:`, err);
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const devUrl = process.env.SUPABASE_DEV_URL;
  const prodUrl = process.env.SUPABASE_PROD_URL;

  if (devUrl) {
    console.log('\n=== Seeding DEV database ===');
    const devPool = new Pool({ connectionString: encodePasswordInUrl(devUrl), ssl: { rejectUnauthorized: false } });
    await seedCatalog04(devPool, 'DEV');
    await devPool.end();
  }

  if (prodUrl) {
    console.log('\n=== Seeding PROD database ===');
    const prodPool = new Pool({ connectionString: encodePasswordInUrl(prodUrl), ssl: { rejectUnauthorized: false } });
    await seedCatalog04(prodPool, 'PROD');
    await prodPool.end();
  }

  if (!devUrl && !prodUrl) {
    console.error('No SUPABASE_DEV_URL or SUPABASE_PROD_URL found.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
