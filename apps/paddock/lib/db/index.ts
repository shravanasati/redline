import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/lib/env";
import { schema } from "@/lib/db/schema";

export const db = drizzle({
	schema,
	connection: {
		connectionString: env.DATABASE_URL,
		// ssl: true
	},
});

export { schema };
