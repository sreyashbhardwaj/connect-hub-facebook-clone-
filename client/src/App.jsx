
import { useEffect, useRef, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import "./responsive.css";
import Dashboard from "./pages/Dashboard";
import Login from "./components/Login";
import Register from "./components/Register";
import FindFriends from "./pages/FindFriends";
import FriendRequests from "./pages/FriendRequests";
import MyFriends from "./pages/MyFriends";
import VerifyOTP from "./pages/VerifyOTP";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Chat from "./pages/Chat";
import Messages from "./pages/Messages";
import CallModal from "./components/CallModal";

// Protected Route
function ProtectedRoute({ children }) {
  const token = useSelector((state) => state.auth.token);

  return token ? children : <Navigate to="/login" replace />;
}

// Main App
function App() {
  const token = useSelector((state) => state.auth.token);
  const currentUser = useSelector((state) => state.auth.user);
  const location = useLocation();

  const socketRef = useRef(null);
  const locationRef = useRef(location.pathname);

  const [globalCall, setGlobalCall] = useState(null);

  // Keep the current route available to socket handlers
  // without reconnecting the socket on every navigation.
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  // Register the logged-in user globally and handle incoming calls.
  useEffect(() => {
    if (!token || !currentUser?.id) {
      setGlobalCall(null);
      return undefined;
    }

    

const SOCKET_URL = window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : "https://vector-active-dictionaries-cards.trycloudflare.com";


const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
});


    socketRef.current = socket;

    const registerUser = () => {
      socket.emit("registerCallUser", {
        userId: Number(currentUser.id),
        name:
          currentUser.name ||
          currentUser.username ||
          "ConnectHub user",
      });

      console.log(
        "[PRESENCE] Registered logged-in user:",
        currentUser.id
      );
    };

    const handleIncomingCall = (incoming) => {
      if (
        !incoming ||
        Number(incoming.targetUserId) !== Number(currentUser.id)
      ) {
        return;
      }

      // Chat.jsx handles the call when the caller's chat is open.
      const currentPath = locationRef.current;
      const openChatMatch = currentPath.match(/^\/chat\/([^/]+)\/?$/);

      if (
        openChatMatch &&
        Number(openChatMatch[1]) === Number(incoming.fromUserId)
      ) {
        return;
      }

      setGlobalCall({
        ...incoming,
        direction: "incoming",
        status: "ringing",
      });
    };

    const handleCallEnded = (payload) => {
      setGlobalCall((previous) => {
        if (!previous) return previous;

        if (
          payload?.callId &&
          previous.callId &&
          String(payload.callId) !== String(previous.callId)
        ) {
          return previous;
        }

        return {
          ...previous,
          status: "ended",
        };
      });
    };

    const handleCallRejected = (payload) => {
      setGlobalCall((previous) => {
        if (!previous) return previous;

        if (
          payload?.callId &&
          previous.callId &&
          String(payload.callId) !== String(previous.callId)
        ) {
          return previous;
        }

        return {
          ...previous,
          status: "rejected",
        };
      });
    };

    const handleConnectError = (error) => {
      console.error(
        "[PRESENCE] Socket connection failed:",
        error.message
      );
    };

    socket.on("connect", registerUser);
    socket.on("incomingCall", handleIncomingCall);
    socket.on("callEnded", handleCallEnded);
    socket.on("callRejected", handleCallRejected);
    socket.on("connect_error", handleConnectError);

    if (socket.connected) {
      registerUser();
    }

    return () => {
      socket.off("connect", registerUser);
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callEnded", handleCallEnded);
      socket.off("callRejected", handleCallRejected);
      socket.off("connect_error", handleConnectError);

      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [
    token,
    currentUser?.id,
    currentUser?.name,
    currentUser?.username,
  ]);

  const closeGlobalCall = () => {
    setGlobalCall(null);
  };

  return (
    <>
      <Routes>
        {/* Home */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* OTP Verification */}
        <Route
          path="/verify-otp"
          element={<VerifyOTP />}
        />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Friend Requests */}
        <Route
          path="/friend-requests"
          element={
            <ProtectedRoute>
              <FriendRequests />
            </ProtectedRoute>
          }
        />

        {/* Find Friends */}
        <Route
          path="/find-friends"
          element={
            <ProtectedRoute>
              <FindFriends />
            </ProtectedRoute>
          }
        />

        {/* Own Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Another User's Profile */}
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Edit Profile */}
        <Route
          path="/edit-profile"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />

        {/* Chat */}
        <Route
          path="/chat/:userId"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        {/* Messages */}
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />

        {/* My Friends */}
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <MyFriends />
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Global incoming-call window */}
      {globalCall && socketRef.current && currentUser && (
        <CallModal
          call={globalCall}
          socket={socketRef.current}
          currentUser={currentUser}
          friend={{
            id: globalCall.fromUserId,
            name: globalCall.fromName || "ConnectHub user",
            username: globalCall.fromName || "ConnectHub user",
          }}
          onClose={closeGlobalCall}
        />
      )}
    </>
  );
}

export default App;
