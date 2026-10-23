const express = require("express");
const router = express.Router();

const db = require("../config/db");
const verifyToken = require("../middleware/authMiddleware");


// =====================================================
// GET ALL CONVERSATIONS
// =====================================================

router.get("/", verifyToken, (req, res) => {

    const currentUserId =
        Number(req.user.id);


    const query = `
        SELECT
            c.id AS conversation_id,

            CASE
                WHEN c.user1_id = ?
                THEN c.user2_id
                ELSE c.user1_id
            END AS friend_id,

            CASE
                WHEN c.user1_id = ?
                THEN u2.name
                ELSE u1.name
            END AS friend_name,

            CASE
                WHEN c.user1_id = ?
                THEN u2.profile_picture
                ELSE u1.profile_picture
            END AS profile_picture,

            (
                SELECT m.message
                FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
            ) AS last_message,

            (
                SELECT m.created_at
                FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
            ) AS last_message_at,

            (
                SELECT COUNT(*)
                FROM messages m
                WHERE m.conversation_id = c.id
                AND m.sender_id != ?
                AND m.status != 'read'
            ) AS unread_count

        FROM conversations c

        JOIN users u1
            ON u1.id = c.user1_id

        JOIN users u2
            ON u2.id = c.user2_id

        WHERE
            c.user1_id = ?
            OR c.user2_id = ?

        ORDER BY
            last_message_at DESC,
            c.id DESC
    `;


    db.query(
        query,
        [
            // friend_id
            currentUserId,

            // friend_name
            currentUserId,

            // profile_picture
            currentUserId,

            // unread_count
            currentUserId,

            // WHERE user1
            currentUserId,

            // WHERE user2
            currentUserId,
        ],
        (err, conversations) => {

            if (err) {

                console.error(
                    "GET CONVERSATIONS ERROR:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to load conversations",

                    error:
                        err.message,

                });

            }


            return res.status(200).json({

                success: true,

                conversations,

            });

        }
    );

});


// =====================================================
// CREATE OR GET CONVERSATION
// =====================================================

router.post("/", verifyToken, (req, res) => {

    const currentUserId =
        Number(req.user.id);

    const otherUserId =
        Number(req.body.otherUserId);


    if (!otherUserId) {

        return res.status(400).json({

            success: false,

            message:
                "Other user ID is required",

        });

    }


    if (
        currentUserId ===
        otherUserId
    ) {

        return res.status(400).json({

            success: false,

            message:
                "You cannot create a conversation with yourself",

        });

    }


    // =====================================================
    // NORMALIZE USER IDS
    // =====================================================

    const user1 =
        Math.min(
            currentUserId,
            otherUserId
        );

    const user2 =
        Math.max(
            currentUserId,
            otherUserId
        );


    // =====================================================
    // CHECK EXISTING CONVERSATION
    // =====================================================

    const findQuery = `
        SELECT id
        FROM conversations
        WHERE user1_id = ?
        AND user2_id = ?
    `;


    db.query(
        findQuery,
        [user1, user2],
        (err, results) => {

            if (err) {

                console.error(
                    "FIND CONVERSATION ERROR:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to find conversation",

                    error:
                        err.message,

                });

            }


            if (results.length > 0) {

                return res.status(200).json({

                    success: true,

                    message:
                        "Conversation found",

                    conversationId:
                        results[0].id,

                });

            }


            // =====================================================
            // CREATE CONVERSATION
            // =====================================================

            const insertQuery = `
                INSERT INTO conversations
                (
                    user1_id,
                    user2_id
                )
                VALUES (?, ?)
            `;


            db.query(
                insertQuery,
                [user1, user2],
                (err, result) => {

                    if (err) {

                        console.error(
                            "CREATE CONVERSATION ERROR:",
                            err
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Could not create conversation",

                            error:
                                err.message,

                        });

                    }


                    return res.status(201).json({

                        success: true,

                        message:
                            "Conversation created",

                        conversationId:
                            result.insertId,

                    });

                }
            );

        }
    );

});


// =====================================================
// MARK CONVERSATION AS READ
// =====================================================

router.put(
    "/:conversationId/read",
    verifyToken,
    (req, res) => {

        const currentUserId =
            Number(req.user.id);

        const conversationId =
            Number(req.params.conversationId);


        if (!conversationId) {

            return res.status(400).json({

                success: false,

                message:
                    "Conversation ID is required",

            });

        }


        // =====================================================
        // CHECK USER BELONGS TO CONVERSATION
        // =====================================================

        const checkQuery = `
            SELECT id
            FROM conversations
            WHERE id = ?
            AND (
                user1_id = ?
                OR user2_id = ?
            )
        `;


        db.query(
            checkQuery,
            [
                conversationId,
                currentUserId,
                currentUserId,
            ],
            (err, results) => {

                if (err) {

                    console.error(
                        "CHECK READ CONVERSATION ERROR:",
                        err
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Database error",

                        error:
                            err.message,

                    });

                }


                if (results.length === 0) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "You are not part of this conversation",

                    });

                }


                // =====================================================
                // MARK ONLY RECEIVED MESSAGES AS READ
                // =====================================================

                const updateQuery = `
                    UPDATE messages
                    SET status = 'read'
                    WHERE conversation_id = ?
                    AND sender_id != ?
                    AND status != 'read'
                `;


                db.query(
                    updateQuery,
                    [
                        conversationId,
                        currentUserId,
                    ],
                    (updateErr) => {

                        if (updateErr) {

                            console.error(
                                "MARK MESSAGES READ ERROR:",
                                updateErr
                            );

                            return res.status(500).json({

                                success: false,

                                message:
                                    "Could not mark messages as read",

                                error:
                                    updateErr.message,

                            });

                        }


                        return res.status(200).json({

                            success: true,

                            message:
                                "Messages marked as read",

                        });

                    }
                );

            }
        );

    }
);


module.exports = router;