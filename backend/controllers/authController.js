const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Gmail configuration
const mailUser = process.env.MAIL_USER;
const mailPass = process.env.EMAIL_PASS
    ? process.env.EMAIL_PASS.replace(/\s/g, "")
    : "";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: mailUser,
        pass: mailPass,
    },
});

// MySQL query helper
const query = (sql, values = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, values, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });

// Generate six-digit OTP
const generateOTP = () =>
    crypto.randomInt(100000, 1000000).toString();

// Send OTP email
const sendOTP = async (userId, email, name) => {
    if (!mailUser || !mailPass) {
        throw new Error(
            "Email configuration is missing. Set MAIL_USER and EMAIL_PASS in backend/.env."
        );
    }

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
        "DELETE FROM email_otps WHERE user_id = ?",
        [userId]
    );

    await query(
        `INSERT INTO email_otps (user_id, otp_hash, expires_at)
         VALUES (?, ?, ?)`,
        [userId, otpHash, expiresAt]
    );

    try {
        await transporter.sendMail({
            from: `"ConnectHub" <${mailUser}>`,
            to: email,
            subject: "ConnectHub Email Verification",
            text: `Hello ${name},

Your ConnectHub verification OTP is: ${otp}

This OTP will expire in 10 minutes.

If you did not create this account, you can ignore this email.`,
        });
    } catch (error) {
        await query(
            "DELETE FROM email_otps WHERE user_id = ?",
            [userId]
        );
        throw error;
    }
};

// REGISTER
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body || {};

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required.",
            });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedName || !normalizedEmail || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required.",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters.",
            });
        }

        const existingUsers = await query(
            "SELECT id, name, is_verified FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (existingUsers.length > 0) {
            const existingUser = existingUsers[0];

            if (Number(existingUser.is_verified) === 1) {
                return res.status(409).json({
                    success: false,
                    message: "Email already registered.",
                });
            }

            await sendOTP(
                existingUser.id,
                normalizedEmail,
                existingUser.name
            );

            return res.status(200).json({
                success: true,
                message: "A new OTP has been sent to your email.",
                userId: existingUser.id,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO users
             (name, email, password, is_verified)
             VALUES (?, ?, ?, 0)`,
            [normalizedName, normalizedEmail, hashedPassword]
        );

        await sendOTP(
            result.insertId,
            normalizedEmail,
            normalizedName
        );

        return res.status(201).json({
            success: true,
            message: "Registration successful. Please verify your email.",
            userId: result.insertId,
        });
    } catch (error) {
        console.error("Registration error:", error);

        if (
            error.code === "EAUTH" ||
            error.responseCode === 535
        ) {
            return res.status(502).json({
                success: false,
                message:
                    "Gmail rejected the email credentials. Check MAIL_USER and use a Google App Password in EMAIL_PASS.",
            });
        }

        if (
            error.message &&
            error.message.startsWith(
                "Email configuration is missing"
            )
        ) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Registration could not be completed. Please try again.",
        });
    }
};
// VERIFY REGISTRATION OTP
const verifyOTP = async (req, res) => {
    try {
        const { userId, otp } = req.body || {};

        if (!userId || !otp) {
            return res.status(400).json({
                success: false,
                message: "User ID and OTP are required.",
            });
        }

        if (!/^\d{6}$/.test(String(otp))) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid six-digit OTP.",
            });
        }

        const users = await query(
            "SELECT id, is_verified FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const user = users[0];

        if (Number(user.is_verified) === 1) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified.",
            });
        }

        const otpRecords = await query(
            `SELECT id, otp_hash, expires_at
             FROM email_otps
             WHERE user_id = ?
             ORDER BY id DESC
             LIMIT 1`,
            [userId]
        );

        if (otpRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new OTP.",
            });
        }

        const otpRecord = otpRecords[0];

        if (
            new Date(otpRecord.expires_at).getTime() <= Date.now()
        ) {
            await query(
                "DELETE FROM email_otps WHERE id = ?",
                [otpRecord.id]
            );

            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one.",
            });
        }

        const isMatch = await bcrypt.compare(
            String(otp),
            otpRecord.otp_hash
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect OTP.",
            });
        }

        await query(
            "UPDATE users SET is_verified = 1 WHERE id = ?",
            [userId]
        );

        await query(
            "DELETE FROM email_otps WHERE user_id = ?",
            [userId]
        );

        return res.status(200).json({
            success: true,
            message: "Email verified successfully. You can now log in.",
        });
    } catch (error) {
        console.error("OTP verification error:", error);

        return res.status(500).json({
            success: false,
            message: "OTP verification failed.",
        });
    }
};
// RESEND OTP
const resendOTP = async (req, res) => {
    try {
        const { userId } = req.body || {};

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required.",
            });
        }

        const users = await query(
            `SELECT id, name, email, is_verified
             FROM users
             WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const user = users[0];

        if (Number(user.is_verified) === 1) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified.",
            });
        }

        await sendOTP(
            user.id,
            user.email,
            user.name
        );

        return res.status(200).json({
            success: true,
            message: "A new OTP has been sent to your email.",
        });
    } catch (error) {
        console.error("Resend OTP error:", error);

        if (
            error.code === "EAUTH" ||
            error.responseCode === 535
        ) {
            return res.status(502).json({
                success: false,
                message:
                    "Gmail rejected the email credentials. Check MAIL_USER and use a Google App Password in EMAIL_PASS.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to resend OTP. Please try again.",
        });
    }
};
// LOGIN
const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required.",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const users = await query(
            "SELECT * FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        if (Number(user.is_verified) !== 1) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before logging in.",
                userId: user.id,
                requiresVerification: true,
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing");

            return res.status(500).json({
                success: false,
                message: "Server configuration error.",
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d",
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                profile_picture: user.profile_picture,
                bio: user.bio,
            },
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = {
    register,
    verifyOTP,
    resendOTP,
    login,
};