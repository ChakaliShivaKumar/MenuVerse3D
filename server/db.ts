import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import * as schema from "@shared/schema";

// Load environment variables if not already loaded
if (!process.env.DATABASE_URL) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  config({ path: path.resolve(__dirname, "..", ".env.local") });
}

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
