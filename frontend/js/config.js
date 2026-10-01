/*
 * Frontend configuration.
 * API_BASE_URL: where the FastAPI backend lives.
 *   - Local:      "http://localhost:8000"
 *   - Production: "" (same origin, the Docker container serves site + API)
 */
window.APP_CONFIG = {
  API_BASE_URL:
    location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "file:"
      ? "http://localhost:8000"
      : ""  // same origin: the container serves both the site and /api,
};
