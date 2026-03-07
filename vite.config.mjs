import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ mode }) => {
  const plugins = [react(), runtimeErrorOverlay()];
  
  if (mode !== "production" && process.env.REPL_ID !== undefined) {
    const cartographer = await import("@replit/vite-plugin-cartographer");
    const devBanner = await import("@replit/vite-plugin-dev-banner");
    plugins.push(cartographer.cartographer(), devBanner.devBanner());
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
        "@remotion-src": path.resolve(import.meta.dirname, "src", "remotion"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    define: {
      // Expose Supabase credentials to frontend (anon key is safe for public use)
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(process.env.SUPABASE_URL || ""),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(process.env.SUPABASE_ANON_KEY || ""),
    },
    server: {
      host: "0.0.0.0",
      port: 5000,
      strictPort: true,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: "http://localhost:5051",
          changeOrigin: true,
          secure: false,
        },
      },
      fs: {
        strict: true,
        allow: [
          path.resolve(import.meta.dirname, "client"),
          path.resolve(import.meta.dirname, "src", "remotion"),
          path.resolve(import.meta.dirname, "shared"),
          path.resolve(import.meta.dirname, "node_modules"),
        ],
        deny: ["**/.*"],
      },
    },
  };
});
