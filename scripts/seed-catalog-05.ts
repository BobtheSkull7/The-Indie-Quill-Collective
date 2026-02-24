import { Pool } from 'pg';

function encodePasswordInUrl(url: string): string {
  const match = url.match(/^(postgresql:\/\/[^:]+:)([^@]+)(@.+)$/);
  if (!match) return url;
  const [_, prefix, password, suffix] = match;
  return prefix + encodeURIComponent(password) + suffix;
}

async function seedCatalog05(pool: Pool, label: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let deckResult = await client.query(
      `SELECT id FROM vibe_decks WHERE title = 'The Poet''s Voice'`
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
         VALUES ($1, 'The Poet''s Voice', 'Mastering rhythm, imagery, and the economy of emotion. Learn to say everything with very little.', 4, true, 'poet')
         RETURNING id`,
        [currId]
      );
      console.log(`[${label}] Created 'The Poet''s Voice' deck with id ${insertDeck.rows[0].id}`);
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
         description = 'Mastering rhythm, imagery, and the economy of emotion. Learn to say everything with very little.',
         specialization = 'poet'
       WHERE id = $1`, [deckId]
    );

    const lessons = [
      {
        title: "The Image as an Anchor",
        order_index: 1,
        content: `[Foundation: "A poem is a picture made of words."]

In poetry, we don't explain feelings; we show them through Images. Instead of saying you are "sad," you might describe "a single cracked teacup on a dusty shelf." This is called an Anchor. It gives the reader something solid to hold onto while they feel the emotions of your poem.

We focus on the Concrete. A concrete word is something you can touch, smell, or see. The more specific the image, the more powerful the poem. You aren't just writing lines; you are painting a scene in the reader's mind, one brushstroke at a time.`,
        tasks: [
          { title: "The Anchor", type: "speaking", task: "Pick an emotion like 'Happiness' or 'Loneliness.' Don't use the word itself. Describe one object that represents that feeling to you." },
          { title: "Showing vs. Telling", type: "comprehension", task: "Why is a 'cracked teacup' more interesting to a reader than just saying the word 'sad'?" },
          { title: "The Image", type: "writing", task: "Type one sentence describing a weather event (like a storm or a hot day) using only one sensory detail." },
        ],
      },
      {
        title: "The Music of Words",
        order_index: 2,
        content: `[Foundation: "Poetry is meant to be heard, not just read."]

Poetry has a Rhythm, much like a heartbeat or a song. We look at the "Music" of your words\u2014how they sound when they hit the air. Some words are sharp and quick (like 'click' or 'snap'), while others are long and smooth (like 'slumber' or 'glow').

Using VibeScribe is essential here. When you speak your poem, you will hear where the rhythm breaks. You'll find the natural "bounce" of your lines. We aren't worried about perfect rhyming; we are worried about the Flow. If it feels good to say, it will feel good to read.`,
        tasks: [
          { title: "The Echo", type: "speaking", task: "Read a short phrase three times, changing the speed each time. Notice how the feeling changes when you speak slowly versus quickly." },
          { title: "The Heartbeat", type: "comprehension", task: "In your own words, why is the 'sound' of a word just as important as its meaning in a poem?" },
          { title: "Sound Pairing", type: "writing", task: "Type two words that sound 'sharp' and two words that sound 'soft'." },
        ],
      },
      {
        title: "The Power of White Space",
        order_index: 3,
        content: `[Foundation: "What you leave out is as important as what you put in."]

On a poem's page, the empty space (the White Space) is part of the art. Where you choose to end a line is called a Line Break. A line break tells the reader when to pause and what word to think about most. It creates "suspense" in the middle of a sentence.

By using less text, you give the words more room to breathe. Every word in a poem has to be "heavy" with meaning because there are so few of them. We practice Word Economy\u2014cutting away everything that isn't the heart of the poem.`,
        tasks: [
          { title: "The Pause", type: "speaking", task: "Speak a sentence, but take a long breath in the middle of it. How does that pause change the meaning of the second half?" },
          { title: "The Breath", type: "comprehension", task: "How does a 'Line Break' help a poet control how the reader feels?" },
          { title: "The Cut", type: "writing", task: "Take the sentence 'I walked down the long and very lonely street' and remove three words to make it feel like a line of poetry." },
        ],
      },
      {
        title: "The Unexpected Turn",
        order_index: 4,
        content: `[Foundation: "A poem should start like a breeze and end like a thunderclap."]

Similar to a story's twist, a poem often has a Volta or a "Turn." This is a moment where the mood or the topic shifts suddenly. You might start by talking about a flower and end by talking about a memory of your grandmother. This "Turn" is what makes a poem feel deep and surprising.`,
        tasks: [
          { title: "The Shift", type: "speaking", task: "Start by describing something in nature, then suddenly talk about a feeling you had today. Try to connect them in one breath." },
          { title: "The Turn", type: "writing", task: "Write two lines: the first line is about a color, and the second line is about a secret." },
        ],
      },
      {
        title: "The Soul's Signature",
        order_index: 5,
        content: `[Foundation: "Your poem is a snapshot of your soul at this exact moment."]

The final lesson is about Authenticity. There is no "wrong" way to write a poem if it is true to how you feel. Your "Signature" is the unique way you see the world. When you finish this path, you aren't just a writer; you are a Poet who knows how to capture a feeling and keep it forever.`,
        tasks: [
          { title: "The Signature", type: "speaking", task: "What is one thing you see differently than anyone else? Speak about it for 60 seconds." },
          { title: "The Final Line", type: "writing", task: "Write the last line of your 'Graduation Poem.' Make it a line that you want to be remembered by." },
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
      console.log(`[${label}]   \u2192 ${lesson.tasks.length} tasks seeded`);
    }

    await client.query('COMMIT');
    console.log(`[${label}] Catalog 05 seed complete: 5 lessons, 13 tasks.`);
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
    await seedCatalog05(devPool, 'DEV');
    await devPool.end();
  }

  if (prodUrl) {
    console.log('\n=== Seeding PROD database ===');
    const prodPool = new Pool({ connectionString: encodePasswordInUrl(prodUrl), ssl: { rejectUnauthorized: false } });
    await seedCatalog05(prodPool, 'PROD');
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
