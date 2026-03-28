import "dotenv/config";

import { eq } from "drizzle-orm";
import { db } from "../server/db";
import { workerApplications } from "../shared/schema";

type WorkerIdentity = {
  workerName: string | null;
  firstName: string | null;
  lastName: string | null;
  hasIdentity: boolean;
};

type ReportRow = {
  id: string;
  old_full_name: string | null;
  resolved_full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  updated: boolean;
};

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function splitName(fullName: string): { firstName: string | null; lastName: string | null } {
  const [firstName = "", ...lastNameParts] = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: firstName || null,
    lastName: lastNameParts.join(" ") || null,
  };
}

function resolveWorkerIdentity(input: {
  fullName?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
}): WorkerIdentity {
  const normalizedFullName = normalizeText(input.fullName);
  const normalizedFirstName = normalizeText(input.firstName);
  const normalizedLastName = normalizeText(input.lastName);
  const structuredName = normalizeText(`${normalizedFirstName || ""} ${normalizedLastName || ""}`);
  const fallbackEmail = normalizeText(input.email);
  const fallbackPhone = normalizeText(input.phone);

  const workerName = normalizedFullName || structuredName || fallbackEmail || fallbackPhone || null;
  let firstName = normalizedFirstName;
  let lastName = normalizedLastName;

  if (workerName && (!firstName || !lastName)) {
    const split = splitName(workerName);
    firstName = firstName || split.firstName;
    lastName = lastName || split.lastName;
  }

  return {
    workerName,
    firstName,
    lastName,
    hasIdentity: Boolean(workerName),
  };
}

function printUsage(): void {
  console.log(`
Usage:
  npx tsx scripts/backfill-worker-application-names.ts [--apply]

Options:
  --apply    Persist normalized fullName when it is missing and fallback identity exists

Notes:
- This migration is non-destructive.
- It never overwrites existing non-empty fullName.
- It prints derived first_name/last_name for every row as a backfill report.
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  const apply = args.includes("--apply");
  const rows = await db.select().from(workerApplications);

  let total = 0;
  let hasIdentity = 0;
  let missingIdentity = 0;
  let updatedCount = 0;

  const report: ReportRow[] = [];

  for (const row of rows) {
    total += 1;

    const oldFullName = normalizeText(row.fullName);
    const identity = resolveWorkerIdentity({
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
    });

    if (identity.hasIdentity) {
      hasIdentity += 1;
    } else {
      missingIdentity += 1;
    }

    const shouldUpdateFullName = !oldFullName && Boolean(identity.workerName);
    let updated = false;

    if (apply && shouldUpdateFullName && identity.workerName) {
      await db
        .update(workerApplications)
        .set({
          fullName: identity.workerName,
          updatedAt: new Date(),
        })
        .where(eq(workerApplications.id, row.id));
      updated = true;
      updatedCount += 1;
    }

    report.push({
      id: row.id,
      old_full_name: oldFullName,
      resolved_full_name: identity.workerName,
      first_name: identity.firstName,
      last_name: identity.lastName,
      email: normalizeText(row.email),
      phone: normalizeText(row.phone),
      updated,
    });
  }

  console.log("\n=== Worker Name Backfill Report ===");
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Total records: ${total}`);
  console.log(`Resolvable identity records: ${hasIdentity}`);
  console.log(`Unresolvable identity records: ${missingIdentity}`);
  console.log(`Records updated: ${updatedCount}`);

  console.log("\nSample (first 10 rows):");
  for (const item of report.slice(0, 10)) {
    console.log(
      `- ${item.id} | old=${item.old_full_name ?? "(empty)"} | resolved=${item.resolved_full_name ?? "(empty)"} | first=${item.first_name ?? "(empty)"} | last=${item.last_name ?? "(empty)"} | updated=${item.updated}`
    );
  }

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to persist normalized fullName where missing.");
  }
}

main().catch((error) => {
  console.error("\nBackfill failed:", error);
  process.exit(1);
});
