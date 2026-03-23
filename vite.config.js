import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const serverPort = env.SERVER_PORT || "3001";

    return {
        plugins: [react()],
        cacheDir: ".vite-cache",
        server: {
            port: 5173,
            proxy: {
                "/api": {
                    target: `http://127.0.0.1:${serverPort}`,
                    changeOrigin: true
                }
            }
        }
    };
});
