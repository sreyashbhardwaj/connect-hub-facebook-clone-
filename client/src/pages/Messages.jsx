import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { fetchFriends } from "../redux/friendSlice";

import "./Messages.css";

function Messages() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const {
        friends = [],
        loading = false,
        error = null,
    } = useSelector((state) => state.friends || {});

    useEffect(() => {
        dispatch(fetchFriends());
    }, [dispatch]);

    const openChat = (friend) => {
        const person = friend.friend || friend.user || friend;

        if (!person.id) {
            console.error("Friend ID not found:", person);
            return;
        }

        navigate(`/chat/${person.id}`);
    };

    return (
        <div className="messages-page">

            {/* HEADER */}

            <div className="messages-page-header">

                <div>
                    <h1>Messages</h1>

                    <p>
                        Chat with your ConnectHub friends.
                    </p>
                </div>

            </div>


            {/* CONTENT */}

            <div className="messages-content">

                <div className="messages-panel">

                    <div className="messages-panel-header">

                        <h2>Your Chats</h2>

                        <span>
                            {friends.length}{" "}
                            {friends.length === 1
                                ? "friend"
                                : "friends"}
                        </span>

                    </div>


                    {loading ? (

                        <div className="messages-empty">
                            Loading your friends...
                        </div>

                    ) : error ? (

                        <div className="messages-error">
                            {typeof error === "string"
                                ? error
                                : "Unable to load friends."}
                        </div>

                    ) : friends.length === 0 ? (

                        <div className="messages-empty">

                            <div className="messages-empty-icon">
                                💬
                            </div>

                            <h3>No friends yet</h3>

                            <p>
                                Add some friends to start chatting.
                            </p>

                        </div>

                    ) : (

                        <div className="messages-friends-list">

                            {friends.map((friend, index) => {

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
                                        className="message-friend-item"
                                        key={
                                            person.id || index
                                        }
                                        onClick={() =>
                                            openChat(friend)
                                        }
                                    >

                                        {/* AVATAR */}

                                        <div className="message-friend-avatar">

                                            {person.profile_picture ? (

                                                <img
                                                    src={
                                                        person.profile_picture
                                                    }
                                                    alt={name}
                                                />

                                            ) : (

                                                name
                                                    .charAt(0)
                                                    .toUpperCase()

                                            )}

                                        </div>


                                        {/* USER INFO */}

                                        <div className="message-friend-info">

                                            <h3>{name}</h3>

                                            <p>
                                                Click to open chat
                                            </p>

                                        </div>


                                        {/* ARROW */}

                                        <div className="message-friend-arrow">
                                            →
                                        </div>

                                    </div>
                                );
                            })}

                        </div>

                    )}

                </div>

            </div>

        </div>
    );
}

export default Messages;