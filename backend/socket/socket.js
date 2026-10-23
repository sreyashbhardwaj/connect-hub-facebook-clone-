

module.exports = function initializeSocket(io, db) {
  // Store active sockets for each user.
  // Supports multiple tabs and browser windows.
  const userSockets = new Map();
  const socketUsers = new Map();

  // ==================== PRESENCE HELPERS ====================

  function addUserSocket(userId, socketId) {
    const key = String(userId);

    if (!userSockets.has(key)) {
      userSockets.set(key, new Set());
    }

    userSockets.get(key).add(socketId);
    socketUsers.set(socketId, key);
  }

  function removeUserSocket(socketId) {
    const userId = socketUsers.get(socketId);

    if (!userId) {
      return null;
    }

    const sockets = userSockets.get(userId);

    if (sockets) {
      sockets.delete(socketId);

      if (sockets.size === 0) {
        userSockets.delete(userId);
      }
    }

    socketUsers.delete(socketId);
    return userId;
  }

  function getOnlineUserIds() {
    return Array.from(userSockets.keys()).map(Number);
  }

  function emitToUser(userId, event, payload) {
    const sockets = userSockets.get(String(userId));

    if (!sockets || sockets.size === 0) {
      return false;
    }

    for (const socketId of sockets) {
      io.to(socketId).emit(event, payload);
    }

    return true;
  }

  // Check whether a user belongs to a conversation.
  function isConversationMember(conversationId, userId, callback) {
    const query = `
      SELECT id
      FROM conversations
      WHERE id = ?
        AND (user1_id = ? OR user2_id = ?)
      LIMIT 1
    `;

    db.query(query, [conversationId, userId, userId], (error, rows) => {
      if (error) {
        console.error("Conversation membership check failed:", error);
        return callback(error, false);
      }

      callback(null, rows.length > 0);
    });
  }

  // Broadcast updated call records only to the relevant chat room.
  function sendCallHistoryToConversation(conversationId, callRecord) {
    io.to(`conversation:${conversationId}`).emit(
      "callHistoryUpdated",
      callRecord
    );
  }

  // ==================== SOCKET.IO ====================

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // ==================== USER PRESENCE ====================

    socket.on("registerCallUser", (data = {}) => {
      const { userId, name } = data;
      const id = Number(userId);

      if (
        userId === undefined ||
        userId === null ||
        String(userId).trim() === "" ||
        !Number.isSafeInteger(id) ||
        id <= 0
      ) {
        console.log("[PRESENCE] Invalid user ID received:", userId);
        return;
      }

      const previousUserId = socketUsers.get(socket.id);

      // Avoid duplicate registration on the same socket.
      if (previousUserId === String(id)) {
        socket.emit("onlineUsers", {
          userIds: getOnlineUserIds(),
        });

        return;
      }

      // Handle a socket registered to a different user.
      if (previousUserId) {
        removeUserSocket(socket.id);

        if (!userSockets.has(previousUserId)) {
          io.emit("userOffline", {
            userId: Number(previousUserId),
          });
        }
      }

      const wasOnline = userSockets.has(String(id));

      addUserSocket(id, socket.id);

      socket.data.callUserId = id;
      socket.data.callUserName =
        typeof name === "string" && name.trim()
          ? name.trim().slice(0, 100)
          : "ConnectHub user";

      console.log(
        `[PRESENCE] Registered user ${id} on socket ${socket.id}. ` +
          `Active sockets: ${userSockets.get(String(id)).size}`
      );

      // Broadcast only when the user changes from offline to online.
      if (!wasOnline) {
        io.emit("userOnline", {
          userId: id,
        });
      }

      socket.emit("onlineUsers", {
        userIds: getOnlineUserIds(),
      });

      console.log(
        `[PRESENCE] Sent online users to ${id}:`,
        getOnlineUserIds()
      );
    });

    // ==================== EXISTING CHAT ====================

    socket.on("joinConversation", (conversationId) => {
      const chatId = Number(conversationId);
      const userId = socket.data.callUserId;

      if (
        !userId ||
        !Number.isSafeInteger(chatId) ||
        chatId <= 0
      ) {
        return;
      }

      isConversationMember(chatId, userId, (error, isMember) => {
        if (error || !isMember) {
          console.log("User cannot join this conversation:", chatId);
          return;
        }

        const room = `conversation:${chatId}`;

        socket.join(room);

        console.log(`Socket ${socket.id} joined ${room}`);
      });
    });

    // ==================== CALL HISTORY: RETRIEVE ====================

    socket.on("getCallHistory", ({ conversationId } = {}) => {
      const userId = socket.data.callUserId;
      const chatId = Number(conversationId);

      if (
        !userId ||
        !Number.isSafeInteger(chatId) ||
        chatId <= 0
      ) {
        return;
      }

      isConversationMember(chatId, userId, (membershipError, isMember) => {
        if (membershipError || !isMember) {
          socket.emit("callHistory", []);
          return;
        }

        const query = `
          SELECT
            id,
            call_id,
            conversation_id,
            caller_id,
            receiver_id,
            call_type,
            call_status,
            started_at,
            answered_at,
            ended_at,
            duration_seconds
          FROM call_history
          WHERE conversation_id = ?
          ORDER BY started_at ASC, id ASC
        `;

        db.query(query, [chatId], (error, rows) => {
          if (error) {
            console.error("Fetch call history failed:", error);

            socket.emit("callHistoryError", {
              message: "Could not load call history.",
            });

            return;
          }

          socket.emit("callHistory", rows);
        });
      });
    });

    // ==================== CALL HISTORY: SAVE / UPDATE ====================

    socket.on("saveCallHistory", (data = {}) => {
      const currentUserId = socket.data.callUserId;

      const callId =
        typeof data.callId === "string" ? data.callId.trim() : "";

      const conversationId = Number(data.conversationId);
      const callerId = Number(data.callerId);
      const receiverId = Number(data.receiverId);

      const callType = data.callType === "video" ? "video" : "audio";

      const allowedStatuses = [
        "ringing",
        "connecting",
        "connected",
        "completed",
        "missed",
        "rejected",
        "failed",
      ];

      const callStatus = allowedStatuses.includes(data.callStatus)
        ? data.callStatus
        : null;

      const durationSeconds = Math.max(
        0,
        Math.floor(Number(data.durationSeconds) || 0)
      );

      if (
        !currentUserId ||
        !callId ||
        callId.length > 100 ||
        !Number.isSafeInteger(conversationId) ||
        conversationId <= 0 ||
        !Number.isSafeInteger(callerId) ||
        callerId <= 0 ||
        !Number.isSafeInteger(receiverId) ||
        receiverId <= 0 ||
        callerId === receiverId ||
        (currentUserId !== callerId && currentUserId !== receiverId) ||
        !callStatus
      ) {
        socket.emit("callHistoryError", {
          message: "Invalid call-history information.",
        });

        return;
      }

      isConversationMember(
        conversationId,
        currentUserId,
        (membershipError, isMember) => {
          if (membershipError || !isMember) {
            socket.emit("callHistoryError", {
              message: "You are not a member of this conversation.",
            });

            return;
          }

          // Verify that both participants belong to this conversation.
          const participantsQuery = `
            SELECT id
            FROM conversations
            WHERE id = ?
              AND (
                (user1_id = ? AND user2_id = ?)
                OR
                (user1_id = ? AND user2_id = ?)
              )
            LIMIT 1
          `;

          db.query(
            participantsQuery,
            [
              conversationId,
              callerId,
              receiverId,
              receiverId,
              callerId,
            ],
            (participantsError, participantRows) => {
              if (participantsError || !participantRows.length) {
                if (participantsError) {
                  console.error(
                    "Call participant validation failed:",
                    participantsError
                  );
                }

                socket.emit("callHistoryError", {
                  message: "Call participants do not match this chat.",
                });

                return;
              }

              const saveQuery = `
                INSERT INTO call_history (
                  call_id,
                  conversation_id,
                  caller_id,
                  receiver_id,
                  call_type,
                  call_status,
                  started_at,
                  answered_at,
                  ended_at,
                  duration_seconds
                )
                VALUES (
                  ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP,
                  IF(
                    ? IN ('connected', 'completed'),
                    CURRENT_TIMESTAMP,
                    NULL
                  ),
                  IF(
                    ? IN ('completed', 'missed', 'rejected', 'failed'),
                    CURRENT_TIMESTAMP,
                    NULL
                  ),
                  ?
                )
                ON DUPLICATE KEY UPDATE
                  call_status = VALUES(call_status),
                  answered_at = IF(
                    VALUES(call_status) IN ('connected', 'completed'),
                    COALESCE(answered_at, CURRENT_TIMESTAMP),
                    answered_at
                  ),
                  ended_at = IF(
                    VALUES(call_status) IN (
                      'completed', 'missed', 'rejected', 'failed'
                    ),
                    COALESCE(ended_at, CURRENT_TIMESTAMP),
                    ended_at
                  ),
                  duration_seconds = GREATEST(
                    duration_seconds,
                    VALUES(duration_seconds)
                  )
              `;

              db.query(
                saveQuery,
                [
                  callId,
                  conversationId,
                  callerId,
                  receiverId,
                  callType,
                  callStatus,
                  callStatus,
                  callStatus,
                  durationSeconds,
                ],
                (saveError) => {
                  if (saveError) {
                    console.error("Save call history failed:", saveError);

                    socket.emit("callHistoryError", {
                      message: "Could not save call history.",
                    });

                    return;
                  }

                  const fetchQuery = `
                    SELECT
                      id,
                      call_id,
                      conversation_id,
                      caller_id,
                      receiver_id,
                      call_type,
                      call_status,
                      started_at,
                      answered_at,
                      ended_at,
                      duration_seconds
                    FROM call_history
                    WHERE call_id = ?
                    LIMIT 1
                  `;

                  db.query(fetchQuery, [callId], (fetchError, rows) => {
                    if (fetchError || !rows.length) {
                      console.error(
                        "Read saved call history failed:",
                        fetchError
                      );

                      return;
                    }

                   
  const callRecord = rows[0];

  // Update the conversation room.
  sendCallHistoryToConversation(
    conversationId,
    callRecord
  );

  // Notify both users, even if they are on another page.
  emitToUser(callerId, "callHistoryUpdated", callRecord);
  emitToUser(receiverId, "callHistoryUpdated", callRecord);

                  });
                }
              );
            }
          );
        }
      );
    });

    // ==================== EXISTING SEND MESSAGE ====================

    socket.on("sendMessage", (data) => {
      const { conversationId, senderId, message } = data || {};

      if (
        !conversationId ||
        !senderId ||
        typeof message !== "string" ||
        !message.trim()
      ) {
        console.log("Invalid message data");
        return;
      }

      // Use the registered socket user instead of trusting senderId.
      const currentUserId = socket.data.callUserId;

      if (!currentUserId || Number(senderId) !== currentUserId) {
        console.log("Message sender does not match registered user");
        return;
      }

      const checkConversationQuery = `
        SELECT id
        FROM conversations
        WHERE id = ?
          AND (user1_id = ? OR user2_id = ?)
      `;

      db.query(
        checkConversationQuery,
        [conversationId, currentUserId, currentUserId],
        (err, results) => {
          if (err) {
            console.error("Conversation check error:", err);
            return;
          }

          if (!results.length) {
            console.log("User is not part of conversation");
            return;
          }

          const insertMessageQuery = `
            INSERT INTO messages
              (conversation_id, sender_id, message)
            VALUES (?, ?, ?)
          `;

          db.query(
            insertMessageQuery,
            [conversationId, currentUserId, message.trim()],
            (insertErr, result) => {
              if (insertErr) {
                console.error("Save message error:", insertErr);
                return;
              }

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
                (getErr, messageResult) => {
                  if (getErr) {
                    console.error("Get message error:", getErr);
                    return;
                  }

                  const savedMessage = messageResult[0];

                  io.to(`conversation:${conversationId}`).emit(
                    "newMessage",
                    savedMessage
                  );

                  console.log("Real-time message:", savedMessage);
                }
              );
            }
          );
        }
      );
    });

    // ==================== EXISTING UNSEND MESSAGE ====================

    socket.on("unsendMessage", (data) => {
      const { conversationId, messageId, senderId } = data || {};
      const currentUserId = socket.data.callUserId;

      if (
        !currentUserId ||
        !conversationId ||
        !messageId ||
        Number(senderId) !== currentUserId
      ) {
        console.log("Invalid unsend message data");
        return;
      }

      const checkMessageQuery = `
        SELECT id, conversation_id, sender_id
        FROM messages
        WHERE id = ?
          AND conversation_id = ?
          AND sender_id = ?
      `;

      db.query(
        checkMessageQuery,
        [messageId, conversationId, currentUserId],
        (err, results) => {
          if (err) {
            console.error("Unsend message check error:", err);
            return;
          }

          if (!results.length) {
            console.log("Message not found or user is not the sender");
            return;
          }

          io.to(`conversation:${conversationId}`).emit(
            "messageUnsent",
            {
              messageId: Number(messageId),
            }
          );

          console.log(`Message ${messageId} marked for unsend`);
        }
      );
    });

    // ==================== EXISTING CALL SIGNALING ====================

    socket.on("callUser", (data = {}) => {
      const fromUserId = socket.data.callUserId;
      const targetUserId = Number(data.targetUserId);
      const conversationId = Number(data.conversationId);
      const callType = data.callType === "video" ? "video" : "audio";

      if (
        !fromUserId ||
        !Number.isSafeInteger(targetUserId) ||
        targetUserId <= 0 ||
        targetUserId === fromUserId ||
        !Number.isSafeInteger(conversationId) ||
        conversationId <= 0
      ) {
        socket.emit("callError", {
          message:
            "This call could not be started. Open a valid chat and try again.",
        });

        return;
      }

      // Verify both users belong to the same conversation.
      const participantsQuery = `
        SELECT id
        FROM conversations
        WHERE id = ?
          AND (
            (user1_id = ? AND user2_id = ?)
            OR
            (user1_id = ? AND user2_id = ?)
          )
        LIMIT 1
      `;

      db.query(
        participantsQuery,
        [
          conversationId,
          fromUserId,
          targetUserId,
          targetUserId,
          fromUserId,
        ],
        (conversationError, rows) => {
          if (conversationError || !rows.length) {
            if (conversationError) {
              console.error(
                "Call conversation validation failed:",
                conversationError
              );
            }

            socket.emit("callError", {
              message: "You can only call the friend in this conversation.",
            });

            return;
          }

          const payload = {
            fromUserId,
            fromName: socket.data.callUserName || "ConnectHub user",
            targetUserId,
            callType,
            conversationId,
            callId: `${fromUserId}-${targetUserId}-${Date.now()}`,
          };

          if (!emitToUser(targetUserId, "incomingCall", payload)) {
            console.log(
              `[CALL] User ${targetUserId} is offline/not registered; ` +
                `caller ${fromUserId} cannot reach them.`
            );

            socket.emit("callUnavailable", {
              message:
                "Your friend is not connected to calling. " +
                "Ask them to log in and keep ConnectHub open.",
            });

            return;
          }

          console.log(
            `[CALL] Ringing user ${targetUserId} for ${callType} call ${payload.callId}.`
          );

          socket.emit("callRinging", {
            callId: payload.callId,
            targetUserId,
            callType,
            conversationId,
          });

          socket.data.activeCall = {
            peerUserId: targetUserId,
            callId: payload.callId,
            conversationId,
          };
        }
      );
    });

    socket.on(
      "acceptCall",
      ({ fromUserId, callId, callType, conversationId } = {}) => {
        const currentUserId = socket.data.callUserId;
        const callerId = Number(fromUserId);

        if (
          !currentUserId ||
          !Number.isSafeInteger(callerId) ||
          callerId <= 0 ||
          !callId
        ) {
          return;
        }

        const payload = {
          fromUserId: currentUserId,
          targetUserId: callerId,
          callId,
          callType: callType === "video" ? "video" : "audio",
          conversationId: Number(conversationId) || undefined,
        };

        const delivered = emitToUser(
          callerId,
          "callAccepted",
          payload
        );

        if (!delivered) {
          socket.emit("callError", {
            message: "The caller has disconnected.",
          });
        }

        socket.data.activeCall = {
          peerUserId: callerId,
          callId,
          conversationId: Number(conversationId) || undefined,
        };
      }
    );

    socket.on("rejectCall", ({ fromUserId, callId } = {}) => {
      const currentUserId = socket.data.callUserId;
      const callerId = Number(fromUserId);

      if (
        currentUserId &&
        Number.isSafeInteger(callerId) &&
        callerId > 0 &&
        callId
      ) {
        emitToUser(callerId, "callRejected", {
          fromUserId: currentUserId,
          callId,
        });
      }

      socket.data.activeCall = null;
    });

    socket.on("webrtcOffer", ({ targetUserId, callId, offer } = {}) => {
      if (
        !socket.data.callUserId ||
        !targetUserId ||
        !callId ||
        !offer
      ) {
        return;
      }

      emitToUser(targetUserId, "webrtcOffer", {
        fromUserId: socket.data.callUserId,
        callId,
        offer,
      });
    });

    socket.on("webrtcAnswer", ({ targetUserId, callId, answer } = {}) => {
      if (
        !socket.data.callUserId ||
        !targetUserId ||
        !callId ||
        !answer
      ) {
        return;
      }

      emitToUser(targetUserId, "webrtcAnswer", {
        fromUserId: socket.data.callUserId,
        callId,
        answer,
      });
    });

    socket.on(
      "iceCandidate",
      ({ targetUserId, callId, candidate } = {}) => {
        if (
          !socket.data.callUserId ||
          !targetUserId ||
          !callId ||
          !candidate
        ) {
          return;
        }

        emitToUser(targetUserId, "iceCandidate", {
          fromUserId: socket.data.callUserId,
          callId,
          candidate,
        });
      }
    );

    socket.on("endCall", ({ targetUserId, callId } = {}) => {
      const peerUserId = Number(
        targetUserId || socket.data.activeCall?.peerUserId
      );

      if (socket.data.callUserId && peerUserId) {
        emitToUser(peerUserId, "callEnded", {
          fromUserId: socket.data.callUserId,
          callId,
        });
      }

      socket.data.activeCall = null;
    });

    // ==================== DISCONNECT / PRESENCE ====================

    socket.on("disconnect", () => {
      const registeredUserId = socketUsers.get(socket.id);

      removeUserSocket(socket.id);

      if (registeredUserId) {
        const remainingSockets =
          userSockets.get(registeredUserId)?.size || 0;

        console.log(
          `[PRESENCE] User ${registeredUserId} disconnected. ` +
            `Remaining sockets: ${remainingSockets}`
        );

        // Mark offline only when the last socket disconnects.
        if (remainingSockets === 0) {
          io.emit("userOffline", {
            userId: Number(registeredUserId),
          });
        }
      } else {
        console.log("A user disconnected:", socket.id);
      }
    });
  });

};
