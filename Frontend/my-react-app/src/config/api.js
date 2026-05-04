// Force all backend API calls to use relative paths.
// This guarantees that requests are intercepted by:
//  - Local Dev: Vite's built-in proxy (vite.config.js -> http://localhost:3000)
//  - Production: Nginx reverse proxy (nginx.conf -> https://backend.../api/)
// This flawlessly bypasses CORS checks and preflight failures on Railway.
const API_BASE_URL = "";

export default API_BASE_URL;
