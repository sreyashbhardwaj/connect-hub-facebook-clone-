const express = require("express");
const router = express.Router();

const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");
const fs = require("fs");


// ======================================================
// PROFILE IMAGE UPLOAD CONFIGURATION
// ======================================================

// Create:
// backend/uploads/profiles

const uploadDirectory = path.join(
    __dirname,
    "../uploads/profiles"
);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true,
    });
}


// ======================================================
// MULTER STORAGE
// ======================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, uploadDirectory);

    },

    filename: (req, file, cb) => {

        const extension = path.extname(
            file.originalname
        ).toLowerCase();

        const filename =
            `profile-${req.user.id}-${Date.now()}${extension}`;

        cb(null, filename);

    },

});


// ======================================================
// IMAGE FILE VALIDATION
// ======================================================

const fileFilter = (req, file, cb) => {

    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Only JPG, JPEG, PNG and WEBP images are allowed."
            ),
            false
        );

    }

};


// ======================================================
// MULTER CONFIGURATION
// ======================================================

const upload = multer({

    storage: storage,

    fileFilter: fileFilter,

    limits: {
        fileSize: 5 * 1024 * 1024,
    },

});


// ======================================================
// MULTER ERROR HANDLER
// ======================================================

const uploadProfileImage = (req, res, next) => {

    upload.single("profile_picture")(
        req,
        res,
        (err) => {

            if (err instanceof multer.MulterError) {

                if (err.code === "LIMIT_FILE_SIZE") {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Profile image must be less than 5MB.",
                    });

                }

                return res.status(400).json({
                    success: false,
                    message: err.message,
                });

            }

            if (err) {

                return res.status(400).json({
                    success: false,
                    message: err.message,
                });

            }

            next();

        }
    );

};


// ======================================================
// GET LOGGED-IN USER PROFILE
// GET /api/profile
// ======================================================

router.get(
    "/",
    authMiddleware,
    (req, res) => {

        const userId = req.user.id;

        const sql = `
            SELECT
                id,
                name,
                email,
                profile_picture,
                bio,
                created_at
            FROM users
            WHERE id = ?
        `;

        db.query(
            sql,
            [userId],
            (err, results) => {

                if (err) {

                    console.error(
                        "Profile fetch error:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to fetch profile.",
                    });

                }

                if (results.length === 0) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "User not found.",
                    });

                }

                return res.status(200).json({

                    success: true,

                    user: results[0],

                });

            }
        );

    }
);


// ======================================================
// UPDATE PROFILE
// PUT /api/profile
//
// Supports:
// - name
// - bio
// - profile_picture
// ======================================================

router.put(
    "/",
    authMiddleware,
    uploadProfileImage,
    (req, res) => {

        const userId = req.user.id;

        const name =
            req.body.name !== undefined
                ? req.body.name.trim()
                : undefined;

        const bio =
            req.body.bio !== undefined
                ? req.body.bio.trim()
                : undefined;


        // --------------------------------------------------
        // PROFILE IMAGE PATH
        // --------------------------------------------------

        let profilePicture;

        if (req.file) {

            profilePicture =
                `/uploads/profiles/${req.file.filename}`;

        }


        // --------------------------------------------------
        // CHECK IF ANYTHING WAS PROVIDED
        // --------------------------------------------------

        if (
            name === undefined &&
            bio === undefined &&
            profilePicture === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Please provide at least one field to update.",
            });

        }


        // --------------------------------------------------
        // VALIDATE NAME
        // --------------------------------------------------

        if (
            name !== undefined &&
            !name
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Name cannot be empty.",
            });

        }


        // --------------------------------------------------
        // VALIDATE BIO
        // --------------------------------------------------

        if (
            bio !== undefined &&
            typeof bio !== "string"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Bio must be text.",
            });

        }


        // --------------------------------------------------
        // BUILD UPDATE QUERY
        // --------------------------------------------------

        const fields = [];
        const values = [];


        if (name !== undefined) {

            fields.push("name = ?");
            values.push(name);

        }


        if (bio !== undefined) {

            fields.push("bio = ?");
            values.push(bio);

        }


        if (profilePicture !== undefined) {

            fields.push(
                "profile_picture = ?"
            );

            values.push(profilePicture);

        }


        values.push(userId);


        const sql = `
            UPDATE users
            SET ${fields.join(", ")}
            WHERE id = ?
        `;


        // --------------------------------------------------
        // UPDATE DATABASE
        // --------------------------------------------------

        db.query(
            sql,
            values,
            (err, result) => {

                if (err) {

                    console.error(
                        "Profile update error:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to update profile.",
                    });

                }


                if (
                    result.affectedRows === 0
                ) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "User not found.",
                    });

                }


                // --------------------------------------------------
                // GET UPDATED PROFILE
                // --------------------------------------------------

                const fetchSql = `
                    SELECT
                        id,
                        name,
                        email,
                        profile_picture,
                        bio,
                        created_at
                    FROM users
                    WHERE id = ?
                `;


                db.query(
                    fetchSql,
                    [userId],
                    (fetchErr, results) => {

                        if (fetchErr) {

                            console.error(
                                "Updated profile fetch error:",
                                fetchErr
                            );

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Profile updated, but unable to fetch it.",
                            });

                        }


                        return res.status(200).json({

                            success: true,

                            message:
                                "Profile updated successfully.",

                            user: results[0],

                        });

                    }
                );

            }
        );

    }
);


// ======================================================
// VIEW ANOTHER USER'S PROFILE
// GET /api/profile/:id
// ======================================================

router.get(
    "/:id",
    authMiddleware,
    (req, res) => {

        const userId = Number(
            req.params.id
        );


        if (
            !Number.isInteger(userId) ||
            userId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid user ID.",
            });

        }


        const sql = `
            SELECT
                id,
                name,
                profile_picture,
                bio,
                created_at
            FROM users
            WHERE id = ?
        `;


        db.query(
            sql,
            [userId],
            (err, results) => {

                if (err) {

                    console.error(
                        "Public profile fetch error:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to fetch user profile.",
                    });

                }


                if (results.length === 0) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "User not found.",
                    });

                }


                return res.status(200).json({

                    success: true,

                    user: results[0],

                });

            }
        );

    }
);


module.exports = router;