import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import friendReducer from "./friendSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    friends: friendReducer,
  },
});