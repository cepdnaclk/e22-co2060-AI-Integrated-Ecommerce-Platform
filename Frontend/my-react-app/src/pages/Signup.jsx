import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import SuccessAnimation from "../components/SuccessAnimation";
import API_BASE_URL from "../config/api";

// Exchange Firebase token for backend JWT
async function syncBackendSession(idToken) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

const Signup = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Update profile with name
      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`
      });

      // 3. Get ID token and sync with backend
      const idToken = await userCredential.user.getIdToken();
      await syncBackendSession(idToken);

      // 4. Show success
      setIsSuccess(true);
    } catch (err) {
      console.error("❌ Signup error:", err);
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-[#0d1424] via-[#072454] to-[#1945a5]">
        <SuccessAnimation
          message="Account Created! Welcome to BEETA..."
          onDone={() => navigate("/login")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2 bg-blue-100">
      {/* LEFT PANEL */}
      <div className="hidden md:flex relative flex-col justify-center px-12 text-white bg-gradient-to-br from-[#0d1424] via-[#072454] to-[#1945a5]">
        <h2 className="text-4xl font-bold mb-6">JOIN US</h2>
        <p className="text-blue-100 max-w-md leading-relaxed">
          Create an account to start shopping and enjoy personalized recommendations.
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center bg-white min-h-screen md:min-h-0 py-12 md:py-0">
        <div className="w-full max-w-md px-8">
          <h3 className="text-2xl font-semibold text-gray-800 mb-2">Create Account</h3>
          <p className="text-gray-500 text-sm mb-6 text-center">Join the BEETA community today</p>

          {error && (
            <p className="mb-4 bg-red-100 text-red-600 text-sm p-2 rounded">
              {error}
            </p>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <input
              type="email"
              placeholder="Email Address"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            <button
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition duration-200"
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;

