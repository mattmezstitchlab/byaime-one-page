import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

const rawPort = process.env.PORT ?? "4173";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

if (!basePath) {
  throw new Error(`Invalid BASE_PATH value: "${basePath}"`);
}

/* Les plugins Replit ne déclarent pas `vite` en peerDependency : leurs types
   `Plugin` se résolvent sur l'instance de vite hissée à la racine du store,
   pas sur celle de ce package (même version 7.3.6, autre empreinte de pairs
   — tsx/yaml). Structurellement identiques, nominalement distincts pour tsc.
   On les rattache explicitement au type de CE vite ; aucun comportement ne
   change, et régénérer le lockfile pour dédupliquer n'est pas une option
   (voir docs/vercel-deployment.md — Lockfile). */
const replitPlugins: PluginOption[] = [
  runtimeErrorOverlay() as PluginOption,
  ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
    ? [
        (await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer({
            root: path.resolve(import.meta.dirname, ".."),
          }),
        )) as PluginOption,
      ]
    : []),
];

export default defineConfig({
  base: basePath,
  plugins: [mockupPreviewPlugin(), react(), tailwindcss(), ...replitPlugins],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
