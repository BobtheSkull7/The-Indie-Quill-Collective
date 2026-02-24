import { Pool } from 'pg';

function encodePasswordInUrl(url: string): string {
  const match = url.match(/^(postgresql:\/\/[^:]+:)([^@]+)(@.+)$/);
  if (!match) return url;
  const [_, prefix, password, suffix] = match;
  return prefix + encodeURIComponent(password) + suffix;
}

async function seedCatalog03(pool: Pool, label: string) {
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
      `SELECT id FROM vibe_decks WHERE title = 'The Authority''s Framework'`
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
         VALUES ($1, 'The Authority''s Framework', 'Turning your knowledge into a legacy. Learn to structure truth so it changes the reader''s life.', 3, true, 'authority')
         RETURNING id`,
        [currId]
      );
      console.log(`[${label}] Created 'The Authority''s Framework' deck with id ${insertDeck.rows[0].id}`);
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
         description = 'Turning your knowledge into a legacy. Learn to structure truth so it changes the reader''s life.',
         specialization = 'authority'
       WHERE id = $1`, [deckId]
    );

    const lessons = [
      {
        title: "The Big Problem",
        order_index: 1,
        content: `[Foundation: "A non-fiction book is a bridge from a problem to a solution."]

In the Authority Path, you aren't just writing a book; you are helping a reader. Every great non-fiction book starts with a Big Problem. This is a specific challenge that your reader is facing right now. Maybe they want to learn a new hobby, or maybe they are looking for a way to feel happier.

Your job is to be the Guide. Imagine you are standing on one side of a river (the Problem) and your reader is on the other. Your book is the bridge that helps them cross over. We start by identifying exactly who your reader is and what 'pain' they are feeling. When you know the Problem, you know your purpose.

We also look for your Unique Angle. There might be other books on this topic, but they don't have your voice or your specific experience. Your 'Angle' is the special way you look at the problem that makes your solution better or easier to understand.`,
        tasks: [
          { title: "The Bridge", type: "speaking", task: "Who is your reader, and what is the 'Big Problem' they are facing? How does it make them feel?" },
          { title: "The Guide", type: "comprehension", task: "In your own words, why is it more important to focus on the reader's problem than on your own life story?" },
          { title: "The Promise", type: "writing", task: "Type one sentence that starts with: 'By the end of this book, my reader will know how to...'" },
        ],
      },
      {
        title: "The Pillar Method",
        order_index: 2,
        content: `[Foundation: "Structure is the skeleton that holds your truth together."]

When you have a lot of knowledge, it can feel messy. We use the Pillar Method to keep your book organized. Imagine your book is a house. The roof is your 'Big Idea,' but you need strong Pillars to hold it up. Each Pillar is a main chapter or a big concept that supports your message.

Most books need about 3 to 7 Pillars. If you have too few, the house falls down. If you have too many, the reader gets lost in the rooms. Each Pillar should lead naturally to the next one, taking the reader step-by-step toward the solution.

Using the Kindlepreneur approach, we make sure each Pillar is something people are actually looking for. We don't just guess what they want to know; we look at the questions they are already asking. This ensures your book isn't just smart—it's helpful.`,
        tasks: [
          { title: "The Three Pillars", type: "speaking", task: "If you only had 5 minutes to teach someone your topic, what are the three most important things you would tell them?" },
          { title: "The House", type: "comprehension", task: "Why is it helpful to have 'Pillars' instead of just writing everything you know in one big long list?" },
          { title: "The Blueprint", type: "writing", task: "List three potential chapter titles that could act as Pillars for your book." },
        ],
      },
      {
        title: "The Power of Proof",
        order_index: 3,
        content: `[Foundation: "Don't just tell them the truth; show them it works."]

As an Authority, you need to build Trust. You do this by using Proof. Proof can be many things: a story about someone you helped, a fact from a study, or even your own experience. When you share Proof, the reader stops wondering 'Is this true?' and starts thinking 'This will work for me, too!'

The best kind of proof is the Success Story. When you show a 'Before and After' (how someone was struggling before they knew your secret, and how they are doing now), it gives the reader hope. It turns your advice into a real-world tool.

We also use Analogies. An analogy is just a way of explaining something hard by comparing it to something easy. For example: 'Writing a book is like training for a marathon.' This helps the reader understand your 'Authority' without feeling overwhelmed.`,
        tasks: [
          { title: "The Success Story", type: "speaking", task: "Tell a short story about a time your advice or knowledge helped someone (or yourself) change for the better." },
          { title: "Building Trust", type: "comprehension", task: "Why does a reader need 'Proof' before they will believe your advice?" },
          { title: "The Analogy", type: "writing", task: "Pick a hard part of your topic and explain it using an analogy (e.g., 'Learning this skill is like learning to ride a bike because...')." },
        ],
      },
      {
        title: "The Teacher's Voice",
        order_index: 4,
        content: `[Foundation: "Speak to your reader as a friend, not as a professor."]

When you write as an Authority, it can be tempting to use big, fancy words to sound smart. But the best teachers know that the most powerful voice is a Simple Voice. Your goal is to be helpful, not to be impressive. We want the reader to feel like they are sitting across from you having a cup of coffee.

We use a technique called Active Teaching. Instead of saying 'One might consider doing this,' you say 'Try this today.' This gives the reader confidence. It makes them feel like they can actually do what you are teaching.

Your voice should be encouraging and clear, like a coach on the sidelines. If you wouldn't say a sentence out loud to a friend, you shouldn't put it in your book. Your 'Voice' is what makes the reader trust you.`,
        tasks: [
          { title: "The Coffee Chat", type: "speaking", task: "Imagine your reader is sitting right in front of you. Give them one piece of advice in 60 seconds using the simplest words you can find." },
          { title: "The Coach", type: "comprehension", task: "Why is it better to sound like a 'friendly coach' than a 'fancy professor' when you are teaching someone something new?" },
          { title: "The Clear Cut", type: "writing", task: "Take a 'fancy' sentence like 'One must utilize the proper implements' and rewrite it to be as simple as possible (e.g., 'Use the right tools')." },
        ],
      },
      {
        title: "The Call to Action",
        order_index: 5,
        content: `[Foundation: "A book is finished when the reader knows exactly what to do next."]

The end of a non-fiction book isn't just a goodbye; it is a Call to Action. This is the moment where you tell the reader exactly how to use the knowledge you've shared. You've built the bridge, and now it's time for the reader to walk across it and change their life.

A great ending gives the reader a Quick Win. This is a small, easy task they can do right now to see a result. When the reader sees that your advice works in a small way, they will believe it can work in a big way.

Finally, look at the Legacy of the Lesson. How will the reader's life be different a year from now because they read your book? By painting a picture of their future success, you leave them feeling inspired and ready to go.`,
        tasks: [
          { title: "The Quick Win", type: "speaking", task: "What is one small thing your reader can do in less than 10 minutes to start solving their 'Big Problem'?" },
          { title: "The Next Step", type: "comprehension", task: "Why is it important to give the reader a specific 'Call to Action' at the end of your book?" },
          { title: "The Future Self", type: "writing", task: "Write a 'Congratulations' sentence to your reader, describing how much better their life will be after they follow your advice." },
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
    console.log(`[${label}] Catalog 03 seed complete: 5 lessons, 15 tasks.`);
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
    await seedCatalog03(devPool, 'DEV');
    await devPool.end();
  }

  if (prodUrl) {
    console.log('\n=== Seeding PROD database ===');
    const prodPool = new Pool({ connectionString: encodePasswordInUrl(prodUrl), ssl: { rejectUnauthorized: false } });
    await seedCatalog03(prodPool, 'PROD');
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
