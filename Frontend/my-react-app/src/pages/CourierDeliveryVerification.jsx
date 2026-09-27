import { useState } from "react";
import { dmsService } from "../services/dmsService";

export default function CourierDeliveryVerification() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");
    setResult(null);

    if (!trackingNumber.trim()) {
      setError("Please enter the tracking number.");
      return;
    }

    if (!otp.trim()) {
      setError("Please enter the customer OTP.");
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("OTP must contain exactly 6 digits.");
      return;
    }

    setLoading(true);

    try {
      const response = await dmsService.verifyDeliveryOtp(
        trackingNumber.trim(),
        otp.trim()
      );

      setResult(response);
    } catch (err) {
      setError(
        err?.message ||
          "OTP verification failed. Please check the OTP and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">

        <div className="text-center">
          <h1 className="text-2xl font-bold">
            Delivery Verification
          </h1>

          <p className="text-sm text-slate-400 mt-2">
            Enter the customer's OTP to confirm delivery.
          </p>
        </div>

        <form onSubmit={handleVerify} className="mt-8 space-y-5">

          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Tracking Number
            </label>

            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Customer OTP
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, ""))
              }
              placeholder="Enter 6-digit OTP"
              className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-950 border border-red-800 p-4">
              <p className="text-sm text-red-300">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 py-3 font-semibold transition"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        {result && (
          <div className="mt-6 rounded-xl bg-green-950 border border-green-700 p-5">

            <h2 className="text-lg font-semibold text-green-400">
              ✓ Delivery Confirmed
            </h2>

            <p className="text-sm text-slate-300 mt-3">
              {result.message ||
                "OTP verified successfully. Shipment marked as delivered."}
            </p>

            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="text-slate-400">
                  Tracking Number:
                </span>{" "}
                {trackingNumber}
              </p>

              <p>
                <span className="text-slate-400">
                  Status:
                </span>{" "}
                <span className="text-green-400 font-semibold">
                  DELIVERED
                </span>
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
