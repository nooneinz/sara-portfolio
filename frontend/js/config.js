/*
 * Frontend configuration.
 * API_BASE_URL: where the FastAPI backend lives.
 *   - Local:      "http://localhost:8000"
 *   - Production: your Render URL, e.g. "https://sara-portfolio-api.onrender.com"
 */
window.APP_CONFIG = {
  API_BASE_URL:
    location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "file:"
      ? "http://localhost:8000"
      : ""  // same origin: the Docker container serves both the site and /api,
};
