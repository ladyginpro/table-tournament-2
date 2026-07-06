import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: { plugins: ["babel-plugin-react-compiler"] },
    }),
  ],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3000" },
    allowedHosts: ["table-tournament-2.ru.tuna.am"],
  },
});
