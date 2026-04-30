import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

const getDatabaseUrl = () => {
  // Try multiple possible environment variable names for database URL
  const dbUrl = process.env.DATABASE_URL || 
                process.env.POSTGRES_URL || 
                process.env.SUPABASE_DB_URL;
  
  if (!dbUrl) {
    console.error("❌ Database Configuration Error:");
    console.error("   DATABASE_URL environment variable is required");
    console.error("   Available env vars: DATABASE_URL, POSTGRES_URL, SUPABASE_DB_URL");
    console.error("   Current environment variables:");
    Object.keys(process.env)
      .filter(k => k.includes('DATABASE') || k.includes('POSTGRES') || k.includes('SUPABASE'))
      .forEach(k => console.error(`   - ${k}: ${process.env[k]?.substring(0, 50)}...`));
    throw new Error("DATABASE_URL environment variable is required");
  }
  
  return dbUrl;
};

const databaseUrl = getDatabaseUrl();
const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });
