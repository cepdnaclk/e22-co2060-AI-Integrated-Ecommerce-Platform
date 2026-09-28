import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { dmsService } from "../services/dmsService";

export default function CustomerCourierQrScanner() {
  const scannerRef = useRef(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
    };
  }, []);

  const startScanner = async () => {
    setError("");
    setResult(null);
    setScanning(true);

    try {
      const scanner = new Html5Qrcode("customer-courier-qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          try {
            await scanner.stop();
          } catch {}

          setScanning(false);

          try {
            const response = await dmsService.scanCourierQr({
              qrText: decodedText,
            });

            setResult(response);
          } catch (err) {
            setError(
              err?.message ||
                "Failed to process courier QR code."
            );
          }
        },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      setError(
        err?.message ||
          "Unable to access camera."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
        <h1 className="text-2xl font-bold text-center">
          Scan Courier QR
        </h1>

        <p className="text-sm text-slate-400 text-center mt-2">
          Scan the QR code displayed by your delivery courier.
        </p>

        <div
          id="customer-courier-qr-reader"
          className="mt-6 overflow-hidden rounded-xl"
        />

        {!scanning && !result && (
          <button
            onClick={startScanner}
            className="w-full mt-6 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 font-semibold"
          >
            Start QR Scanner
          </button>
        )}

        {scanning && (
          <p className="text-center text-blue-400 mt-4">
            Scanning courier QR...
          </p>
        )}

        {error && (
          <div className="mt-5 rounded-xl bg-red-950 border border-red-800 p-4">
            <p className="text-red-300 text-sm">
              {error}
            </p>
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-xl bg-slate-800 border border-slate-700 p-5">
            <h2 className="text-lg font-semibold text-green-400">
              Courier QR Scanned Successfully
            </h2>

            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="text-slate-400">
                  Tracking Number:
                </span>{" "}
                {result.trackingNumber}
              </p>

              <p>
                <span className="text-slate-400">
                  Courier:
                </span>{" "}
                {result.courier?.name || "Unknown"}
              </p>

              <p>
                <span className="text-slate-400">
                  Employee ID:
                </span>{" "}
                {result.courier?.employeeId || "N/A"}
              </p>
            </div>

            {result.otp && (
              <div className="mt-6 rounded-xl bg-blue-950 border border-blue-700 p-5 text-center">
                <p className="text-sm text-blue-300">
                  Delivery OTP
                </p>

                <p className="text-4xl font-bold tracking-[0.4em] mt-2">
                  {result.otp}
                </p>

                <p className="text-xs text-slate-400 mt-3">
                  Tell this OTP to the courier.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-500 text-center mt-4">
              OTP expires in 15 minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
