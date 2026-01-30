import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, workplaces, workplaceAssignments } from "../shared/schema";
import { eq } from "drizzle-orm";

const app = express();
const log = console.log;

const DEMO_USERS = [
  {
    id: "client-1",
    email: "client@example.com",
    fullName: "Sarah Mitchell",
    role: "client" as const,
    password: "password123",
  },
  {
    id: "worker-1",
    email: "worker@example.com",
    fullName: "James Rodriguez",
    role: "worker" as const,
    password: "password123",
    onboardingStatus: "ONBOARDED",
    workerRoles: ["Housekeeper", "Houseperson", "Server"],
  },
  {
    id: "hr-1",
    email: "hr@example.com",
    fullName: "Emily Chen",
    role: "hr" as const,
    password: "password123",
  },
  {
    id: "admin-1",
    email: "admin@example.com",
    fullName: "Michael Thompson",
    role: "admin" as const,
    password: "password123",
  },
];

async function seedDemoUsers() {
  try {
    for (const demoUser of DEMO_USERS) {
      const existing = await db.select().from(users).where(eq(users.id, demoUser.id)).limit(1);
      if (existing.length === 0) {
        const hashedPassword = await bcrypt.hash(demoUser.password, 10);
        await db.insert(users).values({
          id: demoUser.id,
          email: demoUser.email,
          fullName: demoUser.fullName,
          password: hashedPassword,
          role: demoUser.role,
          isActive: true,
          onboardingStatus: demoUser.onboardingStatus,
          workerRoles: demoUser.workerRoles ? JSON.stringify(demoUser.workerRoles) : null,
        });
        log(`Seeded demo user: ${demoUser.email}`);
      }
    }
  } catch (error) {
    log("Error seeding demo users:", error);
  }
}

const CAE_WORKPLACE = {
  id: "workplace-cae-1",
  name: "CAE Aviation Training & Services Toronto",
  addressLine1: "2025 Logistics Dr",
  city: "Mississauga",
  province: "ON",
  postalCode: "L5S 1Z9",
  country: "Canada",
  latitude: 43.6894,
  longitude: -79.6355,
  geofenceRadiusMeters: 150,
  isActive: true,
};

async function seedWorkplaces() {
  try {
    const existing = await db.select().from(workplaces).where(eq(workplaces.id, CAE_WORKPLACE.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(workplaces).values(CAE_WORKPLACE);
      log(`Seeded workplace: ${CAE_WORKPLACE.name}`);
      
      const adminExists = await db.select().from(users).where(eq(users.id, "admin-1")).limit(1);
      const workerExists = await db.select().from(users).where(eq(users.id, "worker-1")).limit(1);
      
      if (adminExists.length > 0 && workerExists.length > 0) {
        const assignmentExists = await db.select().from(workplaceAssignments)
          .where(eq(workplaceAssignments.workplaceId, CAE_WORKPLACE.id))
          .limit(1);
        
        if (assignmentExists.length === 0) {
          await db.insert(workplaceAssignments).values({
            id: "assignment-1",
            workplaceId: CAE_WORKPLACE.id,
            workerUserId: "worker-1",
            status: "active",
            invitedByUserId: "admin-1",
            notes: "Demo assignment for testing",
          });
          log(`Seeded workplace assignment: worker-1 to CAE Aviation`);
        }
      }
    }
  } catch (error) {
    log("Error seeding workplaces:", error);
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d: string) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, x-user-role, x-user-id");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  const sitemapPath = path.resolve(process.cwd(), "server", "templates", "sitemap.xml");
  const robotsPath = path.resolve(process.cwd(), "server", "templates", "robots.txt");

  app.get("/sitemap.xml", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(sitemapPath);
  });

  app.get("/robots.txt", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(robotsPath);
  });

  // Serve logo and favicon
  const logoPath = path.resolve(process.cwd(), "server", "templates", "logo.png");
  const faviconPath = path.resolve(process.cwd(), "server", "templates", "favicon.png");

  app.get("/logo.png", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(logoPath);
  });

  app.get("/favicon.png", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(faviconPath);
  });

  app.get("/favicon.ico", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(faviconPath);
  });

  // Serve Contractor Payment & Processing Guide
  const contractorGuidePath = path.resolve(process.cwd(), "server", "templates", "contractor-guide.html");
  const contractorGuideTemplate = fs.readFileSync(contractorGuidePath, "utf-8");

  // Serve guide at /guide path
  app.get("/guide", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(contractorGuideTemplate);
  });

  // Also serve at /contractor-guide for backwards compatibility
  app.get("/contractor-guide", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(contractorGuideTemplate);
  });

  // Serve Support page
  const supportPath = path.resolve(process.cwd(), "server", "templates", "support.html");
  const supportTemplate = fs.readFileSync(supportPath, "utf-8");

  app.get("/support", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(supportTemplate);
  });

  // Serve Privacy Policy page
  const privacyPath = path.resolve(process.cwd(), "server", "templates", "privacy.html");
  const privacyTemplate = fs.readFileSync(privacyPath, "utf-8");

  app.get("/privacy", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(privacyTemplate);
  });

  // Serve Worker Application Form
  const applyPath = path.resolve(process.cwd(), "server", "templates", "apply.html");
  const applyTemplate = fs.readFileSync(applyPath, "utf-8");

  app.get("/apply", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(applyTemplate);
  });

  // Serve Admin Applications Dashboard
  const adminAppsPath = path.resolve(process.cwd(), "server", "templates", "admin-applications.html");
  const adminAppsTemplate = fs.readFileSync(adminAppsPath, "utf-8");

  app.get("/admin/applications", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.status(200).send(adminAppsTemplate);
  });

  log("Serving static Expo files with dynamic manifest routing");

  app.get("/", (req: Request, res: Response) => {
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    // Check if request is from guide subdomain
    const host = req.hostname || req.headers.host || "";
    if (host.startsWith("guide.") || host.includes("guide.wfconnect")) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.status(200).send(contractorGuideTemplate);
    }

    return serveLandingPage({
      req,
      res,
      landingPageTemplate,
      appName,
    });
  });

  app.get("/manifest", (req: Request, res: Response, next: NextFunction) => {
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build"), { index: false }));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

(async () => {
  await seedDemoUsers();
  await seedWorkplaces();

  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();
