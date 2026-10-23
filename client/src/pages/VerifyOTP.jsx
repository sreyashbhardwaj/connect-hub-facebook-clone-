import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import "../components/Auth.css";
function VerifyOTP() {
    const location = useLocation();
    const navigate = useNavigate();

    const userId = location.state?.userId;
    const email = location.state?.email || "";

    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const handleVerify = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!userId) {
            setError("User information is missing. Please register again.");
            return;
        }

        if (!/^\d{6}$/.test(otp)) {
            setError("Please enter a valid six-digit OTP.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post(
                "/auth/verify-otp",
                {
                    userId,
                    otp,
                }
            );

            setMessage(response.data.message);
            navigate("/login", {
                state: {
                    message: "Email verified successfully. Please log in.",
                },
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "OTP verification failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError("");
        setMessage("");

        if (!userId) {
            setError("User information is missing. Please register again.");
            return;
        }

        try {
            setResending(true);

            const response = await api.post(
                "/auth/resend-otp",
                { userId }
            );

            setMessage(response.data.message);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to resend OTP. Please try again."
            );
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-brand">
                    <h1>ConnectHub</h1>
                    <p>Meet. Connect. Chat.</p>
                </div>

                <h2>Verify Your Email</h2>

                <p className="auth-subtitle">
                    Enter the six-digit OTP sent to
                    <br />
                    <strong>{email}</strong>
                </p>

                <form onSubmit={handleVerify}>
                    <div className="form-group">
                        <label htmlFor="otp">Verification Code</label>

                        <input
                            id="otp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => {
                                setOtp(
                                    e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 6)
                                );
                                setError("");
                            }}
                            maxLength={6}
                            required
                        />
                    </div>

                    {error && (
                        <p className="auth-error">{error}</p>
                    )}

                    {message && (
                        <p className="auth-success">{message}</p>
                    )}

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading || otp.length !== 6}
                    >
                        {loading ? "Verifying..." : "Verify Email"}
                    </button>
                </form>

                <p className="auth-footer">
                    Didn't receive the OTP?
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending}
                        className="auth-link-button"
                    >
                        {resending ? "Sending..." : " Resend OTP"}
                    </button>
                </p>

                <p className="auth-footer">
                    <Link to="/register">Back to Registration</Link>
                </p>
            </div>
        </div>
    );
}

export default VerifyOTP;