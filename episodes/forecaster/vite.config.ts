import { defineConfig } from "vite";

// 5176 so every episode can run side by side.
export default defineConfig({ base: "./", server: { port: 5176, open: true } });
