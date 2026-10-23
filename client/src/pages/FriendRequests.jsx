import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import {
    fetchFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    fetchFriends,
} from "../redux/friendSlice";

import "./FriendRequests.css";

function FriendRequests() {
    const dispatch = useDispatch();

    const {
        requests = [],
        loading = false,
        error = null,
    } = useSelector((state) => state.friends || {});

    // Fetch requests when the page opens.
    // Refresh periodically to show newly received requests.
    useEffect(() => {
        dispatch(fetchFriendRequests());

        const interval = setInterval(() => {
            dispatch(fetchFriendRequests());
        }, 5000);

        return () => clearInterval(interval);
    }, [dispatch]);

    // Accept a friend request
    const handleAccept = async (requestId) => {
    try {
        await dispatch(
            acceptFriendRequest(requestId)
        ).unwrap();

        // Refresh the friends list after accepting
        await dispatch(fetchFriends()).unwrap();

        // Refresh pending requests
        await dispatch(fetchFriendRequests()).unwrap();

    } catch (err) {
        console.error("Unable to accept request:", err);
    }
};

    // Reject a friend request
    const handleReject = async (requestId) => {
        try {
            await dispatch(
                rejectFriendRequest(requestId)
            ).unwrap();
        } catch (err) {
            console.error("Unable to reject request:", err);
        }
    };

    return (
        <div className="requests-page">

            {/* Sidebar */}
            <aside className="requests-sidebar">

                <div className="requests-logo">
                    <span className="requests-logo-icon">
                        C
                    </span>

                    <h2>ConnectHub</h2>
                </div>

                <p className="requests-menu-title">
                    MENU
                </p>

                <nav className="requests-nav">

                    <Link
                        to="/dashboard"
                        className="requests-nav-item"
                    >
                        <span>▦</span>
                        Dashboard
                    </Link>

                    <Link
                        to="/find-friends"
                        className="requests-nav-item"
                    >
                        <span>👥</span>
                        Find Friends
                    </Link>

                    <Link
                        to="/friend-requests"
                        className="requests-nav-item active"
                    >
                        <span>📩</span>
                        Friend Requests

                        {requests.length > 0 && (
                            <span className="requests-badge">
                                {requests.length}
                            </span>
                        )}
                    </Link>

                    <Link
                        to="/friends"
                        className="requests-nav-item"
                    >
                        <span>🤝</span>
                        My Friends
                    </Link>

                    
                </nav>
            </aside>

            {/* Main content */}
            <main className="requests-main">

                {/* Page header */}
                <header className="requests-header">

                    <div>
                        <h1>Friend Requests</h1>

                        <p>
                            Manage the people who want to
                            connect with you.
                        </p>
                    </div>

                    <Link
                        to="/find-friends"
                        className="discover-button"
                    >
                        + Find Friends
                    </Link>

                </header>

                {/* Welcome section */}
                <section className="requests-welcome">

                    <div>
                        <span className="requests-eyebrow">
                            YOUR COMMUNITY
                        </span>

                        <h2>
                            Grow your circle 🤝
                        </h2>

                        <p>
                            Accept requests to connect with
                            new people on ConnectHub.
                        </p>
                    </div>

                    <div className="requests-welcome-icon">
                        💌
                    </div>

                </section>

                {/* Requests section */}
                <section className="requests-content">

                    <div className="requests-section-header">

                        <div>
                            <h2>Received Requests</h2>

                            <p>
                                {requests.length} pending{" "}
                                {requests.length === 1
                                    ? "request"
                                    : "requests"}
                            </p>
                        </div>

                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="requests-error">
                            {typeof error === "string"
                                ? error
                                : "Something went wrong. Please try again."}
                        </div>
                    )}

                    {/* Loading */}
                    {loading && requests.length === 0 ? (
                        <div className="requests-empty">
                            Loading friend requests...
                        </div>
                    ) : requests.length > 0 ? (

                        /* Request cards */
                        <div className="requests-list">

                            {requests.map((request) => {

                                // Backend returns name and email
                                // directly in each request object.
                                const name =
                                    request.name ||
                                    request.sender?.name ||
                                    request.from?.name ||
                                    request.user?.name ||
                                    request.email ||
                                    "ConnectHub User";

                                const email =
                                    request.email ||
                                    request.sender?.email ||
                                    request.from?.email ||
                                    request.user?.email ||
                                    "";

                                const requestId =
                                    request.request_id ||
                                    request.requestId ||
                                    request.id;

                                const profilePicture =
                                    request.profile_picture ||
                                    request.sender?.profile_picture ||
                                    request.user?.profile_picture;

                                return (
                                    <div
                                        className="request-card"
                                        key={requestId}
                                    >

                                        {/* Sender information */}
                                        <div className="request-person">

                                            <div className="request-avatar">
                                                {profilePicture ? (
                                                    <img
                                                        src={profilePicture}
                                                        alt={name}
                                                    />
                                                ) : (
                                                    name
                                                        .charAt(0)
                                                        .toUpperCase()
                                                )}
                                            </div>

                                            <div className="request-person-info">

                                                <h3>{name}</h3>

                                                <p>
                                                    {email ||
                                                        "Wants to connect with you"}
                                                </p>

                                                <span className="request-status">
                                                    Pending request
                                                </span>

                                            </div>

                                        </div>

                                        {/* Accept and reject buttons */}
                                        <div className="request-actions">

                                            <button
                                                className="accept-button"
                                                onClick={() =>
                                                    handleAccept(requestId)
                                                }
                                                disabled={!requestId}
                                            >
                                                ✓ Accept
                                            </button>

                                            <button
                                                className="reject-button"
                                                onClick={() =>
                                                    handleReject(requestId)
                                                }
                                                disabled={!requestId}
                                            >
                                                ✕ Reject
                                            </button>

                                        </div>

                                    </div>
                                );
                            })}

                        </div>

                    ) : (

                        /* Empty state */
                        <div className="requests-empty">

                            <div className="requests-empty-icon">
                                📭
                            </div>

                            <h3>No pending requests</h3>

                            <p>
                                When someone sends you a
                                friend request, it will
                                appear here.
                            </p>

                            <Link to="/find-friends">
                                Find New Friends
                            </Link>

                        </div>
                    )}

                </section>

            </main>
        </div>
    );
}

export default FriendRequests;