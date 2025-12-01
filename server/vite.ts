import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { type Server } from "http";

const viteLogger = {
  hasWarned: false,
  info: (msg: string) => console.log(msg),
  warn: (msg: string) => {
    console.warn(msg);
    viteLogger.hasWarned = true;
  },
  warnOnce: (msg: string) => {
    if (!viteLogger.hasWarned) {
      console.warn(msg);
      viteLogger.hasWarned = true;
    }
  },
  error: (msg: string) => console.error(msg),
  clearScreen: () => {},
};

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
    customLogger: viteLogger,
  });

  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html"
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = await vite.transformIndexHtml(url, template);

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
