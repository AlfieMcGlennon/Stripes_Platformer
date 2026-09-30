import { defineConfig } from "vite";

// 5175 so all episodes can run side by side.
export default defineConfig({ base: "./", server: { port: 5175, open: true } });
