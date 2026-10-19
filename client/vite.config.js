import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, calls to /api go to the Express server, so no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:5000" } },
});
