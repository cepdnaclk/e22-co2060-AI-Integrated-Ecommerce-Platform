import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import API_BASE_URL from "../config/api";

/**
 * This page is opened when the user clicks the verification link in the email.
 * It silently calls the backend, shows a brief message, then closes itself
 * so the original SellerRegister tab automatically continues.
 */
const VerifySellerEmail = () => {
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) return;

        // Call the backend to do the actual verification
        fetch(`${API_BASE_URL}/api/sellers/verify-email?token=${token}`)
            .then(() => {
                // Try to close this tab after a short delay
                setTimeout(() => window.close(), 1800);
            })
            .catch(() => {
                setTimeout(() => window.close(), 1800);
            });
    }, []);

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "linear-gradient(135deg, #0d1424, #072454, #1945a5)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontFamily: "Arial, sans-serif",
                textAlign: "center",
                padding: 24,
            }}
        >
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>
                Email Verified!
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 15 }}>
                Your seller account is now active.<br />
                You can close this tab — your original page is continuing automatically.
            </p>
        </div>
    );
};

export default VerifySellerEmail;
