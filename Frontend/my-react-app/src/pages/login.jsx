import { useState } from "react";
import "../index.css";

const Login = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (onClose) onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen grid grid-cols-1 md:grid-cols-2 bg-blue-100">
      {/* LEFT — BLUE FULL PANEL */}
      <div
        className="
  relative flex flex-col justify-center px-12 text-white
  bg-gradient-to-br from-[#0d1424] via-[#072454] to-[#1945a5]
  bg-[length:300%_300%] animate-gradient
"
      >
        <h2 className="text-4xl font-bold mb-6">WELCOME</h2>
        <p className="text-blue-100 max-w-md leading-relaxed">
          Log in to access your dashboard and manage your account securely.
        </p>

        {/* Decorative circles */}
        <div className="absolute bottom-16 left-16 w-32 h-32 bg-blue-400 rounded-full opacity-40" />
        <div className="absolute bottom-32 left-40 w-20 h-20 bg-blue-300 rounded-full opacity-40" />
      </div>

      {/* RIGHT — WHITE FULL PANEL */}
      <div className="flex items-center justify-center bg-white">
        <div className="w-full max-w-md px-8">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">Sign in</h3>

          {error && (
            <p className="mb-4 bg-red-100 text-red-600 text-sm p-2 rounded">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-sm text-blue-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" />
                Remember me
              </label>
              <span className="text-blue-600 cursor-pointer hover:underline">
                Forgot Password?
              </span>
            </div>

            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <button
              type="button"
              className="w-full border border-gray-300 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Sign in with other
            </button>
          </form>

          <p className="text-sm text-center mt-6 text-gray-600">
            Don’t have an account?{" "}
            <span className="text-blue-600 cursor-pointer hover:underline">
              Sign up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
