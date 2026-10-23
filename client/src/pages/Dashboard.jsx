import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import {
    fetchFriends,
    fetchFriendRequests,
} from "../redux/friendSlice";

import { logout } from "../redux/authSlice";

import api from "../api/api";

import Chat from "./Chat";

import "./Dashboard.css";


function Dashboard() {

    const dispatch = useDispatch();
    const navigate = useNavigate();


    const { user } = useSelector(
        (state) => state.auth
    );


    const {
        friends = [],
        requests = [],
        loading = false,
    } = useSelector(
        (state) => state.friends || {}
    );


    // =====================================================
    // CHAT STATES
    // =====================================================

    const [chatSearch, setChatSearch] =
        useState("");

    const [chatTab, setChatTab] =
        useState("all");

    const [conversations, setConversations] =
        useState([]);

    const [activeChatUserId, setActiveChatUserId] =
        useState(null);


    // =====================================================
    // LOAD FRIENDS, REQUESTS AND CONVERSATIONS
    // =====================================================

    useEffect(() => {

        dispatch(fetchFriends());

        dispatch(fetchFriendRequests());

        fetchConversations();

    }, [dispatch]);


    // =====================================================
    // FETCH CONVERSATIONS
    // =====================================================

    const fetchConversations = async () => {

        try {

            const response =
                await api.get(
                    "/conversations"
                );

            setConversations(
                response.data.conversations || []
            );

        } catch (error) {

            console.error(
                "Error fetching conversations:",
                error
            );

        }

    };


    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = () => {

        dispatch(logout());

        navigate("/login");

    };


    // =====================================================
    // USER NAME
    // =====================================================

    const userName =
        user?.name ||
        user?.username ||
        "User";


    // =====================================================
    // MERGE FRIENDS WITH EXISTING CONVERSATIONS
    // =====================================================

    const chatList = friends.map((friend) => {
        const person = friend.friend || friend.user || friend;
        const conversation = conversations.find((item) => Number(item.friend_id) === Number(person.id));
        return {
            friend_id: person.id,
            friend_name: person.name || person.username || person.email || "Friend",
            profile_picture: person.profile_picture || "",
            last_message: conversation?.last_message || "",
            last_message_at: conversation?.last_message_at || null,
            unread_count: Number(conversation?.unread_count || 0),
            conversation_id: conversation?.conversation_id || null,
        };
    }).sort((a, b) => {
        if (a.last_message_at && b.last_message_at) return new Date(b.last_message_at) - new Date(a.last_message_at);
        if (a.last_message_at) return -1;
        if (b.last_message_at) return 1;
        return a.friend_name.localeCompare(b.friend_name);
    });

    const filteredChatList = chatList.filter((chat) => {
        const matchesSearch = chat.friend_name.toLowerCase().includes(chatSearch.toLowerCase());
        const matchesTab = chatTab === "all" || (chatTab === "unread" && chat.unread_count > 0);
        return matchesSearch && matchesTab;
    });


    // =====================================================
    // OPEN CHAT
    // =====================================================

    const openChat = async (conversation) => {

    if (!conversation?.friend_id) {
        return;
    }


    // ==========================================
    // MARK EXISTING CONVERSATION AS READ
    // ==========================================

    if (conversation.conversation_id) {

        try {

            await api.put(
                `/conversations/${conversation.conversation_id}/read`
            );

        } catch (error) {

            console.error(
                "Error marking messages as read:",
                error
            );

        }


        // ==========================================
        // UPDATE DASHBOARD IMMEDIATELY
        // ==========================================

        setConversations((previous) =>
            previous.map((item) => {

                if (
                    Number(item.conversation_id) ===
                    Number(conversation.conversation_id)
                ) {

                    return {
                        ...item,
                        unread_count: 0,
                    };

                }

                return item;

            })
        );

    }


    // ==========================================
    // OPEN FLOATING CHAT
    // ==========================================

    setActiveChatUserId(
        conversation.friend_id
    );

};


    // =====================================================
    // PROFILE IMAGE
    // =====================================================

    const getProfileImage = (person) => {

        if (!person?.profile_picture) {

            return "";

        }


        if (
            person.profile_picture.startsWith(
                "http://"
            ) ||
            person.profile_picture.startsWith(
                "https://"
            )
        ) {

            return person.profile_picture;

        }


        return (
            `http://localhost:5000` +
            person.profile_picture
        );

    };


    // =====================================================
    // FORMAT CHAT TIME
    // =====================================================

    const formatChatTime = (date) => {

        if (!date) {

            return "";

        }


        const messageDate =
            new Date(date);

        const now =
            new Date();


        const sameDay =
            messageDate.toDateString() ===
            now.toDateString();


        if (sameDay) {

            return messageDate.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit",
                }
            );

        }


        return messageDate.toLocaleDateString(
            [],
            {
                day: "2-digit",
                month: "2-digit",
            }
        );

    };


    return (

        <div className="dashboard">


            {/* =====================================================
                SIDEBAR
            ===================================================== */}

            <aside className="dashboard-sidebar">


                <div className="dashboard-logo">

                    <span className="logo-icon">
                        C
                    </span>

                    <h2>
                        ConnectHub
                    </h2>

                </div>


                <div className="sidebar-menu">

                    <p className="menu-heading">
                        MENU
                    </p>


                    <Link
                        to="/dashboard"
                        className="menu-item active"
                    >

                        <span>
                            ▦
                        </span>

                        Dashboard

                    </Link>


                    <Link
                        to="/find-friends"
                        className="menu-item"
                    >

                        <span>
                            👥
                        </span>

                        Find Friends

                    </Link>


                    <Link
                        to="/friend-requests"
                        className="menu-item"
                    >

                        <span>
                            📩
                        </span>

                        Friend Requests


                        {requests.length > 0 && (

                            <span className="menu-badge">
                                {requests.length}
                            </span>

                        )}

                    </Link>


                    <Link
                        to="/friends"
                        className="menu-item"
                    >

                        <span>
                            🤝
                        </span>

                        My Friends

                    </Link>


                    {/* Messages intentionally removed */}

                </div>


                <div className="sidebar-bottom">

                    <button
                        className="menu-item logout-button"
                        onClick={handleLogout}
                    >

                        <span>
                            ↪
                        </span>

                        Logout

                    </button>

                </div>

            </aside>


            {/* =====================================================
                MAIN CONTENT
            ===================================================== */}

            <main className="dashboard-main">


                {/* =====================================================
                    HEADER
                ===================================================== */}

                <header className="dashboard-header">

                    <div>

                        <h1>
                            Dashboard
                        </h1>

                        <p>
                            Stay connected with your people.
                        </p>

                    </div>


                   
<div
    className="dashboard-profile"
    onClick={() => navigate("/profile")}
    role="button"
    tabIndex={0}
    title="View Profile"
    onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate("/profile");
        }
    }}
>
    <div className="profile-avatar">
        {userName.charAt(0).toUpperCase()}
    </div>

    <div>
        <strong>{userName}</strong>
        <span>Member</span>
    </div>
</div>

                </header>


                {/* =====================================================
                    WELCOME
                ===================================================== */}

                <section className="welcome-section">

                    <div className="welcome-content">

                        <span className="welcome-label">
                            YOUR COMMUNITY
                        </span>


                        <h2>
                            Welcome back, {userName}! 👋
                        </h2>


                        <p>
                            Connect with friends, discover new people,
                            and keep in touch with your community.
                        </p>


                        <Link
                            to="/find-friends"
                            className="welcome-button"
                        >

                            Find Friends

                            <span>
                                →
                            </span>

                        </Link>

                    </div>


                    <div className="welcome-illustration">

                        <div className="illustration-circle">
                            👥
                        </div>

                    </div>

                </section>


                {/* =====================================================
                    STATISTICS
                ===================================================== */}

                <section className="dashboard-stats">


                    <div className="stat-card">

                        <div className="stat-icon friends-icon">
                            👥
                        </div>


                        <div>

                            <p>
                                Total Friends
                            </p>

                            <h2>
                                {friends.length}
                            </h2>

                            <span>
                                People you're connected with
                            </span>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon requests-icon">
                            📩
                        </div>


                        <div>

                            <p>
                                Friend Requests
                            </p>

                            <h2>
                                {requests.length}
                            </h2>

                            <span>
                                Requests waiting for you
                            </span>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon messages-icon">
                            💬
                        </div>


                        <div>

                            <p>
                                Chats
                            </p>

                            <h2>
                                {conversations.length}
                            </h2>

                            <span>
                                Your conversations
                            </span>

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    LOWER SECTION
                ===================================================== */}

                <section className="dashboard-content">


                    {/* =====================================================
                        MY FRIENDS
                    ===================================================== */}

                    <div className="dashboard-panel">


                        <div className="panel-header">

                            <div>

                                <h2>
                                    My Friends
                                </h2>

                                <p>
                                    Your connections
                                </p>

                            </div>


                            <Link
                                to="/friends"
                                className="view-all"
                            >
                                View all →
                            </Link>

                        </div>


                        {loading ? (

                            <div className="dashboard-empty">
                                Loading friends...
                            </div>

                        ) : friends.length > 0 ? (

                            <div className="recent-friends-list">

                                {friends
                                    .slice(0, 5)
                                    .map(
                                        (
                                            friend,
                                            index
                                        ) => {

                                            const person =
                                                friend.friend ||
                                                friend.user ||
                                                friend;


                                            const name =
                                                person.name ||
                                                person.username ||
                                                person.email ||
                                                "Friend";


                                            return (

                                                <div
                                                    className="recent-friend"
                                                    key={
                                                        person.id ||
                                                        index
                                                    }
                                                >

                                                    <div className="friend-avatar">

                                                        {getProfileImage(
                                                            person
                                                        ) ? (

                                                            <img
                                                                src={getProfileImage(
                                                                    person
                                                                )}
                                                                alt={name}
                                                            />

                                                        ) : (

                                                            name
                                                                .charAt(0)
                                                                .toUpperCase()

                                                        )}

                                                    </div>


                                                    <div className="friend-details">

                                                        <strong>
                                                            {name}
                                                        </strong>

                                                        <span>
                                                            {person.email ||
                                                                "ConnectHub member"}
                                                        </span>

                                                    </div>


                                                    <span className="online-status">
                                                        Connected
                                                    </span>

                                                </div>

                                            );

                                        }
                                    )}

                            </div>

                        ) : (

                            <div className="dashboard-empty">

                                <div className="empty-emoji">
                                    👥
                                </div>

                                <h3>
                                    No friends yet
                                </h3>

                                <p>
                                    Find people and start building
                                    your community.
                                </p>

                                <Link to="/find-friends">
                                    Find Friends
                                </Link>

                            </div>

                        )}

                    </div>


                    {/* =====================================================
                        CHATS
                    ===================================================== */}

                    <div className="dashboard-panel chats-panel">


                        {/* CHAT HEADER */}

                        <div className="chats-header">

                            <div className="chats-title-row">

                                <h2>
                                    Chats
                                </h2>

                                <Link
                                    to="/messages"
                                    className="chats-open-button"
                                >
                                    ↗
                                </Link>

                            </div>


                            <div className="chats-header-icons">

                            </div>

                        </div>


                        {/* SEARCH */}

                        <div className="chat-search-box">

                            <span>
                                🔍
                            </span>


                            <input
                                type="text"
                                placeholder="Search Messenger"
                                value={chatSearch}
                                onChange={(e) =>
                                    setChatSearch(
                                        e.target.value
                                    )
                                }
                            />

                        </div>


                        {/* =====================================================
                            ALL / UNREAD TABS
                        ===================================================== */}

                        <div className="chat-tabs">


                            <button
                                type="button"
                                className={
                                    `chat-tab ${
                                        chatTab === "all"
                                            ? "active"
                                            : ""
                                    }`
                                }
                                onClick={() =>
                                    setChatTab("all")
                                }
                            >
                                All
                            </button>


                            <button
                                type="button"
                                className={
                                    `chat-tab ${
                                        chatTab === "unread"
                                            ? "active"
                                            : ""
                                    }`
                                }
                                onClick={() =>
                                    setChatTab("unread")
                                }
                            >
                                Unread
                            </button>

                        </div>


                        {/* BACKUP MESSAGE */}

                        <div className="chat-backup-notice">

                            <span>
                                Chats are securely stored.
                            </span>

                            <span className="chat-backup-link">
                                View all
                            </span>

                        </div>


                        {/* =====================================================
                            CHAT LIST
                        ===================================================== */}

                        <div className="dashboard-chat-list">

                            {filteredChatList.length === 0 ? (
                                <div className="dashboard-chat-empty">
                                    <div>💬</div>
                                    <h3>{chatTab === "unread" ? "No unread chats" : "No chats yet"}</h3>
                                    <p>{chatTab === "unread" ? "You're all caught up." : "Start a conversation with a friend."}</p>
                                </div>
                            ) : (
                                filteredChatList.slice(0, 5).map((chat) => {
                                    const name = chat.friend_name || "Friend";
                                    let image = "";
                                    if (chat.profile_picture) {
                                        image = chat.profile_picture.startsWith("http://") || chat.profile_picture.startsWith("https://")
                                            ? chat.profile_picture
                                            : `http://localhost:5000${chat.profile_picture}`;
                                    }
                                    const unreadCount = Number(chat.unread_count || 0);
                                    return (
                                        <button type="button" className={`dashboard-chat-item ${unreadCount > 0 ? "chat-unread" : ""}`} key={chat.friend_id} onClick={() => openChat(chat)}>
                                            <div className="dashboard-chat-avatar">
                                                {image ? <img src={image} alt={name} /> : name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="dashboard-chat-info">
                                                <strong>{name}</strong>
                                                <span className={unreadCount > 0 ? "chat-last-message unread-text" : "chat-last-message"}>
                                                    {chat.last_message || "No messages yet"}
                                                </span>
                                            </div>
                                            <div className="dashboard-chat-meta">
                                                {chat.last_message_at && <small>{formatChatTime(chat.last_message_at)}</small>}
                                                {unreadCount > 0 && <span className="chat-unread-badge">{unreadCount}</span>}
                                            </div>
                                            <span className="dashboard-chat-arrow">›</span>
                                        </button>
                                    );
                                })
                            )}

                        </div>

                    </div>

                </section>


                {/* FOOTER */}

                <footer className="dashboard-footer">
                    © 2026 ConnectHub. Stay connected.
                </footer>


                {/* =====================================================
                    FLOATING CHAT WINDOW
                ===================================================== */}

                {activeChatUserId && (

                    <Chat
                        userId={activeChatUserId}
                        onClose={async () => {

                            setActiveChatUserId(
                                null
                            );

                            await fetchConversations();

                        }}
                    />

                )}

            </main>

        </div>

    );

}


export default Dashboard;