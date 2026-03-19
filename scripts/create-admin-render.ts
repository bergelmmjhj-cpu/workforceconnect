import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash("@1900Dundas", 10);
    
    const existing = await db.select().from(users).where(eq(users.email, "admin@wfconnect.org")).limit(1);
    
    if (existing.length > 0) {
      await db.update(users)
        .set({ passwordHash: hashedPassword })
        .where(eq(users.email, "admin@wfconnect.org"));
      console.log("✓ Admin password updated");
    } else {
      await db.insert(users).values({
        id: "admin-1",
        name: "Admin User",
        email: "admin@wfconnect.org",
        passwordHash: hashedPassword,
        role: "admin",
        status: "active",
      });
      console.log("✓ Admin user created");
    }
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

createAdmin();
