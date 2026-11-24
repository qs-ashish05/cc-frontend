import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// In dev, the browser calls /api/... and Vite forwards it to your FastAPI server,
// so you do not need CORS while developing.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target =
    env.VITE_PROXY_TARGET ||
    "https://ccbackend-4s4mso8cw-qsashish05s-projects.vercel.app";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
