
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import api from "../api/api";
import { logout } from "../redux/authSlice";

import "./Profile.css";

function Profile() {
    const navigate = useNavigate();
    const { userId } = useParams();
    const dispatch = useDispatch();

    const currentUser = useSelector(
        (state) => state.auth.user
    );

    const currentUserId = currentUser?.id;

    const isOwnProfile =
        userId === undefined ||
        (
            currentUserId != null &&
            String(userId) === String(currentUserId)
        );

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Logout
    const handleLogout = () => {
        dispatch(logout());
        navigate("/login", { replace: true });
    };

    // Fetch own profile or another user's public profile
    useEffect(() => {
        let cancelled = false;

        const fetchProfile = async () => {
            try {
                setLoading(true);
                setError("");
                setProfile(null);

                const response = isOwnProfile
                    ? await api.get("/profile")
                    : await api.get(`/profile/${userId}`);

                if (cancelled) return;

                if (
                    response.data?.success &&
                    response.data.user
                ) {
                    setProfile(response.data.user);
                } else {
                    setError("Unable to load profile.");
                }
            } catch (err) {
                if (cancelled) return;

                console.error("Profile fetch error:", err);

                setError(
                    err.response?.data?.message ||
                    "Unable to load profile."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchProfile();

        return () => {
            cancelled = true;
        };
    }, [userId, isOwnProfile]);

    // Profile image URL
    const getProfileImage = () => {
        const picture = profile?.profile_picture;

        if (!picture) return "";

        if (
            picture.startsWith("http://") ||
            picture.startsWith("https://")
        ) {
            return picture;
        }

        return `http://localhost:5000${
            picture.startsWith("/") ? "" : "/"
        }${picture}`;
    };

    // Loading state
    if (loading) {
        return (
            <div className="profile-page">
                <aside className="profile-sidebar">
                    <div className="profile-sidebar-brand">
                        <span className="brand-icon">C</span>
                        <span>ConnectHub</span>
                    </div>

                    <p className="sidebar-heading">MAIN MENU</p>

                    <nav className="profile-sidebar-nav">
                        <button onClick={() => navigate("/dashboard")}>
                            <span>▦</span> Dashboard
                        </button>

                        <button onClick={() => navigate("/find-friends")}>
                            <span>♟</span> Find Friends
                        </button>

                        <button onClick={() => navigate("/friend-requests")}>
                            <span>✉</span> Friend Requests
                        </button>

                        <button onClick={() => navigate("/friends")}>
                            <span>🤝</span> My Friends
                        </button>

                        {isOwnProfile && (
                            <button
                                className="active"
                                onClick={() => navigate("/profile")}
                            >
                                <span>👤</span> My Profile
                            </button>
                        )}
                    </nav>

                    <div className="profile-sidebar-bottom">
                        <button onClick={handleLogout}>
                            <span>↪</span> Logout
                        </button>
                    </div>
                </aside>

                <div className="profile-loading">
                    Loading profile...
                </div>
            </div>
        );
    }

    // Error state
    if (error || !profile) {
        return (
            <div className="profile-page">
                <aside className="profile-sidebar">
                    <div className="profile-sidebar-brand">
                        <span className="brand-icon">C</span>
                        <span>ConnectHub</span>
                    </div>

                    <p className="sidebar-heading">MAIN MENU</p>

                    <nav className="profile-sidebar-nav">
                        <button onClick={() => navigate("/dashboard")}>
                            <span>▦</span> Dashboard
                        </button>

                        <button onClick={() => navigate("/find-friends")}>
                            <span>♟</span> Find Friends
                        </button>

                        <button onClick={() => navigate("/friend-requests")}>
                            <span>✉</span> Friend Requests
                        </button>

                        <button onClick={() => navigate("/friends")}>
                            <span>🤝</span> My Friends
                        </button>
                    </nav>

                    <div className="profile-sidebar-bottom">
                        <button onClick={handleLogout}>
                            <span>↪</span> Logout
                        </button>
                    </div>
                </aside>

                <div className="profile-error">
                    {error || "Profile not found."}

                    <div style={{ marginTop: "16px" }}>
                        <button onClick={() => navigate("/dashboard")}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const profileImage = getProfileImage();

    return (
        <div className="profile-page">

            {/* Sidebar */}
            <aside className="profile-sidebar">
                <div className="profile-sidebar-brand">
                    <span className="brand-icon">C</span>
                    <span>ConnectHub</span>
                </div>

                <p className="sidebar-heading">MAIN MENU</p>

                <nav className="profile-sidebar-nav">
                    <button onClick={() => navigate("/dashboard")}>
                        <span>▦</span> Dashboard
                    </button>

                    <button onClick={() => navigate("/find-friends")}>
                        <span>♟</span> Find Friends
                    </button>

                    <button onClick={() => navigate("/friend-requests")}>
                        <span>✉</span> Friend Requests
                    </button>

                    <button onClick={() => navigate("/friends")}>
                        <span>🤝</span> My Friends
                    </button>

                    {isOwnProfile && (
                        <button
                            className="active"
                            onClick={() => navigate("/profile")}
                        >
                            <span>👤</span> My Profile
                        </button>
                    )}
                </nav>

                <div className="profile-sidebar-bottom">
                    <button onClick={handleLogout}>
                        <span>↪</span> Logout
                    </button>
                </div>
            </aside>

            {/* Existing Profile Container */}
            <div className="profile-container">

                <div className="profile-cover"></div>

                <div className="profile-content">

                    {/* Profile Picture */}
                    <div className="profile-picture-wrapper">
                        {profileImage ? (
                            <img
                                src={profileImage}
                                alt={`${profile.name || "User"} profile`}
                                className="profile-picture"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
                        ) : (
                            <div className="profile-picture default-picture">
                                {profile.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                        )}
                    </div>

                    {/* User Information */}
                    <div className="profile-info">
                        <h1>{profile.name || "User"}</h1>

                        {profile.email && (
                            <p className="profile-email">
                                {profile.email}
                            </p>
                        )}

                        {/* Bio */}
                        <div className="profile-bio">
                            <h3>About Me</h3>
                            <p>
                                {profile.bio || "No bio added yet."}
                            </p>
                        </div>

                        {/* Account Details */}
                        <div className="profile-details">
                            <div className="profile-detail">
                                <span className="detail-label">
                                    Member since
                                </span>

                                <span className="detail-value">
                                    {profile.created_at
                                        ? new Date(
                                            profile.created_at
                                        ).toLocaleDateString()
                                        : "N/A"}
                                </span>
                            </div>
                        </div>

                        {/* Existing Actions */}
                        {isOwnProfile ? (
                            <button
                                className="edit-profile-button"
                                onClick={() =>
                                    navigate("/edit-profile")
                                }
                            >
                                ✏️ Edit Profile
                            </button>
                        ) : (
                            <button
                                className="edit-profile-button"
                                onClick={() =>
                                    navigate(`/chat/${profile.id}`)
                                }
                            >
                                💬 Message
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
