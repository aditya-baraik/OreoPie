import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // './' makes all asset paths relative — required for GitHub Pages
  base: "./",

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  server: {
    allowedHosts: true, // allow Replit proxy & any custom domain
  },

  build: {
    outDir: "dist",
  },
});
