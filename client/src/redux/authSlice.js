
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";

// Safely get saved user
const getSavedUser = () => {
    try {
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    } catch (error) {
        console.error("SAVED USER ERROR:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        return null;
    }
};

const savedUser = getSavedUser();
const savedToken = localStorage.getItem("token");

// Registration API
export const registerUser = createAsyncThunk(
    "auth/register",
    async (userData, { rejectWithValue }) => {
        try {
            const response = await api.post(
                "/auth/register",
                userData
            );

            return response.data;
        } catch (error) {
            console.error("REGISTRATION ERROR:", error);
            console.error("REGISTRATION STATUS:", error.response?.status);
            console.error("REGISTRATION RESPONSE:", error.response?.data);

            return rejectWithValue(
                error.response?.data?.message ||
                error.message ||
                "Registration failed"
            );
        }
    }
);

// Login API
export const loginUser = createAsyncThunk(
    "auth/login",
    async (credentials, { rejectWithValue }) => {
        try {
            // Log the destination without logging the password
            console.log("========== CONNECTHUB LOGIN ==========");
            console.log("API BASE URL:", api.defaults.baseURL);
            console.log("LOGIN ENDPOINT:", `${api.defaults.baseURL}/auth/login`);
            console.log("LOGIN EMAIL:", credentials.email);

            const response = await api.post(
                "/auth/login",
                credentials
            );

            const data = response.data;

            // Debug backend response
            console.log("LOGIN HTTP STATUS:", response.status);
            console.log("LOGIN RESPONSE:", data);

            const { token, user } = data;

            // Validate the response
            if (!token || !user || user.id == null) {
                console.error(
                    "INVALID LOGIN RESPONSE: token, user, or user.id is missing"
                );

                return rejectWithValue(
                    data?.message ||
                    "Invalid login response from server"
                );
            }

            // Save authentication details
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));

            console.log("CONNECTHUB LOGIN SUCCESS");

            return { token, user };
        } catch (error) {
            // Detailed diagnostics
            console.error("LOGIN ERROR:", error.message);
            console.error("LOGIN STATUS:", error.response?.status);
            console.error("LOGIN RESPONSE:", error.response?.data);

            if (error.response) {
                return rejectWithValue(
                    error.response.data?.message ||
                    `Login failed (${error.response.status})`
                );
            }

            if (error.request) {
                return rejectWithValue(
                    "Unable to reach the backend. Check the API URL and network connection."
                );
            }

            return rejectWithValue(
                error.message || "Login failed"
            );
        }
    }
);

// Authentication state
const authSlice = createSlice({
    name: "auth",

    initialState: {
        user: savedToken ? savedUser : null,
        token: savedToken,
        loading: false,
        error: null,
        registered: false,
    },

    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;

            localStorage.removeItem("token");
            localStorage.removeItem("user");
        },

        clearError: (state) => {
            state.error = null;
        },

        clearRegistered: (state) => {
            state.registered = false;
        },
    },

    extraReducers: (builder) => {
        builder
            // Registration
            .addCase(registerUser.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.registered = false;
            })
            .addCase(registerUser.fulfilled, (state) => {
                state.loading = false;
                state.registered = true;
                state.error = null;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Registration failed";
            })

            // Login
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Login failed";
            });
    },
});

export const {
    logout,
    clearError,
    clearRegistered,
} = authSlice.actions;

export default authSlice.reducer;
