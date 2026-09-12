import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "4173";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

if (!basePath) {
  throw new Error(`Invalid BASE_PATH value: "${basePath}"`);
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    /*
     * Découpage des dépendances en chunks stables : l'entrée applicative ne
     * porte plus que le code AIME, les bibliothèques lourdes sont chargées en
     * parallèle et restent en cache d'un déploiement à l'autre (leur nom ne
     * change pas tant que leur version ne change pas). Aucun composant n'est
     * modifié : c'est un découpage de sortie, sans effet sur le rendu serveur
     * ni sur les contrôles. Un découpage par route (React.lazy) pourra s'ajouter
     * ensuite, piloté par une mesure Lighthouse sur le déploiement réel.
     */
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id) || id.includes("react/jsx-runtime")) return "vendor-react";
          if (id.includes("@clerk")) return "vendor-clerk";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("date-fns")) return "vendor-dates";
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("@paper-design")) return "vendor-shaders";
          if (id.includes("lucide-react") || id.includes("react-icons")) return "vendor-icons";
          if (id.includes("/zod") || id.includes("zod/v4")) return "vendor-zod";
          return "vendor";
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: process.env.AIME_API_URL
      ? {
          "/api": {
            target: process.env.AIME_API_URL,
            changeOrigin: true,
          },
        }
      : undefined,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
