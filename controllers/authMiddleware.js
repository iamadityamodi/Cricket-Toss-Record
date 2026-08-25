import jwt from "jsonwebtoken";
import db from "../config/db.js";

const authenticateToken = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        // --------------------------------
        // Authorization Header Check
        // --------------------------------

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization token required"
            });
        }

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization format"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token missing"
            });
        }

        // --------------------------------
        // Verify JWT
        // --------------------------------

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

 
        // =================================
        // GUEST USER
        // =================================

        if (decoded.type === "GUEST") {

            req.user = {
                type: "GUEST",
                guestId: decoded.guestId
            };

            console.log(
                "Guest User:",
                decoded.guestId
            );

            return next();
        }

        // =================================
        // LOGIN USER
        // =================================

        if (decoded.type === "USER") {

            const result = await db.query(
                `SELECT token_version
                 FROM tabregistration
                 WHERE id = $1
                 LIMIT 1`,
                [decoded.id]
            );

            if (
                !result.rows ||
                result.rows.length === 0
            ) {
                return res.status(401).json({
                    success: false,
                    message: "User not found"
                });
            }

            const currentTokenVersion =
                result.rows[0].token_version;

            

            // --------------------------------
            // Check old login token
            // --------------------------------

            if (
                decoded.tokenVersion !==
                currentTokenVersion
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Token is no longer valid. Please login again."
                });
            }

            req.user = {
                type: "USER",
                id: decoded.id,
                tokenVersion: decoded.tokenVersion
            };

            return next();
        }

        // =================================
        // Unknown Token Type
        // =================================

        return res.status(401).json({
            success: false,
            message: "Invalid token type"
        });

    } catch (error) {

        console.error(
            "Authentication Error:",
            error
        );

        // JWT expired
        if (error.name === "TokenExpiredError") {

            return res.status(401).json({
                success: false,
                message: "Token expired"
            });
        }

        // Invalid JWT
        if (error.name === "JsonWebTokenError") {

            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        return res.status(401).json({
            success: false,
            message: "Authentication failed"
        });
    }
};

export default authenticateToken;