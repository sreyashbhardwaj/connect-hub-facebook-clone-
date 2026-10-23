import { useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import { NavLink, useNavigate } from "react-router-dom";



import api from "../api/api";

import { logout } from "../redux/authSlice";

import { sendFriendRequest } from "../redux/friendSlice";



import "./FindFriends.css";
import "./FindFriends_profile_click.css";



function FindFriends() {

    const dispatch = useDispatch();

    const navigate = useNavigate();



    const { user } = useSelector((state) => state.auth);



    const [search, setSearch] = useState("");

    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(false);

    const [searchError, setSearchError] = useState("");

    const [sentRequests, setSentRequests] = useState([]);



    const userName = user?.name || user?.username || "User";

    const getPersonProfileImage = (person) => {
        const picture = person?.profile_picture;
        if (!picture) return "";
        if (picture.startsWith("http://") || picture.startsWith("https://")) return picture;
        return `http://localhost:5000${picture.startsWith("/") ? "" : "/"}${picture}`;
    };




    // Search users

    const handleSearch = async (e) => {

        e.preventDefault();



        const query = search.trim();



        if (!query) {

            setUsers([]);

            setSearchError("Please enter a name or email.");

            return;

        }



        try {

            setLoading(true);

            setSearchError("");



            const response = await api.get("/users/search", {

                params: { q: query },

            });



            const foundUsers = response.data.users || [];



            setUsers(

                foundUsers.filter(

                    (person) => String(person.id) !== String(user?.id)

                )

            );



            if (foundUsers.length === 0) {

                setSearchError("No users found.");

            }

        } catch (error) {

            console.error("User search error:", error);



            setUsers([]);

            setSearchError(

                error.response?.data?.message ||

                "Unable to search users. Please try again."

            );

        } finally {

            setLoading(false);

        }

    };



    // Send friend request

    const handleAddFriend = async (userId) => {

        try {

            await dispatch(sendFriendRequest(userId)).unwrap();



            setSentRequests((previous) => [...previous, userId]);

        } catch (error) {

            setSearchError(

                typeof error === "string"

                    ? error

                    : error?.message || "Unable to send friend request."

            );

        }

    };



    // Logout

    const handleLogout = () => {

        dispatch(logout());

        navigate("/login");

    };



    return (

        <div className="find-friends-layout">



            {/* Sidebar */}

            <aside className="find-friends-sidebar">



                {/* Logo */}

                <div className="find-friends-logo">

                    <div className="find-friends-logo-icon">C</div>

                    <h2>ConnectHub</h2>

                </div>





                {/* Navigation */}

                <div className="find-friends-menu">

                    <p className="find-friends-menu-title">MAIN MENU</p>



                    <NavLink

                        to="/dashboard"

                        className={({ isActive }) =>

                            `find-friends-menu-item ${isActive ? "active" : ""}`

                        }

                    >

                        <span className="menu-icon">▦</span>

                        <span>Dashboard</span>

                    </NavLink>



                    <NavLink

                        to="/find-friends"

                        className={({ isActive }) =>

                            `find-friends-menu-item ${isActive ? "active" : ""}`

                        }

                    >

                        <span className="menu-icon">♟</span>

                        <span>Find Friends</span>

                    </NavLink>



                    <NavLink

                        to="/friend-requests"

                        className={({ isActive }) =>

                            `find-friends-menu-item ${isActive ? "active" : ""}`

                        }

                    >

                        <span className="menu-icon">📩</span>

                        <span>Friend Requests</span>

                    </NavLink>



                    <NavLink

                        to="/friends"

                        className={({ isActive }) =>

                            `find-friends-menu-item ${isActive ? "active" : ""}`

                        }

                    >

                        <span className="menu-icon">🤝</span>

                        <span>My Friends</span>

                    </NavLink>





                </div>



                {/* Bottom Settings and Logout */}

                <div className="find-friends-sidebar-bottom">



                    <button

                        className="find-friends-logout"

                        onClick={handleLogout}

                    >

                        <span className="menu-icon">↪</span>

                        <span>Logout</span>

                    </button>

                </div>

            </aside>



            {/* Main Content */}

            <main className="find-friends-main">



                {/* Page Header */}

                <header className="find-friends-header">

                    <div>

                        <h1>Find Friends</h1>

                        <p>Discover people and grow your community.</p>

                    </div>



                    <div className="find-friends-header-profile">

                        <div className="header-avatar">

                            {userName.charAt(0).toUpperCase()}

                        </div>

                        <span>{userName}</span>

                    </div>

                </header>



                {/* Search Section */}

                <section className="find-friends-content">



                    <div className="find-friends-welcome">

                        <div>

                            <span className="find-friends-label">

                                CONNECT WITH PEOPLE

                            </span>



                            <h2>Find your people 👋</h2>



                            <p>

                                Search for people by name or email

                                and send them a friend request.

                            </p>

                        </div>



                        <div className="find-friends-illustration">

                            👥

                        </div>

                    </div>



                    {/* Search Form */}

                    <div className="find-friends-search-card">

                        <h2>Search People</h2>

                        <p>Enter a name or email to find users.</p>



                        <form

                            className="find-friends-search-form"

                            onSubmit={handleSearch}

                        >

                            <div className="search-input-wrapper">

                                <span className="search-icon">🔍</span>



                                <input

                                    type="text"

                                    placeholder="Search by name or email..."

                                    value={search}

                                    onChange={(e) => setSearch(e.target.value)}

                                />

                            </div>



                            <button

                                type="submit"

                                disabled={loading}

                            >

                                {loading ? "Searching..." : "Search"}

                            </button>

                        </form>

                    </div>



                    {/* Search Results */}

                    <div className="find-friends-results">



                        <div className="find-friends-results-header">

                            <div>

                                <h2>People You May Know</h2>

                                <p>

                                    {users.length > 0

                                        ? `${users.length} users found`

                                        : "Search to discover people"}

                                </p>

                            </div>

                        </div>



                        {loading ? (

                            <div className="find-friends-empty">

                                <div className="loading-spinner"></div>

                                <p>Searching for people...</p>

                            </div>

                        ) : searchError ? (

                            <div className="find-friends-empty">

                                <div className="empty-icon">🔍</div>

                                <p>{searchError}</p>

                            </div>

                        ) : users.length > 0 ? (

                            <div className="find-friends-users">

                                {users.map((person) => {

                                    const alreadySent =

                                        sentRequests.includes(person.id);



                                    return (

                                        <div

                                            className="find-friends-user-card"

                                            key={person.id}

                                        >

                                            <button
                                                type="button"
                                                className="user-card-avatar profile-photo-button"
                                                title="View profile"
                                                onClick={() => navigate(`/profile/${person.id}`)}
                                            >
                                                {getPersonProfileImage(person) ? (
                                                    <img
                                                        src={getPersonProfileImage(person)}
                                                        alt={`${person.name || person.username || "User"} profile`}
                                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                                    />
                                                ) : null}
                                                <span>{(person.name || person.username || person.email || "U").charAt(0).toUpperCase()}</span>
                                            </button>



                                            <div className="user-card-info">

                                                <h3>

                                                    {person.name ||

                                                        person.username ||

                                                        "ConnectHub User"}

                                                </h3>



                                                <p>{person.email}</p>

                                            </div>



                                            <button

                                                className={`add-friend-button ${

                                                    alreadySent ? "request-sent" : ""

                                                }`}

                                                onClick={() =>

                                                    handleAddFriend(person.id)

                                                }

                                                disabled={alreadySent}

                                            >

                                                {alreadySent

                                                    ? "Request Sent ✓"

                                                    : "+ Add Friend"}

                                            </button>

                                        </div>

                                    );

                                })}

                            </div>

                        ) : (

                            <div className="find-friends-empty">

                                <div className="empty-icon">👥</div>

                                <h3>No users to display</h3>

                                <p>

                                    Search for people to start

                                    connecting with them.

                                </p>

                            </div>

                        )}

                    </div>

                </section>

            </main>

        </div>

    );

}



export default FindFriends;