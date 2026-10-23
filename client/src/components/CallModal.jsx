

import { useCallback, useEffect, useRef, useState } from "react";

import "./CallModal.css";

const ICE_SERVERS = {

  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],

};

export default function CallModal({

  call,

  socket,

  currentUser,

  friend,

  onClose,

}) {

  const [status, setStatus] = useState(call.status || "calling");

  const [error, setError] = useState("");

  const [muted, setMuted] = useState(false);

  const [cameraOff, setCameraOff] = useState(false);

  const [seconds, setSeconds] = useState(0);
  const secondsRef = useRef(0);

  const localVideoRef = useRef(null);

  const remoteVideoRef = useRef(null);

  const peerRef = useRef(null);

  const localStreamRef = useRef(null);

  const remoteStreamRef = useRef(null);

  const pendingCandidatesRef = useRef([]);

  const callRef = useRef(call);

  const closingRef = useRef(false);

  const everConnectedRef = useRef(false);

  const lastSavedStatusRef = useRef("");

  callRef.current = call;
  secondsRef.current = seconds;

  const isVideo = call.callType === "video";

  const peerUserId = Number(

    call.direction === "incoming"

      ? call.fromUserId

      : call.targetUserId

  );

  const peerName =

    call.direction === "incoming"

      ? call.fromName || friend?.name || "Friend"

      : call.toName || friend?.name || "Friend";

  // ==================== SAVE CALL HISTORY ====================

  const emitCallHistory = useCallback(

    (nextStatus, duration = 0) => {

      const currentCall = callRef.current;

      if (

        !socket?.connected ||

        !currentCall?.callId ||

        !currentCall?.conversationId ||

        !currentUser?.id

      ) {

        return;

      }

      const callerId = Number(

        currentCall.direction === "incoming"

          ? currentCall.fromUserId

          : currentUser.id

      );

      const receiverId = Number(

        currentCall.direction === "incoming"

          ? currentUser.id

          : currentCall.targetUserId

      );

      if (!callerId || !receiverId || callerId === receiverId) {

        return;

      }

      const durationSeconds = Math.max(

        0,

        Math.floor(Number(duration) || 0)

      );

      const saveKey = [

        currentCall.callId,

        nextStatus,

        durationSeconds,

      ].join(":");

      if (lastSavedStatusRef.current === saveKey) {

        return;

      }

      lastSavedStatusRef.current = saveKey;

      socket.emit("saveCallHistory", {

        callId: currentCall.callId,

        conversationId: Number(currentCall.conversationId),

        callerId,

        receiverId,

        callType: currentCall.callType === "video" ? "video" : "audio",

        callStatus: nextStatus,

        durationSeconds,

      });

    },

    [socket, currentUser?.id]

  );

  // ==================== CLEANUP ====================

  const cleanup = useCallback(() => {

    if (peerRef.current) {

      peerRef.current.onicecandidate = null;

      peerRef.current.ontrack = null;

      peerRef.current.onconnectionstatechange = null;

      peerRef.current.close();

      peerRef.current = null;

    }

    if (localStreamRef.current) {

      localStreamRef.current.getTracks().forEach((track) => {

        track.stop();

      });

      localStreamRef.current = null;

    }

    if (remoteStreamRef.current) {

      remoteStreamRef.current.getTracks().forEach((track) => {

        track.stop();

      });

      remoteStreamRef.current = null;

    }

    if (localVideoRef.current) {

      localVideoRef.current.srcObject = null;

    }

    if (remoteVideoRef.current) {

      remoteVideoRef.current.srcObject = null;

    }

    pendingCandidatesRef.current = [];

  }, []);

  // ==================== WEBRTC PEER ====================

  const createPeer = useCallback(() => {

    if (peerRef.current) {

      return peerRef.current;

    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    peerRef.current = pc;

    remoteStreamRef.current = new MediaStream();

    if (remoteVideoRef.current) {

      remoteVideoRef.current.srcObject = remoteStreamRef.current;

    }

    pc.ontrack = (event) => {

      const stream = event.streams?.[0];

      if (stream) {

        remoteStreamRef.current = stream;

      } else if (event.track && remoteStreamRef.current) {

        remoteStreamRef.current.addTrack(event.track);

      }

      if (remoteVideoRef.current) {
        const mediaElement = remoteVideoRef.current;
        mediaElement.srcObject = remoteStreamRef.current;

        // Explicitly attempt playback; browsers may block it until user interaction.
        const playPromise = mediaElement.play();
        if (playPromise?.catch) {
          playPromise.catch(() => {
            setError("Remote audio is ready, but playback was blocked. Tap the call window and try again.");
          });
        }
      }
    };

    pc.onicecandidate = (event) => {

      const currentCall = callRef.current;

      if (event.candidate && socket?.connected) {

        socket.emit("iceCandidate", {

          targetUserId: peerUserId,

          callId: currentCall.callId,

          candidate: event.candidate,

        });

      }

    };

    pc.onconnectionstatechange = () => {

      if (pc.connectionState === "connected") {

        everConnectedRef.current = true;

        setStatus("connected");

      }

      if (

        ["failed", "disconnected"].includes(pc.connectionState)

      ) {

        setStatus("connection-lost");

      }

    };

    return pc;

  }, [peerUserId, socket]);

  // ==================== MICROPHONE / CAMERA ====================

  const getLocalMedia = useCallback(async () => {

    if (localStreamRef.current) {

      return localStreamRef.current;

    }

    if (!navigator.mediaDevices?.getUserMedia) {
  console.error("Media API unavailable:", {
    url: window.location.href,
    secureContext: window.isSecureContext,
    mediaDevices: !!navigator.mediaDevices,
    userAgent: navigator.userAgent,
  });

  throw new Error(
    !window.isSecureContext
      ? "Microphone access requires HTTPS on this device."
      : "Microphone/camera API is unavailable in this browser."
  );
}

    let stream;

    try {

      stream = await navigator.mediaDevices.getUserMedia({

        audio: true,

        video: isVideo,

      });

    } catch (mediaError) {

      if (

        mediaError?.name === "NotAllowedError" ||

        mediaError?.name === "PermissionDeniedError"

      ) {

        throw new Error(

          isVideo

            ? "Microphone/camera permission was denied. Allow both in your browser settings."

            : "Microphone permission was denied. Allow microphone access in your browser settings."

        );

      }

      if (mediaError?.name === "NotFoundError") {

        throw new Error(

          isVideo

            ? "No microphone or camera was found."

            : "No microphone was found."

        );

      }

      if (mediaError?.name === "NotReadableError") {

        throw new Error(

          "Your microphone or camera is being used by another app."

        );

      }

      throw mediaError;

    }

    localStreamRef.current = stream;

    if (localVideoRef.current) {

      localVideoRef.current.srcObject = stream;

    }

    return stream;

  }, [isVideo]);

  const addLocalTracks = useCallback(

    async (pc) => {

      const stream = await getLocalMedia();

      stream.getTracks().forEach((track) => {

        const alreadyAdded = pc

          .getSenders()

          .some((sender) => sender.track?.id === track.id);

        if (!alreadyAdded) {

          pc.addTrack(track, stream);

        }

      });

    },

    [getLocalMedia]

  );

  const flushCandidates = useCallback(async (pc) => {

    for (const candidate of pendingCandidatesRef.current) {

      try {

        await pc.addIceCandidate(candidate);

      } catch (err) {

        console.warn("Could not add ICE candidate:", err);

      }

    }

    pendingCandidatesRef.current = [];

  }, []);

  // ==================== ACCEPT INCOMING CALL ====================

  const acceptIncoming = async () => {

    try {

      setError("");

      const pc = createPeer();

      await addLocalTracks(pc);

      socket.emit("acceptCall", {

        fromUserId: call.fromUserId,

        callId: call.callId,

        callType: call.callType,

        conversationId: Number(call.conversationId),

      });

      setStatus("connecting");

    } catch (err) {

      setError(

        err.message || "Could not access microphone/camera."

      );

    }

  };

  // ==================== END / REJECT CALL ====================

  const rejectOrEnd = useCallback(() => {

    if (closingRef.current) {

      return;

    }

    closingRef.current = true;

    let finalStatus;

    if (

      call.direction === "incoming" &&

      ["ringing", "calling"].includes(status)

    ) {

      finalStatus = "rejected";

    } else if (everConnectedRef.current || status === "connected") {

      finalStatus = "completed";

    } else if (status === "rejected") {

      finalStatus = "rejected";

    } else if (status === "unavailable") {

      finalStatus = "missed";

    } else if (status === "connection-lost") {

      finalStatus = everConnectedRef.current ? "completed" : "failed";

    } else {

      finalStatus = "missed";

    }

    emitCallHistory(finalStatus, seconds);

    if (socket?.connected && call.callId) {

      if (

        call.direction === "incoming" &&

        ["ringing", "calling"].includes(status)

      ) {

        socket.emit("rejectCall", {

          fromUserId: call.fromUserId,

          callId: call.callId,

        });

      } else {

        socket.emit("endCall", {

          targetUserId: peerUserId,

          callId: call.callId,

        });

      }

    }

    cleanup();

    onClose?.();

  }, [

    call,

    cleanup,

    emitCallHistory,

    onClose,

    peerUserId,

    seconds,

    socket,

    status,

  ]);

  // ==================== SOCKET CALL EVENTS ====================

  useEffect(() => {

    if (!socket) {

      return undefined;

    }

    const matching = (payload) =>

      !callRef.current.callId ||

      !payload?.callId ||

      payload.callId === callRef.current.callId;

    const onOffer = async (payload) => {

      if (

        !matching(payload) ||

        Number(payload.fromUserId) !== peerUserId

      ) {

        return;

      }

      try {

        const pc = createPeer();

        await addLocalTracks(pc);

        await pc.setRemoteDescription(

          new RTCSessionDescription(payload.offer)

        );

        await flushCandidates(pc);

        const answer = await pc.createAnswer();

        await pc.setLocalDescription(answer);

        socket.emit("webrtcAnswer", {

          targetUserId: peerUserId,

          callId: callRef.current.callId,

          answer: pc.localDescription,

        });

        setStatus("connecting");

      } catch (err) {

        setError(err.message || "Could not answer the call.");

      }

    };

    const onAnswer = async (payload) => {

      if (

        !matching(payload) ||

        Number(payload.fromUserId) !== peerUserId ||

        !peerRef.current

      ) {

        return;

      }

      try {

        await peerRef.current.setRemoteDescription(

          new RTCSessionDescription(payload.answer)

        );

        await flushCandidates(peerRef.current);

        setStatus("connecting");

      } catch (err) {

        setError(err.message || "Could not establish the call.");

      }

    };

    const onCandidate = async (payload) => {

      if (

        !matching(payload) ||

        Number(payload.fromUserId) !== peerUserId ||

        !payload.candidate

      ) {

        return;

      }

      const candidate = new RTCIceCandidate(payload.candidate);

      if (peerRef.current?.remoteDescription) {

        try {

          await peerRef.current.addIceCandidate(candidate);

        } catch (err) {

          console.warn("ICE candidate error:", err);

        }

      } else {

        pendingCandidatesRef.current.push(candidate);

      }

    };

    const onAccepted = async (payload) => {

      if (

        !matching(payload) ||

        callRef.current.direction !== "outgoing"

      ) {

        return;

      }

      try {

        const pc = createPeer();

        await addLocalTracks(pc);

        const offer = await pc.createOffer();

        await pc.setLocalDescription(offer);

        socket.emit("webrtcOffer", {

          targetUserId: peerUserId,

          callId: callRef.current.callId,

          offer: pc.localDescription,

        });

        setStatus("connecting");

      } catch (err) {

        setError(err.message || "Could not start the call.");

      }

    };

    const onRejected = (payload) => {

      if (!matching(payload)) {

        return;

      }

      setStatus("rejected");

    };

    const onEnded = (payload) => {

      if (!matching(payload)) {

        return;

      }

      setStatus("ended");

    };

    const onUnavailable = () => {

      setStatus("unavailable");

    };

    const onCallError = (payload) => {

      setError(payload?.message || "Call error.");

    };

    socket.on("webrtcOffer", onOffer);

    socket.on("webrtcAnswer", onAnswer);

    socket.on("iceCandidate", onCandidate);

    socket.on("callAccepted", onAccepted);

    socket.on("callRejected", onRejected);

    socket.on("callEnded", onEnded);

    socket.on("callUnavailable", onUnavailable);

    socket.on("callError", onCallError);

    return () => {

      socket.off("webrtcOffer", onOffer);

      socket.off("webrtcAnswer", onAnswer);

      socket.off("iceCandidate", onCandidate);

      socket.off("callAccepted", onAccepted);

      socket.off("callRejected", onRejected);

      socket.off("callEnded", onEnded);

      socket.off("callUnavailable", onUnavailable);

      socket.off("callError", onCallError);

    };

  }, [

    socket,

    peerUserId,

    createPeer,

    addLocalTracks,

    flushCandidates,

  ]);

  // ==================== SAVE STATUS CHANGES ====================

  useEffect(() => {
    const duration = secondsRef.current;

    if (status === "connected") {
      everConnectedRef.current = true;
      emitCallHistory("connected", duration);
    } else if (["calling", "ringing"].includes(status)) {
      emitCallHistory("ringing", duration);
    } else if (status === "connecting") {
      emitCallHistory("connecting", duration);
    } else if (status === "rejected") {
      emitCallHistory("rejected", duration);
    } else if (status === "unavailable") {
      emitCallHistory("missed", duration);
    } else if (status === "connection-lost") {
      emitCallHistory(everConnectedRef.current ? "completed" : "failed", duration);
    } else if (status === "ended") {
      emitCallHistory(everConnectedRef.current ? "completed" : "missed", duration);
    }
  }, [status, emitCallHistory]);

  // ==================== CALL TIMER ====================

  useEffect(() => {

    if (status !== "connected") {

      return undefined;

    }

    const timer = window.setInterval(() => {

      setSeconds((value) => value + 1);

    }, 1000);

    return () => window.clearInterval(timer);

  }, [status]);

  // ==================== CLEANUP ON UNMOUNT ====================

  useEffect(() => {

    return () => {

      cleanup();

    };

  }, [cleanup]);

  // ==================== MUTE / CAMERA ====================

  const toggleMute = () => {

    const next = !muted;

    localStreamRef.current

      ?.getAudioTracks()

      .forEach((track) => {

        track.enabled = !next;

      });

    setMuted(next);

  };

  const toggleCamera = () => {

    const next = !cameraOff;

    localStreamRef.current

      ?.getVideoTracks()

      .forEach((track) => {

        track.enabled = !next;

      });

    setCameraOff(next);

  };

  // ==================== START OUTGOING MEDIA ====================

  useEffect(() => {

    if (

      call.direction !== "outgoing" ||

      call.status !== "calling"

    ) {

      return undefined;

    }

    let cancelled = false;

    const startOutgoing = async () => {

      try {

        await getLocalMedia();

      } catch (err) {

        if (!cancelled) {

          setError(

            err.message || "Could not access microphone/camera."

          );

        }

      }

    };

    startOutgoing();

    return () => {

      cancelled = true;

    };

  }, [call.direction, call.status, call.callId, getLocalMedia]);

  // ==================== DISPLAY STATUS ====================

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(

    seconds % 60

  ).padStart(2, "0")}`;

  const visibleStatus = {

    calling: "Calling…",

    ringing: "Incoming call",

    connecting: "Connecting…",

    connected: time,

    rejected: "Call declined",

    ended: "Call ended",

    unavailable: "Friend is offline",

    "connection-lost": "Connection interrupted",

  }[status] || status;

  // ==================== UI ====================

  return (

    <div

      className="call-modal-backdrop"

      role="dialog"

      aria-modal="true"

      aria-label={`${isVideo ? "Video" : "Voice"} call`}

    >

      <section

        className={`call-modal ${

          isVideo ? "call-modal-video" : "call-modal-audio"

        }`}

      >

        <button

          className="call-modal-close"

          type="button"

          onClick={rejectOrEnd}

          aria-label="Close call window"

        >

          ×

        </button>

        <div className="call-modal-heading">

          {isVideo ? "Video call" : "Voice call"}

        </div>

        <div className="call-modal-person">{peerName}</div>

        <div className="call-modal-status">{visibleStatus}</div>

        {isVideo ? (

          <div className="call-video-grid">

            <video

              ref={remoteVideoRef}

              autoPlay

              playsInline

              className="call-remote-video"

            />

            <video

              ref={localVideoRef}

              autoPlay

              muted

              playsInline

              className="call-local-video"

            />

          </div>

        ) : (

          <>

            <div className="call-avatar">

              {(peerName || "F").charAt(0).toUpperCase()}

            </div>

            <audio ref={remoteVideoRef} autoPlay />

          </>

        )}

        {error && (

          <p className="call-modal-error" role="alert">

            {error}

          </p>

        )}

        {status === "ringing" && call.direction === "incoming" ? (

          <div className="call-controls">

            <button

              type="button"

              className="call-accept"

              onClick={acceptIncoming}

            >

              Accept

            </button>

            <button

              type="button"

              className="call-end"

              onClick={rejectOrEnd}

            >

              Decline

            </button>

          </div>

        ) : [

            "rejected",

            "ended",

            "unavailable",

            "connection-lost",

          ].includes(status) ? (

          <button

            type="button"

            className="call-end"

            onClick={rejectOrEnd}

          >

            Close

          </button>

        ) : (

          <div className="call-controls">

            <button

              type="button"

              className={muted ? "call-control active" : "call-control"}

              onClick={toggleMute}

            >

              {muted ? "Unmute" : "Mute"}

            </button>

            {isVideo && (

              <button

                type="button"

                className={

                  cameraOff ? "call-control active" : "call-control"

                }

                onClick={toggleCamera}

              >

                {cameraOff ? "Camera on" : "Camera off"}

              </button>

            )}

            <button

              type="button"

              className="call-end"

              onClick={rejectOrEnd}

            >

              End call

            </button>

          </div>

        )}

      </section>

    </div>

  );

}
