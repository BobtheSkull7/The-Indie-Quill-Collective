import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { hash } from "./auth";

async function ensurePermanentAdmin() {
  const ADMIN_EMAIL = "Jon@theindiequill.com";
  const ADMIN_PASSWORD = "Marcella@99";
  const ADMIN_FIRST_NAME = "Jon";
  const ADMIN_LAST_NAME = "Admin";

  try {
    const existingUser = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
    
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
        await db.update(users).set({ role: "admin" }).where(eq(users.email, ADMIN_EMAIL));
        console.log("Admin role restored for: " + ADMIN_EMAIL);
      }
    }
  } catch (error) {
    console.error("Error ensuring permanent admin account:", error);
  }
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "indie-quill-collective-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
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

(async () => {
  await ensurePermanentAdmin();
  registerRoutes(app);
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
