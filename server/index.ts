import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import { hash } from "./auth";

const isProd = process.env.NODE_ENV === "production";
const distPath = path.resolve(process.cwd(), "dist/public");
const indexPath = path.resolve(distPath, "index.html");

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
const server = createServer(app);

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

registerRoutes(app);

if (isProd) {
  app.use((req, res, next) => {
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
        res.status(200).send("<!DOCTYPE html><html><head><title>The Indie Quill Collective</title></head><body><h1>The Indie Quill Collective</h1><p>Loading...</p></body></html>");
      }
    });
  });
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err);
});

const PORT = parseInt(process.env.PORT || "5000", 10);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  
  setTimeout(() => {
    ensurePermanentAdmin().catch(err => {
      console.error("Failed to ensure permanent admin:", err);
    });
  }, 1000);
  
  if (!isProd) {
    setupVite(app, server).catch(err => {
      console.error("Failed to setup Vite:", err);
    });
  }
});
