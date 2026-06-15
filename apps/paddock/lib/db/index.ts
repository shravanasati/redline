import { drizzle } from "drizzle-orm/node-postgres";
import { schema } from "@/lib/db/schema";
import { env } from "@/lib/env";

export const db = drizzle({
  schema,
  connection: {
    connectionString: env.DATABASE_URL,
    // ssl: true
  },
});

export { schema };
