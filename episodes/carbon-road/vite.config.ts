import { defineConfig } from "vite";

// 5174 so this can run alongside episode 1 on 5173.
export default defineConfig({ base: "./", server: { port: 5174, open: true } });
