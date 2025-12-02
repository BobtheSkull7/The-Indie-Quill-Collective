import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import { hash } from "./auth";

const isProd = process.env.NODE_ENV === "production";

async function ensurePermanentAdmin() {
  const ADMIN_EMAIL = "jon@theindiequill.com";
  const ADMIN_PASSWORD = "Marcella@99";
  const ADMIN_FIRST_NAME = "Jon";
  const ADMIN_LAST_NAME = "Admin";

  try {
    const existingUser = await db.select().from(users).where(sql`lower(${users.email}) = lower(${ADMIN_EMAIL})`).limit(1);
    
    if (existingUser.length === 0) {
      const hashedPassword = await hash(ADMIN_PASSWORD);
      await db.insert(users).values({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        role: "admin",
      });
      console.log("Permanent admin account created: " + ADMIN_EMAIL);
    } else {
      if (existingUser[0].role !== "admin") {
        await db.update(users).set({ role: "admin" }).where(eq(users.id, existingUser[0].id));
        console.log("Admin role restored for: " + ADMIN_EMAIL);
      }
    }
  } catch (error) {
    console.error("Error ensuring permanent admin account:", error);
  }
}

const app = express();

// Health check endpoint - responds immediately without any database operations
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
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
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
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

// In production, set up static file serving synchronously before routes
if (isProd) {
  serveStatic(app);
}

// Register API routes
registerRoutes(app);

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err);
});

const server = createServer(app);
const PORT = 5000;

// Start server immediately
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  
  // Run database operations asynchronously after server is listening
  setImmediate(() => {
    ensurePermanentAdmin().catch(err => {
      console.error("Failed to ensure permanent admin:", err);
    });
  });
  
  // Set up Vite dev server after server is listening (development only)
  if (!isProd) {
    setupVite(app, server).catch(err => {
      console.error("Failed to setup Vite:", err);
    });
  }
});
