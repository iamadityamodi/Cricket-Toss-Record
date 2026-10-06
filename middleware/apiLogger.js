import pool from "../config/db.js";

let tableChecked = false;

const ensureApiLogsTable = async () => {
    if (tableChecked) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS api_logs (
                id SERIAL PRIMARY KEY,
                method VARCHAR(10),
                endpoint TEXT,
                status_code INTEGER,
                user_id VARCHAR(100),
                ip_address VARCHAR(100),
                request_body JSONB DEFAULT '{}',
                response_time_ms NUMERIC,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        tableChecked = true;
    } catch (err) {
        console.error("Failed to ensure api_logs table exists:", err.message);
    }
};

const apiLogger = (req, res, next) => {

    const startTime = Date.now();

    res.on("finish", async () => {

        try {
            await ensureApiLogsTable();

            const responseTime = Date.now() - startTime;

            console.error("responseTime", responseTime);

            await pool.query(
                `INSERT INTO api_logs
                (
                    method,
                    endpoint,
                    status_code,
                    user_id,
                    ip_address,
                    request_body,
                    response_time_ms
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    req.method,
                    req.originalUrl,
                    res.statusCode,
                    req.body?.userId || req.user?.id || null,
                    req.ip,
                    JSON.stringify(req.body || {}),
                    responseTime
                ]
            );

        } catch (error) {
            console.error("API Logger Error:", error.message);
        }

    });

    next();
};

export default apiLogger;