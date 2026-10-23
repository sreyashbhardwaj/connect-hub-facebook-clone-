
const express = require("express");
const router = express.Router();

const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// Search users
router.get("/search", authMiddleware, (req, res) => {
    const search = req.query.q?.trim();

    if (!search) {
        return res.status(400).json({
            success: false,
            message: "Please enter a name or email.",
        });
    }

    const currentUserId = Number(req.user.id);

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
        return res.status(401).json({
            success: false,
            message: "Invalid user authentication.",
        });
    }

    const searchTerm = `%${search}%`;

    const sql = `
        SELECT
            id,
            name,
            email,
            profile_picture
        FROM users
        WHERE (name LIKE ? OR email LIKE ?)
          AND id != ?
        LIMIT 20
    `;

    db.query(
        sql,
        [searchTerm, searchTerm, currentUserId],
        (err, results) => {
            if (err) {
                console.error("User search error:", err);

                return res.status(500).json({
                    success: false,
                    message: "Unable to search users.",
                });
            }

            return res.status(200).json({
                success: true,
                users: results,
            });
        }
    );
});

module.exports = router;
