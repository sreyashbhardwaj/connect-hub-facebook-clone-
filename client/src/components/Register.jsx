import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import {
    registerUser,
    clearError,
    clearRegistered,
} from "../redux/authSlice";

import "./Auth.css";

function Register() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { loading, error } = useSelector(
        (state) => state.auth
    );

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        dispatch(clearError());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        dispatch(clearError());

        try {
            const response = await dispatch(
                registerUser(formData)
            ).unwrap();

            dispatch(clearRegistered());

            // Save the user ID and email for OTP verification.
            navigate("/verify-otp", {
                state: {
                    userId: response.userId,
                    email: formData.email.trim().toLowerCase(),
                },
            });
        } catch (error) {
            console.error("Registration failed:", error);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-brand">
                    <h1>ConnectHub</h1>
                    <p>Meet. Connect. Chat.</p>
                </div>

                <h2>Create Account</h2>

                <p className="auth-subtitle">
                    Join ConnectHub and start connecting.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>

                        <input
                            type="text"
                            name="name"
                            placeholder="Enter your name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email Address</label>

                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>

                        <input
                            type="password"
                            name="password"
                            placeholder="Minimum 8 characters"
                            value={formData.password}
                            onChange={handleChange}
                            minLength={8}
                            required
                        />
                    </div>

                    {error && (
                        <p className="auth-error">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Creating Account..."
                            : "Create Account"}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account?
                    <Link to="/login"> Login</Link>
                </p>
            </div>
        </div>
    );
}

export default Register;