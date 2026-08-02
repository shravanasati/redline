import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

export const timescaleDb = drizzle({
  schema,
  connection: {
    connectionString: env.TIMESCALE_URL,
  },
});

export { schema };
