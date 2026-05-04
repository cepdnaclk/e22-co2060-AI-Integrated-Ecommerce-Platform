// Use the injected env var when available (set at build time via Dockerfile ARG).
// Falls back to a relative path so the Nginx proxy handles routing in production
// when the build arg was not provided.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default API_BASE_URL;
