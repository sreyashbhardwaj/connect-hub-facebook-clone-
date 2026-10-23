const db = require("../config/db");

// Send a friend request
const sendRequest = (req, res) => {
    const senderId = Number(req.user.id);
    const receiverId = Number(req.params.id);

    // Validate receiver ID
    if (!Number.isInteger(receiverId) || receiverId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID"
        });
    }

    // Validate sender ID
    if (!Number.isInteger(senderId) || senderId <= 0) {
        return res.status(401).json({
            success: false,
            message: "Invalid user authentication"
        });
    }

    // Prevent sending a request to yourself
    if (senderId === receiverId) {
        return res.status(400).json({
            success: false,
            message: "You cannot add yourself"
        });
    }

    // Check whether the receiver exists
    db.query(
        "SELECT id FROM users WHERE id = ?",
        [receiverId],
        (err, users) => {
            if (err) {
                console.error("User lookup error:", err);

                return res.status(500).json({
                    success: false,
                    message: "Database error"
                });
            }

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // Check for an existing request or friendship
            const checkSql = `
                SELECT id, status
                FROM friend_requests
                WHERE
                    (sender_id = ? AND receiver_id = ?)
                    OR
                    (sender_id = ? AND receiver_id = ?)
            `;

            db.query(
                checkSql,
                [senderId, receiverId, receiverId, senderId],
                (err, existing) => {
                    if (err) {
                        console.error("Request lookup error:", err);

                        return res.status(500).json({
                            success: false,
                            message: "Database error"
                        });
                    }

                    if (existing.length > 0) {
                        return res.status(409).json({
                            success: false,
                            message:
                                "A request or friendship already exists"
                        });
                    }

                    // Create a new friend request
                    const insertSql = `
                        INSERT INTO friend_requests
                        (sender_id, receiver_id, status)
                        VALUES (?, ?, 'pending')
                    `;

                    db.query(
                        insertSql,
                        [senderId, receiverId],
                        (err, result) => {
                            if (err) {
                                console.error(
                                    "Friend request insert error:",
                                    err
                                );

                                return res.status(500).json({
                                    success: false,
                                    message: "Could not send request"
                                });
                            }

                            return res.status(201).json({
                                success: true,
                                message: "Friend request sent",
                                requestId: result.insertId
                            });
                        }
                    );
                }
            );
        }
    );
};


// Get received pending friend requests
const getRequests = (req, res) => {
    const userId = Number(req.user.id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({
            success: false,
            message: "Invalid user authentication"
        });
    }

    const sql = `
        SELECT
            fr.id AS request_id,
            fr.sender_id,
            fr.receiver_id,
            u.id AS user_id,
            u.name,
            u.email,
            u.profile_picture,
            fr.status,
            fr.created_at
        FROM friend_requests fr
        JOIN users u
            ON fr.sender_id = u.id
        WHERE fr.receiver_id = ?
        AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Fetch friend requests error:", err);

            return res.status(500).json({
                success: false,
                message: "Could not fetch requests"
            });
        }

        return res.status(200).json({
            success: true,
            requests: results
        });
    });
};


// Accept a friend request
const acceptRequest = (req, res) => {
    const userId = Number(req.user.id);
    const requestId = Number(req.params.id);

    if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid request ID"
        });
    }

    const sql = `
        UPDATE friend_requests
        SET status = 'accepted'
        WHERE id = ?
        AND receiver_id = ?
        AND status = 'pending'
    `;

    db.query(sql, [requestId, userId], (err, result) => {
        if (err) {
            console.error("Accept request error:", err);

            return res.status(500).json({
                success: false,
                message: "Could not accept request"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Pending friend request not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Friend request accepted"
        });
    });
};


// Reject a friend request
const rejectRequest = (req, res) => {
    const userId = Number(req.user.id);
    const requestId = Number(req.params.id);

    if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid request ID"
        });
    }

    const sql = `
        UPDATE friend_requests
        SET status = 'rejected'
        WHERE id = ?
        AND receiver_id = ?
        AND status = 'pending'
    `;

    db.query(sql, [requestId, userId], (err, result) => {
        if (err) {
            console.error("Reject request error:", err);

            return res.status(500).json({
                success: false,
                message: "Could not reject request"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Pending friend request not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Friend request rejected"
        });
    });
};


// Get accepted friends
const getFriends = (req, res) => {
    const userId = Number(req.user.id);

    const sql = `
        SELECT
            u.id,
            u.name,
            u.email,
            u.profile_picture,
            u.bio
        FROM friend_requests fr
        JOIN users u
            ON u.id = CASE
                WHEN fr.sender_id = ? THEN fr.receiver_id
                ELSE fr.sender_id
            END
        WHERE
            (fr.sender_id = ? OR fr.receiver_id = ?)
            AND fr.status = 'accepted'
        ORDER BY u.name
    `;

    db.query(
        sql,
        [userId, userId, userId],
        (err, results) => {
            if (err) {
                console.error("Fetch friends error:", err);

                return res.status(500).json({
                    success: false,
                    message: "Could not fetch friends"
                });
            }

            return res.status(200).json({
                success: true,
                friends: results
            });
        }
    );
};


module.exports = {
    sendRequest,
    getRequests,
    acceptRequest,
    rejectRequest,
    getFriends
};