import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.js";

const connectionString = import.meta.env.VITE_DATABASE_URL || "";

// Disable prefetch for serverless / edge compatibility
const client = connectionString ? postgres(connectionString, { prepare: false }) : null;
export const db = client ? drizzle(client, { schema }) : null;
