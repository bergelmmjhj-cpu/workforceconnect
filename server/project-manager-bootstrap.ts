import type { Express, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { registerProjectManagerRoutes } from "./project-manager-routes";

export function registerProjectManagerWorkflow(app: Express) {
  const template = (name: string) => fs.readFileSync(
    path.resolve(process.cwd(), "server", "templates", name),
    "utf-8",
  );

  const applyTemplate = template("project-manager-apply.html");
  const signTemplate = template("project-manager-sign.html");
  const portalTemplate = template("project-manager-portal.html");
  const adminTemplate = template("project-manager-admin.html");

  app.get("/project-manager-apply", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.status(200).send(applyTemplate);
  });

  const privatePage = (html: string) => (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.status(200).send(html);
  };

  app.get("/project-manager-sign", privatePage(signTemplate));
  app.get("/project-manager-portal", privatePage(portalTemplate));
  app.get("/admin/project-managers", privatePage(adminTemplate));

  registerProjectManagerRoutes(app);
}
