import express from "express";
import { createServer } from "http";

const app = express();
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
  const session = (await import("express-session")).default;
  const pgSession = (await import("connect-pg-simple")).default(session);

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Use Postgres-backed session store in production, memory in dev
  const sessionStore = isProd
    ? new pgSession({
        conString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      })
    : undefined;

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "indie-quill-collective-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProd,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      },
    }),
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
    const path = await import("path");
    const distPath = path.resolve(process.cwd(), "dist/public");
    const indexPath = path.resolve(distPath, "index.html");

    app.use((_req, res, next) => {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:;",
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
      _next: express.NextFunction,
    ) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error(err);
    },
  );

  (app as any).__initialized = true;
  console.log("App initialized");
}