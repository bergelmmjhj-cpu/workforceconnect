import "dotenv/config";
import { db } from "../server/db";
import { appConfig } from "../shared/schema";
import { eq } from "drizzle-orm";

interface ManagedKey {
  id: string;
  name: string;
  prefix: string;
  hash: string;
  scopes: string[];
  createdAt: string;
  createdBy: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
}

async function getManagedApiKeys(): Promise<ManagedKey[]> {
  try {
    const config = await db.query.appConfig.findFirst({
      where: eq(appConfig.key, "api_keys_managed"),
    });
    if (!config || !config.value) return [];
    const parsed = JSON.parse(config.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading keys:", err);
    return [];
  }
}

async function saveManagedApiKeys(keys: ManagedKey[]): Promise<void> {
  try {
    const existing = await db.query.appConfig.findFirst({
      where: eq(appConfig.key, "api_keys_managed"),
    });

    if (existing) {
      await db
        .update(appConfig)
        .set({ value: JSON.stringify(keys) })
        .where(eq(appConfig.key, "api_keys_managed"));
    } else {
      await db.insert(appConfig).values({
        key: "api_keys_managed",
        value: JSON.stringify(keys),
        description: "Managed API keys for Payroll sync",
      });
    }
  } catch (err) {
    console.error("Error saving keys:", err);
    throw err;
  }
}

async function main() {
  const command = process.argv[2];
  const keyName = process.argv[3];
  const scope = process.argv[4];

  if (!command) {
    console.log(`
Usage: npx tsx scripts/grant-api-key-scope.ts <command> [key-name] [scope]

Commands:
  list                          List all API keys and their scopes
  grant <key-name> <scope>      Grant a scope to a key (e.g., 'applications:read')
  grant-payroll                 Grant 'applications:read' to Payroll key (auto-detect)

Examples:
  npx tsx scripts/grant-api-key-scope.ts list
  npx tsx scripts/grant-api-key-scope.ts grant "Payroll Sync" "applications:read"
  npx tsx scripts/grant-api-key-scope.ts grant-payroll
    `);
    process.exit(0);
  }

  try {
    const keys = await getManagedApiKeys();

    if (command === "list") {
      if (keys.length === 0) {
        console.log("\n❌ No API keys found");
        process.exit(0);
      }
      console.log(`\n📋 Managed API Keys (${keys.length} total):\n`);
      keys.forEach((k, i) => {
        const status = k.revokedAt ? "🚫 REVOKED" : "✅ ACTIVE";
        console.log(`  ${i + 1}. ${k.name} [${status}]`);
        console.log(`     ID: ${k.id}`);
        console.log(`     Prefix: ${k.prefix}`);
        console.log(`     Scopes: ${k.scopes.length > 0 ? k.scopes.join(", ") : "(none)"}`);
        console.log(`     Created: ${k.createdAt}`);
        if (k.lastUsedAt) console.log(`     Last used: ${k.lastUsedAt}`);
        if (k.revokedAt) console.log(`     Revoked: ${k.revokedAt}`);
        console.log();
      });
    } else if (command === "grant-payroll") {
      // Auto-detect Payroll key
      const payrollKey = keys.find(
        (k) =>
          !k.revokedAt &&
          (k.name.toLowerCase().includes("payroll") || k.name.toLowerCase().includes("sync"))
      );

      if (!payrollKey) {
        console.error("\n❌ Error: Could not find Payroll API key");
        console.log(`\nAvailable active keys:`);
        keys
          .filter((k) => !k.revokedAt)
          .forEach((k) => console.log(`  - ${k.name}`));
        console.log();
        process.exit(1);
      }

      if (payrollKey.scopes.includes("applications:read")) {
        console.log(`\n✅ Key "${payrollKey.name}" already has scope "applications:read"`);
        console.log(`   Current scopes: ${payrollKey.scopes.join(", ")}\n`);
        process.exit(0);
      }

      // Grant scope
      payrollKey.scopes.push("applications:read");
      await saveManagedApiKeys(keys);

      console.log(`\n✅ Successfully granted "applications:read" to Payroll key`);
      console.log(`   Key: ${payrollKey.name}`);
      console.log(`   ID: ${payrollKey.id}`);
      console.log(`   Updated scopes: ${payrollKey.scopes.join(", ")}\n`);
    } else if (command === "grant") {
      if (!keyName || !scope) {
        console.error("\n❌ Error: Missing key-name or scope argument");
        console.log(
          `Usage: npx tsx scripts/grant-api-key-scope.ts grant "<key-name>" "<scope>"\n`
        );
        process.exit(1);
      }

      const key = keys.find((k) => k.name === keyName);
      if (!key) {
        console.error(`\n❌ Error: API key "${keyName}" not found`);
        console.log(`\nAvailable keys:`);
        keys.forEach((k) => console.log(`  - ${k.name}`));
        console.log();
        process.exit(1);
      }

      if (key.revokedAt) {
        console.error(`\n❌ Error: Cannot update scopes on a revoked key`);
        process.exit(1);
      }

      if (key.scopes.includes(scope)) {
        console.log(`\nℹ️  Key "${keyName}" already has scope "${scope}"`);
        console.log(`   Current scopes: ${key.scopes.join(", ")}\n`);
        process.exit(0);
      }

      // Add scope
      key.scopes.push(scope);
      await saveManagedApiKeys(keys);

      console.log(`\n✅ Successfully granted scope "${scope}" to key "${keyName}"`);
      console.log(`   Updated scopes: ${key.scopes.join(", ")}\n`);
    } else {
      console.error(`\n❌ Unknown command: ${command}`);
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    console.error(
      "\n❌ Error:",
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }
}

main();
