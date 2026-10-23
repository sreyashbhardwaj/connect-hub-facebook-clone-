const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
    sendRequest,
    getRequests,
    acceptRequest,
    rejectRequest,
    getFriends
} = require("../controllers/friendController");

// All friend routes require authentication

// Send a friend request
router.post(
    "/request/:id",                                                 
    verifyToken,
    sendRequest
);

// Get received friend requests
router.get(
    "/requests",
    verifyToken,
    getRequests
);

// Accept a friend request
router.put(
    "/accept/:id",
    verifyToken,
    acceptRequest
);

// Reject a friend request
router.put(
    "/reject/:id",
    verifyToken,
    rejectRequest
);

// Get accepted friends
router.get(
    "/",
    verifyToken,
    getFriends
);

module.exports = router;