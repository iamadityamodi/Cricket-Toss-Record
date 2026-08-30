import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

function getPoolConfig() {
    const rawUrl = process.env.DATABASE_URL;

    // Check if DATABASE_URL is provided and not a generic dummy placeholder
    if (rawUrl && typeof rawUrl === "string" && rawUrl.trim() !== "") {
        const trimmed = rawUrl.trim();
        if (!trimmed.includes("@host:port") && !trimmed.includes("user:password@host")) {
            try {
                // Test if URL is valid
                new URL(trimmed, "postgres://base");
                const requiresSsl = trimmed.includes("sslmode=require") ||
                    trimmed.includes("sslmode=verify-full") ||
                    trimmed.includes("ssl=true");

                return {
                    connectionString: trimmed,
                    ssl: requiresSsl ? { rejectUnauthorized: false } : false,
                    max: 10,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 5000,
                };
            } catch (err) {
                console.warn("⚠️ Invalid DATABASE_URL format in .env, falling back to individual DB credentials.");
            }
        }
    }

    // Fallback to separate environment variables
    const isSsl = process.env.DB_SSL === "true" || process.env.DB_SSL === "require";
    return {
        user: process.env.DB_USER || process.env.PGUSER || "postgres",
        password: process.env.DB_PASSWORD !== undefined ? String(process.env.DB_PASSWORD) : "postgres",
        host: process.env.DB_HOST || process.env.PGHOST || "127.0.0.1",
        port: parseInt(process.env.DB_PORT || process.env.PGPORT || "5432", 10),
        database: process.env.DB_DATABASE || process.env.DB_NAME || process.env.PGDATABASE || "postgres",
        ssl: isSsl ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    };
}

const pgPool = new Pool(getPoolConfig());

pgPool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err);
});

export default pgPool;
