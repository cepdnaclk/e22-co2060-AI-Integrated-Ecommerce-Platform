import { useState } from "react";
import "../index.css";

import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

const Login = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔹 SEND FIREBASE TOKEN TO BACKEND
  const sendTokenToBackend = async (idToken) => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Backend login failed");
      }

      console.log("✅ Backend response:", data);

      // Store YOUR backend JWT (not Firebase token)
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (onClose) onClose();

      return data;
    } catch (err) {
      console.error("❌ Backend error:", err);
      setError("Backend connection failed");
    }
  };

  // 🔹 EMAIL + PASSWORD LOGIN
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const idToken = await userCredential.user.getIdToken();
<<<<<<< HEAD
      await sendTokenToBackend(idToken);
    } catch (err) {
=======

      await sendTokenToBackend(idToken);
    } catch (err) {
      console.error("❌ Firebase login error:", err);
>>>>>>> origin/dev_yuneth
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
<<<<<<< HEAD
      const idToken = await result.user.getIdToken();
      await sendTokenToBackend(idToken);
    } catch (err) {
=======

      const idToken = await result.user.getIdToken();

      await sendTokenToBackend(idToken);
    } catch (err) {
      console.error("❌ Google login error:", err);
>>>>>>> origin/dev_yuneth
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen grid grid-cols-1 md:grid-cols-2 bg-blue-100">
<<<<<<< HEAD
=======
      
>>>>>>> origin/dev_yuneth
      {/* LEFT PANEL */}
      <div className="relative flex flex-col justify-center px-12 text-white bg-gradient-to-br from-[#0d1424] via-[#072454] to-[#1945a5]">
        <h2 className="text-4xl font-bold mb-6">WELCOME</h2>
        <p className="text-blue-100 max-w-md leading-relaxed">
          Log in to access your dashboard and manage your account securely.
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center bg-white">
        <div className="w-full max-w-md px-8">
<<<<<<< HEAD
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">Sign in</h3>
=======
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">
            Sign in
          </h3>
>>>>>>> origin/dev_yuneth

          {error && (
            <p className="mb-4 bg-red-100 text-red-600 text-sm p-2 rounded">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
<<<<<<< HEAD
=======

>>>>>>> origin/dev_yuneth
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full px-4 py-2 border rounded-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
<<<<<<< HEAD
=======

>>>>>>> origin/dev_yuneth
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-sm text-blue-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

<<<<<<< HEAD
            {/* 🔥 GOOGLE LOGIN BUTTON */}
=======
            {/* GOOGLE LOGIN */}
>>>>>>> origin/dev_yuneth
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full border border-gray-300 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Continue with Google
            </button>
<<<<<<< HEAD
=======

>>>>>>> origin/dev_yuneth
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
