import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

import "./EditProfile.css";

function EditProfile() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        bio: "",
    });

    const [profileImage, setProfileImage] = useState(null);
    const [previewImage, setPreviewImage] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // ==================================================
    // FETCH PROFILE
    // ==================================================

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/profile");

            if (response.data.success) {
                const user = response.data.user;

                setFormData({
                    name: user.name || "",
                    bio: user.bio || "",
                });

                // Existing profile image
                if (user.profile_picture) {
                    setPreviewImage(
                        `http://localhost:5000${user.profile_picture}`
                    );
                }
            }

        } catch (error) {

            console.error(
                "Profile fetch error:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Unable to load profile."
            );

        } finally {
            setLoading(false);
        }
    };


    // ==================================================
    // HANDLE TEXT INPUT
    // ==================================================

    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

    };


    // ==================================================
    // HANDLE PROFILE IMAGE
    // ==================================================

    const handleImageChange = (e) => {

        const file = e.target.files[0];

        if (!file) {
            return;
        }

        // Allowed image types
        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {

            setError(
                "Only JPG, JPEG, PNG and WEBP images are allowed."
            );

            return;
        }

        // Maximum 5 MB
        if (file.size > 5 * 1024 * 1024) {

            setError(
                "Profile image must be less than 5MB."
            );

            return;
        }

        setError("");
        setProfileImage(file);

        // Create preview
        const imageURL =
            URL.createObjectURL(file);

        setPreviewImage(imageURL);

    };


    // ==================================================
    // SAVE PROFILE
    // ==================================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setMessage("");

        // Validate name
        if (!formData.name.trim()) {

            setError(
                "Name cannot be empty."
            );

            return;
        }

        try {

            setSaving(true);

            // Create FormData
            const data = new FormData();

            // Add name
            data.append(
                "name",
                formData.name.trim()
            );

            // Add bio
            data.append(
                "bio",
                formData.bio.trim()
            );

            // Add image if selected
            if (profileImage) {

                data.append(
                    "profile_picture",
                    profileImage
                );

            }

            // Send to backend
            const response = await api.put(
                "/profile",
                data
            );

            if (response.data.success) {

                setMessage(
                    "Profile updated successfully!"
                );

                // Go back to profile
                setTimeout(() => {

                    navigate("/profile");

                }, 800);

            }

        } catch (error) {

            console.error(
                "Profile update error:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Unable to update profile."
            );

        } finally {

            setSaving(false);

        }

    };


    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {

        return (
            <div className="edit-profile-page">

                <div className="edit-loading">
                    Loading profile...
                </div>

            </div>
        );

    }


    // ==================================================
    // PAGE
    // ==================================================

    return (
        <div className="edit-profile-page">

            <div className="edit-profile-card">

                {/* Header */}

                <div className="edit-profile-header">

                    <h1>
                        Edit Profile
                    </h1>

                    <p>
                        Update your ConnectHub profile
                    </p>

                </div>


                {/* Error */}

                {error && (
                    <div className="edit-error">
                        {error}
                    </div>
                )}


                {/* Success */}

                {message && (
                    <div className="edit-success">
                        {message}
                    </div>
                )}


                <form onSubmit={handleSubmit}>

                    {/* =================================
                        PROFILE IMAGE
                    ================================= */}

                    <div className="profile-image-section">

                        <div className="profile-image-preview">

                            {previewImage ? (

                                <img
                                    src={previewImage}
                                    alt="Profile preview"
                                />

                            ) : (

                                <div className="profile-image-placeholder">
                                    👤
                                </div>

                            )}

                        </div>


                        <div className="profile-image-controls">

                            <label
                                htmlFor="profile_picture"
                                className="choose-image-button"
                            >
                                📷 Choose Profile Picture
                            </label>

                            <input
                                id="profile_picture"
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handleImageChange}
                                hidden
                            />

                            <p>
                                JPG, PNG or WEBP
                                <br />
                                Maximum size: 5MB
                            </p>

                        </div>

                    </div>


                    {/* =================================
                        NAME
                    ================================= */}

                    <div className="form-group">

                        <label htmlFor="name">
                            Name
                        </label>

                        <input
                            id="name"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter your name"
                        />

                    </div>


                    {/* =================================
                        BIO
                    ================================= */}

                    <div className="form-group">

                        <label htmlFor="bio">
                            Bio
                        </label>

                        <textarea
                            id="bio"
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder="Tell something about yourself..."
                            rows="5"
                            maxLength="500"
                        />

                        <small>
                            {formData.bio.length}/500
                        </small>

                    </div>


                    {/* =================================
                        BUTTONS
                    ================================= */}

                    <div className="edit-buttons">

                        <button
                            type="button"
                            className="cancel-button"
                            onClick={() =>
                                navigate("/profile")
                            }
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="save-button"
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : "Save Changes"}
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
}

export default EditProfile;