import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";

// 1. Get all friends
export const fetchFriends = createAsyncThunk(
    "friends/fetchFriends",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/friends");
            return response.data.friends || [];
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to fetch friends"
            );
        }
    }
);

// 2. Get received friend requests
export const fetchFriendRequests = createAsyncThunk(
    "friends/fetchRequests",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/friends/requests");
            return response.data.requests || [];
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to fetch requests"
            );
        }
    }
);

// 3. Send a friend request
export const sendFriendRequest = createAsyncThunk(
    "friends/sendRequest",
    async (userId, { rejectWithValue }) => {
        try {
            const response = await api.post(
                `/friends/request/${userId}`
            );
            return { userId, ...response.data };
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to send request"
            );
        }
    }
);

// 4. Accept a friend request
export const acceptFriendRequest = createAsyncThunk(
    "friends/acceptRequest",
    async (requestId, { rejectWithValue }) => {
        try {
            const response = await api.put(
                `/friends/accept/${requestId}`
            );
            return { requestId, ...response.data };
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to accept request"
            );
        }
    }
);

// 5. Reject a friend request
export const rejectFriendRequest = createAsyncThunk(
    "friends/rejectRequest",
    async (requestId, { rejectWithValue }) => {
        try {
            const response = await api.put(
                `/friends/reject/${requestId}`
            );
            return { requestId, ...response.data };
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to reject request"
            );
        }
    }
);

// Redux state
const friendSlice = createSlice({
    name: "friends",

    initialState: {
        friends: [],
        requests: [],
        loading: false,
        error: null,
        message: null
    },

    reducers: {
        clearFriendError: (state) => {
            state.error = null;
        },

        clearFriendMessage: (state) => {
            state.message = null;
        }
    },

    extraReducers: (builder) => {
        builder

            // Fetch friends
            .addCase(fetchFriends.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchFriends.fulfilled, (state, action) => {
                state.loading = false;
                state.friends = action.payload;
            })
            .addCase(fetchFriends.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Fetch requests
            .addCase(fetchFriendRequests.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchFriendRequests.fulfilled, (state, action) => {
                state.loading = false;
                state.requests = action.payload;
            })
            .addCase(fetchFriendRequests.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Send request
            .addCase(sendFriendRequest.pending, (state) => {
                state.error = null;
                state.message = null;
            })
            .addCase(sendFriendRequest.fulfilled, (state) => {
                state.message = "Friend request sent successfully";
            })
            .addCase(sendFriendRequest.rejected, (state, action) => {
                state.error = action.payload;
            })

            // Accept request
            .addCase(acceptFriendRequest.pending, (state) => {
                state.error = null;
                state.message = null;
            })
            .addCase(acceptFriendRequest.fulfilled, (state, action) => {
                state.requests = state.requests.filter(
                    (request) =>
                        request.request_id !== action.payload.requestId
                );
                state.message = "Friend request accepted";
            })
            .addCase(acceptFriendRequest.rejected, (state, action) => {
                state.error = action.payload;
            })

            // Reject request
            .addCase(rejectFriendRequest.pending, (state) => {
                state.error = null;
                state.message = null;
            })
            .addCase(rejectFriendRequest.fulfilled, (state, action) => {
                state.requests = state.requests.filter(
                    (request) =>
                        request.request_id !== action.payload.requestId
                );
                state.message = "Friend request rejected";
            })
            .addCase(rejectFriendRequest.rejected, (state, action) => {
                state.error = action.payload;
            });
    }
});

export const {
    clearFriendError,
    clearFriendMessage
} = friendSlice.actions;

export default friendSlice.reducer;