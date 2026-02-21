import React, { useEffect, useState } from "react";
import { fetchUserProfile } from "../services/userService";
import { useNavigate } from "react-router-dom";

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const getProfile = async () => {
            try {
                const data = await fetchUserProfile();
                setProfile(data);
            } catch (err) {
                console.error("Error fetching profile:", err);
                setError(err.response?.data?.message || err.message || "Failed to load profile");
            } finally {
                setLoading(false);
            }
        };

        getProfile();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050B2E] text-white flex justify-center items-center">
                <p className="text-xl text-blue-400 animate-pulse">Loading Profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#050B2E] text-white flex justify-center items-center">
                <div className="bg-red-900/40 px-8 py-5 rounded-xl border border-red-500/50 text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => navigate("/login")}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#050B2E] via-[#081A4A] to-[#020617] text-white px-6 py-10 flex flex-col items-center">

            <div className="w-full max-w-2xl flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Account</h1>
                <button
                    onClick={() => navigate(-1)}
                    className="text-gray-400 hover:text-white transition flex items-center gap-2"
                >
                    <span>&larr;</span> Back
                </button>
            </div>

            <div className="w-full max-w-2xl bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                {/* Glow Effect */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -z-10 -translate-x-1/2 translate-y-1/2"></div>

                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start z-10 relative">

                    {/* Profile Image Column */}
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-purple-500 shadow-lg">
                            <img
                                src={profile?.image || `https://ui-avatars.com/api/?name=${profile?.firstName || "User"}&background=0D8ABC&color=fff&size=128`}
                                alt="Profile"
                                className="w-full h-full rounded-full object-cover bg-[#0a192f] border-4 border-[#0a192f]"
                            />
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white">{profile?.firstName} {profile?.lastName}</h2>
                            <span className="inline-block mt-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-blue-500/30">
                                {profile?.role}
                            </span>
                        </div>
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 w-full space-y-6 md:pt-4">

                        <div className="border-b border-white/10 pb-4">
                            <p className="text-sm text-gray-400 mb-1">Email Address</p>
                            <p className="text-lg text-gray-100 flex items-center gap-2">
                                {profile?.email}
                                {profile?.isEmailVerified && (
                                    <span className="text-green-400 text-xs px-2 py-0.5 rounded-full bg-green-400/10 border border-green-400/20">Verified</span>
                                )}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Account Status</p>
                                <p className="text-gray-100 capitalize">
                                    {profile?.isBlocked ? (
                                        <span className="text-red-400">Blocked</span>
                                    ) : (
                                        <span className="text-green-400">Active</span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Member Since</p>
                                <p className="text-gray-100">
                                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button className="flex-1 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition text-sm font-medium">
                                Edit Profile
                            </button>
                            <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition text-sm font-medium shadow-lg shadow-blue-500/25">
                                Security Settings
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
