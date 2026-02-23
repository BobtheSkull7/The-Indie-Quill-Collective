import { Pool } from 'pg';

function encodePasswordInUrl(url: string): string {
  const match = url.match(/^(postgresql:\/\/[^:]+:)([^@]+)(@.+)$/);
  if (!match) return url;
  const [_, prefix, password, suffix] = match;
  return prefix + encodeURIComponent(password) + suffix;
}

async function seedCatalog01(pool: Pool, label: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const deckResult = await client.query(
      `SELECT vd.id FROM vibe_decks vd
       JOIN curriculums c ON c.id = vd.curriculum_id
       WHERE c.title = 'Published Writer' AND vd.order_index = 1`
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
        `INSERT INTO vibe_decks (curriculum_id, title, description, order_index, is_published)
         VALUES ($1, 'The Universal Core', 'The essential foundations of professional authorship, focusing on mindset, structural integrity, and the VibeScribe workflow.', 1, true)
         RETURNING id`,
        [currId]
      );
      console.log(`[${label}] Created 'The Universal Core' deck with id ${insertDeck.rows[0].id}`);
    } else {
      const deckId = deckResult.rows[0].id;
      console.log(`[${label}] Found existing deck id ${deckId}, cleaning old data...`);

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
        `UPDATE vibe_decks SET title = 'The Universal Core',
         description = 'The essential foundations of professional authorship, focusing on mindset, structural integrity, and the VibeScribe workflow.'
         WHERE id = $1`, [deckId]
      );
    }

    const finalDeckResult = await client.query(
      `SELECT vd.id FROM vibe_decks vd
       JOIN curriculums c ON c.id = vd.curriculum_id
       WHERE c.title = 'Published Writer' AND vd.order_index = 1`
    );
    const deckId = finalDeckResult.rows[0].id;

    const lessons = [
      {
        title: "The Author's Mindset",
        order_index: 1,
        content: `[Foundation: "A writer is someone who has taught themselves how to show up."]

Jerry Jenkins teaches that the most rewarding part of writing isn't just the finished book, but the creation of a 'Sacred Schedule.' Rather than waiting for a fleeting spark of inspiration, we find peace in the simple habit of returning to the page. Writing is a gentle discipline of showing up for yourself and your ideas.

Your 'Writing Sanctum' is simply the space where distractions are barred so your creativity can breathe. As Kindlepreneur's Dave Chesson advocates, creating a friction-free environment is key. This space signals to your brain that it is time to transition from 'thinker' to 'creator.'

Be kind to your first words by embracing the 'Discovery Draft.' Experienced authors know that the first pass is just for you—it's where you find the story. We remove the pressure of perfection, allowing you to play in the 'sandbox' of your imagination without an inner critic looking over your shoulder.

Following the Jenkins model of 'Reader-First' writing, we focus on the joy of the process today. By choosing the rhythm of a schedule over the uncertainty of inspiration, you are building a bridge to the audience waiting to hear your story.`,
        tasks: [
          { title: "The Sanctum Entry", type: "speaking", task: "Describe the space where you are currently sitting. What is one thing here—a view, a sound, or an object—that makes you feel ready to create?" },
          { title: "The Power of Rhythm", type: "comprehension", task: "The lesson suggests that a 'Sacred Schedule' is more reliable than waiting for inspiration. In your own words, why does having a consistent habit help you feel more secure?" },
          { title: "The Discovery Oath", type: "writing", task: "Type the following: 'I claim this space as my Sanctum. I give myself permission to write a messy Discovery Draft and find the joy in the unfolding story.'" },
        ],
      },
      {
        title: "The Big Idea Validation",
        order_index: 2,
        content: `[Foundation: "Your idea deserves a foundation that can support its growth."]

Your ideas are like seeds—delicate and worthy of care. Following Jenna Rainey's 'Pitch-First' approach, we take a moment to sit with your 'What If?' to ensure it has the depth to sustain a full manuscript. Validation isn't a hurdle; it's a way to ensure your energy is spent on a story that will truly flourish.

As Jerry Jenkins suggests, we look for 'Internal Conflict'—the 'War Within'—that keeps a reader turning pages. If an idea makes you wonder 'what happens next,' it already has the mechanical heart required to become a compelling book.

We will gently shape your 'Elevator Pitch' early. Distilling your story into a single, powerful sentence acts as a 'North Star,' keeping you anchored to your core message when the middle of the book becomes complex.

By looking at 'Comps' (Comparable Titles), as Kindlepreneur suggests, we find where your unique story fits. You aren't competing; you are finding the specific gap in the library that only your voice can fill.`,
        tasks: [
          { title: "The High-Concept Pitch", type: "speaking", task: "In 60 seconds or less, speak your 'What If?' out loud. What is the core idea of your book, and what makes you curious about it?" },
          { title: "The War Within", type: "comprehension", task: "According to the lesson, what is the 'internal' element a Big Idea needs to keep a reader engaged with the story?" },
          { title: "The North Star", type: "writing", task: "Draft a one-sentence 'Elevator Pitch' for your story. Focus on your main character and the primary choice they must make." },
        ],
      },
      {
        title: "The Narrative Blueprint",
        order_index: 3,
        content: `[Foundation: "Structure doesn't limit your creativity; it gives your creativity a place to go." — The Novelry Method.]

Think of your story's structure not as a set of rigid walls, but as a trellis for a garden. Both 'Plotters' and 'Pantsers' benefit from knowing the 'Physics of Story.' Planning is an act of kindness you do for your future self to prevent the confusion that often arrives in the middle of a project.

We use simple milestones—like the 'Three-Act Structure'—to give your journey a sense of rhythm. These aren't formulas; they are the proven beats of human storytelling that help you feel confident that your story is building toward a meaningful conclusion.

Your blueprint identifies the 'Inciting Incident'—the moment everything changes—and the 'Climax.' As Jenna Rainey notes, having a plan allows you to focus entirely on the art of the scene because the logic is already handled.

By the time we finish this map, you'll feel a sense of peace. You are building a world, one small stone at a time, and with a blueprint in hand, you can trust that every word you write is moving you closer to the finish line.`,
        tasks: [
          { title: "The Turning Point", type: "speaking", task: "Speak about the moment your story truly begins. What is the 'Inciting Incident' that forces your character to leave their normal life behind?" },
          { title: "The Trellis Concept", type: "comprehension", task: "In the lesson, why is structure compared to a 'trellis' rather than a set of rigid walls?" },
          { title: "The Final Destination", type: "writing", task: "Type a brief description of how you want your reader to feel when they reach the 'Climax' of your story." },
        ],
      },
      {
        title: "Mastering the VibeScribe Flow",
        order_index: 4,
        content: `[Foundation: "Speak your story to capture the truth of your voice." — The Jenna Rainey Strategy.]

Sometimes, the distance between our hearts and a keyboard can feel too long. VibeScribe is your bypass switch. We use 'Voice Brain Dumps' to capture raw emotion and dialogue before the analytical brain can interfere. It's a way to write without the 'blank page' ever staring back at you.

There is a specific 'Authorial Voice' that only comes out when we speak. By using voice-to-text, you tap into the natural rhythms of conversation that Jerry Jenkins argues are essential for realistic dialogue. You are recording the 'truth' of your story in its rawest form.

Don't worry about being eloquent while you speak. Our technology captures the raw ore, allowing you to 'write' while walking, sketching, or simply resting. This follows the Kindlepreneur hack of 'Stacking Habits'—integrating your creative life into your daily movement.

Once your voice is captured and synced to your Sanctum, it becomes the 'Raw Ore' for your manuscript. This hybrid workflow—speaking to spark, typing to polish—is the modern secret to consistent output without the burnout.`,
        tasks: [
          { title: "The Raw Ore", type: "speaking", task: "Without worrying about grammar or perfection, speak for two minutes about a scene or an idea you've been dwelling on lately." },
          { title: "The Bypass Switch", type: "comprehension", task: "How does using your voice help you bypass the 'inner critic' that often shows up when typing?" },
          { title: "The Habit Stack", type: "writing", task: "Type one daily activity (like walking or commuting) where you could use VibeScribe to 'stack' your writing habit into your day." },
        ],
      },
      {
        title: "The Reader's Promise",
        order_index: 5,
        content: `[Foundation: "The reader is the most important person in the room." — Jerry Jenkins.]

Every book is a contract. Jerry Jenkins emphasizes that from page one, you are making a 'Promise' to the reader—of an adventure, a solution, or a transformation. Your job as an author is to be a faithful steward of that promise from the first word to the last.

We will help you visualize your 'Ideal Reader.' When you write for that one specific person, your tone becomes more intimate and your impact more profound. You aren't performing for a crowd; you are serving a friend who is waiting to hear exactly what you have to say.

Purpose-driven writing ensures your book has a 'Takeaway.' Whether it's an emotional resonance or a life-changing insight, we define what the reader gains by spending time in your world. This is what turns a casual reader into a lifelong fan of your work.

Completing this foundation means you are ready to choose your specialized path. You have the mindset, the plan, and the voice. You aren't just starting a book; you are entering the professional world of authorship with your eyes wide open.`,
        tasks: [
          { title: "The Ideal Reader", type: "speaking", task: "Describe the person you are writing this for. Who are they, and why do they need to hear your story right now?" },
          { title: "The Contract", type: "comprehension", task: "What does it mean to make a 'Promise' to your reader from the very first page?" },
          { title: "The Takeaway", type: "writing", task: "Type the one core 'Takeaway' or feeling you want your reader to keep with them long after they close your book." },
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
    console.log(`[${label}] Catalog 01 seed complete: 5 lessons, 15 tasks.`);
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
    await seedCatalog01(devPool, 'DEV');
    await devPool.end();
  }

  if (prodUrl) {
    console.log('\n=== Seeding PROD database ===');
    const prodPool = new Pool({ connectionString: encodePasswordInUrl(prodUrl), ssl: { rejectUnauthorized: false } });
    await seedCatalog01(prodPool, 'PROD');
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
