const express = require("express");
const router = express.Router();

const {
    register,
    login,
    verifyOTP,
    resendOTP
} = require("../controllers/authController");

// Registration API
router.post("/register", register);

// Email OTP verification API
router.post("/verify-otp", verifyOTP);

// Resend OTP API
router.post("/resend-otp", resendOTP);

// Login API
router.post("/login", login);

module.exports = router;