

import { useCallback, useEffect, useRef, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useSelector } from "react-redux";

import { io } from "socket.io-client";

import EmojiPicker from "emoji-picker-react";

import api from "../api/api";

import "./Chat.css";

import "./Chat_profile_click.css";

import CallModal from "../components/CallModal";

function Chat({ userId: propUserId, onClose }) {

  const navigate = useNavigate();

  const location = useLocation();

  const { userId: routeUserId } = useParams();

  const targetUserId = propUserId || routeUserId;

  const currentUser = useSelector((state) => state.auth.user);

  const socketRef = useRef(null);

  const mediaRecorderRef = useRef(null);

  const audioChunksRef = useRef([]);

  const mountedRef = useRef(true);

  const [friend, setFriend] = useState(null);

  const [isFriendOnline, setIsFriendOnline] = useState(false);

  const [conversationId, setConversationId] = useState(null);

  const [messages, setMessages] = useState([]);

  const [callHistory, setCallHistory] = useState([]);

  const [newMessage, setNewMessage] = useState("");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  const [profileImageFailed, setProfileImageFailed] = useState(false);

  const [isRecording, setIsRecording] = useState(false);

  const [recordingTime, setRecordingTime] = useState(0);

  const [callSession, setCallSession] = useState(null);

  const handleCloseChat = useCallback(() => {

    if (typeof onClose === "function") {

      onClose();

      return;

    }

    navigate(location.state?.from || "/friends", { replace: true });

  }, [onClose, navigate, location.state]);

  const getImageUrl = useCallback((picture) => {

    if (!picture) return "";

   if (/^https?:\/\//i.test(picture)) return picture;

    const serverUrl =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : `http://${window.location.hostname}:5000`;

return `${serverUrl}${picture.startsWith("/") ? "" : "/"}${picture}`;

  }, []);

  const friendImage = getImageUrl(friend?.profile_picture);

  useEffect(() => {

    mountedRef.current = true;

    return () => {

      mountedRef.current = false;

      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {

        try {

          recorder.stop();

        } catch (err) {

          console.warn("Could not stop recorder during cleanup:", err);

        }

      }

      if (socketRef.current) {

        socketRef.current.disconnect();

        socketRef.current = null;

      }

    };

  }, []);

  const fetchFriend = useCallback(async () => {

    const response = await api.get(`/profile/${targetUserId}`);

    const payload = response.data;

    const data =

      payload?.user ||

      payload?.profile ||

      payload?.data?.user ||

      payload?.data ||

      payload;

    if (!data || !data.id) {

      throw new Error("User profile was not returned by the server.");

    }

    if (mountedRef.current) {

      setFriend(data);

      setProfileImageFailed(false);

    }

  }, [targetUserId]);

  const getOrCreateConversation = useCallback(async () => {

    const response = await api.post("/conversations", {

      otherUserId: Number(targetUserId),

    });

    const id =

      response.data?.conversationId ||

      response.data?.conversation?.id ||

      response.data?.id;

    if (!id) {

      throw new Error(

        response.data?.message ||

          "Conversation ID was not returned by the server."

      );

    }

    if (mountedRef.current) setConversationId(id);

    return id;

  }, [targetUserId]);

  const fetchMessages = useCallback(async (id) => {

    const response = await api.get(`/messages/${id}`);

    const list =

      response.data?.messages ||

      response.data?.data?.messages ||

      [];

    if (mountedRef.current) {

      setMessages(Array.isArray(list) ? list : []);

    }

  }, []);

  useEffect(() => {

    if (!targetUserId) {

      setError("No user was selected for this chat.");

      setLoading(false);

      return undefined;

    }

    let cancelled = false;

    const loadChat = async () => {

      setLoading(true);

      setError("");

      setFriend(null);

      setConversationId(null);

      setMessages([]);

      setCallHistory([]);

      try {

        await fetchFriend();

        const id = await getOrCreateConversation();

        await fetchMessages(id);

      } catch (err) {

        console.error("Unable to load chat:", err);

        if (!cancelled && mountedRef.current) {

          setError(

            err.response?.data?.message ||

              err.message ||

              "Could not load this chat."

          );

        }

      } finally {

        if (!cancelled && mountedRef.current) {

          setLoading(false);

        }

      }

    };

    loadChat();

    return () => {

      cancelled = true;

    };

  }, [targetUserId, fetchFriend, getOrCreateConversation, fetchMessages]);

  // ==================== SOCKET CONNECTION ====================

  
useEffect(() => {
  if (!conversationId || !currentUser?.id) return undefined;

  
const SOCKET_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://vector-active-dictionaries-cards.trycloudflare.com";

  const socket = io(SOCKET_URL, {
    reconnection: true,
  });

  socketRef.current = socket;

    setIsFriendOnline(false);

    const handleConnect = () => {

      console.log("[PRESENCE] Socket connected:", socket.id);

      console.log("[PRESENCE] Registering current user ID:", currentUser.id);

      socket.emit("registerCallUser", {

        userId: Number(currentUser.id),

        name: currentUser.name || currentUser.username || "ConnectHub user",

      });

      socket.emit("joinConversation", Number(conversationId));

      socket.emit("getCallHistory", {

        conversationId: Number(conversationId),

      });

    };

    const handleOnlineUsers = (payload = {}) => {

      const userIds = Array.isArray(payload.userIds)

        ? payload.userIds

        : [];

      console.log("[PRESENCE] Online users received:", userIds);

      console.log("[PRESENCE] Friend/target ID:", targetUserId);

      const online = userIds.some(

        (id) => String(id) === String(targetUserId)

      );

      setIsFriendOnline(online);

    };

    const handleUserOnline = (payload = {}) => {

      console.log("[PRESENCE] userOnline event received:", payload);

      if (String(payload.userId) === String(targetUserId)) {

        setIsFriendOnline(true);

      }

    };

    const handleUserOffline = (payload = {}) => {

      console.log("[PRESENCE] userOffline event received:", payload);

      if (String(payload.userId) === String(targetUserId)) {

        setIsFriendOnline(false);

      }

    };

    const handleIncomingCall = (call) => {

      if (Number(call.fromUserId) === Number(currentUser.id)) return;

      if (Number(call.conversationId) !== Number(conversationId)) {

        return;

      }

      setCallSession({

        ...call,

        direction: "incoming",

        status: "ringing",

      });

    };

    const handleCallRinging = (call) => {

      setCallSession((previous) =>

        previous

          ? {

              ...previous,

              ...call,

              direction: "outgoing",

              status: "calling",

            }

          : previous

      );

    };

    const handleCallAccepted = (call) => {

      setCallSession((previous) =>

        previous

          ? { ...previous, ...call, status: "connecting" }

          : previous

      );

    };

    const handleCallRejected = () => {

      setCallSession((previous) =>

        previous ? { ...previous, status: "rejected" } : previous

      );

    };

    const handleCallEnded = () => {

      setCallSession((previous) =>

        previous ? { ...previous, status: "ended" } : previous

      );

    };

    const handleCallHistory = (records) => {

      if (!Array.isArray(records)) return;

      setCallHistory(

        records.filter(

          (record) =>

            Number(record.conversation_id ?? record.conversationId) === Number(conversationId)

        )

      );

    };

    const handleCallHistoryError = (payload) => {

      console.error("Call history error:", payload?.message || payload);

    };

    const handleCallHistoryUpdated = (record) => {

      if (

        !record ||

        Number(record.conversation_id ?? record.conversationId) !== Number(conversationId)

      ) {

        return;

      }

      setCallHistory((previous) => {

        const exists = previous.some(

          (item) => String(item.call_id) === String(record.call_id)

        );

        const updated = exists

          ? previous.map((item) =>

              String(item.call_id) === String(record.call_id) ? { ...item, ...record } : item

            )

          : [...previous, record];

        return updated.sort(

          (a, b) =>

            new Date(a.started_at).getTime() -

            new Date(b.started_at).getTime()

        );

      });

    };

    socket.on("connect", handleConnect);

    socket.on("onlineUsers", handleOnlineUsers);

    socket.on("userOnline", handleUserOnline);

    socket.on("userOffline", handleUserOffline);

    socket.on("incomingCall", handleIncomingCall);

    socket.on("callRinging", handleCallRinging);

    socket.on("callAccepted", handleCallAccepted);

    socket.on("callRejected", handleCallRejected);

    socket.on("callEnded", handleCallEnded);

    socket.on("callHistory", handleCallHistory);

    socket.on("callHistoryUpdated", handleCallHistoryUpdated);

    socket.on("callHistoryError", handleCallHistoryError);

    if (socket.connected) {

      handleConnect();

    }

    const handleNewMessage = (message) => {

      if (Number(message.conversation_id) !== Number(conversationId)) {

        return;

      }

      setMessages((previous) => {

        if (

          previous.some(

            (item) => Number(item.id) === Number(message.id)

          )

        ) {

          return previous;

        }

        return [...previous, message];

      });

    };

    const handleMessageUnsent = ({ messageId }) => {

      setMessages((previous) =>

        previous.filter(

          (item) => Number(item.id) !== Number(messageId)

        )

      );

    };

    socket.on("newMessage", handleNewMessage);

    socket.on("messageUnsent", handleMessageUnsent);

    return () => {

      socket.off("connect", handleConnect);

      socket.off("onlineUsers", handleOnlineUsers);

      socket.off("userOnline", handleUserOnline);

      socket.off("userOffline", handleUserOffline);

      socket.off("incomingCall", handleIncomingCall);

      socket.off("callRinging", handleCallRinging);

      socket.off("callAccepted", handleCallAccepted);

      socket.off("callRejected", handleCallRejected);

      socket.off("callEnded", handleCallEnded);

      socket.off("callHistory", handleCallHistory);

      socket.off("callHistoryUpdated", handleCallHistoryUpdated);

      socket.off("callHistoryError", handleCallHistoryError);

      socket.off("newMessage", handleNewMessage);

      socket.off("messageUnsent", handleMessageUnsent);

      socket.disconnect();

      if (socketRef.current === socket) {

        socketRef.current = null;

      }

    };

  }, [

    conversationId,

    currentUser?.id,

    currentUser?.name,

    currentUser?.username,

    targetUserId,

  ]);

  // ==================== SEND TEXT MESSAGE ====================

  const handleSendMessage = async (event) => {

    event.preventDefault();

    const text = newMessage.trim();

    if (

      !text ||

      !conversationId ||

      !currentUser?.id ||

      !socketRef.current?.connected ||

      sending

    ) {

      return;

    }

    setSending(true);

    setError("");

    try {

      socketRef.current.emit("sendMessage", {

        conversationId,

        senderId: currentUser.id,

        message: text,

      });

      setNewMessage("");

      setShowEmojiPicker(false);

    } catch (err) {

      console.error("Could not send message:", err);

      setError("Could not send message. Please try again.");

    } finally {

      setSending(false);

    }

  };

  const handleKeyDown = (event) => {

    if (event.key === "Enter" && !event.shiftKey) {

      event.preventDefault();

      handleSendMessage(event);

    }

  };

  // ==================== VOICE RECORDING ====================
const handleVoiceRecording = async () => {
  // Stop the current recording when the button is clicked again
  if (isRecording) {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    return;
  }

  let stream;

  try {
    if (!conversationId) {
      alert("Please open a conversation first.");
      return;
    }

    stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    // Select a recording format supported by this browser
    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ].find((type) => MediaRecorder.isTypeSupported(type));

    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onerror = (event) => {
      console.error("Voice recording error:", event.error);
      setIsRecording(false);
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.onstop = async () => {
      setIsRecording(false);
      stream.getTracks().forEach((track) => track.stop());

      try {
        const actualMimeType =
          recorder.mimeType || mimeType || "audio/webm";

        const audioBlob = new Blob(audioChunksRef.current, {
          type: actualMimeType,
        });

        audioChunksRef.current = [];

        if (!audioBlob.size) {
          console.error("The recorded audio is empty.");
          return;
        }

        const extension = actualMimeType.includes("ogg")
          ? "ogg"
          : actualMimeType.includes("mp4")
          ? "mp4"
          : actualMimeType.includes("wav")
          ? "wav"
          : "webm";

        const formData = new FormData();

        formData.append(
          "voice",
          audioBlob,
          `voice-${Date.now()}.${extension}`
        );
        formData.append("conversationId", conversationId);

        setSending(true);

        const response = await api.post(
          "/messages/voice",
          formData
        );

        const savedMessage =
          response.data?.data || response.data?.message;

        if (savedMessage && typeof savedMessage === "object") {
          setMessages((previousMessages) => [
            ...previousMessages,
            savedMessage,
          ]);
        } else {
          // If your existing component uses a different message
          // fetching function, keep that existing refresh call here.
          console.warn("Voice message saved; refresh the conversation.");
        }
      } catch (error) {
        console.error(
          "Failed to send voice message:",
          error.response?.data || error
        );
        alert(
          error.response?.data?.message ||
            "Unable to send voice message. Please try again."
        );
      } finally {
        setSending(false);
      }
    };

    recorder.start(1000);
    setIsRecording(true);
  } catch (error) {
    console.error("Unable to start voice recording:", error);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    setIsRecording(false);
    alert("Please allow microphone access and try again.");
  }
};

useEffect(() => {

  if (!isRecording) return undefined;

  const timerId = window.setInterval(() => {

    setRecordingTime((time) => time + 1);

  }, 1000);

  return () => window.clearInterval(timerId);

}, [isRecording]);

  const formatRecordingTime = () => {

    const minutes = Math.floor(recordingTime / 60)

      .toString()

      .padStart(2, "0");

    const seconds = (recordingTime % 60)

      .toString()

      .padStart(2, "0");

    return `${minutes}:${seconds}`;

  };

  const getVoiceUrl = (path) => getImageUrl(path);

  const formatMessageTime = (dateValue) => {

    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {

      hour: "2-digit",

      minute: "2-digit",

    });

  };

  // ==================== CALL HISTORY DISPLAY ====================

  const formatCallDuration = (durationValue) => {

    const totalSeconds = Math.max(0, Number(durationValue) || 0);

    const minutes = Math.floor(totalSeconds / 60);

    const seconds = totalSeconds % 60;

    return minutes > 0

      ? `${minutes} min ${String(seconds).padStart(2, "0")} sec`

      : `${seconds} sec`;

  };

  const getCallLabel = (record) => {

    const isMine =

      Number(record.caller_id) === Number(currentUser?.id);

    const type = record.call_type === "video" ? "video" : "voice";

    switch (record.call_status) {

      case "missed":

        return `Missed ${type} call`;

      case "rejected":

        return `Declined ${type} call`;

      case "failed":

        return `Failed ${type} call`;

      case "completed":

      case "connected":

        return `${isMine ? "Outgoing" : "Incoming"} ${type} call`;

      case "ringing":

        return "Unanswered call";

      case "connecting":

        return `${isMine ? "Outgoing" : "Incoming"} ${type} call`;

      default:

        return `${type.charAt(0).toUpperCase() + type.slice(1)} call`;

    }

  };

  const getDateLabel = (dateValue) => {

    const date = new Date(dateValue);

    const today = new Date();

    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a, b) =>

      a.getFullYear() === b.getFullYear() &&

      a.getMonth() === b.getMonth() &&

      a.getDate() === b.getDate();

    if (sameDay(date, today)) return "Today";

    if (sameDay(date, yesterday)) return "Yesterday";

    return date.toLocaleDateString([], {

      day: "numeric",

      month: "long",

      year: "numeric",

    });

  };

  // Merge messages and call records into one chronological timeline.

  // Call records use started_at; messages use created_at.

  const timelineItems = [

    ...messages.map((message) => ({

      timelineType: "message",

      timelineId: `message-${message.id ?? `${message.created_at}-${message.message}`}`,

      timestamp: message.created_at,

      item: message,

    })),

    ...callHistory.map((record) => ({

      timelineType: "call",

      timelineId: `call-${record.call_id}`,

      timestamp: record.started_at || record.created_at,

      item: record,

    })),

  ].sort((a, b) => {

    const timeA = new Date(a.timestamp || 0).getTime();

    const timeB = new Date(b.timestamp || 0).getTime();

    return (Number.isNaN(timeA) ? 0 : timeA) - (Number.isNaN(timeB) ? 0 : timeB);

  });

  // ==================== LOADING / ERROR STATES ====================

  if (loading) {

    return (

      <div className="chat-floating-window">

        <div className="chat-loading">

          <div className="chat-loader" />

          <p>Loading chat...</p>

          <button

            type="button"

            className="chat-close-button"

            onClick={handleCloseChat}

            aria-label="Close chat"

          >

            ×

          </button>

        </div>

      </div>

    );

  }

  if (error && !friend) {

    return (

      <div className="chat-floating-window">

        <div className="chat-error-page">

          <button

            type="button"

            className="chat-close-button"

            onClick={handleCloseChat}

            aria-label="Close chat"

          >

            ×

          </button>

          <h3>Unable to open chat</h3>

          <p>{error}</p>

          <button type="button" onClick={handleCloseChat}>

            Go back

          </button>

        </div>

      </div>

    );

  }

  // ==================== CHAT UI ====================

  return (

    <div className="chat-floating-window">

      <div className="chat-header">

        <div className="chat-user-info">

          <button

            type="button"

            className="chat-profile-photo-button"

            title="View profile"

            onClick={() =>

              navigate(`/profile/${friend?.id || targetUserId}`)

            }

          >

            {friendImage && !profileImageFailed ? (

              <img

                src={friendImage}

                alt={`${friend?.name || "User"} profile`}

                className="chat-avatar"

                onError={() => setProfileImageFailed(true)}

              />

            ) : (

              <span className="chat-avatar chat-avatar-placeholder">

                {(friend?.name || friend?.username || "U")

                  .charAt(0)

                  .toUpperCase()}

              </span>

            )}

          </button>

          <div className="chat-user-details">

            <h3>{friend?.name || friend?.username || "User"}</h3>

            <span

              className={

                isFriendOnline

                  ? "chat-online-status is-online"

                  : "chat-online-status is-offline"

              }

            >

              ● {isFriendOnline ? "Active now" : "Offline"}

            </span>

          </div>

        </div>

        <div className="chat-header-actions">

          <button

            type="button"

            className="chat-call-button"

            title="Start voice call"

            aria-label="Start voice call"

            disabled={

              !socketRef.current?.connected ||

              !friend?.id ||

              !conversationId ||

              !currentUser?.id

            }

            onClick={() => {

              if (

                !conversationId ||

                !friend?.id ||

                !currentUser?.id ||

                !socketRef.current?.connected

              ) {

                setError(

                  "Chat is not ready. Please reopen the conversation."

                );

                return;

              }

              const call = {

                conversationId: Number(conversationId),

                targetUserId: Number(friend.id),

                fromUserId: Number(currentUser.id),

                fromName:

                  currentUser.name ||

                  currentUser.username ||

                  "ConnectHub user",

                toName: friend.name || "Friend",

                callType: "audio",

                direction: "outgoing",

                status: "calling",

              };

              console.log("Outgoing voice call data:", call);

              setCallSession(call);

              socketRef.current.emit("callUser", call);

            }}

          >

            ☎

          </button>

          <button

            type="button"

            className="chat-call-button"

            title="Start video call"

            aria-label="Start video call"

            disabled={

              !socketRef.current?.connected ||

              !friend?.id ||

              !conversationId ||

              !currentUser?.id

            }

            onClick={() => {

              if (

                !conversationId ||

                !friend?.id ||

                !currentUser?.id ||

                !socketRef.current?.connected

              ) {

                setError(

                  "Chat is not ready. Please reopen the conversation."

                );

                return;

              }

              const call = {

                conversationId: Number(conversationId),

                targetUserId: Number(friend.id),

                fromUserId: Number(currentUser.id),

                fromName:

                  currentUser.name ||

                  currentUser.username ||

                  "ConnectHub user",

                toName: friend.name || "Friend",

                callType: "video",

                direction: "outgoing",

                status: "calling",

              };

              console.log("Outgoing video call data:", call);

              setCallSession(call);

              socketRef.current.emit("callUser", call);

            }}

          >

            ▣

          </button>

          <button

            type="button"

            className="chat-close-button"

            title="Close chat"

            onClick={handleCloseChat}

            aria-label="Close chat"

          >

            ×

          </button>

        </div>

      </div>

      {error && (

        <div className="chat-error" role="alert">

          {error}

        </div>

      )}

      <div className="messages-container">

        {timelineItems.length === 0 ? (

          <div className="no-messages">

            <div className="no-message-icon">💬</div>

            <h3>Start a conversation</h3>

            <p>Send a message to {friend?.name || "your friend"}</p>

          </div>

        ) : (

          timelineItems.map((entry, index) => {

            const entryDate = entry.timestamp ? new Date(entry.timestamp) : null;

            const previousEntry = index > 0 ? timelineItems[index - 1] : null;

            const previousDate = previousEntry?.timestamp

              ? new Date(previousEntry.timestamp)

              : null;

            const validEntryDate = entryDate && !Number.isNaN(entryDate.getTime());

            const validPreviousDate =

              previousDate && !Number.isNaN(previousDate.getTime());

            const isNewDate =

              validEntryDate &&

              (!validPreviousDate ||

                entryDate.toDateString() !== previousDate.toDateString());

            if (entry.timelineType === "call") {

              const record = entry.item;

              const callDate = record.started_at || record.created_at;

              const isCompleted = ["completed", "connected"].includes(

                record.call_status

              );

              return (

                <div className="chat-timeline-group" key={entry.timelineId}>

                  {isNewDate && (

                    <div className="chat-date-separator">

                      <span>{getDateLabel(entry.timestamp)}</span>

                    </div>

                  )}

                  <div className="call-history-row">

                    <div className="call-history-card">

                      <span className="call-history-icon" aria-hidden="true">

                        {record.call_type === "video" ? "▣" : "☎"}

                      </span>

                      <div className="call-history-details">

                        <strong>{getCallLabel(record)}</strong>

                        <span>

                          {callDate

                            ? new Date(callDate).toLocaleDateString([], {

                                month: "short",

                                day: "numeric",

                              })

                            : ""}

                          {callDate ? " · " : ""}

                          {formatMessageTime(callDate)}

                        </span>

                        {isCompleted && (

                          <span>

                            Duration: {formatCallDuration(record.duration_seconds)}

                          </span>

                        )}

                        {record.call_status === "missed" && (

                          <span>No answer</span>

                        )}

                        {record.call_status === "rejected" && (

                          <span>Call declined</span>

                        )}

                        {record.call_status === "failed" && (

                          <span>Call failed</span>

                        )}

                      </div>

                    </div>

                  </div>

                </div>

              );

            }

            const message = entry.item;

            const isMine =

              Number(message.sender_id) === Number(currentUser?.id);

            return (

              <div className="chat-message-group" key={entry.timelineId}>

                {isNewDate && (

                  <div className="chat-date-separator">

                    <span>{getDateLabel(entry.timestamp)}</span>

                  </div>

                )}

                <div

                  className={`message-row ${

                    isMine ? "message-row-mine" : "message-row-theirs"

                  }`}

                >

                  {!isMine && (

                    <button

                      type="button"

                      className="message-sender-avatar message-profile-photo-button"

                      title="View profile"

                      onClick={() =>

                        navigate(`/profile/${friend?.id || targetUserId}`)

                      }

                    >

                      {friendImage && !profileImageFailed ? (

                        <img

                          src={friendImage}

                          alt={`${friend?.name || "User"} profile`}

                          onError={() => setProfileImageFailed(true)}

                        />

                      ) : (

                        <span>

                          {(friend?.name || friend?.username || "U")

                            .charAt(0)

                            .toUpperCase()}

                        </span>

                      )}

                    </button>

                  )}

                  <div

                    className={`message-bubble ${

                      isMine ? "message-mine" : "message-theirs"

                    }`}

                  >

                    {message.message_type === "voice" ? (

                      <div className="voice-message">

                        <audio

                          controls

                          preload="metadata"

                          src={getVoiceUrl(message.message)}

                        />

                      </div>

                    ) : (

                      <p>{message.message}</p>

                    )}

                    <span className="message-time">

                      {formatMessageTime(message.created_at)}

                    </span>

                  </div>

                </div>

              </div>

            );

          })

        )}

      </div>

      <form

        className="message-input-area"

        onSubmit={handleSendMessage}

      >

        {isRecording && (

          <div className="recording-indicator">

            <span className="recording-dot">●</span>{" "}

            Recording {formatRecordingTime()}

          </div>

        )}

        <div className="input-actions">

          <button

            type="button"

            title={isRecording ? "Stop recording" : "Record voice"}

            className={isRecording ? "recording-button" : ""}

            onClick={handleVoiceRecording}

            disabled={sending || !conversationId}

          >

            {isRecording ? "⏹️" : "🎤"}

          </button>

          <button

            type="button"

            title="Image"

            onClick={() =>

              setError("Image messages are not enabled yet.")

            }

          >

            🖼️

          </button>

          <button

            type="button"

            title="Emoji"

            onClick={() =>

              setShowEmojiPicker((visible) => !visible)

            }

          >

            😊

          </button>

        </div>

        {showEmojiPicker && (

          <div className="emoji-picker-container">

            <EmojiPicker

              onEmojiClick={(emojiData) =>

                setNewMessage(

                  (previous) => previous + emojiData.emoji

                )

              }

            />

          </div>

        )}

        <textarea

          value={newMessage}

          onChange={(event) => setNewMessage(event.target.value)}

          onKeyDown={handleKeyDown}

          placeholder="Aa"

          rows={1}

          aria-label="Write a message"

        />

        <button

          type="submit"

          className="send-message-button"

          disabled={

            sending ||

            !newMessage.trim() ||

            !conversationId ||

            !socketRef.current?.connected

          }

          aria-label="Send message"

        >

          {sending ? "..." : "➤"}

        </button>

      </form>

      {callSession && (

        <CallModal

          call={callSession}

          socket={socketRef.current}

          currentUser={currentUser}

          friend={friend}

          onClose={() => setCallSession(null)}

        />

      )}

    </div>

  );

}

export default Chat;
