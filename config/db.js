import dotenv from "dotenv";
import pg from "pg";
import db from "../config/db.js";

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
}

const requiresSsl = databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("sslmode=verify-full") ||
    databaseUrl.includes("ssl=true");

const pgPool = new Pool({
    connectionString: databaseUrl,
    ssl: requiresSsl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

export default pgPool;
