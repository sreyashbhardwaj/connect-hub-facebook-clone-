const express = require("express");
const router = express.Router();

const db = require("../config/db");
const verifyToken = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");
const fs = require("fs");


// =====================================================
// VOICE NOTE UPLOAD CONFIGURATION
// =====================================================

const voiceUploadDir = path.join(
  __dirname,
  "../../client/public/voice"
);

fs.mkdirSync(voiceUploadDir, { recursive: true });

// Create folder if it doesn't exist
if (!fs.existsSync(voiceUploadDir)) {

    fs.mkdirSync(
        voiceUploadDir,
        {
            recursive: true
        }
    );

}


// =====================================================
// MULTER STORAGE
// =====================================================

const voiceStorage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            voiceUploadDir
        );

    },


    filename: (req, file, cb) => {

        const extension =
            path.extname(file.originalname) ||
            ".webm";


        const filename =
            `voice-${req.user.id}-${Date.now()}${extension}`;


        cb(
            null,
            filename
        );

    }

});


// =====================================================
// MULTER CONFIGURATION
// =====================================================

const voiceUpload = multer({

    storage: voiceStorage,

    limits: {

        fileSize:
            10 * 1024 * 1024

    },


    fileFilter: (req, file, cb) => {
  const mimeType = (file.mimetype || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  const allowedTypes = [
    "audio/webm",
    "audio/ogg",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp4",
    "audio/aac",
    "audio/3gpp",
  ];

  if (allowedTypes.includes(mimeType)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported audio format: ${mimeType}`));
  }
}
});
// =====================================================
// GET MESSAGES FOR A CONVERSATION
// =====================================================

router.get(
    "/:conversationId",
    verifyToken,
    (req, res) => {

        const currentUserId =
            req.user.id;

        const conversationId =
            Number(
                req.params.conversationId
            );


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

        const checkConversationQuery = `
            SELECT id
            FROM conversations
            WHERE id = ?
            AND (
                user1_id = ?
                OR user2_id = ?
            )
        `;


        db.query(

            checkConversationQuery,

            [
                conversationId,
                currentUserId,
                currentUserId,
            ],

            (err, conversationResults) => {

                if (err) {

                    console.error(
                        "CHECK CONVERSATION ERROR:",
                        err
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to verify conversation",

                        error:
                            err.message,

                    });

                }


                if (
                    conversationResults.length === 0
                ) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "You are not part of this conversation",

                    });

                }


                // =====================================================
                // GET MESSAGES
                // =====================================================

                const messagesQuery = `
                    SELECT
                        id,
                        conversation_id,
                        sender_id,
                        message,
                        message_type,
                        status,
                        created_at
                    FROM messages
                    WHERE conversation_id = ?
                    ORDER BY created_at ASC, id ASC
                `;


                db.query(

                    messagesQuery,

                    [conversationId],

                    (err, messages) => {

                        if (err) {

                            console.error(
                                "GET MESSAGES ERROR:",
                                err
                            );


                            return res.status(500).json({

                                success: false,

                                message:
                                    "Failed to load messages",

                                error:
                                    err.message,

                            });

                        }


                        return res.status(200).json({

                            success: true,

                            messages,

                        });

                    }

                );

            }

        );

    }

);


// =====================================================
// SEND TEXT MESSAGE
// EXISTING FUNCTIONALITY
// =====================================================

router.post(
    "/",
    verifyToken,
    (req, res) => {

        const senderId =
            req.user.id;


        const {
            conversationId,
            message,
        } = req.body;


        if (!conversationId) {

            return res.status(400).json({

                success: false,

                message:
                    "Conversation ID is required",

            });

        }


        if (
            !message ||
            typeof message !== "string" ||
            !message.trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Message is required",

            });

        }


        const cleanMessage =
            message.trim();


        // =====================================================
        // CHECK CONVERSATION
        // =====================================================

        const checkConversationQuery = `
            SELECT id
            FROM conversations
            WHERE id = ?
            AND (
                user1_id = ?
                OR user2_id = ?
            )
        `;


        db.query(

            checkConversationQuery,

            [
                conversationId,
                senderId,
                senderId,
            ],

            (err, results) => {

                if (err) {

                    console.error(
                        "CHECK MESSAGE CONVERSATION ERROR:",
                        err
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to verify conversation",

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
                // INSERT TEXT MESSAGE
                // =====================================================

                const insertMessageQuery = `
                    INSERT INTO messages
                    (
                        conversation_id,
                        sender_id,
                        message
                    )
                    VALUES (?, ?, ?)
                `;


                db.query(

                    insertMessageQuery,

                    [
                        conversationId,
                        senderId,
                        cleanMessage,
                    ],

                    (err, result) => {

                        if (err) {

                            console.error(
                                "INSERT MESSAGE ERROR:",
                                err
                            );


                            return res.status(500).json({

                                success: false,

                                message:
                                    "Failed to send message",

                                error:
                                    err.message,

                            });

                        }


                        // =====================================================
                        // UPDATE LAST MESSAGE TIME
                        // =====================================================

                        const updateConversationQuery = `
                            UPDATE conversations
                            SET last_message_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `;


                        db.query(

                            updateConversationQuery,

                            [conversationId],

                            (updateErr) => {

                                if (updateErr) {

                                    console.error(
                                        "UPDATE CONVERSATION ERROR:",
                                        updateErr
                                    );

                                    // Message was already saved,
                                    // so don't fail the request.

                                }


                                // =====================================================
                                // GET SAVED MESSAGE
                                // =====================================================

                                const getMessageQuery = `
                                    SELECT
                                        id,
                                        conversation_id,
                                        sender_id,
                                        message,
                                        message_type,
                                        status,
                                        created_at
                                    FROM messages
                                    WHERE id = ?
                                `;


                                db.query(

                                    getMessageQuery,

                                    [result.insertId],

                                    (err, messageResults) => {

                                        if (err) {

                                            console.error(
                                                "GET SAVED MESSAGE ERROR:",
                                                err
                                            );


                                            return res.status(500).json({

                                                success: false,

                                                message:
                                                    "Message saved but could not be loaded",

                                                error:
                                                    err.message,

                                            });

                                        }


                                        return res.status(201).json({

                                            success: true,

                                            message:
                                                "Message sent successfully",

                                            data:
                                                messageResults[0],

                                        });

                                    }

                                );

                            }

                        );

                    }

                );

            }

        );

    }

);


// =====================================================
// SEND VOICE MESSAGE
// EXISTING VOICE FUNCTIONALITY
// =====================================================

router.post(
    "/voice",
    verifyToken,
    voiceUpload.single("voice"),
    (req, res) => {

        const senderId =
            req.user.id;


        const conversationId =
            Number(
                req.body.conversationId
            );


        // =====================================================
        // CHECK CONVERSATION ID
        // =====================================================

        if (!conversationId) {

            if (req.file) {

                fs.unlink(
                    req.file.path,
                    () => {}
                );

            }


            return res.status(400).json({

                success: false,

                message:
                    "Conversation ID is required",

            });

        }


        // =====================================================
        // CHECK VOICE FILE
        // =====================================================

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "Voice file is required",

            });

        }


        // =====================================================
        // CHECK USER BELONGS TO CONVERSATION
        // =====================================================

        const checkConversationQuery = `
            SELECT id
            FROM conversations
            WHERE id = ?
            AND (
                user1_id = ?
                OR user2_id = ?
            )
        `;


        db.query(

            checkConversationQuery,

            [
                conversationId,
                senderId,
                senderId,
            ],

            (err, conversationResults) => {

                if (err) {

                    console.error(
                        "VOICE CHECK CONVERSATION ERROR:",
                        err
                    );


                    fs.unlink(
                        req.file.path,
                        () => {}
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to verify conversation",

                        error:
                            err.message,

                    });

                }


                if (
                    conversationResults.length === 0
                ) {

                    fs.unlink(
                        req.file.path,
                        () => {}
                    );


                    return res.status(403).json({

                        success: false,

                        message:
                            "You are not part of this conversation",

                    });

                }


                // =====================================================
                // VOICE FILE PATH
                // =====================================================

               const voicePath =
  `/voice/${req.file.filename}`;


                // =====================================================
                // INSERT VOICE MESSAGE
                // =====================================================

                const insertVoiceQuery = `
                    INSERT INTO messages
                    (
                        conversation_id,
                        sender_id,
                        message,
                        message_type,
                        status
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        'voice',
                        'sent'
                    )
                `;


                db.query(

                    insertVoiceQuery,

                    [
                        conversationId,
                        senderId,
                        voicePath,
                    ],

                    (err, result) => {

                        if (err) {

                            console.error(
                                "INSERT VOICE MESSAGE ERROR:",
                                err
                            );


                            fs.unlink(
                                req.file.path,
                                () => {}
                            );


                            return res.status(500).json({

                                success: false,

                                message:
                                    "Failed to save voice message",

                                error:
                                    err.message,

                            });

                        }


                        // =====================================================
                        // UPDATE LAST MESSAGE TIME
                        // =====================================================

                        const updateConversationQuery = `
                            UPDATE conversations
                            SET last_message_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `;


                        db.query(

                            updateConversationQuery,

                            [conversationId],

                            (updateErr) => {

                                if (updateErr) {

                                    console.error(
                                        "VOICE UPDATE CONVERSATION ERROR:",
                                        updateErr
                                    );

                                }


                                // =====================================================
                                // GET SAVED VOICE MESSAGE
                                // =====================================================

                                const getVoiceMessageQuery = `
                                    SELECT
                                        id,
                                        conversation_id,
                                        sender_id,
                                        message,
                                        message_type,
                                        status,
                                        created_at
                                    FROM messages
                                    WHERE id = ?
                                `;


                                db.query(

                                    getVoiceMessageQuery,

                                    [result.insertId],

                                    (err, messageResults) => {

                                        if (err) {

                                            console.error(
                                                "GET VOICE MESSAGE ERROR:",
                                                err
                                            );


                                            return res.status(500).json({

                                                success: false,

                                                message:
                                                    "Voice message saved but could not be loaded",

                                                error:
                                                    err.message,

                                            });

                                        }


                                        return res.status(201).json({

                                            success: true,

                                            message:
                                                "Voice message sent successfully",

                                            data:
                                                messageResults[0],

                                        });

                                    }

                                );

                            }

                        );

                    }

                );

            }

        );

    }

);


// =====================================================
// UNSEND MESSAGE
// NEW FUNCTIONALITY
// =====================================================

router.delete(
    "/:messageId",
    verifyToken,
    (req, res) => {

        const currentUserId =
            Number(req.user.id);

        const messageId =
            Number(req.params.messageId);


        // =====================================================
        // VALIDATE MESSAGE ID
        // =====================================================

        if (!messageId) {

            return res.status(400).json({

                success: false,

                message:
                    "Message ID is required",

            });

        }


        // =====================================================
        // GET MESSAGE
        // =====================================================

        const getMessageQuery = `
            SELECT
                id,
                conversation_id,
                sender_id,
                message,
                message_type
            FROM messages
            WHERE id = ?
        `;


        db.query(

            getMessageQuery,

            [messageId],

            (err, results) => {

                if (err) {

                    console.error(
                        "GET MESSAGE FOR UNSEND ERROR:",
                        err
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to find message",

                        error:
                            err.message,

                    });

                }


                // =====================================================
                // MESSAGE NOT FOUND
                // =====================================================

                if (
                    results.length === 0
                ) {

                    return res.status(404).json({

                        success: false,

















































                        message:
                            "Message not found",

                    });

                }


                const message =
                    results[0];


                // =====================================================
                // ONLY SENDER CAN UNSEND
                // =====================================================

                if (
                    Number(message.sender_id) !==
                    currentUserId
                ) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "You can only unsend your own messages",

                    });

                }


                // =====================================================
                // DELETE MESSAGE
                // =====================================================

                const deleteMessageQuery = `
                    DELETE FROM messages
                    WHERE id = ?
                    AND sender_id = ?
                `;


                db.query(

                    deleteMessageQuery,

                    [
                        messageId,
                        currentUserId,
                    ],

                    (deleteErr, deleteResult) => {

                        if (deleteErr) {

                            console.error(
                                "DELETE MESSAGE ERROR:",
                                deleteErr
                            );


                            return res.status(500).json({

                                success: false,

                                message:
                                    "Failed to unsend message",

                                error:
                                    deleteErr.message,

                            });

                        }


                        if (
                            deleteResult.affectedRows === 0
                        ) {

                            return res.status(404).json({

                                success: false,

                                message:
                                    "Message could not be unsent",

                            });

                        }


                        // =====================================================
                        // DELETE VOICE FILE
                        // =====================================================

                        if (
                            message.message_type ===
                                "voice" &&
                            message.message
                        ) {

                            const voiceFilePath =
                                path.join(
                                    __dirname,
                                    "..",
                                    message.message.replace(
                                        /^\/+/,
                                        ""
                                    )
                                );


                            if (
                                fs.existsSync(
                                    voiceFilePath
                                )
                            ) {

                                fs.unlink(
                                    voiceFilePath,
                                    (fileErr) => {

                                        if (fileErr) {

                                            console.error(
                                                "VOICE FILE DELETE ERROR:",
                                                fileErr
                                            );

                                        }

                                    }
                                );

                            }

                        }


                        // =====================================================
                        // UPDATE LAST MESSAGE TIME
                        // =====================================================

                        const updateLastMessageQuery = `
                            UPDATE conversations
                            SET last_message_at = (
                                SELECT MAX(created_at)
                                FROM messages
                                WHERE conversation_id = ?
                            )
                            WHERE id = ?
                        `;


                        db.query(

                            updateLastMessageQuery,

                            [
                                message.conversation_id,
                                message.conversation_id,
                            ],

                            (updateErr) => {

                                if (updateErr) {

                                    console.error(
                                        "UPDATE LAST MESSAGE AFTER UNSEND ERROR:",
                                        updateErr
                                    );

                                }


                                // =====================================================
                                // RESPONSE
                                // =====================================================

                                return res.status(200).json({

                                    success: true,

                                    message:
                                        "Message unsent successfully",

                                    data: {

                                        messageId:
                                            messageId,

                                        conversationId:
                                            message.conversation_id,

                                    },

                                });

                            }

                        );

                    }

                );

            }

        );

    }

);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;