import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import { fetchFriends } from "../redux/friendSlice";
import api from "../api/api";

import "./MyFriends.css";

function MyFriends() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const {
        friends = [],
        loading = false,
        error = null,
    } = useSelector((state) => state.friends || {});

    const [search, setSearch] = useState("");
    const [openMenuId, setOpenMenuId] = useState(null);
    const [removingFriendId, setRemovingFriendId] = useState(null);

    // Load friends
    useEffect(() => {
        dispatch(fetchFriends());
    }, [dispatch]);

    // Close the three-dot menu when clicking outside it
    useEffect(() => {
        const handleClickOutside = () => {
            setOpenMenuId(null);
        };

        if (openMenuId !== null) {
            document.addEventListener("click", handleClickOutside);
        }

        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, [openMenuId]);

    // Filter friends by name or email
    const filteredFriends = friends.filter((friend) => {
        const person = friend.friend || friend.user || friend;
        const name = person.name || person.username || "";
        const email = person.email || "";

        return (
            name.toLowerCase().includes(search.toLowerCase()) ||
            email.toLowerCase().includes(search.toLowerCase())
        );
    });

    // Open chat and remember that the user came from My Friends
    const openChat = (friend) => {
        const person = friend.friend || friend.user || friend;

        if (!person.id) {
            console.error("Friend ID not found:", person);
            return;
        }

        setOpenMenuId(null);

        navigate(`/chat/${person.id}`, {
            state: { from: "/friends" },
        });
    };

    // Remove friend
    const removeFriend = async (friend) => {
        const person = friend.friend || friend.user || friend;

        if (!person.id) {
            console.error("Friend ID not found:", person);
            return;
        }

        const friendName =
            person.name ||
            person.username ||
            person.email ||
            "this friend";

        const confirmed = window.confirm(
            `Are you sure you want to remove ${friendName} from your friends?`
        );

        if (!confirmed) {
            setOpenMenuId(null);
            return;
        }

        try {
            setRemovingFriendId(person.id);
            setOpenMenuId(null);

            // Existing backend endpoint
            await api.delete(`/friends/${person.id}`);

            // Refresh the friend list
            dispatch(fetchFriends());
        } catch (error) {
            console.error("Remove friend error:", error);

            alert(
                error.response?.data?.message ||
                "Unable to remove friend."
            );
        } finally {
            setRemovingFriendId(null);
        }
    };

    // Get profile image URL
    const getProfileImage = (person) => {
        const picture = person?.profile_picture;

        if (!picture) {
            return "";
        }

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

    return (
        <div className="my-friends-page">
            {/* Sidebar */}
            <aside className="friends-sidebar">
                <div className="friends-logo">
                    <span className="friends-logo-icon">C</span>
                    <h2>ConnectHub</h2>
                </div>

                <p className="friends-menu-title">MENU</p>

                <nav className="friends-nav">
                    <Link
                        to="/dashboard"
                        className="friends-nav-item"
                    >
                        ▦ Dashboard
                    </Link>

                    <Link
                        to="/find-friends"
                        className="friends-nav-item"
                    >
                        👥 Find Friends
                    </Link>

                    <Link
                        to="/friend-requests"
                        className="friends-nav-item"
                    >
                        📩 Friend Requests
                    </Link>

                    <Link
                        to="/friends"
                        className="friends-nav-item active"
                    >
                        🤝 My Friends
                    </Link>
                </nav>
            </aside>

            {/* Main content */}
            <main className="my-friends-main">
                <header className="my-friends-header">
                    <div>
                        <h1>My Friends</h1>
                        <p>All your connections in one place.</p>
                    </div>

                    <Link
                        to="/find-friends"
                        className="find-more-button"
                    >
                        + Find Friends
                    </Link>
                </header>

                {/* Welcome banner */}
                <section className="friends-welcome">
                    <div>
                        <span>YOUR COMMUNITY</span>
                        <h2>Your people, your connections 🤝</h2>
                        <p>
                            Stay connected with the people who matter to you.
                        </p>
                    </div>

                    <div className="friends-welcome-icon">👥</div>
                </section>

                {/* Friend count */}
                <section className="friends-stats">
                    <div className="friends-stat-card">
                        <div className="friends-stat-icon">👥</div>

                        <div>
                            <p>Total Friends</p>
                            <h2>{friends.length}</h2>
                        </div>
                    </div>
                </section>

                {/* Friends list */}
                <section className="friends-list-panel">
                    <div className="friends-list-header">
                        <div>
                            <h2>All Friends</h2>
                            <p>
                                {friends.length}{" "}
                                {friends.length === 1 ? "friend" : "friends"}
                            </p>
                        </div>

                        <input
                            type="text"
                            placeholder="Search your friends..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="friends-empty">
                            Loading your friends...
                        </div>
                    ) : error ? (
                        <div className="friends-error">
                            {typeof error === "string"
                                ? error
                                : "Unable to load friends."}
                        </div>
                    ) : filteredFriends.length > 0 ? (
                        <div className="friends-grid">
                            {filteredFriends.map((friend, index) => {
                                const person =
                                    friend.friend || friend.user || friend;

                                const name =
                                    person.name ||
                                    person.username ||
                                    person.email ||
                                    "Friend";

                                const image = getProfileImage(person);

                                return (
                                    <div
                                        className="my-friend-card"
                                        key={person.id || index}
                                    >
                                        {/* Three-dot menu */}
                                        <div
                                            className="friend-menu-wrapper"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                type="button"
                                                className="friend-menu-button"
                                                aria-label="Friend options"
                                                aria-expanded={
                                                    openMenuId === person.id
                                                }
                                                onClick={(e) => {
                                                    e.stopPropagation();

                                                    setOpenMenuId(
                                                        openMenuId === person.id
                                                            ? null
                                                            : person.id
                                                    );
                                                }}
                                            >
                                                ⋮
                                            </button>

                                            {openMenuId === person.id && (
                                                <div
                                                    className="friend-dropdown"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openChat(friend)
                                                        }
                                                    >
                                                        <span className="friend-option-icon">
                                                            💬
                                                        </span>
                                                        <span>Message</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="remove-friend-option"
                                                        disabled={
                                                            removingFriendId ===
                                                            person.id
                                                        }
                                                        onClick={() =>
                                                            removeFriend(friend)
                                                        }
                                                    >
                                                        <span className="friend-option-icon">
                                                            🗑️
                                                        </span>
                                                        <span>
                                                            {removingFriendId ===
                                                            person.id
                                                                ? "Removing..."
                                                                : "Remove Friend"}
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Profile photo */}
                                        <div className="my-friend-avatar">
                                            {image ? (
                                                <img
                                                    src={image}
                                                    alt={name}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display =
                                                            "none";
                                                    }}
                                                />
                                            ) : (
                                                name.charAt(0).toUpperCase()
                                            )}
                                        </div>

                                        <h3>{name}</h3>

                                        <p>
                                            {person.email ||
                                                "ConnectHub member"}
                                        </p>

                                        <span className="friend-connected">
                                            ● Connected
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="friends-empty">
                            <div className="friends-empty-icon">👥</div>

                            <h3>
                                {search
                                    ? "No matching friends"
                                    : "You haven't added any friends yet"}
                            </h3>

                            <p>
                                {search
                                    ? "Try searching with another name or email."
                                    : "Find people and start building your community."}
                            </p>

                            {!search && (
                                <Link to="/find-friends">
                                    Find Friends
                                </Link>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default MyFriends;