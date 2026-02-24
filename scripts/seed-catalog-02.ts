import { Pool } from 'pg';

function encodePasswordInUrl(url: string): string {
  const match = url.match(/^(postgresql:\/\/[^:]+:)([^@]+)(@.+)$/);
  if (!match) return url;
  const [_, prefix, password, suffix] = match;
  return prefix + encodeURIComponent(password) + suffix;
}

async function seedCatalog02(pool: Pool, label: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const colCheck = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'vibe_decks' AND column_name = 'specialization'`
    );
    if (colCheck.rows.length === 0) {
      console.log(`[${label}] Adding 'specialization' column to vibe_decks...`);
      await client.query(`ALTER TABLE vibe_decks ADD COLUMN specialization VARCHAR(50)`);
    }

    let deckResult = await client.query(
      `SELECT id FROM vibe_decks WHERE title = 'The Novelist''s Craft'`
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
         VALUES ($1, 'The Novelist''s Craft', 'Mastering the architecture of long-form fiction, from the Hero''s internal heartbeat to the final, world-changing climax.', 2, true, 'novelist')
         RETURNING id`,
        [currId]
      );
      console.log(`[${label}] Created 'The Novelist''s Craft' deck with id ${insertDeck.rows[0].id}`);
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
         description = 'Mastering the architecture of long-form fiction, from the Hero''s internal heartbeat to the final, world-changing climax.',
         specialization = 'novelist'
       WHERE id = $1`, [deckId]
    );

    const lessons = [
      {
        title: "Your Hero's Big Wish",
        order_index: 1,
        content: `[Foundation: "Your story starts when your character wants something they can't have yet."]

Every story needs a Protagonist. That is just a fancy word for your 'Main Character' or the 'Hero' of your book. The most important thing about your Protagonist is their Burning Desire. This is the one big thing they want more than anything else in the world.

Think about your Hero. Do they want to find a lost treasure? Do they want to save their family? When your Hero has a Big Wish, it acts like an engine that pulls the reader through the story.

We also look for a Ghost. A Ghost isn't a spooky spirit; it's just a sad memory or a secret fear from the Hero's past. This 'Ghost' makes it hard for them to get what they want. It creates a 'War Within' their own heart. Once you know what they want and what they are afraid of, your story will start to move on its own.`,
        tasks: [
          { title: "The Big Wish", type: "speaking", task: "Tell me about your Hero. What is the one thing they want most, and what is the one 'Ghost' or fear that is holding them back?" },
          { title: "The Engine", type: "comprehension", task: "In your own words, why does a Hero need to 'want' something for the story to be exciting?" },
          { title: "The Hero's Name", type: "writing", task: "Type your Hero's name and one sentence describing what they want to achieve by the end of the book." },
        ],
      },
      {
        title: "A World That Feels Real",
        order_index: 2,
        content: `[Foundation: "The place where your story happens should feel like it's alive."]

The Setting is the place where your story happens. To make it feel real, we don't just list every detail. Instead, we use Sensory Anchors. Pick one or two specific details—the smell of pine needles, the sound of a dry leaf crunching, or the cold feel of a metal door handle. This helps the reader feel like they are standing right next to your Hero.

Every place also has Unwritten Rules. These are things people in that world just 'know.' For example: 'In this town, nobody goes outside after the sun sets.' These rules create 'Passive Conflict.' This means the world itself is making things difficult for your Hero. When you build a world with its own smells, sounds, and rules, the reader stops feeling like they are reading a book and starts feeling like they are visiting a new place.`,
        tasks: [
          { title: "The Sensory Anchor", type: "speaking", task: "Close your eyes. Describe your Hero's home using only smells and sounds. Don't tell me what it looks like!" },
          { title: "The World's Rules", type: "comprehension", task: "What is an 'Unwritten Rule'? Give an example of a rule that could make things hard for a character." },
          { title: "The Setting Name", type: "writing", task: "Type the name of your story's main location and one 'Sensory Anchor' that describes it (like 'the smell of salt water' or 'the hum of old lights')." },
        ],
      },
      {
        title: "The Big Change",
        order_index: 3,
        content: `[Foundation: "A story begins when something happens that changes everything."]

Every great book has a 'Point of No Return.' We call this the Inciting Incident. It is the 'Big Change' that kicks the story into gear. Imagine your Hero is living their normal life, and suddenly something happens—a mystery begins, or they have to go on a trip. This event forces the Hero to make a Choice.

The world as they knew it is gone, and they can't go back. This Big Change should be linked to the Big Wish we talked about in Lesson 01. If your Hero wants to be brave, the Big Change should be something that scares them! Like a row of dominoes falling, this one event will lead to the next. You are now officially on the path to the end of your book.`,
        tasks: [
          { title: "The Big Change", type: "speaking", task: "What is the one event that changes your Hero's life forever? What happens that makes it impossible for them to go back to their normal life?" },
          { title: "The Choice", type: "comprehension", task: "Why is it important that the Hero chooses to take action after the Big Change happens?" },
          { title: "The First Domino", type: "writing", task: "Write one sentence about the moment the world changes for your Hero. Start with the words: 'Everything changed when...'" },
        ],
      },
      {
        title: "People Talking",
        order_index: 4,
        content: `[Foundation: "Dialogue is not how people actually talk; it is how we wish they talked."]

In a novel, talking is called Dialogue. Your characters shouldn't talk about the weather; they should talk to get what they want. We use something called Subtext. This is a big word that just means 'the meaning under the words.' If a character is angry but says, 'I'm fine,' the subtext says they are mad. This makes your characters feel smart and deep.

Using VibeScribe is the best way to practice this. When you speak your dialogue out loud, you can hear if it sounds like a real person or a robot. Good dialogue is like a tennis match. Each person is hitting the ball back and forth, trying to 'win' the conversation. When your characters talk with a purpose, the reader feels like they are eavesdropping on a real, exciting moment.`,
        tasks: [
          { title: "The Tennis Match", type: "speaking", task: "Imagine two characters are arguing over a lost key. Speak both parts of the conversation for 60 seconds. Make sure they don't just agree with each other!" },
          { title: "The Under-Words", type: "comprehension", task: "In your own words, what is 'Subtext'? Why is it more interesting than a character just saying exactly how they feel?" },
          { title: "The Unspoken Truth", type: "writing", task: "Write two lines of dialogue. One character says something nice, but the other character knows they are actually lying." },
        ],
      },
      {
        title: "The Big Finish",
        order_index: 5,
        content: `[Foundation: "A great ending isn't a surprise; it's a promise kept."]

The end of your book is called the Climax. This is the moment where the Hero finally faces their 'Ghost' and tries to get their 'Big Wish' one last time. Everything in the story has been leading to this one big 'Showdown.' A good ending should feel Surprising but Right. You want the reader to gasp, but then think, 'I should have seen that coming!'

After the excitement, we have the Resolution. This is a quiet moment where we see how the world has changed. The Hero might not get exactly what they wanted, but they usually get what they needed. Finishing a novel is a huge achievement. You have proven that you can build a whole world and guide a character through a storm. You are now a Novelist.`,
        tasks: [
          { title: "The Hero's Change", type: "speaking", task: "How is your Hero different at the end of the story compared to the beginning? What did they learn about themselves?" },
          { title: "The Promise Kept", type: "comprehension", task: "Why is it important to remember the 'Reader's Promise' when you are writing the end of your book?" },
          { title: "The Final Image", type: "writing", task: "Describe the very last thing the reader sees in their mind before they close the book. Is it a sunset? A smile? A closed door?" },
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
      console.log(`[${label}] Lesson ${lesson.order_index}: "${lesson.title}" → tome_id ${tomeId}`);

      for (let i = 0; i < lesson.tasks.length; i++) {
        const t = lesson.tasks[i];
        const minWordCount = t.type === 'writing' ? 10 : 0;
        await client.query(
          `INSERT INTO vibe_cards (tome_id, task, qualifications, task_type, xp_value, min_word_count, order_index)
           VALUES ($1, $2, $3, $4, 0, $5, $6)`,
          [tomeId, `${t.title}: ${t.task}`, null, t.type, minWordCount, i + 1]
        );
      }
      console.log(`[${label}]   → 3 tasks seeded (speaking, comprehension, writing)`);
    }

    await client.query('COMMIT');
    console.log(`[${label}] Catalog 02 seed complete: 5 lessons, 15 tasks.`);
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
    await seedCatalog02(devPool, 'DEV');
    await devPool.end();
  }

  if (prodUrl) {
    console.log('\n=== Seeding PROD database ===');
    const prodPool = new Pool({ connectionString: encodePasswordInUrl(prodUrl), ssl: { rejectUnauthorized: false } });
    await seedCatalog02(prodPool, 'PROD');
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
