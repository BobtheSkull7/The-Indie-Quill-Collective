import express from "express";
import { createServer } from "http";

const app = express();

// IMPORTANT: allow secure cookies behind Render's proxy
app.set("trust proxy", 1);

const server = createServer(app);

const PORT = parseInt(process.env.PORT || "5000", 10);
const isProd = process.env.NODE_ENV === "production";

// Register health check routes IMMEDIATELY, before server starts
app.get("/health", (_req, res) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.status(200).send("OK");
});

// Start server IMMEDIATELY with health check routes only
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
  // Now run bootstrap in background after server is listening
  bootstrapFast().catch((err) => {
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
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
      },
    } : false, // Disable CSP in development for Vite HMR
    crossOriginEmbedderPolicy: false, // Allow embedding for Replit preview
  }));

  app.use(cors());
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

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "indie-quill-collective-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProd,
        httpOnly: true,
        sameSite: "strict",
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
  const { startSyncWorker } = await import("./sync-worker");
  startSyncWorker();

  (app as any).__initialized = true;
  console.log("App initialized");
}
