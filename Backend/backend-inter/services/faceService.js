/**
 * Face Recognition Service Client
 * Communicates with the Python Face Recognition microservice.
 * 
 * MODULAR DESIGN: This module is the ONLY place that talks to the
 * face service. If FACE_RECOGNITION_ENABLED is false, all methods
 * return { verified: true, skipped: true } — the rest of the app
 * works identically.
 */

import axios from "axios";

const FACE_RECOGNITION_ENABLED =
  (process.env.FACE_RECOGNITION_ENABLED || "false").toLowerCase() === "true";

const FACE_SERVICE_URL =
  process.env.FACE_SERVICE_URL || "http://localhost:5000";

const FACE_SIMILARITY_THRESHOLD =
  parseFloat(process.env.FACE_SIMILARITY_THRESHOLD) || 0.45;

const client = axios.create({
  baseURL: FACE_SERVICE_URL,
  timeout: 15000, // 15 s max
  headers: { "Content-Type": "application/json" },
});

/**
 * Check if face recognition is enabled.
 * Reads env at call-time (not import-time) so dotenv has loaded.
 */
export function isFaceEnabled() {
  return (process.env.FACE_RECOGNITION_ENABLED || "false").toLowerCase() === "true";
}

/**
 * Generate a face embedding from a base64 image.
 * Returns { success, embedding } or throws.
 */
export async function generateEmbedding(base64Image) {
  if (!isFaceEnabled()) {
    return { success: true, skipped: true, embedding: null };
  }

  try {
    const { data } = await client.post("/generate-embedding", {
      image: base64Image,
    });
    return data;
  } catch (err) {
    const msg =
      err.response?.data?.detail || err.message || "Face service unavailable";
    console.error("Face service – generateEmbedding error:", msg);
    throw new Error(msg);
  }
}

/**
 * Verify a live face against a stored embedding.
 * Returns { verified, similarity, threshold, skipped? }
 */
export async function verifyFace(base64Image, storedEmbedding, adminId) {
  if (!isFaceEnabled()) {
    return { verified: true, skipped: true };
  }

  if (!storedEmbedding || storedEmbedding.length === 0) {
    // Admin has no face enrolled — skip face check gracefully
    return { verified: true, skipped: true, reason: "no_embedding" };
  }

  try {
    const { data } = await client.post("/verify-face", {
      image: base64Image,
      stored_embedding: storedEmbedding,
      admin_id: adminId,
      threshold: parseFloat(process.env.FACE_SIMILARITY_THRESHOLD) || 0.45,
    });
    return data;
  } catch (err) {
    const msg =
      err.response?.data?.detail || err.message || "Face service unavailable";
    console.error("Face service – verifyFace error:", msg);
    throw new Error(msg);
  }
}

/**
 * Health check on the Python microservice.
 */
export async function healthCheck() {
  if (!isFaceEnabled()) {
    return { status: "disabled" };
  }
  try {
    const { data } = await client.get("/health");
    return data;
  } catch {
    return { status: "unreachable" };
  }
}
