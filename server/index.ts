import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerPayrollHoursRoutes } from "./payroll-hours";
import { setupWebSocket } from "./websocket";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, workplaces, workplaceAssignments, timesheets, timesheetEntries, workerApplications } from "../shared/schema";
import { eq, and, isNull } from "drizzle-orm";

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

async function seedTimesheets() {
  try {
    // Check if demo timesheets exist for Period 2 (Jan 10-23, 2026)
    const existingTs = await db.select().from(timesheets).where(eq(timesheets.id, "timesheet-demo-1")).limit(1);
    
    if (existingTs.length === 0) {
      // Create demo timesheet for worker-1 in Period 2
      await db.insert(timesheets).values({
        id: "timesheet-demo-1",
        workerUserId: "worker-1",
        periodYear: 2026,
        periodNumber: 2,
        status: "submitted",
        submittedAt: new Date("2026-01-24T09:00:00Z"),
        totalHours: "32.50",
        totalPay: "650.00",
      });
      
      // Add timesheet entries
      const entries = [
        {
          id: "entry-1",
          timesheetId: "timesheet-demo-1",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-12",
          timeInUtc: new Date("2026-01-12T13:00:00Z"),
          timeOutUtc: new Date("2026-01-12T21:00:00Z"),
          breakMinutes: 30,
          hours: "7.50",
          payRate: "20.00",
          amount: "150.00",
          notes: "Regular shift",
        },
        {
          id: "entry-2",
          timesheetId: "timesheet-demo-1",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-13",
          timeInUtc: new Date("2026-01-13T13:00:00Z"),
          timeOutUtc: new Date("2026-01-13T21:00:00Z"),
          breakMinutes: 30,
          hours: "7.50",
          payRate: "20.00",
          amount: "150.00",
        },
        {
          id: "entry-3",
          timesheetId: "timesheet-demo-1",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-14",
          timeInUtc: new Date("2026-01-14T14:00:00Z"),
          timeOutUtc: new Date("2026-01-14T22:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00",
        },
        {
          id: "entry-4",
          timesheetId: "timesheet-demo-1",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-19",
          timeInUtc: new Date("2026-01-19T09:00:00Z"),
          timeOutUtc: new Date("2026-01-19T17:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00",
        },
      ];
      
      for (const entry of entries) {
        await db.insert(timesheetEntries).values(entry);
      }
      
      log("Seeded demo timesheet: worker-1 Period 2 (submitted, 32.5h, $650)");
    }
    
    // Create a second demo timesheet for another period (approved)
    const existingTs2 = await db.select().from(timesheets).where(eq(timesheets.id, "timesheet-demo-2")).limit(1);
    
    if (existingTs2.length === 0) {
      await db.insert(timesheets).values({
        id: "timesheet-demo-2",
        workerUserId: "worker-1",
        periodYear: 2026,
        periodNumber: 3,
        status: "approved",
        submittedAt: new Date("2026-02-07T09:00:00Z"),
        approvedByUserId: "admin-1",
        approvedAt: new Date("2026-02-08T10:00:00Z"),
        totalHours: "40.00",
        totalPay: "800.00",
      });
      
      // Add entries for approved timesheet
      const entries2 = [
        {
          id: "entry-5",
          timesheetId: "timesheet-demo-2",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-26",
          timeInUtc: new Date("2026-01-26T09:00:00Z"),
          timeOutUtc: new Date("2026-01-26T17:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00",
        },
        {
          id: "entry-6",
          timesheetId: "timesheet-demo-2",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-27",
          timeInUtc: new Date("2026-01-27T09:00:00Z"),
          timeOutUtc: new Date("2026-01-27T17:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00",
        },
        {
          id: "entry-7",
          timesheetId: "timesheet-demo-2",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-01-28",
          timeInUtc: new Date("2026-01-28T09:00:00Z"),
          timeOutUtc: new Date("2026-01-28T17:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00",
        },
        {
          id: "entry-8",
          timesheetId: "timesheet-demo-2",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-02-02",
          timeInUtc: new Date("2026-02-02T09:00:00Z"),
          timeOutUtc: new Date("2026-02-02T17:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00",
        },
        {
          id: "entry-9",
          timesheetId: "timesheet-demo-2",
          workplaceId: "workplace-cae-1",
          dateLocal: "2026-02-03",
          timeInUtc: new Date("2026-02-03T09:00:00Z"),
          timeOutUtc: new Date("2026-02-03T17:30:00Z"),
          breakMinutes: 30,
          hours: "8.00",
          payRate: "20.00",
          amount: "160.00",
        },
      ];
      
      for (const entry of entries2) {
        await db.insert(timesheetEntries).values(entry);
      }
      
      log("Seeded demo timesheet: worker-1 Period 3 (approved, 40h, $800)");
    }
  } catch (error) {
    log("Error seeding timesheets:", error);
  }
}

async function seedProductionAdmin() {
  try {
    // Check if production admin exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@wfconnect.org")).limit(1);
    
    if (existingAdmin.length === 0) {
      // Create production admin user with password: @1900Dundas
      const hashedPassword = await bcrypt.hash("@1900Dundas", 10);
      await db.insert(users).values({
        id: crypto.randomUUID(),
        email: "admin@wfconnect.org",
        password: hashedPassword,
        fullName: "Admin User",
        role: "admin",
        timezone: "America/Toronto",
        isActive: true,
      });
      log("Created production admin user: admin@wfconnect.org");
    } else {
      log("Production admin user already exists");
    }
  } catch (error) {
    log("Error seeding production admin:", error);
  }
}

async function backfillApprovedApplicationAccounts() {
  try {
    const approvedApps = await db.select({
      id: workerApplications.id,
      email: workerApplications.email,
      fullName: workerApplications.fullName,
      phone: workerApplications.phone,
      preferredRoles: workerApplications.preferredRoles,
    }).from(workerApplications).where(eq(workerApplications.status, "approved"));

    let created = 0;
    for (const app of approvedApps) {
      if (!app.email) continue;
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, app.email.toLowerCase())).limit(1);
      if (existing) continue;

      const crypto = await import("crypto");
      const firstName = (app.fullName || "worker").split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
      const phoneLast4 = (app.phone || "0000").replace(/\D/g, "").slice(-4);
      const tempPassword = `${firstName}${phoneLast4}`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      await db.insert(users).values({
        id: crypto.randomUUID(),
        email: app.email.toLowerCase(),
        password: hashedPassword,
        fullName: app.fullName || "Worker",
        role: "worker",
        phone: app.phone || undefined,
        isActive: true,
        onboardingStatus: "AGREEMENT_PENDING",
        workerRoles: app.preferredRoles || undefined,
        mustChangePassword: true,
        timezone: "America/Toronto",
      });
      created++;
    }

    if (created > 0) {
      log(`Backfilled ${created} user accounts from approved applications`);
    }
  } catch (error) {
    log("Error backfilling approved application accounts:", error);
  }
}

async function backfillWorkerPhones() {
  try {
    const workersWithoutPhone = await db.select({ id: users.id, email: users.email })
      .from(users)
      .where(and(eq(users.role, "worker"), isNull(users.phone)));

    if (workersWithoutPhone.length === 0) {
      return;
    }

    let backfilled = 0;
    for (const worker of workersWithoutPhone) {
      const [app] = await db.select({ phone: workerApplications.phone })
        .from(workerApplications)
        .where(and(
          eq(workerApplications.email, worker.email),
          eq(workerApplications.status, "approved")
        ))
        .limit(1);

      if (app?.phone) {
        await db.update(users)
          .set({ phone: app.phone })
          .where(eq(users.id, worker.id));
        backfilled++;
      }
    }

    if (backfilled > 0) {
      log(`Backfilled phone numbers for ${backfilled} workers from their applications`);
    }
  } catch (error) {
    log("Error backfilling worker phones:", error);
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
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
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
      limit: "30mb", // Increased for base64 file uploads (photo + resume, each up to 10MB → ~13.3MB base64)
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "30mb" }));
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
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

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

  // Serve Applicant Portal (apply.wfconnect.org)
  const applyFormPath = path.resolve(process.cwd(), "server", "templates", "apply-form.html");
  const applyFormTemplate = fs.existsSync(applyFormPath) ? fs.readFileSync(applyFormPath, "utf-8") : null;

  // Serve Applicants Admin Portal (apply.wfconnect.org/applicants)
  const applicantsPortalPath = path.resolve(process.cwd(), "server", "templates", "applicants-portal.html");
  const applicantsPortalTemplate = fs.existsSync(applicantsPortalPath) ? fs.readFileSync(applicantsPortalPath, "utf-8") : null;

  function isApplySubdomain(req: Request): boolean {
    const host = (req.hostname || req.headers.host || "").toLowerCase();
    return host.startsWith("apply.") || host.includes("apply.wfconnect");
  }

  if (applicantsPortalTemplate) {
    app.get("/applicants", (req: Request, res: Response, next: NextFunction) => {
      if (!isApplySubdomain(req) && req.hostname !== "localhost" && !req.hostname?.includes("replit")) {
        return next();
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
      const rendered = applicantsPortalTemplate.replace("__GOOGLE_CLIENT_ID__", googleClientId);
      return res.status(200).send(rendered);
    });
    log("Applicants admin portal available at /applicants and apply.wfconnect.org/applicants");
  }

  // /apply is subdomain-aware:
  //   apply.wfconnect.org  → apply-form.html  (standalone lead capture, cold calling pool)
  //   guide.wfconnect.org  → apply.html       (full worker application form)
  //   any other domain     → apply.html       (default full form)
  if (applyFormTemplate) {
    log("Applicant lead portal available at apply.wfconnect.org/apply");
  }

  // Serve Clawd AI standalone web chat + PWA at /clawdai (app.wfconnect.org/clawdai)
  const clawdChatPath = path.resolve(process.cwd(), "server", "templates", "clawd-chat.html");
  const clawdChatTemplate = fs.existsSync(clawdChatPath) ? fs.readFileSync(clawdChatPath, "utf-8") : null;
  if (clawdChatTemplate) {
    app.get("/clawdai", (req: Request, res: Response, next: NextFunction) => {
      if (!isAppSubdomain(req) && req.hostname !== "localhost" && !req.hostname?.includes("replit")) {
        return next();
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      return res.status(200).send(clawdChatTemplate);
    });
    const clawdManifestPath = path.resolve(process.cwd(), "server", "templates", "clawd-manifest.json");
    app.get("/clawd-manifest.json", (_req: Request, res: Response) => {
      res.setHeader("Content-Type", "application/manifest+json");
      res.sendFile(clawdManifestPath);
    });
    log("Clawd AI web chat available at /clawdai and app.wfconnect.org/clawdai");
  }

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

  // Serve Account Deletion Request page
  const accountDeletionPath = path.resolve(process.cwd(), "server", "templates", "account-deletion.html");
  const accountDeletionTemplate = fs.readFileSync(accountDeletionPath, "utf-8");

  app.get("/account-deletion", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(accountDeletionTemplate);
  });

  // Serve Worker Application Form (full form, used by guide.wfconnect.org)
  const applyPath = path.resolve(process.cwd(), "server", "templates", "apply.html");
  const applyTemplate = fs.readFileSync(applyPath, "utf-8");

  // Single subdomain-aware /apply route:
  //   apply.wfconnect.org → apply-form.html (standalone lead capture)
  //   everywhere else     → apply.html      (full worker registration form)
  app.get("/apply", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (isApplySubdomain(req) && applyFormTemplate) {
      res.setHeader("Cache-Control", "no-cache");
      return res.status(200).send(applyFormTemplate);
    }
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(applyTemplate);
  });

  // /contractor-apply — unconditionally serves the full worker registration form
  // (no hostname detection — works reliably regardless of how the proxy sets Host headers)
  app.get("/contractor-apply", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(applyTemplate);
  });

  // Serve Payment Information Page
  const paymentInfoPath = path.resolve(process.cwd(), "server", "templates", "payment-info.html");
  const paymentInfoTemplate = fs.readFileSync(paymentInfoPath, "utf-8");

  app.get("/payment-info", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(paymentInfoTemplate);
  });

  // Serve Admin Applications Dashboard
  const adminAppsPath = path.resolve(process.cwd(), "server", "templates", "admin-applications.html");
  const adminAppsTemplate = fs.readFileSync(adminAppsPath, "utf-8");

  app.get("/admin/applications", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.status(200).send(adminAppsTemplate);
  });

  // Serve Admin Timesheets & Payroll Dashboard
  const adminTimesheetsPath = path.resolve(process.cwd(), "server", "templates", "admin-timesheets.html");
  const adminTimesheetsTemplate = fs.readFileSync(adminTimesheetsPath, "utf-8");

  app.get("/admin/timesheets", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.status(200).send(adminTimesheetsTemplate);
  });

  // Serve Admin Hours Automation Dashboard
  const adminHoursPath = path.resolve(process.cwd(), "server", "templates", "admin-hours.html");
  const adminHoursTemplate = fs.readFileSync(adminHoursPath, "utf-8");

  app.get("/admin/hours", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.status(200).send(adminHoursTemplate);
  });

  log("Serving static Expo files with dynamic manifest routing");

  // === DOMAIN-BASED ROUTING ===
  // app.wfconnect.org -> Serve Expo Web app from web-dist/
  // wfconnect.org -> Serve marketing landing page
  // guide.wfconnect.org -> Serve contractor guide
  
  const webDistPath = path.resolve(process.cwd(), "web-dist");
  const webDistIndexPath = path.join(webDistPath, "index.html");
  const webBuildExists = fs.existsSync(webDistIndexPath);
  
  if (webBuildExists) {
    log("Web build found at web-dist/index.html - app subdomain routing enabled");
  } else {
    log("WARNING: web-dist/index.html not found - app subdomain will return 500 error");
  }

  // Helper to check if request is from app subdomain
  function isAppSubdomain(req: Request): boolean {
    const host = (req.hostname || req.headers.host || "").toLowerCase();
    return host.startsWith("app.") || host.includes("app.wfconnect");
  }

  // Helper to check if request is from guide subdomain
  function isGuideSubdomain(req: Request): boolean {
    const host = (req.hostname || req.headers.host || "").toLowerCase();
    return host.startsWith("guide.") || host.includes("guide.wfconnect");
  }

  // Serve static files from web-dist for app subdomain BEFORE other routes
  // This handles assets like /_expo/static/js/*, /assets/*, etc.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isAppSubdomain(req) && webBuildExists) {
      // Skip API routes - they should work on all domains
      if (req.path.startsWith("/api")) {
        return next();
      }
      
      // Check if the requested file exists in web-dist
      const filePath = path.join(webDistPath, req.path);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        // Set cache headers for static assets
        if (req.path.includes("/_expo/") || req.path.includes("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
        return res.sendFile(filePath);
      }
    }
    next();
  });

  // Handle root path and Expo manifest
  app.get("/", (req: Request, res: Response) => {
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    // App subdomain - serve Expo web app
    if (isAppSubdomain(req)) {
      if (!webBuildExists) {
        return res.status(500).json({
          error: "Web build not available",
          message: "The Expo web build (web-dist/index.html) was not found. Please ensure the web build step completed successfully."
        });
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      return res.sendFile(webDistIndexPath);
    }

    // Guide subdomain
    if (isGuideSubdomain(req)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.status(200).send(contractorGuideTemplate);
    }

    // Apply subdomain — public applicant portal
    if (isApplySubdomain(req) && applyFormTemplate) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      return res.status(200).send(applyFormTemplate);
    }

    // Default - serve landing page
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

  // SPA fallback for app subdomain - serve index.html for any unmatched GET routes
  // This enables client-side routing (e.g., /login, /dashboard)
  // Using a middleware function instead of app.get("*") for compatibility with newer path-to-regexp
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Only handle GET requests for SPA fallback
    if (req.method !== "GET") {
      return next();
    }
    
    // Skip API routes
    if (req.path.startsWith("/api")) {
      return next();
    }
    
    // Only apply SPA fallback for app subdomain
    if (isAppSubdomain(req) && webBuildExists) {
      // Check if it's a file request (has extension) - let static middleware handle those
      if (path.extname(req.path)) {
        return next();
      }
      
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      return res.sendFile(webDistIndexPath);
    }
    
    next();
  });

  log("Expo routing: Checking expo-platform header on / and /manifest");
  log("Domain routing: app.wfconnect.org -> web-dist/, wfconnect.org -> landing page");
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

const isDemoMode = process.env.DEMO_MODE !== "false";

(async () => {
  if (isDemoMode) {
    log("DEMO MODE enabled - seeding demo data...");
    await seedDemoUsers();
    await seedWorkplaces();
    await seedTimesheets();
  } else {
    log("PRODUCTION MODE - skipping demo data seeding");
    await seedProductionAdmin();
    await backfillWorkerPhones();
    await backfillApprovedApplicationAccounts();
  }

  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  registerPayrollHoursRoutes(app);
  const server = await registerRoutes(app);
  setupWebSocket(server);

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

      // CRM startup check and auto-sync (non-blocking, runs after server is listening)
      (async () => {
        try {
          const crmClient = await import("./services/weekdays-crm");
          if (!crmClient.isConfigured()) {
            log("[CRM] Not configured - skipping sync setup");
            return;
          }
          const connResult = await crmClient.testConnection();
          if (!connResult.connected) {
            log("[CRM] Connection test failed:", connResult.error);
            return;
          }
          log("[CRM] Connected to Weekdays CRM successfully");
          const crmSync = await import("./services/crm-sync");
          try {
            await crmSync.syncAll(false);
            log("[CRM] Initial sync completed");
          } catch (syncErr: any) {
            log("[CRM] Initial sync failed:", syncErr.message);
          }
          setInterval(async () => {
            try {
              if (crmSync.isSyncRunning()) return;
              await crmSync.syncConfirmedShifts(false);
              await crmSync.syncHotelRequests(false);
            } catch (err: any) {
              log("[CRM] Auto-sync failed:", err.message);
            }
          }, 15 * 60 * 1000);
          log("[CRM] Auto-sync scheduled every 15 minutes");
        } catch (crmErr: any) {
          log("[CRM] Startup check failed (non-blocking):", crmErr.message);
        }
      })();

      // AI Operations Assistant startup (non-blocking)
      (async () => {
        try {
          const aiAssistant = await import("./services/ai-assistant/index");
          await aiAssistant.startAssistant();
        } catch (aiErr: any) {
          log("[AI] Startup failed (non-blocking):", aiErr.message);
        }
      })();

      // AI Follow-up SMS Scheduler (non-blocking)
      (async () => {
        try {
          const followup = await import("./services/aiFollowupService");
          followup.startFollowupScheduler();
        } catch (err: any) {
          log("[AI FOLLOWUP] Startup failed (non-blocking):", err.message);
        }
      })();
    },
  );
})();
