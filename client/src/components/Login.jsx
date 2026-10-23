import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, clearError } from "../redux/authSlice";
import "./Auth.css";

function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate()

    const { loading, error } = useSelector(
        (state) => state.auth
    );

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });

        dispatch(clearError());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await dispatch(loginUser(formData)).unwrap();
            navigate("/dashboard");
        } catch (error) {
            console.error("Login failed:", error);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-brand">
                    <h1>ConnectHub</h1>
                    <p>Connect with people who matter.</p>
                </div>

                <h2>Welcome Back!</h2>
                <p className="auth-subtitle">
                    Login to continue chatting with your friends.
                </p>

                <form onSubmit={handleSubmit}>
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
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {error && (
                        <p className="auth-error">{error}</p>
                    )}

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account?
                    <Link to="/register"> Create Account</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;