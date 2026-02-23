import express from "express";
import { createServer } from "http";

const app = express();

// IMPORTANT: allow secure cookies behind Render's proxy
app.set("trust proxy", 1);

const server = createServer(app);

const PORT = parseInt(process.env.PORT || "5000", 10);
const isProd = process.env.NODE_ENV === "production";

// Track initialization state for diagnostics
let bootstrapError: string | null = null;
let bootstrapComplete = false;

// Register health check routes IMMEDIATELY, before server starts
app.get("/health", (_req, res) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.status(200).send("OK");
});

app.get("/api/health", (_req, res) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.status(200).send("OK");
});

// Google OAuth diagnostic endpoint (no auth required, temporary)
app.get("/api/google-check", (_req, res) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({
    clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
    clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
    redirectUriSet: !!process.env.GOOGLE_REDIRECT_URI,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "NOT SET",
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Diagnostic endpoint to check initialization status
app.get("/api/status", (_req, res) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({
    bootstrapComplete,
    bootstrapError: isProd 
      ? (bootstrapError ? "Initialization error" : null) 
      : bootstrapError,
    nodeEnv: process.env.NODE_ENV,
    hasSupabaseUrl: !!process.env.SUPABASE_PROD_URL,
    hasSessionSecret: !!process.env.SESSION_SECRET,
    hasOpenAIKey: !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
    hasGameEngineUrl: !!process.env.GAME_ENGINE_URL,
    gameEngineUrlLength: process.env.GAME_ENGINE_URL?.length || 0,
  });
});

// Start server IMMEDIATELY with health check routes only
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`[ENV CHECK] GAME_ENGINE_URL: ${process.env.GAME_ENGINE_URL ? `SET (${process.env.GAME_ENGINE_URL.length} chars, starts with "${process.env.GAME_ENGINE_URL.substring(0, 10)}...")` : "NOT SET"}`);
  console.log(`[ENV CHECK] GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? "SET" : "NOT SET"}`);
  console.log(`[ENV CHECK] GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET"}`);
  console.log(`[ENV CHECK] GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI ? `SET (${process.env.GOOGLE_REDIRECT_URI})` : "NOT SET"}`);
  console.log(`[ENV CHECK] RESEND_API_KEY: ${process.env.RESEND_API_KEY ? `SET (${process.env.RESEND_API_KEY.length} chars)` : "NOT SET"}`);
  console.log(`[ENV CHECK] RESEND_FROM_EMAIL: ${process.env.RESEND_FROM_EMAIL ? `SET (${process.env.RESEND_FROM_EMAIL})` : "NOT SET (will use default)"}`);

  // Now run bootstrap in background after server is listening
  bootstrapFast()
    .then(() => {
      bootstrapComplete = true;
      console.log("App initialized");
    })
    .catch((err) => {
      bootstrapError = err.message || String(err);
      console.error("Bootstrap failed:", err);
    });
});

async function bootstrapFast() {
  const cors = (await import("cors")).default;
  const helmet = (await import("helmet")).default;
  const session = (await import("express-session")).default;
  const pgSession = (await import("connect-pg-simple")).default(session);

  // Security headers via Helmet
  app.use(helmet({
    contentSecurityPolicy: isProd ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:", "https:", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https:", "wss:"],
      },
    } : false, // Disable CSP in development for Vite HMR
    crossOriginEmbedderPolicy: false, // Allow embedding for Replit preview
  }));

  app.use(cors());

  // Stripe webhook route MUST be registered BEFORE express.json()
  // Webhooks need raw Buffer, not parsed JSON
  const { WebhookHandlers } = await import('./webhookHandlers');
  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];
      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature' });
      }
      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;
        if (!Buffer.isBuffer(req.body)) {
          console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
          return res.status(500).json({ error: 'Webhook processing error' });
        }
        await WebhookHandlers.processWebhook(req.body as Buffer, sig);
        res.status(200).json({ received: true });
      } catch (error: any) {
        console.error('Webhook error:', error.message);
        res.status(400).json({ error: 'Webhook processing error' });
      }
    }
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Use Supabase-backed session store for both environments
  // This ensures sessions persist across Replit restarts
  const supabaseUrl = isProd 
    ? process.env.SUPABASE_PROD_URL 
    : process.env.SUPABASE_DEV_URL;
  
  const sessionStore = supabaseUrl
    ? new pgSession({
        conString: supabaseUrl,
        tableName: "user_sessions",
        createTableIfMissing: true,
      })
    : undefined;
  
  if (!supabaseUrl) {
    console.warn("Warning: No Supabase URL configured, using in-memory sessions");
  }

  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be configured - refusing to start with default secret");
  }

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProd,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      },
    }),
  );

  // Request logging middleware - minimal in production for security and performance
  app.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (reqPath.startsWith("/api")) {
        // Production: log only method, path, status, duration (no response bodies)
        console.log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
      }
    });

    next();
  });

  // Run table migrations on Supabase before registering routes
  const { pool: dbPool } = await import("./db");
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS curriculums (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      is_published BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS vibe_decks (
      id SERIAL PRIMARY KEY,
      curriculum_id INTEGER NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      is_published BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS tomes (
      id SERIAL PRIMARY KEY,
      deck_id INTEGER NOT NULL REFERENCES vibe_decks(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS vibe_cards (
      id SERIAL PRIMARY KEY,
      tome_id INTEGER NOT NULL REFERENCES tomes(id) ON DELETE CASCADE,
      task TEXT NOT NULL,
      qualifications TEXT,
      xp_value INTEGER NOT NULL DEFAULT 100,
      min_word_count INTEGER NOT NULL DEFAULT 10,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS tome_absorptions (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      tome_id INTEGER NOT NULL REFERENCES tomes(id) ON DELETE CASCADE,
      absorbed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, tome_id)
    );
  `);
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS manuscripts (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      card_id INTEGER NOT NULL REFERENCES vibe_cards(id) ON DELETE CASCADE,
      content TEXT NOT NULL DEFAULT '',
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, card_id)
    );
  `);
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS card_submissions (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      card_id INTEGER NOT NULL REFERENCES vibe_cards(id) ON DELETE CASCADE,
      manuscript_id INTEGER REFERENCES manuscripts(id) ON DELETE SET NULL,
      reflection TEXT NOT NULL DEFAULT '',
      xp_earned INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'submitted',
      paste_count INTEGER NOT NULL DEFAULT 0,
      is_flagged_for_review BOOLEAN NOT NULL DEFAULT false,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, card_id)
    );
  `);

  const columnMigrations: Array<{table: string, column: string, definition: string}> = [
    { table: 'curriculums', column: 'title', definition: "VARCHAR(255) NOT NULL DEFAULT ''" },
    { table: 'curriculums', column: 'description', definition: 'TEXT' },
    { table: 'curriculums', column: 'order_index', definition: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'curriculums', column: 'is_published', definition: 'BOOLEAN NOT NULL DEFAULT false' },
    { table: 'curriculums', column: 'created_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },
    { table: 'curriculums', column: 'updated_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },

    { table: 'vibe_decks', column: 'curriculum_id', definition: 'INTEGER NOT NULL DEFAULT 0 REFERENCES curriculums(id) ON DELETE CASCADE' },
    { table: 'vibe_decks', column: 'title', definition: "VARCHAR(255) NOT NULL DEFAULT ''" },
    { table: 'vibe_decks', column: 'description', definition: 'TEXT' },
    { table: 'vibe_decks', column: 'order_index', definition: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'vibe_decks', column: 'is_published', definition: 'BOOLEAN NOT NULL DEFAULT false' },
    { table: 'vibe_decks', column: 'created_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },
    { table: 'vibe_decks', column: 'updated_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },

    { table: 'tomes', column: 'deck_id', definition: 'INTEGER NOT NULL DEFAULT 0 REFERENCES vibe_decks(id) ON DELETE CASCADE' },
    { table: 'tomes', column: 'title', definition: "VARCHAR(255) NOT NULL DEFAULT ''" },
    { table: 'tomes', column: 'content', definition: "TEXT NOT NULL DEFAULT ''" },
    { table: 'tomes', column: 'order_index', definition: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'tomes', column: 'created_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },
    { table: 'tomes', column: 'updated_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },

    { table: 'vibe_cards', column: 'tome_id', definition: 'INTEGER NOT NULL DEFAULT 0 REFERENCES tomes(id) ON DELETE CASCADE' },
    { table: 'vibe_cards', column: 'task', definition: "TEXT NOT NULL DEFAULT ''" },
    { table: 'vibe_cards', column: 'qualifications', definition: 'TEXT' },
    { table: 'vibe_cards', column: 'xp_value', definition: 'INTEGER NOT NULL DEFAULT 100' },
    { table: 'vibe_cards', column: 'min_word_count', definition: 'INTEGER NOT NULL DEFAULT 10' },
    { table: 'vibe_cards', column: 'order_index', definition: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'vibe_cards', column: 'created_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },
    { table: 'vibe_cards', column: 'updated_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },

    { table: 'tome_absorptions', column: 'user_id', definition: "VARCHAR(255) NOT NULL DEFAULT ''" },
    { table: 'tome_absorptions', column: 'tome_id', definition: 'INTEGER NOT NULL DEFAULT 0 REFERENCES tomes(id) ON DELETE CASCADE' },
    { table: 'tome_absorptions', column: 'absorbed_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },

    { table: 'manuscripts', column: 'user_id', definition: "VARCHAR(255) NOT NULL DEFAULT ''" },
    { table: 'manuscripts', column: 'card_id', definition: 'INTEGER NOT NULL DEFAULT 0 REFERENCES vibe_cards(id) ON DELETE CASCADE' },
    { table: 'manuscripts', column: 'content', definition: "TEXT NOT NULL DEFAULT ''" },
    { table: 'manuscripts', column: 'word_count', definition: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'manuscripts', column: 'created_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },
    { table: 'manuscripts', column: 'updated_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },

    { table: 'card_submissions', column: 'user_id', definition: "VARCHAR(255) NOT NULL DEFAULT ''" },
    { table: 'card_submissions', column: 'card_id', definition: 'INTEGER NOT NULL DEFAULT 0 REFERENCES vibe_cards(id) ON DELETE CASCADE' },
    { table: 'card_submissions', column: 'manuscript_id', definition: 'INTEGER REFERENCES manuscripts(id) ON DELETE SET NULL' },
    { table: 'card_submissions', column: 'reflection', definition: "TEXT NOT NULL DEFAULT ''" },
    { table: 'card_submissions', column: 'xp_earned', definition: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'card_submissions', column: 'status', definition: "VARCHAR(50) NOT NULL DEFAULT 'submitted'" },
    { table: 'card_submissions', column: 'paste_count', definition: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'card_submissions', column: 'is_flagged_for_review', definition: 'BOOLEAN NOT NULL DEFAULT false' },
    { table: 'card_submissions', column: 'submitted_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },

    { table: 'vibescribe_transcripts', column: 'user_id', definition: "VARCHAR(255) NOT NULL DEFAULT ''" },
    { table: 'vibescribe_transcripts', column: 'vibescribe_id', definition: 'VARCHAR(50)' },
    { table: 'vibescribe_transcripts', column: 'content', definition: "TEXT NOT NULL DEFAULT ''" },
    { table: 'vibescribe_transcripts', column: 'source_type', definition: "VARCHAR(50) NOT NULL DEFAULT 'voice'" },
    { table: 'vibescribe_transcripts', column: 'is_used', definition: 'BOOLEAN NOT NULL DEFAULT false' },
    { table: 'vibescribe_transcripts', column: 'created_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },

    { table: 'master_manuscripts', column: 'user_id', definition: "VARCHAR(255) NOT NULL DEFAULT ''" },
    { table: 'master_manuscripts', column: 'title', definition: "VARCHAR(500) NOT NULL DEFAULT 'My Master Manuscript'" },
    { table: 'master_manuscripts', column: 'content', definition: "JSONB NOT NULL DEFAULT '{}'" },
    { table: 'master_manuscripts', column: 'word_count', definition: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'master_manuscripts', column: 'created_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },
    { table: 'master_manuscripts', column: 'updated_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },

    { table: 'game_characters', column: 'user_id', definition: "VARCHAR(255) NOT NULL DEFAULT ''" },
    { table: 'game_characters', column: 'xp', definition: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'game_characters', column: 'level', definition: 'INTEGER NOT NULL DEFAULT 1' },
    { table: 'game_characters', column: 'active_title', definition: "VARCHAR(255) DEFAULT 'the Novice'" },
    { table: 'game_characters', column: 'unlocked_titles', definition: `JSONB NOT NULL DEFAULT '["the Novice"]'` },
    { table: 'game_characters', column: 'equipped_items', definition: `JSONB NOT NULL DEFAULT '{"main_hand": null, "off_hand": null, "head": null, "body": null, "hands": null, "feet": null}'` },
    { table: 'game_characters', column: 'unlocked_items', definition: "JSONB NOT NULL DEFAULT '[]'" },
    { table: 'game_characters', column: 'created_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },
    { table: 'game_characters', column: 'updated_at', definition: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },
  ];

  const existingCols = await dbPool.query(`
    SELECT table_name, column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name IN (
      'curriculums','vibe_decks','tomes','vibe_cards','tome_absorptions',
      'manuscripts','card_submissions','vibescribe_transcripts',
      'master_manuscripts','game_characters'
    )
  `);
  const existingSet = new Set(existingCols.rows.map((r: any) => `${r.table_name}.${r.column_name}`));

  const missing = columnMigrations.filter(m => !existingSet.has(`${m.table}.${m.column}`));
  if (missing.length > 0) {
    console.log(`[Migration] Adding ${missing.length} missing column(s):`);
    for (const m of missing) {
      try {
        await dbPool.query(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.definition}`);
        console.log(`[Migration]   + ${m.table}.${m.column}`);
      } catch (e: any) {
        console.warn(`[Migration]   ~ ${m.table}.${m.column} skipped: ${e.message}`);
      }
    }
  }

  const constraintMigrations = [
    { table: 'manuscripts', constraint: 'manuscripts_user_id_card_id_key', definition: 'UNIQUE (user_id, card_id)' },
    { table: 'card_submissions', constraint: 'card_submissions_user_id_card_id_key', definition: 'UNIQUE (user_id, card_id)' },
    { table: 'tome_absorptions', constraint: 'tome_absorptions_user_id_tome_id_key', definition: 'UNIQUE (user_id, tome_id)' },
  ];
  for (const c of constraintMigrations) {
    try {
      const check = await dbPool.query(`SELECT 1 FROM information_schema.table_constraints WHERE table_name = $1 AND constraint_name = $2`, [c.table, c.constraint]);
      if (check.rows.length === 0) {
        await dbPool.query(`ALTER TABLE ${c.table} ADD CONSTRAINT ${c.constraint} ${c.definition}`);
        console.log(`[Migration]   + constraint ${c.constraint}`);
      }
    } catch (e: any) {
      console.warn(`[Migration]   ~ constraint ${c.constraint} skipped: ${e.message}`);
    }
  }
  const serialTables = ['manuscripts', 'card_submissions', 'tome_absorptions', 'vibescribe_transcripts', 'master_manuscripts', 'game_characters', 'curriculum', 'lessons', 'user_progress', 'writing_sessions'];
  for (const tbl of serialTables) {
    try {
      const colCheck = await dbPool.query(
        `SELECT column_default FROM information_schema.columns WHERE table_name = $1 AND column_name = 'id'`, [tbl]
      );
      if (colCheck.rows.length > 0 && !colCheck.rows[0].column_default) {
        const seqName = `${tbl}_id_seq`;
        await dbPool.query(`CREATE SEQUENCE IF NOT EXISTS ${seqName}`);
        const maxId = await dbPool.query(`SELECT COALESCE(MAX(id), 0) + 1 as next_val FROM ${tbl}`);
        await dbPool.query(`SELECT setval('${seqName}', ${maxId.rows[0].next_val}, false)`);
        await dbPool.query(`ALTER TABLE ${tbl} ALTER COLUMN id SET DEFAULT nextval('${seqName}')`);
        await dbPool.query(`ALTER SEQUENCE ${seqName} OWNED BY ${tbl}.id`);
        console.log(`[Migration]   + fixed serial default on ${tbl}.id`);
      }
    } catch (e: any) {
      console.warn(`[Migration]   ~ serial check for ${tbl}.id skipped: ${e.message}`);
    }
  }

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS vibescribe_transcripts (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      vibescribe_id VARCHAR(50),
      content TEXT NOT NULL,
      source_type VARCHAR(50) NOT NULL DEFAULT 'voice',
      is_used BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vibescribe_transcripts_user ON vibescribe_transcripts(user_id);
    CREATE INDEX IF NOT EXISTS idx_vibescribe_transcripts_vsid ON vibescribe_transcripts(vibescribe_id);
  `);
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS master_manuscripts (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL UNIQUE,
      title VARCHAR(500) NOT NULL DEFAULT 'My Master Manuscript',
      content JSONB NOT NULL DEFAULT '{}',
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_master_manuscripts_user ON master_manuscripts(user_id);

    CREATE TABLE IF NOT EXISTS game_characters (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL UNIQUE,
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      active_title VARCHAR(255) DEFAULT 'the Novice',
      unlocked_titles JSONB NOT NULL DEFAULT '["the Novice"]',
      equipped_items JSONB NOT NULL DEFAULT '{"main_hand": null, "off_hand": null, "head": null, "body": null, "hands": null, "feet": null}',
      unlocked_items JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_game_characters_user ON game_characters(user_id);
  `);
  try {
    await dbPool.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS vibe_scribe_id VARCHAR(50)`);
  } catch (e) {
    console.warn("[Migration] vibe_scribe_id column may already exist:", (e as any).message);
  }
  console.log("[Migration] Curriculum + Workspace + Game tables verified/created on Supabase");

  const { registerRoutes } = await import("./routes");
  registerRoutes(app);

  if (isProd) {
    const path = await import("path");
    const distPath = path.resolve(process.cwd(), "dist/public");
    const indexPath = path.resolve(distPath, "index.html");

    app.use(express.static(distPath));

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(indexPath, (err) => {
        if (err) {
          res
            .status(200)
            .send(
              "<!DOCTYPE html><html><head><title>The Indie Quill Collective</title></head><body><h1>Loading...</h1></body></html>",
            );
        }
      });
    });
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  }

  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      console.error(err);

      // Prevent “Cannot set headers after they are sent” errors
      if (res.headersSent) {
        return next(err);
      }

      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    },
  );

  // Start the LLC sync worker (runs every 5 minutes)
  try {
    const { startSyncWorker } = await import("./sync-worker");
    startSyncWorker();
  } catch (err) {
    console.error("[Sync Worker] Failed to start sync worker:", err);
    console.warn("[Sync Worker] App will continue without background sync - check database configuration");
  }

  (app as any).__initialized = true;
}
