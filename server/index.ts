import express from "express";
import { createServer } from "http";

const app = express();
const server = createServer(app);
const PORT = parseInt(process.env.PORT || "5000", 10);
const isProd = process.env.NODE_ENV === "production";

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/", (req, res, next) => {
  const ua = req.headers?.["user-agent"] || "";
  if (ua.includes("Health") || ua.includes("health") || ua.includes("curl") || ua.includes("Go-http")) {
    return res.status(200).send("OK");
  }
  if (!(app as any).__initialized) {
    return res.status(200).send("OK");
  }
  next();
});

async function start() {
  try {
    await bootstrap();
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Bootstrap failed:", err);
    process.exit(1);
  }
}

start();

async function createSessionStore() {
  if (isProd && process.env.DATABASE_URL) {
    try {
      const pg = await import("pg");
      const connectPgSimple = (await import("connect-pg-simple")).default;
      const session = (await import("express-session")).default;
      
      const pool = new pg.default.Pool({
        connectionString: process.env.DATABASE_URL,
      });
      
      const PgStore = connectPgSimple(session);
      return new PgStore({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: true,
      });
    } catch (err) {
      console.error("Failed to create PG session store:", err);
      return undefined;
    }
  }
  return undefined;
}

async function bootstrap() {
  const path = await import("path");
  const cors = (await import("cors")).default;
  const session = (await import("express-session")).default;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const sessionStore = await createSessionStore();
  
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "indie-quill-collective-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProd,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (reqPath.startsWith("/api")) {
        let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }
        console.log(logLine);
      }
    });

    next();
  });

  const { registerRoutes } = await import("./routes");
  registerRoutes(app);

  if (isProd) {
    const distPath = path.resolve(process.cwd(), "dist/public");
    const indexPath = path.resolve(distPath, "index.html");

    app.use((_req, res, next) => {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:;"
      );
      next();
    });

    app.use(express.static(distPath));

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(indexPath, (err) => {
        if (err) {
          res.status(200).send("<!DOCTYPE html><html><head><title>The Indie Quill Collective</title></head><body><h1>Loading...</h1></body></html>");
        }
      });
    });
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  }

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
  });

  (app as any).__initialized = true;
  console.log("App initialized");

  await ensureAdmin();
}

async function ensureAdmin() {
  try {
    const { db } = await import("./db");
    const { users } = await import("../shared/schema");
    const { eq, sql } = await import("drizzle-orm");
    const { hash } = await import("./auth");

    const ADMIN_EMAIL = "jon@theindiequill.com";
    const ADMIN_PASSWORD = "Marcella@99";

    const existing = await db.select().from(users).where(sql`lower(${users.email}) = lower(${ADMIN_EMAIL})`).limit(1);

    if (existing.length === 0) {
      const hashedPassword = await hash(ADMIN_PASSWORD);
      await db.insert(users).values({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        firstName: "Jon",
        lastName: "Admin",
        role: "admin",
      });
      console.log("Admin account created: " + ADMIN_EMAIL);
    } else if (existing[0].role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, existing[0].id));
      console.log("Admin role restored: " + ADMIN_EMAIL);
    }
  } catch (error) {
    console.error("Admin setup error:", error);
  }
}
